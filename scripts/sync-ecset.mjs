#!/usr/bin/env node
// Sync ECSET scout management data → public/content/*.json
// Usage: node scripts/sync-ecset.mjs [--dry-run]
// Env:   ECSET_USERNAME, ECSET_PASSWORD, ECSET_TOTP_SECRET (base32 authenticator
//        secret — required if the account has 2FA enabled), DRY_RUN=true
import { load } from 'cheerio';
import { createHmac } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT = resolve(__dirname, '../public/content');
const BASE = 'https://ecset.cserkesz.hu';
const DRY_RUN = process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run');

// Present as a normal browser on every request. A bare Node/undici User-Agent is
// an obvious automation tell, and some ECSET pages appear to serve a stripped
// response to it — real headers keep the traffic looking like an ordinary login.
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'hu-HU,hu;q=0.9,en-US;q=0.8,en;q=0.7',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
// Random integer in [min, max] — used to space requests out like a human and to
// vary their order, so the session never replays the same robotic burst.
const jitter = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const humanPause = () => sleep(jitter(2500, 9000));

// ── 2FA (TOTP) ────────────────────────────────────────────────────────────────

// Base32 (RFC 4648) decode — authenticator-app secrets are distributed as base32.
function base32Decode(input) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = input.replace(/=+$/, '').toUpperCase().replace(/\s+/g, '');
  let bits = '';
  for (const char of clean) {
    const val = alphabet.indexOf(char);
    if (val === -1) throw new Error(`Invalid character in ECSET_TOTP_SECRET: ${char}`);
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

// RFC 6238 TOTP: 30s step, 6 digits, HMAC-SHA1 — the standard algorithm behind
// Google Authenticator / Authy / most "scan this QR code" 2FA setups.
function totp(secret, step = 30, digits = 6) {
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 1000 / step);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24 | (hmac[offset + 1] & 0xff) << 16 |
    (hmac[offset + 2] & 0xff) << 8 | (hmac[offset + 3] & 0xff)) % 10 ** digits;
  return code.toString().padStart(digits, '0');
}

// The verification step's field name isn't something we can hardcode sight
// unseen, so read the real form back instead of guessing: carry over every
// hidden field it already has (CSRF token + any wizard state) and fill in
// whichever visible input looks like the code field.
async function submitTwoFactorCode(cookie, stepLocation, totpSecret) {
  const stepUrl = stepLocation.startsWith('http') ? stepLocation : `${BASE}${stepLocation}`;
  const stepRes = await fetch(stepUrl, { headers: { ...BROWSER_HEADERS, Cookie: cookie } });
  const stepHtml = await stepRes.text();
  const $ = load(stepHtml);
  const $form = $('form').first();
  if (!$form.length) throw new Error('2FA verification form not found — ECSET login page may have changed');

  const body = new URLSearchParams();
  $form.find('input').each((_, el) => {
    const $el = $(el);
    const name = $el.attr('name');
    if (!name) return;
    const type = ($el.attr('type') || 'text').toLowerCase();
    if (type === 'checkbox' || type === 'radio') {
      if ($el.attr('checked') !== undefined) body.append(name, $el.attr('value') ?? 'on');
      return;
    }
    body.append(name, $el.attr('value') ?? '');
  });

  // Hidden fields (CSRF token, wizard step state) can themselves contain
  // "token" in their name (e.g. csrfmiddlewaretoken) — restrict the match to
  // visible inputs, since the code the user types is never a hidden field.
  const codeField = $form.find('input').filter((_, el) => {
    const $el = $(el);
    const type = ($el.attr('type') || 'text').toLowerCase();
    if (type === 'hidden') return false;
    const name = ($el.attr('name') || '').toLowerCase();
    const id = ($el.attr('id') || '').toLowerCase();
    return /otp|token|code|2fa/.test(name) || /otp|token|code|2fa/.test(id);
  }).first();
  const codeName = codeField.attr('name');
  if (!codeName) throw new Error('Could not find the 2FA code field on the verification form');
  body.set(codeName, totp(totpSecret));

  // Pause as if reading the code off an authenticator app and typing it in.
  await sleep(jitter(2000, 6000));

  const action = $form.attr('action');
  const postUrl = !action ? stepUrl : action.startsWith('http') ? action : `${BASE}${action}`;
  const res = await fetch(postUrl, {
    method: 'POST',
    headers: {
      ...BROWSER_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookie,
      Referer: stepUrl,
    },
    body,
    redirect: 'manual',
  });

  const setCookies = res.headers.getSetCookie?.() ?? [res.headers.get('set-cookie') ?? ''];
  const joined = setCookies.join('; ');
  return {
    location: res.headers.get('location') ?? '',
    sessionId: joined.match(/sessionid=([^;,\s]+)/)?.[1],
    csrfToken: joined.match(/csrftoken=([^;,\s]+)/)?.[1],
    status: res.status,
  };
}

