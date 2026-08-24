// VedaLingo Pinterest Auto-Pin
// Creates or updates Pinterest pins so title, description, and board are always
// derived from the SAME content object — eliminating description mismatches.
//
// Usage:
//   node pinterest-auto-pin.js --dry-run          Preview what would be posted
//   node pinterest-auto-pin.js --create-all       Create pins for all content
//   node pinterest-auto-pin.js --update-existing  Update existing pins (requires pin IDs)
//   node pinterest-auto-pin.js --type word        Only process word-type content
//   node pinterest-auto-pin.js --id viveka        Process a single content item by id
//
// Prerequisites:
//   1. Pinterest Standard API access (currently pending)
//   2. credentials.json must have: pinterestAccessToken, pinterestBoardIds
//   3. The output/ folder must contain generated reel thumbnails for each item

const fs   = require('fs');
const path = require('path');
const https = require('https');

const { generatePinTitle, generatePinDescription, getPinterestBoard } = require('./automation/lib/captions');
const { WORDS, GRAMMAR, MYTHS } = require('./content-data');

// ── Paths ─────────────────────────────────────────────────────────────────────
const CREDS_FILE    = path.join(__dirname, 'automation', 'credentials.json');
const STATE_FILE    = path.join(__dirname, 'pinterest-pin-state.json');
const LOG_DIR       = path.join(__dirname, 'automation', 'post-logs');
const OUTPUT_DIR    = path.join(__dirname, 'output');

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// ── Logger ────────────────────────────────────────────────────────────────────
const today   = new Date().toISOString().split('T')[0];
const logFile = path.join(LOG_DIR, `pinterest-${today}.log`);
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}`;
  console.log(line);
  fs.appendFileSync(logFile, line + '\n');
}

// ── Args ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isDryRun        = args.includes('--dry-run');
const doCreateAll     = args.includes('--create-all');
const doUpdateExisting = args.includes('--update-existing');
const typeFilter      = args.includes('--type') ? args[args.indexOf('--type') + 1] : null;
const idFilter        = args.includes('--id')   ? args[args.indexOf('--id') + 1]   : null;

if (!isDryRun && !doCreateAll && !doUpdateExisting) {
  console.log(`
VedaLingo Pinterest Auto-Pin
────────────────────────────
Usage:
  node pinterest-auto-pin.js --dry-run           Preview what would be posted (safe)
  node pinterest-auto-pin.js --create-all        Create pins for all content
  node pinterest-auto-pin.js --update-existing   Update existing pin titles/descriptions
  node pinterest-auto-pin.js --type word         Filter by type: word | grammar | myth
  node pinterest-auto-pin.js --id viveka         Single content item by id

Examples:
  node pinterest-auto-pin.js --dry-run --type word
  node pinterest-auto-pin.js --create-all --id viveka
  node pinterest-auto-pin.js --update-existing
