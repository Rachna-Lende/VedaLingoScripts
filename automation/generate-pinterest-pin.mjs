/**
 * VedaLingo Pinterest Pin Generator
 * Creates 1000x1500px aesthetic Sanskrit pins for Pinterest
 * Uploads to Cloudinary, returns URL for Pinterest API
 */

import { createCanvas } from 'canvas';
import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';

const __dirname = dirname(fileURLToPath(import.meta.url));

cloudinary.config({
  cloud_name: 'da0nxrtc6',
  api_key: process.env.CLOUDINARY_API_KEY || '932847491832242',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'sRwOq_vtfEu6oadqmGkJ04GMW70',
});

// ── Pin content — 90 days of Sanskrit wisdom ────────────────────────────────
const PIN_CONTENT = [
  { devanagari: 'अहिंसा', iast: 'ahiṃsā', meaning: 'Non-violence', fact: 'The highest dharma — Mahabharata calls it the greatest gift one can give the world.', category: 'Values' },
  { devanagari: 'धर्म', iast: 'dharma', meaning: 'Righteous duty', fact: 'From √dhṛ — to hold, sustain. Dharma is what holds the cosmos together.', category: 'Philosophy' },
  { devanagari: 'करुणा', iast: 'karuṇā', meaning: 'Compassion', fact: 'One of the four divine abodes (brahma-vihāra) in both Hindu and Buddhist traditions.', category: 'Values' },
  { devanagari: 'विद्या', iast: 'vidyā', meaning: 'Knowledge', fact: 'From √vid — to know. The root of the word "video" in Latin. Sanskrit lives in English.', category: 'Wisdom' },
  { devanagari: 'शान्ति', iast: 'śānti', meaning: 'Peace', fact: 'Chanted three times in Vedic tradition — for peace in body, mind, and spirit.', category: 'Spirituality' },
  { devanagari: 'सत्य', iast: 'satya', meaning: 'Truth', fact: 'From √as — to be. Satya literally means "that which is". Truth = existence itself.', category: 'Philosophy' },
  { devanagari: 'प्रेम', iast: 'prema', meaning: 'Divine love', fact: 'Unlike kāma (desire), prema is selfless love — the love a parent feels for a child.', category: 'Values' },
  { devanagari: 'ज्ञान', iast: 'jñāna', meaning: 'Wisdom', fact: 'The root "jñā" is the same as "gnosis" in Greek and "know" in English.', category: 'Wisdom' },
  { devanagari: 'मोक्ष', iast: 'mokṣa', meaning: 'Liberation', fact: 'The fourth and ultimate goal of life in Hindu philosophy — freedom from the cycle of rebirth.', category: 'Spirituality' },
  { devanagari: 'सूर्य', iast: 'sūrya', meaning: 'The Sun', fact: 'Cognate with Latin "sol" and English "solar". The Indo-European root *sóh₂wl̥ connects all.', category: 'Etymology' },
  { devanagari: 'नमस्ते', iast: 'namaste', meaning: 'I bow to you', fact: 'namas + te — literally "reverence to you". The divine in me recognises the divine in you.', category: 'Culture' },
  { devanagari: 'योग', iast: 'yoga', meaning: 'Union', fact: 'From √yuj — to yoke, join. The same root as English "yoke". Yoga = joining self to the divine.', category: 'Etymology' },
  { devanagari: 'अग्नि', iast: 'agni', meaning: 'Fire', fact: 'Identical to Latin "ignis" and English "ignite". One of the oldest preserved Indo-European words.', category: 'Etymology' },
  { devanagari: 'वायु', iast: 'vāyu', meaning: 'Wind, air', fact: 'Father of Hanuman in the Ramayana. The breath (prāṇa) is Vāyu within every living being.', category: 'Mythology' },
  { devanagari: 'आनन्द', iast: 'ānanda', meaning: 'Bliss', fact: 'The Taittiriya Upanishad says the ultimate reality is sat-chit-ānanda — being, consciousness, bliss.', category: 'Spirituality' },
];