// ── Auth ──────────────────────────────────────────────────────────────────────

async function login() {
  const { ECSET_USERNAME: user, ECSET_PASSWORD: pass, ECSET_TOTP_SECRET: totpSecret } = process.env;
  if (!user || !pass) throw new Error('Set ECSET_USERNAME and ECSET_PASSWORD env vars');

  const pageRes = await fetch(`${BASE}/accounts/login/`, { headers: BROWSER_HEADERS });
  const setCookies1 = pageRes.headers.getSetCookie?.() ?? [pageRes.headers.get('set-cookie') ?? ''];
  let csrfCookie = setCookies1.join('; ').match(/csrftoken=([^;,\s]+)/)?.[1] ?? '';
  const pageHtml = await pageRes.text();
  const csrfToken = pageHtml.match(/name="csrfmiddlewaretoken"\s+value="([^"]+)"/)?.[1];
  if (!csrfToken) throw new Error('CSRF token not found on login page');

  // Pause as if a person were typing their credentials into the form.
  await sleep(jitter(2000, 5000));

  const body = new URLSearchParams({ csrfmiddlewaretoken: csrfToken, login: user, password: pass });
  const postRes = await fetch(`${BASE}/accounts/login/`, {
    method: 'POST',
    headers: {
      ...BROWSER_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: `csrftoken=${csrfCookie}`,
      Referer: `${BASE}/accounts/login/`,
    },
    body,
    redirect: 'manual',
  });

  let location = postRes.headers.get('location') ?? '';
  const setCookies2 = postRes.headers.getSetCookie?.() ?? [postRes.headers.get('set-cookie') ?? ''];
  let sessionId = setCookies2.join('; ').match(/sessionid=([^;,\s]+)/)?.[1];

  // Django keeps step-1 wizard state in the session even before the user is
  // fully authenticated, so the intermediate sessionid above is what carries
  // us into the token step below — it isn't the final authenticated session.
  if (location.includes('2fa')) {
    if (!totpSecret) {
      throw new Error(
        'Account requires 2FA — set ECSET_TOTP_SECRET to the base32 authenticator secret shown when enabling 2FA on this account'
      );
    }
    if (!sessionId) throw new Error(`Login step 1 failed before reaching 2FA (HTTP ${postRes.status})`);
    const stepCookie = `csrftoken=${csrfCookie}; sessionid=${sessionId}`;
    const result = await submitTwoFactorCode(stepCookie, location, totpSecret);
    location = result.location;
    sessionId = result.sessionId ?? sessionId;
    if (result.csrfToken) csrfCookie = result.csrfToken;
    if (location.includes('2fa')) throw new Error(`2FA verification rejected (HTTP ${result.status}) — check ECSET_TOTP_SECRET`);
  }

  if (!sessionId) throw new Error(`Login failed (HTTP ${postRes.status}, redirect: ${location})`);

  const cookie = `csrftoken=${csrfCookie}; sessionid=${sessionId}`;

  // A sessionid cookie alone doesn't guarantee an authenticated session — verify
  // by inspecting an authenticated page, not just the cookie's presence.
  const checkRes = await fetch(`${BASE}/mcssz/811/`, { headers: { ...BROWSER_HEADERS, Cookie: cookie }, redirect: 'manual' });
  if (checkRes.status >= 300 && checkRes.status < 400) {
    throw new Error(`Login verification failed: /mcssz/811/ redirected (HTTP ${checkRes.status}) — session not authenticated`);
  }
  const checkHtml = await checkRes.text();
  if (/name="login"/.test(checkHtml) || /accounts\/login/.test(checkHtml)) {
    throw new Error('Login verification failed: authenticated page still shows a login form');
  }

  return cookie;
}