`);
  process.exit(0);
}

// ── Load credentials ──────────────────────────────────────────────────────────
let creds = {};
if (!isDryRun) {
  if (!fs.existsSync(CREDS_FILE)) {
    console.error('❌ credentials.json not found at', CREDS_FILE);
    process.exit(1);
  }
  creds = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));
  if (!creds.pinterestAccessToken || creds.pinterestAccessToken.startsWith('PASTE')) {
    console.error('❌ credentials.json missing pinterestAccessToken');
    console.error('   Add it under: "pinterestAccessToken": "YOUR_TOKEN_HERE"');
    process.exit(1);
  }
  if (!creds.pinterestBoardIds) {
    console.error('❌ credentials.json missing pinterestBoardIds');
    console.error('   Add: "pinterestBoardIds": { "word": "BOARD_ID", "grammar": "BOARD_ID", "myth": "BOARD_ID" }');
    process.exit(1);
  }
}

// ── Load/init pin state ───────────────────────────────────────────────────────
let pinState = { pins: {}, lastRun: null };
if (fs.existsSync(STATE_FILE)) {
  pinState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

// ── Build content list ────────────────────────────────────────────────────────
const ALL_CONTENT = [
  ...WORDS.map(c => ({ ...c, type: 'word' })),
  ...GRAMMAR.map(c => ({ ...c, type: 'grammar' })),
  ...MYTHS.map(c => ({ ...c, type: 'myth' })),
];

let toProcess = ALL_CONTENT;
if (typeFilter) toProcess = toProcess.filter(c => c.type === typeFilter);
if (idFilter)   toProcess = toProcess.filter(c => c.id === idFilter);

// ── Find thumbnail for a content item ────────────────────────────────────────
// Thumbnails are the first frame / cover image from generated reels.
// Filenames: Day001_R1_word_viveka.mp4 → we look for Day*_R1_word_viveka.jpg/png
function findThumbnail(type, id) {
  // Walk output directory recursively for a matching file
  const candidates = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      // Match: _word_viveka.jpg / _word_viveka.png / _word_viveka_thumb.jpg
      if (entry.name.includes(`_${type}_${id}`) && /\.(jpg|jpeg|png|webp)$/i.test(entry.name)) {
        candidates.push(full);
      }
    }
  }
  walk(OUTPUT_DIR);
  return candidates[0] || null;
}

// ── Pinterest API helpers ─────────────────────────────────────────────────────
function pinterestRequest(method, endpoint, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.pinterest.com',
      path: `/v5${endpoint}`,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
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
          if (res.statusCode >= 400) reject(new Error(`Pinterest API ${res.statusCode}: ${JSON.stringify(json)}`));
          else resolve(json);
        } catch (e) {
          reject(new Error(`Pinterest parse error: ${data}`));
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function getBoardId(type) {
  return creds.pinterestBoardIds[type];
}

async function createPin(content, boardId) {
  const title = generatePinTitle(content.type, content);
  const description = generatePinDescription(content.type, content);
  const thumb = findThumbnail(content.type, content.id);

  const body = {
    board_id: boardId,
    title,
    description,
    link: 'https://vedalingo.in',
    media_source: thumb
      ? { source_type: 'image_base64', content_type: 'image/jpeg', data: fs.readFileSync(thumb).toString('base64') }
      : { source_type: 'image_url', url: 'https://vedalingo.in/og-image.png' },
  };

  return pinterestRequest('POST', '/pins', body, creds.pinterestAccessToken);
}

async function updatePin(pinId, content) {
  const title = generatePinTitle(content.type, content);
  const description = generatePinDescription(content.type, content);

  // Pinterest API v5 PATCH /pins/{pin_id} — only title and description can be updated
  return pinterestRequest('PATCH', `/pins/${pinId}`, { title, description }, creds.pinterestAccessToken);
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  log(`=== VedaLingo Pinterest Auto-Pin ===`);
  log(`Mode: ${isDryRun ? 'DRY RUN' : doCreateAll ? 'CREATE ALL' : 'UPDATE EXISTING'}`);
  log(`Items to process: ${toProcess.length}${typeFilter ? ` (type: ${typeFilter})` : ''}${idFilter ? ` (id: ${idFilter})` : ''}`);

  let created = 0, updated = 0, skipped = 0, failed = 0;

  for (const content of toProcess) {
    const title       = generatePinTitle(content.type, content);
    const description = generatePinDescription(content.type, content);
    const board       = getPinterestBoard(content.type);
    const thumb       = findThumbnail(content.type, content.id);

    if (isDryRun) {
      console.log(`\n────────────────────────────`);
      console.log(`ID:    ${content.id} (${content.type})`);
      console.log(`Board: ${board}`);
      console.log(`Title: ${title}`);
      console.log(`Desc:  ${description.slice(0, 120)}...`);
      console.log(`Thumb: ${thumb || '⚠ no thumbnail found — will use fallback URL'}`);
      skipped++;
      continue;
    }

    const existingPinId = pinState.pins[content.id]?.pinId;

    try {
      if (doUpdateExisting && existingPinId) {
        log(`Updating pin ${existingPinId} for ${content.id}...`);
        await updatePin(existingPinId, content);
        pinState.pins[content.id] = { ...pinState.pins[content.id], title, updatedAt: new Date().toISOString() };
        log(`✅ Updated: ${content.id}`);
        updated++;
      } else if (doCreateAll && !existingPinId) {
        const boardId = await getBoardId(content.type);
        if (!boardId) {
          log(`⚠ No board ID for type ${content.type} — skipping ${content.id}`);
          skipped++;
          continue;
        }
        log(`Creating pin for ${content.id} on board ${board}...`);
        const result = await createPin(content, boardId);
        pinState.pins[content.id] = { pinId: result.id, title, board, createdAt: new Date().toISOString() };
        log(`✅ Created pin ${result.id}: ${content.id}`);
        created++;

        // Rate limit: Pinterest allows ~10 pins/min on Standard access
        await new Promise(r => setTimeout(r, 6500));
      } else {
        log(`⏭ Skipping ${content.id} (${existingPinId ? 'already exists, use --update-existing' : 'use --create-all'})`);
        skipped++;
      }
    } catch (e) {
      log(`❌ Failed ${content.id}: ${e.message}`);
      failed++;
    }
  }

  if (!isDryRun) {
    pinState.lastRun = new Date().toISOString();
    fs.writeFileSync(STATE_FILE, JSON.stringify(pinState, null, 2));
  }

  log(`\n=== Done ===`);
  log(`Created: ${created} | Updated: ${updated} | Skipped: ${skipped} | Failed: ${failed}`);
  if (isDryRun) log('(Dry run — no changes made. Remove --dry-run to execute.)');
})().catch(err => {
  log('FATAL:', err.message);
  log(err.stack);
  process.exit(1);
});
