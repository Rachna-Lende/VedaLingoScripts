// VedaLingo Pinterest Mismatch Fixer
//
// Reads all existing pins from your Pinterest boards via API,
// compares each pin's title+description against what it SHOULD be
// (derived from content-data.js), and either:
//   --report   Prints a mismatch report (safe, read-only)
//   --fix      PATCHes each mismatched pin with correct data
//
// Usage:
//   node pinterest-fix-mismatches.js --report
//   node pinterest-fix-mismatches.js --fix
//   node pinterest-fix-mismatches.js --fix --id jaya   (fix one pin)
//
// Requires credentials.json to have:
//   pinterestAccessToken
//   pinterestBoardIds: { word, grammar, myth }

const fs    = require('fs');
const path  = require('path');
const https = require('https');

const { generatePinTitle, generatePinDescription, getPinterestBoard } = require('./automation/lib/captions');
const { WORDS, GRAMMAR, MYTHS } = require('./content-data');

const CREDS_FILE  = path.join(__dirname, 'automation', 'credentials.json');
const STATE_FILE  = path.join(__dirname, 'pinterest-pin-state.json');
const REPORT_FILE = path.join(__dirname, 'pinterest-mismatch-report.md');

// ── Args ──────────────────────────────────────────────────────────────────────
const args     = process.argv.slice(2);
const doReport = args.includes('--report');
const doFix    = args.includes('--fix');
const idFilter = args.includes('--id') ? args[args.indexOf('--id') + 1] : null;

if (!doReport && !doFix) {
  console.log(`
Pinterest Mismatch Fixer
────────────────────────
Usage:
  node pinterest-fix-mismatches.js --report         Scan boards and print mismatches
  node pinterest-fix-mismatches.js --fix            Fix all mismatched pins via API
  node pinterest-fix-mismatches.js --fix --id jaya  Fix one specific pin
`);
  process.exit(0);
}

// ── Load credentials ──────────────────────────────────────────────────────────
if (!fs.existsSync(CREDS_FILE)) {
  console.error('❌ credentials.json not found at', CREDS_FILE);
  process.exit(1);
}
const creds = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));
if (!creds.pinterestAccessToken || creds.pinterestAccessToken.startsWith('PASTE')) {
  console.error('❌ pinterestAccessToken not set in credentials.json');
  process.exit(1);
}
if (!creds.pinterestBoardIds) {
  console.error('❌ pinterestBoardIds not set in credentials.json');
  process.exit(1);
}

const TOKEN = creds.pinterestAccessToken;

// ── Content lookup map ────────────────────────────────────────────────────────
const ALL_CONTENT = [
  ...WORDS.map(c => ({ ...c, type: 'word' })),
  ...GRAMMAR.map(c => ({ ...c, type: 'grammar' })),
  ...MYTHS.map(c => ({ ...c, type: 'myth' })),
];

// Build lookup by devanagari (what Pinterest pin titles start with)
// and by translit
const byDevanagari = {};
const byTranslit   = {};
for (const c of ALL_CONTENT) {
  byDevanagari[c.devanagari] = c;
  byTranslit[c.translit.toLowerCase()] = c;
  byTranslit[c.id.toLowerCase()] = c;
}

