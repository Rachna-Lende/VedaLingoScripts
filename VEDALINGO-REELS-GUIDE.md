# VedaLingo Reels — Complete Production Guide

> This document is the single source of truth for generating all VedaLingo short-form content.  
> Every reel — past, present, and future — is produced from the files described here.  
> A Windows Scheduled Task runs `run-next-batch.js` every 89 days automatically.  
> **You will never run out of content as long as this folder exists.**

---

## 1. What the System Produces

- **Format:** 9:16 vertical video (764 × 1600 px), MP4, suitable for Instagram Reels and YouTube Shorts
- **Duration:** 10–22 seconds per reel (determined by TTS voiceover length)
- **Volume:** 2 reels per day × 90 days = **180 reels per batch**
- **Audio:** Microsoft Neural TTS voiceover (en-IN-NeerjaNeural) + sitar background music at 35% volume
- **Content types:** Sanskrit Word · Grammar Concept · Mythology Story, rotating so each type appears equally

---

## 2. Project Location

```
C:\SanskritClaude\vedalingo-reels\
```

### Key Files

| File | Purpose |
|------|---------|
| `pipeline.js` | Master script — screenshots + TTS + video assembly for any day range |
| `content-data.js` | All 90-day content: 60 words, 60 grammar entries, 60 mythology stories |
| `reel-template.js` | HTML generator for the 4-screen reel layout |
| `bg.png` | Background image (manuscript books, lotus mandala, gold border) |
| `run-next-batch.js` | Auto-batch runner — called by Windows Task Scheduler every 89 days |
| `VEDALINGO-REELS-GUIDE.md` | This file |

### Output Location

```
C:\SanskritClaude\vedalingo-reels\output\
  batch-1\          ← Days 1–90  (first 3 months)
    day-001\
      Day001_R1_word_viveka.mp4
      Day001_R2_grammar_three-numbers.mp4
    day-002\
    ...
    day-090\
  batch-2\          ← Days 1–90, fresh content cycle (generated on day 89)
  batch-3\
  ...
```

Each batch folder is self-contained. Upload in order: batch-1 day-001 on calendar day 1, batch-2 day-001 on calendar day 91, and so on.

---

## 3. Background Music — Sitar

**File used:** `C:\Users\Rachna Lende\Downloads\44231991-sitar-215153.mp3`

