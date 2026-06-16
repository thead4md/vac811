#!/usr/bin/env node
// Sync ECSET scout management data → public/content/*.json
// Usage: node scripts/sync-ecset.mjs [--dry-run]
// Env:   ECSET_USERNAME, ECSET_PASSWORD, DRY_RUN=true
import { load } from 'cheerio';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT = resolve(__dirname, '../public/content');
const BASE = 'https://ecset.cserkesz.hu';
const DRY_RUN = process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run');

// ── Auth ──────────────────────────────────────────────────────────────────────

async function login() {
  const { ECSET_USERNAME: user, ECSET_PASSWORD: pass } = process.env;
  if (!user || !pass) throw new Error('Set ECSET_USERNAME and ECSET_PASSWORD env vars');

  const pageRes = await fetch(`${BASE}/accounts/login/`);
  const setCookies1 = pageRes.headers.getSetCookie?.() ?? [pageRes.headers.get('set-cookie') ?? ''];
  const csrfCookie = setCookies1.join('; ').match(/csrftoken=([^;,\s]+)/)?.[1] ?? '';
  const pageHtml = await pageRes.text();
  const csrfToken = pageHtml.match(/name="csrfmiddlewaretoken"\s+value="([^"]+)"/)?.[1];
  if (!csrfToken) throw new Error('CSRF token not found on login page');

  const body = new URLSearchParams({ csrfmiddlewaretoken: csrfToken, login: user, password: pass });
  const postRes = await fetch(`${BASE}/accounts/login/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: `csrftoken=${csrfCookie}`,
      Referer: `${BASE}/accounts/login/`,
    },
    body,
    redirect: 'manual',
  });

  const location = postRes.headers.get('location') ?? '';
  const setCookies2 = postRes.headers.getSetCookie?.() ?? [postRes.headers.get('set-cookie') ?? ''];
  const sessionId = setCookies2.join('; ').match(/sessionid=([^;,\s]+)/)?.[1];

  if (location.includes('2fa')) throw new Error('2FA required — use an account with 2FA disabled');
  if (!sessionId) throw new Error(`Login failed (HTTP ${postRes.status}, redirect: ${location})`);

  return `csrftoken=${csrfCookie}; sessionid=${sessionId}`;
}

async function get(cookie, path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: cookie } });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${path}`);
  return res.text();
}

// ── Scrapers ──────────────────────────────────────────────────────────────────

// Parse an ECSET DataTable page. All ECSET tables use id="datatable" and are
// server-rendered, so cheerio can parse them directly from the raw HTML.
function tableRows(html) {
  const $ = load(html);
  const rows = [];
  $('#datatable tbody tr').each((_, tr) => {
    const cells = $(tr).find('td').toArray().map(td => {
      const $td = $(td);
      return {
        text: $td.text().replace(/\s+/g, ' ').trim(),
        dataOrder: $td.attr('data-order') ?? null,
        email: $td.find('a[href^="mailto:"]').attr('href')?.replace('mailto:', '') ?? null,
      };
    });
    if (cells.length) rows.push(cells);
  });
  return rows;
}

async function scrapeLeaders(cookie) {
  const rows = tableRows(await get(cookie, '/mcssz/811/vezetok/'));
  // Columns: 0=# 1=Egység 2=Korosztály 3=Nem 4=Megbízatás 5=Vége 6=Név 7=E-mail 8=Tel
  return rows.map(c => ({
    unit:    c[1]?.text ?? '',
    role:    c[4]?.text ?? '',
    endDate: c[5]?.dataOrder ?? c[5]?.text ?? '',
    // data-order on the name cell is the plain name (no HTML link)
    name:    c[6]?.dataOrder ?? c[6]?.text ?? '',
    email:   c[7]?.email ?? '',
  }));
}