// ── Pinterest API ─────────────────────────────────────────────────────────────
function pinterestRequest(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.pinterest.com',
      path: `/v5${endpoint}`,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 400) reject(new Error(`${res.statusCode}: ${JSON.stringify(json)}`));
          else resolve(json);
        } catch (e) {
          reject(new Error(`Parse error: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// Fetch all pins from one board (handles pagination)
async function fetchBoardPins(boardId) {
  const pins = [];
  let cursor = null;
  do {
    const qs = cursor ? `?bookmark=${encodeURIComponent(cursor)}&page_size=100` : '?page_size=100';
    const res = await pinterestRequest('GET', `/boards/${boardId}/pins${qs}`);
    if (res.items) pins.push(...res.items);
    cursor = res.bookmark || null;
  } while (cursor);
  return pins;
}

// Match a live pin to a content item
function matchPinToContent(pin) {
  const title = (pin.title || '').trim();
  const desc  = (pin.description || '').trim();

  // Try matching by devanagari in the title: "Viveka (विवेक) —"
  for (const [deva, content] of Object.entries(byDevanagari)) {
    if (title.includes(deva)) return content;
  }

  // Try matching by translit in the title (first word, capitalized)
  const firstWord = title.split(/[\s(—]/)[0].toLowerCase();
  if (byTranslit[firstWord]) return byTranslit[firstWord];

  // Try matching by devanagari in the description
  for (const [deva, content] of Object.entries(byDevanagari)) {
    if (desc.includes(deva)) return content;
  }

  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const boardTypes = ['word', 'grammar', 'myth'];
  const mismatches = [];
  let   totalPins  = 0;

  console.log('Scanning Pinterest boards...\n');

  for (const type of boardTypes) {
    const boardId = creds.pinterestBoardIds[type];
    if (!boardId) {
      console.warn(`⚠ No board ID for type "${type}" in credentials.json — skipping`);
      continue;
    }

    console.log(`Fetching board: ${getPinterestBoard(type)} (${boardId})...`);
    let pins;
    try {
      pins = await fetchBoardPins(boardId);
    } catch (e) {
      console.error(`❌ Failed to fetch board ${boardId}: ${e.message}`);
      continue;
    }
    console.log(`  Found ${pins.length} pins`);
    totalPins += pins.length;

    for (const pin of pins) {
      if (idFilter) {
        // Only check pins matching this id
        const matched = matchPinToContent(pin);
        if (!matched || matched.id !== idFilter) continue;
      }

      const content = matchPinToContent(pin);
      if (!content) {
        mismatches.push({ pin, issue: 'unmatched', correctContent: null, type });
        continue;
      }

      const correctTitle = generatePinTitle(content.type, content);
      const correctDesc  = generatePinDescription(content.type, content);

      const titleWrong = (pin.title || '').trim() !== correctTitle;
      const descWrong  = (pin.description || '').trim() !== correctDesc;

      if (titleWrong || descWrong) {
        mismatches.push({
          pin,
          content,
          type,
          correctTitle,
          correctDesc,
          currentTitle: pin.title,
          currentDesc:  pin.description,
          titleWrong,
          descWrong,
        });
      }
    }
  }

  console.log(`\nTotal pins scanned: ${totalPins}`);
  console.log(`Mismatches found:   ${mismatches.length}\n`);

  // ── Report ──────────────────────────────────────────────────────────────────
  if (doReport || !doFix) {
    const lines = [
      `# Pinterest Mismatch Report`,
      `Generated: ${new Date().toISOString()}`,
      `Total pins scanned: ${totalPins} | Mismatches: ${mismatches.length}`,
      '',
    ];

    if (mismatches.length === 0) {
      lines.push('✅ All pins are correct — no mismatches found.');
    } else {
      for (const m of mismatches) {
        lines.push(`## Pin: ${m.pin.id}`);
        lines.push(`URL: https://pinterest.com/pin/${m.pin.id}/`);
        if (m.issue === 'unmatched') {
          lines.push(`❓ Could not match to any content item`);
          lines.push(`Current title: ${m.pin.title}`);
        } else {
          lines.push(`Matched content: **${m.content.id}** (${m.content.type})`);
          if (m.titleWrong) {
            lines.push(`\n**TITLE WRONG**`);
            lines.push(`Current:  ${m.currentTitle}`);
            lines.push(`Correct:  ${m.correctTitle}`);
          }
          if (m.descWrong) {
            lines.push(`\n**DESCRIPTION WRONG**`);
            lines.push(`Current:  ${(m.currentDesc || '').slice(0, 120)}...`);
            lines.push(`Correct:  ${m.correctDesc.slice(0, 120)}...`);
          }
        }
        lines.push('');
      }
    }

    fs.writeFileSync(REPORT_FILE, lines.join('\n'));
    console.log(`Report saved: ${REPORT_FILE}`);
    console.log(lines.join('\n'));
  }

  // ── Fix ──────────────────────────────────────────────────────────────────────
  if (doFix && mismatches.length > 0) {
    console.log('\nFixing mismatched pins...\n');
    let fixed = 0, failed = 0;

    // Load state to update pin IDs
    const state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : { pins: {} };

    for (const m of mismatches) {
      if (m.issue === 'unmatched') {
        console.log(`⚠ Skipping unmatched pin ${m.pin.id} — cannot determine correct content`);
        continue;
      }

      try {
        console.log(`Fixing: ${m.content.id} (pin ${m.pin.id})...`);
        await pinterestRequest('PATCH', `/pins/${m.pin.id}`, {
          title:       m.correctTitle,
          description: m.correctDesc,
        });

        // Update state file
        state.pins[m.content.id] = {
          ...state.pins[m.content.id],
          pinId:     m.pin.id,
          title:     m.correctTitle,
          updatedAt: new Date().toISOString(),
        };

        console.log(`  ✅ Fixed: ${m.content.id}`);
        fixed++;

        // Rate limit
        await new Promise(r => setTimeout(r, 1000));
      } catch (e) {
        console.error(`  ❌ Failed ${m.pin.id}: ${e.message}`);
        failed++;
      }
    }

    state.lastFixRun = new Date().toISOString();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

    console.log(`\nDone — Fixed: ${fixed} | Failed: ${failed}`);
    if (failed > 0) {
      console.log('Note: PATCH requires Standard API access. If you see 403 errors, Standard access is still pending.');
    }
  }

  if (mismatches.length === 0) {
    console.log('✅ All pins already have correct titles and descriptions.');
  }
})().catch(err => {
  console.error('FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