async function get(cookie, path) {
  const res = await fetch(`${BASE}${path}`, { headers: { ...BROWSER_HEADERS, Cookie: cookie } });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${path}`);
  if (res.url !== `${BASE}${path}`) console.warn(`  ⚠ ${path} redirected to ${res.url}`);
  return res.text();
}

// ── Scrapers ──────────────────────────────────────────────────────────────────

// Parse an ECSET DataTable page. ECSET adds both `id="datatable"` and the
// `dataTable` CSS class via JavaScript at runtime, so the raw server HTML may
// only have a plain <table class="table">. We find the table with the most
// body rows — the data table always dominates the page.
function tableRows(html) {
  const $ = load(html);
  const rows = [];

  // Pick the table with the most <tbody tr> rows
  let best = null, bestCount = 0;
  $('table').each((_, t) => {
    const n = $(t).find('tbody tr').length;
    if (n > bestCount) { bestCount = n; best = t; }
  });

  if (!best) return rows;

  $(best).find('tbody tr').each((_, tr) => {
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

async function scrapeCamps(cookie) {
  const rows = tableRows(await get(cookie, '/mcssz/811/taborok/'));
  // Columns: 0=# 1=Időtartam 2=Szervező 3=Táborhely 4=Táborparancsnok 5=Létszám 6=Státusz
  // Filter to 811 camps only — joint camps list other troops as organiser
  return rows
    .filter(c => c[2]?.text === '811. Szent József cserkészcsapat')
    .map(c => {
      const dateRange = c[1]?.text ?? '';
      const year = parseInt(dateRange.match(/^(\d{4})\./)?.[1] ?? '0');
      const commander = (c[4]?.dataOrder ?? c[4]?.text ?? '')
        .replace(/\s*\([^)]+\)\s*/g, '').trim();
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
  const res = await fetch(`${BASE}/mcssz/811/naptar/export.ics`, { headers: { ...BROWSER_HEADERS, Cookie: cookie } });
  if (!res.ok) throw new Error(`ICS fetch failed: HTTP ${res.status}`);
  return parseICS(await res.text());
}

async function scrapeHomepage(cookie) {
  const html = await get(cookie, '/mcssz/811/');
  const $ = load(html);
  const fields = {};
  $('dt').each((_, dt) => {
    const key = $(dt).text().trim();
    const val = $(dt).next('dd').text().replace(/\s+/g, ' ').trim();
    fields[key] = val;
  });
  const bodyText = $.root().text();
  const orsMatch = bodyText.match(/(\d+) aktív őrs/);
  const fb = fields['Facebook oldal'];
  const ig = fields['Instagram oldal'];
  return {
    memberCount: parseInt(fields['Aktív tagok száma']) || null,
    orsCount:    orsMatch ? parseInt(orsMatch[1]) : null,
    address:     fields['Székhely'] || null,
    emailMain:   fields['E-mail'] || null,
    facebook:    fb ? `https://www.facebook.com/${fb}` : null,
    instagram:   ig ? `https://www.instagram.com/${ig.replace(/^@/, '')}` : null,
  };
}

// ── Transformers ──────────────────────────────────────────────────────────────

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