async function scrapeCamps(cookie) {
  const rows = tableRows(await get(cookie, '/mcssz/811/taborok/'));
  // Columns: 0=# 1=Időtartam 2=Szervező 3=Táborhely 4=Táborparancsnok 5=Létszám 6=Státusz
  return rows
    .filter(c => c[2]?.text === '811. Szent József cserkészcsapat')
    .map(c => {
      const dateRange = c[1]?.text ?? '';
      const year = parseInt(dateRange.match(/^(\d{4})\./)?.[1] ?? '0');
      const commander = (c[4]?.dataOrder ?? c[4]?.text ?? '')
        .replace(/\s*\(\d+\.\)\s*/g, '').trim();
      return {
        year,
        location: c[3]?.text ?? '',
        commander,
        participants: parseInt(c[5]?.text ?? '0') || 0,
      };
    })
    .filter(c => c.year > 0);
}

// Parse ICS manually — the format is simple enough to avoid an extra dependency.
function parseICS(ics) {
  const today = new Date().toISOString().slice(0, 10);
  const events = [];
  for (const block of ics.split('BEGIN:VEVENT').slice(1)) {
    const prop = k => {
      const m = block.match(new RegExp(`^${k}[^:]*:(.+)$`, 'm'));
      return (m?.[1] ?? '').trim();
    };
    const dtstart = prop('DTSTART');
    const dateMatch = dtstart.match(/(\d{4})(\d{2})(\d{2})/);
    if (!dateMatch) continue;
    const date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    if (date < today) continue;
    const summary = prop('SUMMARY').replace(/\\[,;]/g, '$1').replace(/\\n/g, ' ');
    const description = prop('DESCRIPTION').replace(/\\[,;]/g, '$1').replace(/\\n/g, '\n').trim();
    const uid = prop('UID');
    events.push({ uid, summary, description, date });
  }
  return events;
}

async function scrapeEvents(cookie) {
  const res = await fetch(`${BASE}/mcssz/811/naptar/export.ics`, { headers: { Cookie: cookie } });
  if (!res.ok) throw new Error(`ICS fetch failed: HTTP ${res.status}`);
  return parseICS(await res.text());
}

async function scrapeMemberCount(cookie) {
  const html = await get(cookie, '/mcssz/811/');
  const $ = load(html);
  let count = null;
  $('dt').each((_, dt) => {
    if ($(dt).text().trim() === 'Aktív tagok száma') {
      count = parseInt($(dt).next('dd').text().trim()) || null;
    }
  });
  return count;
}

// ── Transformers ──────────────────────────────────────────────────────────────

const LEADER_ROLES = new Set([
  'csapatparancsnok',
  'csapatparancsnok-helyettes',
  'törzsőrsvezető',
  'táborparancsnok',
  'táborozási vezető',
  'rajparancsnok',
  'rajvezető',
]);
const STAFF_ROLES = new Set([
  'csapatparancsnok',
  'csapatparancsnok-helyettes',
  'törzsőrsvezető',
  'táborparancsnok',
  'táborozási vezető',
]);

function normName(s) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function transformLeaders(ecset, existing) {
  const byName = new Map(existing.leaders.map(l => [normName(l.name), l]));
  const leaders = ecset
    .filter(l => LEADER_ROLES.has(l.role.toLowerCase()))
    .map(l => {
      const prev = byName.get(normName(l.name));
      const roleLow = l.role.toLowerCase();
      return {
        name: l.name,
        // Preserve the human-edited display role from existing data if the person is known.
        // Fall back to capitalized ECSET role for new entries.
        role: prev?.role ?? capitalize(l.role),
        email: l.email || prev?.email || '',
        raj: l.unit.endsWith(' raj') ? l.unit : (prev?.raj ?? ''),
        isStaff: STAFF_ROLES.has(roleLow),
        ...(prev?.photo ? { photo: prev.photo } : {}),
      };
    });
  return { leaders };
}

