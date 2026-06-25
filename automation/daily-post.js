// VedaLingo Daily Post — called by Windows Task Scheduler
// Usage:
//   node daily-post.js morning   → posts Reel 1 (8 AM)
//   node daily-post.js evening   → posts Reel 2 (6 PM)
//
// Each call posts one reel to both Instagram and YouTube Shorts,
// then advances the state. After 90 days it moves to the next batch.

const fs   = require('fs');
const path = require('path');

const { postReel }           = require('./lib/instagram');
const { uploadShort }        = require('./lib/youtube');
const { generateCaption, generateYouTubeTitle, generateYouTubeTags } = require('./lib/captions');

// ── Paths ────────────────────────────────────────────────────────────────────
const ROOT         = path.join(__dirname, '..');
const STATE_FILE   = path.join(__dirname, 'post-state.json');
const CREDS_FILE   = path.join(__dirname, 'credentials.json');
const LOG_DIR      = path.join(__dirname, 'post-logs');
const OUTPUT_DIR   = path.join(ROOT, 'output');

// Content pool (all entries from all batches)
const { WORDS, GRAMMAR, MYTHS } = require('../content-data');
const ALL_CONTENT = [...WORDS, ...GRAMMAR, ...MYTHS];

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// ── Logger ───────────────────────────────────────────────────────────────────
const today   = new Date().toISOString().split('T')[0];
const logFile = path.join(LOG_DIR, `${today}.log`);
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}`;
  console.log(line);
  fs.appendFileSync(logFile, line + '\n');
}

// ── Parse reel slot from args ─────────────────────────────────────────────────
const slot = process.argv[2]; // 'morning' or 'evening'
if (!['morning', 'evening'].includes(slot)) {
  console.error('Usage: node daily-post.js morning|evening');
  process.exit(1);
}
const reelIndex = slot === 'morning' ? 1 : 2; // R1 or R2

// ── Load credentials ──────────────────────────────────────────────────────────
const creds = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));
if (creds.instagramAccessToken.startsWith('PASTE')) {
  log('❌ credentials.json not filled in. See SETUP-GUIDE.md');
  process.exit(1);
}

// ── Load + update state ───────────────────────────────────────────────────────
const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));

// ── Find today's video file ───────────────────────────────────────────────────
function findReelFile(batchNum, dayNum, reelNum) {
  const batchFolder = batchNum === 1 ? '' : `batch-${batchNum}/`;
  const dayFolder   = `day-${String(dayNum).padStart(3, '0')}`;
  const dir         = path.join(OUTPUT_DIR, batchFolder ? `batch-${batchNum}` : '', dayFolder);

  if (!fs.existsSync(dir)) {
    // Fallback: batch-1 may not have "batch-1" subfolder (original pipeline)
    const altDir = path.join(OUTPUT_DIR, dayFolder);
    if (fs.existsSync(altDir)) {
      return fs.readdirSync(altDir).find(f => f.includes(`_R${reelNum}_`) && f.endsWith('.mp4'))
        ? path.join(altDir, fs.readdirSync(altDir).find(f => f.includes(`_R${reelNum}_`) && f.endsWith('.mp4')))
        : null;
    }
    return null;
  }
  const file = fs.readdirSync(dir).find(f => f.includes(`_R${reelNum}_`) && f.endsWith('.mp4'));
  return file ? path.join(dir, file) : null;
}

// Parse type + contentId from filename like "Day001_R1_word_viveka.mp4"
function parseFilename(filename) {
  const m = path.basename(filename).match(/Day\d+_R\d+_(\w+)_(.+)\.mp4/);
  return m ? { type: m[1], contentId: m[2] } : null;
}

function findContent(id) {
  return ALL_CONTENT.find(c => c.id === id);
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const { currentBatch, currentDay } = state;

  log(`=== VedaLingo Daily Post — ${slot} ===`);
  log(`Batch ${currentBatch}, Day ${currentDay}, Reel ${reelIndex}`);

  const videoPath = findReelFile(currentBatch, currentDay, reelIndex);
  if (!videoPath || !fs.existsSync(videoPath)) {
    log(`❌ Video file not found for Batch ${currentBatch} Day ${currentDay} R${reelIndex}`);
    log('   Check that the batch has been generated. Run: node run-next-batch.js');
    process.exit(1);
  }

  log(`Video: ${videoPath}`);

  const parsed = parseFilename(videoPath);
  if (!parsed) { log('❌ Could not parse filename'); process.exit(1); }

  const content = findContent(parsed.contentId);
  if (!content) { log(`❌ Content not found for id: ${parsed.contentId}`); process.exit(1); }

  const caption   = generateCaption(parsed.type, content);
  const ytTitle   = generateYouTubeTitle(parsed.type, content);
  const ytTags    = generateYouTubeTags(parsed.type);
  const ytDesc    = generateCaption(parsed.type, content); // reuse caption as description

  log(`Type: ${parsed.type} | Content: ${parsed.contentId}`);
  log(`Caption preview: ${caption.slice(0, 80)}...`);

  let igId = null, ytId = null;
  let igError = null, ytError = null;

  // ── Post to Instagram ──────────────────────────────────────────────────────
  try {
    log('\n--- Instagram ---');
    igId = await postReel(creds.instagramAccessToken, creds.instagramUserId, videoPath, caption, log);
  } catch (e) {
    igError = e.message;
    log(`❌ Instagram failed: ${e.message}`);
  }

  // ── Upload to YouTube ──────────────────────────────────────────────────────
  try {
    log('\n--- YouTube ---');
    ytId = await uploadShort(creds, videoPath, ytTitle, ytDesc, ytTags, log);
  } catch (e) {
    ytError = e.message;
    log(`❌ YouTube failed: ${e.message}`);
  }

  // ── Update state ───────────────────────────────────────────────────────────
  state.history.push({
    date: new Date().toISOString(),
    batch: currentBatch, day: currentDay, reel: reelIndex,
    type: parsed.type, contentId: parsed.contentId,
    instagram: igId || `ERROR: ${igError}`,
    youtube: ytId ? `https://youtu.be/${ytId}` : `ERROR: ${ytError}`,
  });

  state.lastPosted = new Date().toISOString();
  state.totalPosted += (igId || ytId) ? 1 : 0;

  // Advance state: after evening post, move to next day
  if (slot === 'evening') {
    state.reelsPostedToday = 0;
    if (currentDay >= 90) {
      state.currentBatch = currentBatch + 1;
      state.currentDay   = 1;
      log(`\n🎉 Batch ${currentBatch} complete! Moving to Batch ${currentBatch + 1}`);
    } else {
      state.currentDay = currentDay + 1;
    }
  } else {
    state.reelsPostedToday = 1;
  }

  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

  const success = igId && ytId;
  log(`\n${success ? '✅' : '⚠'} Posted — Instagram: ${igId || 'FAILED'} | YouTube: ${ytId || 'FAILED'}`);
  log(`Next: Day ${state.currentDay}, Batch ${state.currentBatch}`);

  if (!success) process.exit(1);
})().catch(err => {
  log('FATAL:', err.message);
  log(err.stack);
  process.exit(1);
});
