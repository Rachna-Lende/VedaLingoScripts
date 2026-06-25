// VedaLingo — Auto Batch Runner
// Called by Windows Task Scheduler every 89 days.
// Generates the next 90-day block of reels (180 videos) into output/batch-N/
// and updates batch-state.json so state is never lost.
//
// Content cycling: content-data.js holds a large pool. Each batch draws a
// different slice of 60 words, 60 grammar, 60 myths using a pool offset.
// When the pool is exhausted, it cycles back to the beginning (content repeats
// after enough batches, which is fine — audience renews every 3 months).

const puppeteer   = require('puppeteer');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const { execFileSync } = require('child_process');
const ffmpegPath  = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const { reelHTML }      = require('./reel-template');
const { WORDS, GRAMMAR, MYTHS } = require('./content-data');
const path = require('path');
const fs   = require('fs');

// ── Paths ───────────────────────────────────────────────────────────────────
const ROOT       = __dirname;
const STATE_FILE = path.join(ROOT, 'batch-state.json');
const LOG_DIR    = path.join(ROOT, 'batch-logs');
const SITAR      = 'C:\\Users\\Rachna Lende\\Downloads\\44231991-sitar-215153.mp3';
const MUSIC      = fs.existsSync(SITAR) ? SITAR : null;
const VOICE      = 'en-IN-NeerjaNeural';
const SCREENS    = ['s1', 's2', 's3', 's4'];

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// ── Load state ───────────────────────────────────────────────────────────────
const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
const batchNum   = state.nextBatch;
const batchLabel = `batch-${batchNum}`;
const BASE       = path.join(ROOT, 'output', batchLabel);