**Source:** [Pixabay](https://pixabay.com) — search "sitar" — royalty-free, no attribution required.  
The specific file is track ID 44231991. If it is ever lost, search Pixabay for "sitar meditation" and download any track under Creative Commons or Pixabay License.

**How music is mixed in:**
- Music loops infinitely (`-stream_loop -1`) so it never cuts out mid-reel
- Volume ratio: voiceover 100%, sitar 35%
- Filter used: `amerge + pan` (bypasses ffmpeg normalization — keeps exact volumes)

If you want to change the sitar track, update the `SITAR` constant at the top of `pipeline.js`:
```js
const SITAR = 'C:\\path\\to\\your\\new-track.mp3';
```

---

## 4. The 4-Screen Reel Template

Every reel is exactly 4 screens rendered from HTML and assembled into one video:

| Screen | Name | Content | Voiceover reads |
|--------|------|---------|----------------|
| S1 | Hook | Curiosity question | `data.hook` |
| S2 | Sanskrit | Devanagari script + transliteration | `data.voice2` (meaning, never the Sanskrit word itself) |
| S3 | Meaning | English explanation | `data.voice3` |
| S4 | Takeaway | Life lesson + Veda Lingo logo | `data.voice4` + "Veda Lingo." |

**Why Sanskrit words are NOT spoken:** TTS mispronounces Sanskrit. The Devanagari script is shown visually on S2; `voice2` speaks the meaning or context instead.

**Why "Veda Lingo" not "VedaLingo":** The space forces Microsoft Neural TTS to stress each syllable correctly — "Vay-da Ling-go" not "veda-LINGO".

### Visual Design (reel-template.js)

- **Background:** `bg.png` (manuscript texture, lotus mandala, Sanskrit watermark, diamond border)
- **Dark scrim:** `rgba(6, 2, 1, 0.30)` overlay keeps text legible without killing the background
- **Sanskrit font:** Tiro Devanagari Hindi (Google Fonts)
- **English font:** Cormorant Garamond (Google Fonts)
- **Sanskrit size:** 136px (1 line) · 110px (2 lines) · 76px (3+ lines)
- **Glow effect:** `0 0 28px rgba(255,215,80,0.50), 0 0 65px rgba(220,155,20,0.22)`
- **Canvas:** 763px wide × 1600px tall, rendered at 1:1 scale by Puppeteer, then scaled to 764px in ffmpeg (must be even for libx264)

---

## 5. Content Structure

Each content entry in `content-data.js` looks like this:

```js
{
  id:         'viveka',                          // unique slug used in filename
  devanagari: 'विवेक',                           // shown on Screen 2 (use \n for line breaks)
  translit:   'viveka',                          // shown below Devanagari
  screenText: 'discernment · the wisdom to see what truly matters',  // shown on Screen 3
  hook:       'What separates wisdom from mere knowledge?',           // S1 voiceover
  voice2:     'Viveka is the Sanskrit word for discernment.',         // S2 voiceover (NOT the Sanskrit word)
  voice3:     'It is the ability to see what is real ...',            // S3 voiceover
  voice4:     'One moment of viveka can change everything.',          // S4 voiceover (before "Veda Lingo.")
}
```

### Content Rotation (90-day schedule)

The 90 days repeat a 3-day pattern 30 times:
- **Day mod 0:** Reel 1 = Word, Reel 2 = Grammar
- **Day mod 1:** Reel 1 = Grammar, Reel 2 = Myth
- **Day mod 2:** Reel 1 = Myth, Reel 2 = Word

This ensures each type appears exactly 60 times across 90 days (2 per type per 3-day cycle).

### Adding New Content for Future Batches

Open `content-data.js` and add entries to `WORDS`, `GRAMMAR`, or `MYTHS` arrays using the format above.  
Each array needs exactly **60 entries** per 90-day batch. The batch runner (`run-next-batch.js`) automatically picks the correct 60 from an extended pool using a batch offset.

**Content guidelines (non-negotiable):**
- No sectarian claims or deity comparisons
- No politically sensitive interpretations
- Focus on: language etymology, universal values, character stories, philosophical concepts
- Always respectful — content must not hurt any religious sentiment

---

## 6. Technology Stack

| Tool | Version/Notes | Install |
|------|--------------|---------|
| Node.js | v24+ | Already installed |
| Puppeteer | `npm install puppeteer` | Takes screenshots of HTML |
| msedge-tts | `npm install msedge-tts` | Free Microsoft TTS, no API key needed |
| @ffmpeg-installer/ffmpeg | `npm install @ffmpeg-installer/ffmpeg` | Bundled ffmpeg binary |
| @ffprobe-installer/ffprobe | `npm install @ffprobe-installer/ffprobe` | Audio duration detection |

**No API keys. No paid services. Runs 100% offline after npm install.**

### Why execFileSync not execSync

ffmpeg filter chains contain `|` characters (e.g., `pan=mono|c0=c0+c1`). Windows shell intercepts `|` as a pipe operator. `execFileSync` passes arguments as an array directly to the binary, bypassing the shell entirely.

---

## 7. Running the Pipeline Manually

```powershell
# From C:\SanskritClaude\vedalingo-reels\

# Generate all 90 days (180 reels)
node pipeline.js

# Generate specific days only
node pipeline.js 1 3        # days 1–3
node pipeline.js 45         # day 45 only

# Resume after interruption — already-done reels are skipped automatically
node pipeline.js

# Generate next batch manually
node run-next-batch.js
```

**Time estimate:** ~2–3 hours for a full 90-day batch (180 reels) on a standard laptop.  
The pipeline is resumable — if interrupted, re-run the same command and it skips completed reels.

---

## 8. Automatic Scheduling — Never Run Out of Content

A Windows Scheduled Task runs `run-next-batch.js` every **89 days** — one day before the current batch ends — so the next 90 days are ready before you need them.

### What run-next-batch.js Does

1. Reads `batch-state.json` to find which batch number is next
2. Creates `output/batch-N/` folder
3. Runs the pipeline using a content offset (so batch 2 uses entries 60–119, batch 3 uses 120–179, etc.)
4. Updates `batch-state.json` with the new batch number and date
5. Writes a log to `batch-logs/batch-N.log`

### Scheduled Task Details

- **Task name:** `VedaLingo-NextBatch`
- **Trigger:** Every 89 days at 9:00 AM, starting from the date of first batch completion
- **Action:** `node C:\SanskritClaude\vedalingo-reels\run-next-batch.js`
- **Log:** `C:\SanskritClaude\vedalingo-reels\batch-logs\`

To verify the task exists:
```powershell
schtasks /query /tn "VedaLingo-NextBatch" /fo LIST
```

To run it immediately (test):
```powershell
schtasks /run /tn "VedaLingo-NextBatch"
```

To delete and recreate (if needed):
```powershell
schtasks /delete /tn "VedaLingo-NextBatch" /f
node C:\SanskritClaude\vedalingo-reels\setup-schedule.js
```

---

## 9. If Something Breaks

### "Cannot find module" on npm packages
```powershell
cd C:\SanskritClaude\vedalingo-reels
npm install
```

### Sitar music file missing
Download a new sitar track from [Pixabay](https://pixabay.com/music/?q=sitar), update the `SITAR` path in `pipeline.js`.

### TTS fails / "No audio data received"
Microsoft Edge TTS is a free cloud service. Check internet connection. The `toFile(dir, text, options)` signature is: first arg = directory, second = plain text (no SSML), third = options.

### ffmpeg "width not divisible by 2"
The `-vf scale=764:1600` in `makeClip()` fixes this. Do not change to 763.

### Puppeteer can't load fonts (screenshots show boxes instead of Devanagari)
The pipeline waits 2500ms after page load for Google Fonts. If on slow internet, increase the timeout in `pipeline.js` around line 113: `await new Promise(r => setTimeout(r, 5000))`.

### Pipeline crashed mid-run
Just re-run `node pipeline.js` or `node run-next-batch.js`. Every completed reel is checked by filename — already-done work is never repeated.

---

## 10. Instagram + YouTube Shorts Automation

Fully automated. Two Claude scheduled tasks run every day — no action needed.

| Task | Time | What it does |
|------|------|-------------|
| `vedalingo-morning-post` | 8:00 AM daily | Posts Reel 1 to Instagram + YouTube |
| `vedalingo-evening-post` | 6:00 PM daily | Posts Reel 2 to Instagram + YouTube |

### How it works

1. Reads `automation/post-state.json` to find today's batch + day
2. Finds the MP4 in `output/batch-N/day-XXX/`
3. Generates caption + hashtags from the content data (type-specific)
4. **Instagram:** serves video via localtunnel → Meta Graph API → publishes Reel
5. **YouTube:** uploads directly via YouTube Data API → published as Short
6. Updates state, advances to next day after evening post
7. After day 90, automatically moves to the next batch

### Caption style

- **Word reels:** `✨ Sanskrit Word of the Day` + meaning + life lesson + 15 hashtags
- **Grammar reels:** `📚 Sanskrit Grammar Gem` + insight + application + 15 hashtags
- **Myth reels:** `🌸 Sanskrit Wisdom & Story` + story + moral + 15 hashtags

### Files

```
automation/
  daily-post.js       — main runner (morning/evening arg)
  setup-auth.js       — one-time YouTube OAuth
  credentials.json    — API keys (fill in once, see SETUP-GUIDE.md)
  post-state.json     — tracks current day/batch/progress
  post-logs/          — daily logs
  lib/
    instagram.js      — Meta Graph API wrapper
    youtube.js        — YouTube Data API wrapper
    captions.js       — caption + hashtag generator
  SETUP-GUIDE.md      — step-by-step credential setup
```

### First-time setup required

Before the scheduled tasks can post, you need to fill in `automation/credentials.json` with your API keys. Full instructions: `automation/SETUP-GUIDE.md`

Takes ~30 minutes once. After that, everything is automatic forever.

---

## 11. Recreating From Scratch (Disaster Recovery)

If the entire `vedalingo-reels` folder is lost:

1. Create `C:\SanskritClaude\vedalingo-reels\`
2. `npm init -y && npm install puppeteer msedge-tts @ffmpeg-installer/ffmpeg @ffprobe-installer/ffprobe`
3. Restore these files from backup (or rebuild from this guide):
   - `bg.png` — background image (designed in image editor; stores the visual brand)
   - `content-data.js` — all 180+ content entries
   - `pipeline.js` — main orchestrator
   - `reel-template.js` — HTML layout
   - `run-next-batch.js` — scheduler runner
4. Download sitar MP3 from Pixabay (search "sitar"), update path in `pipeline.js`
5. Run `node pipeline.js` to regenerate all reels
6. Run `node setup-schedule.js` to re-register the Windows Scheduled Task

The content in `content-data.js` is the only irreplaceable asset. **Back it up to Google Drive or GitHub.**

---

*Last updated: 2026-06-25 | Batch 1 complete (180 reels, Days 1–90)*
