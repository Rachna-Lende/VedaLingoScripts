// Uploads days 57-90 R1+R2 videos to Cloudinary and saves URLs to cloudinary-manifest.json
// Run once: node upload-to-cloudinary.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CLOUD_NAME  = 'da0nxrtc6';
const API_KEY     = '932847491832242';
const API_SECRET  = 'sRwOq_vtfEu6oadqmGkJ04GMW70';
const UPLOAD_PRESET = 'vedalingo_reels';
const OUTPUT_DIR  = path.join(__dirname, 'output');
const MANIFEST    = path.join(__dirname, 'cloudinary-manifest.json');

const START_DAY = 57;
const END_DAY   = 90;

// Load existing manifest if any
let manifest = {};
if (fs.existsSync(MANIFEST)) {
  manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  console.log(`Loaded existing manifest with ${Object.keys(manifest).length} entries`);
}

async function uploadVideo(filePath, publicId) {
  const fileBuffer = fs.readFileSync(filePath);
  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer]), path.basename(filePath));
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('public_id', publicId);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upload failed: ${err}`);
  }

  const data = await res.json();
  return data.secure_url;
}

async function main() {
  for (let day = START_DAY; day <= END_DAY; day++) {
    const dayPad = String(day).padStart(3, '0');
    const dayFolder = path.join(OUTPUT_DIR, `day-${dayPad}`);

    if (!fs.existsSync(dayFolder)) {
      console.warn(`  ⚠️  day-${dayPad} folder missing, skipping`);
      continue;
    }

    const files = fs.readdirSync(dayFolder).filter(f => f.endsWith('.mp4'));

    for (const filename of files) {
      const reel = filename.includes('_R1_') ? 'R1' : 'R2';
      const key  = `day${dayPad}_${reel}`;

      if (manifest[key]) {
        console.log(`  ✅ ${key} already uploaded → ${manifest[key]}`);
        continue;
      }

      const filePath = path.join(dayFolder, filename);
      const publicId = `vedalingo/${key}_${Date.now()}`;

      console.log(`  ⬆️  Uploading ${filename}...`);
      try {
        const url = await uploadVideo(filePath, publicId);
        manifest[key] = url;
        // Save after every upload so we don't lose progress on interruption
        fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
        console.log(`  ✅ ${key} → ${url}`);
      } catch (e) {
        console.error(`  ❌ ${key} failed: ${e.message}`);
      }
    }

    console.log(`Day ${day} done`);
  }

  console.log(`\n✅ Manifest saved to ${MANIFEST}`);
  console.log(`Total entries: ${Object.keys(manifest).length}`);
}

main().catch(console.error);
