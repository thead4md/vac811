#!/usr/bin/env node
// Quick smoke-test for the OpenAI preflight function.
// Usage: OPENAI_API_KEY=sk-... node scripts/test-preflight.mjs
//
// Uses two public images:
//   KEEP candidate — a clear outdoor photo
//   SKIP candidate — a blurry/dark image

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PREFLIGHT_MODEL = process.env.GALLERY_PREFLIGHT_MODEL || 'gpt-4o-mini';

if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY');
  process.exit(1);
}

const PREFLIGHT_PROMPT = `You are a photo curator for a Hungarian scout troop's public website.
Reply with KEEP or SKIP only — no other text.
SKIP if: clearly blurry, severely underexposed/dark, accidental shot (ground/sky/finger covering lens), or obviously a near-identical duplicate of a standard group pose.
When in doubt, reply KEEP.`;

// Public test images
const TESTS = [
  {
    label: 'clear outdoor photo (expect KEEP)',
    url: 'https://picsum.photos/id/119/640/480',  // forest/nature scene
  },
  {
    label: 'another clear photo (expect KEEP)',
    url: 'https://picsum.photos/id/1/640/480',    // laptop/desk scene
  },
];

async function preflight(imageUrl, label) {
  console.log(`\nTesting: ${label}`);
  console.log(`  Calling OpenAI ${PREFLIGHT_MODEL} with URL…`);

  let res;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: PREFLIGHT_MODEL,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
            { type: 'text', text: PREFLIGHT_PROMPT },
          ],
        }],
        max_tokens: 10,
        temperature: 0,
      }),
    });
  } catch (err) {
    console.error(`  FAIL: network error — ${err.message}`);
    return;
  }

  if (!res.ok) {
    const body = await res.text();
    console.error(`  FAIL: OpenAI ${res.status} — ${body.slice(0, 200)}`);
    return;
  }

  const json = await res.json();
  const text = (json.choices?.[0]?.message?.content ?? '').trim();
  const keep = !text.toUpperCase().startsWith('SKIP');
  const usage = json.usage ? `(${json.usage.prompt_tokens} in / ${json.usage.completion_tokens} out tokens)` : '';
  console.log(`  Response: "${text}" → ${keep ? 'KEEP ✓' : 'SKIP ✓'} ${usage}`);
}

for (const t of TESTS) {
  await preflight(t.url, t.label);
}
console.log('\nDone.');
