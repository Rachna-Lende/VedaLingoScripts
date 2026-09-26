// VedaLingo Reel Pipeline — generates all 90 days × 2 reels = 180 MP4s
// Usage:
//   node pipeline.js            → generate all 180 reels
//   node pipeline.js 1          → generate only day 1 (both reels)
//   node pipeline.js 1 3        → generate days 1–3
//   node pipeline.js --reel 2   → only reel 2 of every day
// Skips reels whose final MP4 already exists (safe to resume after interruption).

const puppeteer   = require('puppeteer');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const { execFileSync } = require('child_process');
const ffmpegPath  = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const { reelHTML }        = require('./reel-template');
const { buildSchedule }   = require('./content-data');
const path = require('path');
const fs   = require('fs');

// ── Config ─────────────────────────────────────────────────────────────
const BASE    = path.join(__dirname, 'output');
const SITAR   = 'C:\\Users\\Rachna Lende\\Downloads\\44231991-sitar-215153.mp3';
const MUSIC   = fs.existsSync(SITAR) ? SITAR
              : fs.existsSync(path.join(__dirname, 'music.mp3'))
                ? path.join(__dirname, 'music.mp3') : null;
const VOICE   = 'en-IN-NeerjaNeural';
const SCREENS = ['s1', 's2', 's3', 's4'];

if (!fs.existsSync(BASE)) fs.mkdirSync(BASE);

// ── Argument parsing ────────────────────────────────────────────────────
const args = process.argv.slice(2);
let dayFrom = 1, dayTo = 90, onlyReel = null;
if (args.includes('--reel')) onlyReel = parseInt(args[args.indexOf('--reel') + 1]);
const nums = args.filter(a => !isNaN(a)).map(Number);
if (nums.length >= 1) dayFrom = dayTo = nums[0];
if (nums.length >= 2) dayTo = nums[1];

// ── Helpers ─────────────────────────────────────────────────────────────
// execFileSync with args array — bypasses shell entirely, no quoting issues on Windows.
function ffRun(args)  { return execFileSync(ffmpegPath,  args, { stdio: 'pipe' }); }
function ffpRun(args) { return execFileSync(ffprobePath, args, { stdio: 'pipe' }); }
function fwd(p) { return p.replace(/\\/g, '/'); }

function getDuration(mp3) {
  const r = ffpRun(['-v', 'quiet', '-print_format', 'json', '-show_format', mp3]);
  return parseFloat(JSON.parse(r).format.duration) + 0.5;
}

// Clips: image + voice only. Music mixed into final reel after concat.
function makeClip(img, audio, out, dur) {
  ffRun([
    '-y',
    '-loop', '1', '-i', img,
    '-i', audio,
    '-t', dur.toFixed(2),
    '-c:v', 'libx264', '-tune', 'stillimage', '-pix_fmt', 'yuv420p',
    '-vf', 'scale=764:1600',
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
    out,
  ]);
}

function concatClips(clips, out, tmpDir) {
  const list = path.join(tmpDir, '_list.txt');
  // Absolute forward-slash paths — execFileSync has no shell, no cwd context for ffmpeg
  fs.writeFileSync(list, clips.map(c => `file '${c.replace(/\\/g, '/')}'`).join('\n'));
  ffRun(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out]);
}

// Mix bansuri music under the voice — amerge+pan bypasses amix normalization
function addMusic(silentReel, finalOut) {
  ffRun([
    '-y',
    '-i', silentReel,
    '-stream_loop', '-1', '-i', MUSIC,
    '-filter_complex', '[0:a]volume=1.0[v];[1:a]volume=0.35[m];[v][m]amerge=inputs=2,pan=mono|c0=c0+c1[a]',
    '-map', '0:v',
    '-map', '[a]',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-shortest',
    finalOut,
  ]);
}

async function generateTTS(tts, text, dest) {
  const dir = path.dirname(dest);
  await tts.toFile(dir, text, { pitch: '-4%' });
  const produced = path.join(dir, 'audio.mp3');
  if (fs.existsSync(produced)) fs.renameSync(produced, dest);
}

// ── Per-reel generator ──────────────────────────────────────────────────
async function generateReel(browser, tts, dayNum, reelNum, entry) {
  const { type, data } = entry;
  const tag    = `Day${String(dayNum).padStart(3,'0')}_R${reelNum}_${type}_${data.id}`;
  const outDir = path.join(BASE, `day-${String(dayNum).padStart(3,'0')}`);
  const finalMP4 = path.join(outDir, `${tag}.mp4`);

  if (fs.existsSync(finalMP4)) {
    console.log(`  ↩ skip  ${tag}  (already done)`);
    return;
  }

  const tmpDir = path.join(outDir, `_tmp_${tag}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    // 1 — Generate HTML + screenshot 4 screens
    const htmlPath = path.join(tmpDir, 'reel.html');
    fs.writeFileSync(htmlPath, reelHTML(data));

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 2000, deviceScaleFactor: 1 });
    await page.goto('file:///' + fwd(htmlPath), { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise(r => setTimeout(r, 2500)); // font load

    const pngs = {};
    for (const sid of SCREENS) {
      const el = await page.$(`#${sid}`);
      const png = path.join(tmpDir, `${sid}.png`);
      await el.screenshot({ path: png });
      pngs[sid] = png;
    }
    await page.close();

    // 2 — Generate voiceovers (screen 2 voice = meaning, not Sanskrit word)
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

    // 3 — Build 4 clips
    const clips = [];
    for (const sid of SCREENS) {
      const dur  = getDuration(mp3s[sid]);
      const clip = path.join(tmpDir, `${sid}.mp4`);
      process.stdout.write(`    ${sid}: ${dur.toFixed(1)}s `);
      makeClip(pngs[sid], mp3s[sid], clip, dur);
      process.stdout.write('✓  ');
      clips.push(clip);
    }
    console.log();

    // 4 — Concatenate clips → silent reel, then mix in bansuri music
    const silentReel = path.join(tmpDir, 'silent.mp4');
    concatClips(clips, silentReel, tmpDir);
    if (MUSIC) {
      addMusic(silentReel, finalMP4);
    } else {
      fs.renameSync(silentReel, finalMP4);
    }
    const mb = (fs.statSync(finalMP4).size / 1024 / 1024).toFixed(1);
    console.log(`  ✅ ${tag}  (${mb} MB)`);

  } finally {
    // Clean up tmp dir
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ── Main ────────────────────────────────────────────────────────────────
(async () => {
  const schedule = buildSchedule();

  console.log(`\n🎬 VedaLingo Pipeline`);
  console.log(`   Days ${dayFrom}–${dayTo}  |  ${MUSIC ? '🎵 music on' : 'no music'}  |  voice: ${VOICE}\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  });

  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

  let done = 0, skipped = 0;
  for (const { day, reel1, reel2 } of schedule) {
    if (day < dayFrom || day > dayTo) continue;
    const outDir = path.join(BASE, `day-${String(day).padStart(3,'0')}`);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    console.log(`\n── Day ${day} ─────────────────────────`);

    if (!onlyReel || onlyReel === 1) {
      const before = done;
      await generateReel(browser, tts, day, 1, reel1);
      if (done > before) done++; else skipped++;
    }
    if (!onlyReel || onlyReel === 2) {
      const before = done;
      await generateReel(browser, tts, day, 2, reel2);
      if (done > before) done++; else skipped++;
    }
  }

  await browser.close();

  console.log(`\n✅ Done — ${done} generated, ${skipped} skipped`);
  console.log(`   Output: ${BASE}`);
})().catch(err => { console.error(err); process.exit(1); });