// ── Colour palettes ──────────────────────────────────────────────────────────
const PALETTES = [
  { bg: '#1A0500', accent: '#D4AF37', text: '#FFF8E7', sub: '#E8C97A', name: 'Maroon Gold' },
  { bg: '#0D1B2A', accent: '#C9A84C', text: '#F5EDD6', sub: '#D4B483', name: 'Midnight Gold' },
  { bg: '#1C1C1E', accent: '#BF9642', text: '#FFFBF0', sub: '#D4AF37', name: 'Obsidian Gold' },
  { bg: '#0A0A14', accent: '#9B7FD4', text: '#F0EBFF', sub: '#C4A8FF', name: 'Deep Violet' },
  { bg: '#0F1A10', accent: '#7CAE7A', text: '#F0FFF0', sub: '#A8D5A2', name: 'Forest' },
];

// ── Draw helpers ─────────────────────────────────────────────────────────────
function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, currentY);
  return currentY;
}

// ── Decorative elements ──────────────────────────────────────────────────────
function drawMandalaCorner(ctx, cx, cy, size, color, alpha = 0.15) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((i * Math.PI) / 4);
    ctx.beginPath();
    ctx.arc(0, size * 0.4, size * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  for (let r = size * 0.2; r <= size; r += size * 0.2) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDivider(ctx, x, y, width, color) {
  const grad = ctx.createLinearGradient(x, y, x + width, y);
  grad.addColorStop(0, 'transparent');
  grad.addColorStop(0.3, color);
  grad.addColorStop(0.7, color);
  grad.addColorStop(1, 'transparent');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawOmSymbol(ctx, cx, cy, size, color) {
  // Simplified Om using text
  ctx.save();
  ctx.font = `${size}px serif`;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.12;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ॐ', cx, cy);
  ctx.restore();
}

// ── Main pin generator ───────────────────────────────────────────────────────
export function generatePin(content, paletteIndex = 0) {
  const W = 1000, H = 1500;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const P = PALETTES[paletteIndex % PALETTES.length];

  // Background gradient
  const bgGrad = ctx.createRadialGradient(W / 2, H * 0.3, 0, W / 2, H / 2, H * 0.8);
  bgGrad.addColorStop(0, shadeColor(P.bg, 30));
  bgGrad.addColorStop(1, P.bg);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Large Om watermark
  drawOmSymbol(ctx, W / 2, H * 0.42, 600, P.accent);

  // Corner mandalas
  drawMandalaCorner(ctx, 0, 0, 180, P.accent, 0.12);
  drawMandalaCorner(ctx, W, 0, 180, P.accent, 0.12);
  drawMandalaCorner(ctx, 0, H, 180, P.accent, 0.08);
  drawMandalaCorner(ctx, W, H, 180, P.accent, 0.08);

  // Top border line
  const topGrad = ctx.createLinearGradient(0, 0, W, 0);
  topGrad.addColorStop(0, 'transparent');
  topGrad.addColorStop(0.5, P.accent);
  topGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = topGrad;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.8;
  ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(W, 8); ctx.stroke();
  ctx.globalAlpha = 1;

  // Category pill
  const catText = content.category.toUpperCase();
  ctx.font = 'bold 26px sans-serif';
  const catW = ctx.measureText(catText).width + 48;
  drawRoundRect(ctx, (W - catW) / 2, 60, catW, 48, 24);
  ctx.fillStyle = P.accent + '22';
  ctx.fill();
  ctx.strokeStyle = P.accent;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.4;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = P.sub;
  ctx.textAlign = 'center';
  ctx.fillText(catText, W / 2, 93);

  // VedaLingo logo area
  ctx.font = 'bold 32px sans-serif';
  ctx.fillStyle = P.accent;
  ctx.textAlign = 'center';
  ctx.fillText('VedaLingo', W / 2, 170);
  ctx.font = '22px sans-serif';
  ctx.fillStyle = P.sub;
  ctx.globalAlpha = 0.7;
  ctx.fillText('Learn Sanskrit. Understand India.', W / 2, 205);
  ctx.globalAlpha = 1;

  drawDivider(ctx, 80, 240, W - 160, P.accent);

  // Devanagari — large centrepiece
  ctx.font = `bold 160px serif`;
  ctx.fillStyle = P.text;
  ctx.textAlign = 'center';
  ctx.shadowColor = P.accent;
  ctx.shadowBlur = 30;
  ctx.fillText(content.devanagari, W / 2, 520);
  ctx.shadowBlur = 0;

  // IAST transliteration
  ctx.font = 'italic 52px serif';
  ctx.fillStyle = P.sub;
  ctx.textAlign = 'center';
  ctx.fillText(content.iast, W / 2, 610);

  drawDivider(ctx, 120, 660, W - 240, P.accent);

  // Meaning
  ctx.font = 'bold 48px sans-serif';
  ctx.fillStyle = P.accent;
  ctx.textAlign = 'center';
  ctx.fillText(content.meaning, W / 2, 740);

  // Fact card
  drawRoundRect(ctx, 60, 790, W - 120, 380, 20);
  ctx.fillStyle = '#ffffff08';
  ctx.fill();
  ctx.strokeStyle = P.accent + '33';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = '34px sans-serif';
  ctx.fillStyle = P.text;
  ctx.textAlign = 'left';
  ctx.globalAlpha = 0.9;
  wrapText(ctx, content.fact, 100, 860, W - 200, 52);
  ctx.globalAlpha = 1;

  drawDivider(ctx, 80, 1210, W - 160, P.accent);

  // CTA section
  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = P.accent;
  ctx.textAlign = 'center';
  ctx.fillText('Learn Sanskrit for free', W / 2, 1290);

  ctx.font = '28px sans-serif';
  ctx.fillStyle = P.sub;
  ctx.globalAlpha = 0.8;
  ctx.fillText('vedalingo.in  ·  Available on Google Play', W / 2, 1340);
  ctx.globalAlpha = 1;

  // Bottom decorative dots
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(W / 2 + (i - 2) * 24, 1400, i === 2 ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = i === 2 ? P.accent : P.sub + '66';
    ctx.fill();
  }

  // Bottom border
  ctx.strokeStyle = topGrad;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.8;
  ctx.beginPath(); ctx.moveTo(0, H - 8); ctx.lineTo(W, H - 8); ctx.stroke();
  ctx.globalAlpha = 1;

  return canvas.toBuffer('image/png');
}

function shadeColor(hex, pct) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16) + pct);
  const g = Math.min(255, ((n >> 8) & 0xff) + pct);
  const b = Math.min(255, (n & 0xff) + pct);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ── Upload to Cloudinary ─────────────────────────────────────────────────────
export async function uploadPin(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId, folder: 'vedalingo-pinterest', overwrite: true, resource_type: 'image' },
      (err, result) => err ? reject(err) : resolve(result.secure_url)
    );
    stream.end(buffer);
  });
}

// ── CLI: generate today's pin ────────────────────────────────────────────────
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const state = JSON.parse(readFileSync(join(__dirname, 'post-state.json'), 'utf8'));
  const dayIndex = (state.currentDay - 1) % PIN_CONTENT.length;
  const content = PIN_CONTENT[dayIndex];
  const paletteIndex = state.currentDay % PALETTES.length;

  console.log(`Generating pin for day ${state.currentDay}: ${content.devanagari} (${content.meaning})`);
  const buffer = generatePin(content, paletteIndex);

  const localPath = join(__dirname, '..', 'output', `pinterest-day-${state.currentDay}.png`);
  writeFileSync(localPath, buffer);
  console.log(`✅ Saved locally: ${localPath}`);

  const url = await uploadPin(buffer, `pinterest-day-${state.currentDay}`);
  console.log(`✅ Cloudinary URL: ${url}`);
  console.log(url); // used by GitHub Action
}