function transformCamps(ecset, existing) {
  const byYear = new Map(existing.camps.map(c => [c.year, c]));
  const camps = ecset.map(ec => {
    const prev = byYear.get(ec.year);
    return {
      year: ec.year,
      location: ec.location,
      commander: ec.commander,
      // ECSET has no theme or notes — preserve from existing data
      theme: prev?.theme ?? '',
      participants: ec.participants,
      notes: prev?.notes ?? '',
    };
  });
  // Keep manually-maintained camps that ECSET doesn't list
  for (const [year, prev] of byYear) {
    if (!camps.find(c => c.year === year)) camps.push(prev);
  }
  camps.sort((a, b) => b.year - a.year);
  return { camps };
}

function eventCategory(summary) {
  const s = summary.toLowerCase();
  if (s.includes('mise') || s.includes('körmenet') || s.includes('búcsú')) return 'mise';
  if (s.includes('tábor')) return 'tábor';
  if (s.includes('portya')) return 'portya';
  if (s.includes('verseny') || s.includes('bajnokság')) return 'verseny';
  return 'egyéb';
}

function slugify(s) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function transformEvents(ecset, existing) {
  const today = new Date().toISOString().slice(0, 10);
  const events = ecset.map(e => {
    const id = `${slugify(e.summary)}-${e.date.slice(0, 7)}`;
    const prev = existing.events.find(x => x.id === id);
    const dateDisplay = new Date(e.date + 'T12:00:00+02:00').toLocaleDateString('hu-HU', {
      year: 'numeric', month: 'long', day: 'numeric',
    }) + '.';
    return {
      id,
      title: prev?.title ?? e.summary,
      date: e.date,
      dateDisplay: prev?.dateDisplay ?? dateDisplay,
      description: prev?.description ?? e.description,
      category: prev?.category ?? eventCategory(e.summary),
    };
  });
  // Keep manually-added future events that aren't from ECSET
  for (const prev of existing.events) {
    if (prev.date >= today && !events.find(e => e.id === prev.id)) events.push(prev);
  }
  events.sort((a, b) => a.date.localeCompare(b.date));
  return { events };
}

function transformSettings(memberCount, existing) {
  if (memberCount === null) return existing;
  return { ...existing, activeMemberCount: memberCount };
}

// ── I/O ───────────────────────────────────────────────────────────────────────

function read(name) { return JSON.parse(readFileSync(resolve(CONTENT, name), 'utf8')); }
function write(name, data) { writeFileSync(resolve(CONTENT, name), JSON.stringify(data, null, 2) + '\n'); }

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`sync-ecset ${DRY_RUN ? '(dry run) ' : ''}starting…`);

  const cookie = await login();
  console.log('✓ logged in');

  const [ecsetLeaders, ecsetCamps, ecsetEvents, memberCount] = await Promise.all([
    scrapeLeaders(cookie),
    scrapeCamps(cookie),
    scrapeEvents(cookie),
    scrapeMemberCount(cookie),
  ]);
  console.log(`  leaders: ${ecsetLeaders.length}, camps: ${ecsetCamps.length}, events: ${ecsetEvents.length}, members: ${memberCount}`);

  const leaders  = transformLeaders(ecsetLeaders, read('leaders.json'));
  const camps    = transformCamps(ecsetCamps, read('camps.json'));
  const events   = transformEvents(ecsetEvents, read('events.json'));
  const settings = transformSettings(memberCount, read('settings.json'));

  if (DRY_RUN) {
    console.log('\n── leaders.json ──\n', JSON.stringify(leaders, null, 2));
    console.log('\n── camps.json ──\n', JSON.stringify(camps, null, 2));
    console.log('\n── events.json ──\n', JSON.stringify(events, null, 2));
    console.log('\n── settings.json ──\n', JSON.stringify(settings, null, 2));
    console.log('\n✓ dry run complete — no files written');
    return;
  }

  write('leaders.json', leaders);
  write('camps.json', camps);
  write('events.json', events);
  write('settings.json', settings);
  console.log('✓ wrote 4 content files');
}

main().catch(err => { console.error(err.message); process.exit(1); });