// ── Log setup ────────────────────────────────────────────────────────────────
const logFile = path.join(LOG_DIR, `${batchLabel}.log`);
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}`;
  console.log(line);
  fs.appendFileSync(logFile, line + '\n');
}

log(`=== VedaLingo Batch ${batchNum} ===`);
log(`Music: ${MUSIC || 'NONE — sitar file not found at ' + SITAR}`);
if (!MUSIC) {
  log('WARNING: Update SITAR path in run-next-batch.js and pipeline.js');
}

// ── Content slice for this batch ─────────────────────────────────────────────
// Each batch uses a different 60-entry window from the pool.
// Pool can be extended in content-data.js at any time.
const POOL_SIZE = 60; // entries per type per batch
const offset    = ((batchNum - 1) * POOL_SIZE) % Math.max(WORDS.length, GRAMMAR.length, MYTHS.length);

function slice(arr) {
  // Wrap around if pool smaller than needed
  const out = [];
  for (let i = 0; i < POOL_SIZE; i++) out.push(arr[(offset + i) % arr.length]);
  return out;
}

const words   = slice(WORDS);
const grammar = slice(GRAMMAR);
const myths   = slice(MYTHS);

log(`Content offset: ${offset} (words ${offset}–${(offset+59) % WORDS.length}, grammar, myths)`);

// ── Schedule (90-day pattern, 30 cycles × 3 days) ────────────────────────────
function buildSchedule() {
  const schedule = [];
  let wi = 0, gi = 0, mi = 0;
  for (let cycle = 0; cycle < 30; cycle++) {
    // Day A: Word + Grammar
    schedule.push({ day: schedule.length + 1,
      reel1: { type: 'word',    data: words[wi++]   },
      reel2: { type: 'grammar', data: grammar[gi++] } });
    // Day B: Grammar + Myth
    schedule.push({ day: schedule.length + 1,
      reel1: { type: 'grammar', data: grammar[gi++] },
      reel2: { type: 'myth',    data: myths[mi++]   } });
    // Day C: Myth + Word
    schedule.push({ day: schedule.length + 1,
      reel1: { type: 'myth',    data: myths[mi++]   },
      reel2: { type: 'word',    data: words[wi++]   } });
  }
  return schedule;
}

// ── ffmpeg helpers ────────────────────────────────────────────────────────────
function ffRun(args)  { return execFileSync(ffmpegPath,  args, { stdio: 'pipe' }); }
function ffpRun(args) { return execFileSync(ffprobePath, args, { stdio: 'pipe' }); }
function fwd(p) { return p.replace(/\\/g, '/'); }

function getDuration(mp3) {
  const r = ffpRun(['-v', 'quiet', '-print_format', 'json', '-show_format', mp3]);
  return parseFloat(JSON.parse(r).format.duration) + 0.5;
}

function makeClip(img, audio, out, dur) {
  ffRun(['-y', '-loop', '1', '-i', img, '-i', audio,
    '-t', dur.toFixed(2), '-c:v', 'libx264', '-tune', 'stillimage',
    '-pix_fmt', 'yuv420p', '-vf', 'scale=764:1600',
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out]);
}

function concatClips(clips, out, tmpDir) {
  const list = path.join(tmpDir, '_list.txt');
  fs.writeFileSync(list, clips.map(c => `file '${fwd(c)}'`).join('\n'));
  ffRun(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out]);
}

function addMusic(silentReel, finalOut) {
  ffRun(['-y', '-i', silentReel, '-stream_loop', '-1', '-i', MUSIC,
    '-filter_complex', '[0:a]volume=1.0[v];[1:a]volume=0.35[m];[v][m]amerge=inputs=2,pan=mono|c0=c0+c1[a]',
    '-map', '0:v', '-map', '[a]',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-shortest', finalOut]);
}

async function generateTTS(tts, text, dest) {
  const dir = path.dirname(dest);
  await tts.toFile(dir, text, { pitch: '-4%' });
  const produced = path.join(dir, 'audio.mp3');
  if (fs.existsSync(produced)) fs.renameSync(produced, dest);
}

// ── Per-reel generator ────────────────────────────────────────────────────────
async function generateReel(browser, tts, dayNum, reelNum, entry) {
  const { type, data } = entry;
  if (!data) { log(`  ⚠ SKIP Day${dayNum} R${reelNum} — no data`); return; }

  const tag     = `Day${String(dayNum).padStart(3,'0')}_R${reelNum}_${type}_${data.id}`;
  const outDir  = path.join(BASE, `day-${String(dayNum).padStart(3,'0')}`);
  const finalMP4 = path.join(outDir, `${tag}.mp4`);

  if (fs.existsSync(finalMP4)) { log(`  ↩ skip ${tag}`); return; }

  const tmpDir = path.join(outDir, `_tmp_${tag}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    const htmlPath = path.join(tmpDir, 'reel.html');
    fs.writeFileSync(htmlPath, reelHTML(data));

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 2000, deviceScaleFactor: 1 });
    await page.goto('file:///' + fwd(htmlPath), { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise(r => setTimeout(r, 2500));

    const pngs = {};
    for (const sid of SCREENS) {
      const el  = await page.$(`#${sid}`);
      const png = path.join(tmpDir, `${sid}.png`);
      await el.screenshot({ path: png });
      pngs[sid] = png;
    }
    await page.close();

    const voices = {
      s1: data.hook,
      s2: data.voice2,
      s3: data.voice3,
      s4: `${data.voice4} Veda Lingo.`,
    };
    const mp3s = {};
    for (const sid of SCREENS) {
      const mp3 = path.join(tmpDir, `${sid}.mp3`);
      await generateTTS(tts, voices[sid], mp3);
      mp3s[sid] = mp3;
    }

    const clips = [];
    for (const sid of SCREENS) {
      const dur  = getDuration(mp3s[sid]);
      const clip = path.join(tmpDir, `${sid}.mp4`);
      makeClip(pngs[sid], mp3s[sid], clip, dur);
      clips.push(clip);
    }

    const silentReel = path.join(tmpDir, 'silent.mp4');
    concatClips(clips, silentReel, tmpDir);
    if (MUSIC) {
      addMusic(silentReel, finalMP4);
    } else {
      fs.renameSync(silentReel, finalMP4);
    }

    const mb = (fs.statSync(finalMP4).size / 1024 / 1024).toFixed(1);
    log(`  ✅ ${tag}  (${mb} MB)`);

  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  if (!fs.existsSync(BASE)) fs.mkdirSync(BASE, { recursive: true });

  log(`Output folder: ${BASE}`);
  log(`Starting pipeline for Batch ${batchNum} (90 days, 180 reels)...`);

  const schedule = buildSchedule();

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  });
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

  for (const { day, reel1, reel2 } of schedule) {
    const outDir = path.join(BASE, `day-${String(day).padStart(3,'0')}`);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    log(`\n── Day ${day} ──`);
    await generateReel(browser, tts, day, 1, reel1);
    await generateReel(browser, tts, day, 2, reel2);
  }

  await browser.close();

  // ── Update state ────────────────────────────────────────────────────────────
  const today  = new Date().toISOString().split('T')[0];
  const nextRun = new Date(Date.now() + 89 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  state.currentBatch = batchNum;
  state.nextBatch    = batchNum + 1;
  state.lastGenerated = today;
  state.nextScheduledRun = nextRun;
  state.batchHistory.push({
    batch: batchNum, generated: today,
    days: '1-90', reels: 180, outputFolder: batchLabel,
  });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

  log(`\n✅ Batch ${batchNum} complete — 180 reels in ${BASE}`);
  log(`Next batch (${batchNum + 1}) scheduled for: ${nextRun}`);
})().catch(err => {
  log('FATAL ERROR:', err.message);
  log(err.stack);
  process.exit(1);
});