const HU_MONTHS = ['január', 'február', 'március', 'április', 'május', 'június',
  'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];
// Build "2026. június 30." directly. toLocaleDateString('hu-HU') depends on the
// runtime's ICU/locale data, which differs between macOS and the CI runner and
// produced a double period there — this is deterministic everywhere.
function huDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${y}. ${HU_MONTHS[m - 1]} ${d}.`;
}

function transformEvents(ecset, existing) {
  const today = new Date().toISOString().slice(0, 10);
  const events = ecset.map(e => {
    const id = `${slugify(e.summary)}-${e.date.slice(0, 7)}`;
    const prev = existing.events.find(x => x.id === id);
    const dateDisplay = huDate(e.date);
    // dateDisplay is otherwise editor-owned once set (prev wins), but a stale
    // double-period value is a known robot artifact from an old date-format
    // bug, not something a human would type — repair it in place rather than
    // preserving it forever (audit finding C8).
    const isStaleBotArtifact = prev?.dateDisplay && /\.\.$/.test(prev.dateDisplay);
    return {
      id,
      title: prev?.title ?? e.summary,
      date: e.date,
      dateDisplay: !isStaleBotArtifact && prev?.dateDisplay ? prev.dateDisplay : dateDisplay,
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

// Field ownership (audit finding C3): activeMemberCount/activeOrsCount/rajCount
// are auto-computed stats ECSET/rajok.json always own, so the sync keeps them
// current every run — CMS shows them as editable but a manual edit there is
// expected to be overwritten (config.yml documents this with a hint).
// address/emailMain/facebook/instagram are organizational identity details an
// editor may reasonably correct in the CMS; once set, an editor's value wins
// forever and ECSET only fills the field in while it's still empty.
function transformSettings({ memberCount, orsCount, address, emailMain, facebook, instagram }, existing, rajCount) {
  const s = { ...existing };
  if (memberCount !== null) s.activeMemberCount = memberCount;
  if (orsCount    !== null) s.activeOrsCount    = orsCount;
  if (rajCount    !== null) s.rajCount          = rajCount;
  s.address   = existing.address   || address   || existing.address;
  s.emailMain = existing.emailMain || emailMain || existing.emailMain;
  s.facebook  = existing.facebook  || facebook  || existing.facebook;
  s.instagram = existing.instagram || instagram || existing.instagram;
  return s;
}

// A maintenance page, error page, or table-format drift tends to produce data
// that "parses" but is empty or wildly different from last time. Refuse to
// write in that case rather than silently corrupting the content files.
function assertSanity({ homepage, camps, events }, existingSettings) {
  const prevMembers = existingSettings.activeMemberCount;
  if (homepage.memberCount !== null && prevMembers) {
    const delta = Math.abs(homepage.memberCount - prevMembers) / prevMembers;
    if (delta > 0.3) {
      throw new Error(
        `Sanity check failed: scraped member count ${homepage.memberCount} deviates >30% from previous ${prevMembers} (possible maintenance/error page)`
      );
    }
  }
  if (camps.length < 1) {
    throw new Error('Sanity check failed: 0 camps scraped (possible maintenance/error page or table format change)');
  }
  if (events.length === 0) {
    throw new Error('Sanity check failed: 0 events scraped from the ICS feed (possible maintenance/error page or format change)');
  }
}

// ── I/O ───────────────────────────────────────────────────────────────────────

function read(name) { return JSON.parse(readFileSync(resolve(CONTENT, name), 'utf8')); }
function write(name, data) {
  const path = resolve(CONTENT, name);
  const tmpPath = `${path}.tmp-${process.pid}`;
  writeFileSync(tmpPath, JSON.stringify(data, null, 2) + '\n');
  renameSync(tmpPath, path);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`sync-ecset ${DRY_RUN ? '(dry run) ' : ''}starting…`);

  const cookie = await login();
  console.log('✓ logged in');

  // TEMP diagnostic (DEBUG_ROUTE): dump a page's parsed table rows + dt/dd
  // pairs and exit — used to discover where ECSET exposes raj/korosztály
  // data before writing a real scraper for it. Never touches any content file.
  if (process.env.DEBUG_ROUTE) {
    const route = process.env.DEBUG_ROUTE;
    console.log(`\n── DEBUG_ROUTE: ${route} ──`);
    const html = await get(cookie, route);
    const $ = load(html);
    const dtdd = {};
    $('dt').each((_, dt) => {
      dtdd[$(dt).text().trim()] = $(dt).next('dd').text().replace(/\s+/g, ' ').trim();
    });
    console.log('dt/dd pairs:', JSON.stringify(dtdd, null, 2));
    const rows = tableRows(html);
    console.log(`table rows (${rows.length}):`, JSON.stringify(rows.slice(0, 30), null, 2));
    // Dump every nav link — first pass filtered by keyword and found nothing,
    // which likely means either different wording or JS-rendered nav; dump
    // everything so a human can spot the real path.
    const links = [];
    $('a[href]').each((_, a) => {
      const href = $(a).attr('href') ?? '';
      const text = $(a).text().replace(/\s+/g, ' ').trim();
      if (href && !href.startsWith('#')) links.push({ href, text });
    });
    console.log(`all links (${links.length}):`, JSON.stringify(links, null, 2));

    // For each "-raj/" link, dump its ancestor elements' full text (a few
    // levels up) — a korosztály badge would likely sit as sibling/nearby text
    // rather than its own link, so link text alone won't show it.
    const rajContext = [];
    $('a[href*="-raj/"], a[href*="/raj/"]').each((_, a) => {
      const $a = $(a);
      const href = $a.attr('href');
      const levels = [];
      let $node = $a;
      for (let i = 0; i < 4; i++) {
        $node = $node.parent();
        if (!$node.length) break;
        levels.push($node.text().replace(/\s+/g, ' ').trim().slice(0, 300));
      }
      rajContext.push({ href, levels });
    });
    console.log('raj ancestor text:', JSON.stringify(rajContext, null, 2));
    console.log('mentions "Anonymus"?', html.includes('Anonymus'));
    console.log('mentions "korosztály"/"korosztaly"?', /korosztály|korosztaly/i.test(html));
    console.log('\n✓ debug route dump complete — no files written');
    return;
  }

  // Settle after login, as a user reading the dashboard would.
  await sleep(jitter(1500, 6000));

  // Fetch the pages one at a time, in a random order, with human-like gaps —
  // a single parallel burst right after login is the clearest automation tell.
  const tasks = [
    ['homepage', () => scrapeHomepage(cookie)],
    ['camps',    () => scrapeCamps(cookie)],
    ['events',   () => scrapeEvents(cookie)],
  ];
  for (let i = tasks.length - 1; i > 0; i--) {  // Fisher–Yates shuffle
    const j = jitter(0, i);
    [tasks[i], tasks[j]] = [tasks[j], tasks[i]];
  }

  const out = {};
  for (let i = 0; i < tasks.length; i++) {
    const [key, fn] = tasks[i];
    out[key] = await fn();
    if (i < tasks.length - 1) await humanPause();
  }
  const { memberCount, orsCount } = out.homepage;
  console.log(`  members: ${memberCount}, ors: ${orsCount}, camps: ${out.camps.length}, events: ${out.events.length}`);

  // rajCount is derived from rajok.json (maintained in CMS) rather than ECSET,
  // since ECSET has no structured raj count endpoint.
  const existingSettings = read('settings.json');
  const rajCount = read('rajok.json').rajok?.length ?? null;

  assertSanity(out, existingSettings);

  const camps    = transformCamps(out.camps, read('camps.json'));
  const events   = transformEvents(out.events, read('events.json'));
  const settings = transformSettings(out.homepage, existingSettings, rajCount);

  if (DRY_RUN) {
    console.log('\n── camps.json ──\n', JSON.stringify(camps, null, 2));
    console.log('\n── events.json ──\n', JSON.stringify(events, null, 2));
    console.log('\n── settings.json ──\n', JSON.stringify(settings, null, 2));
    console.log('\n✓ dry run complete — no files written');
    return;
  }

  write('camps.json', camps);
  write('events.json', events);
  write('settings.json', settings);
  console.log('✓ wrote 3 content files');
}

main().catch(err => { console.error(err.message); process.exit(1); });
