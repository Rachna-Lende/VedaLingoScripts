/**
 * VedaLingo Pinterest Pin Generator
 * Uses Puppeteer + HTML to render the same dark bg.png + gold-glow aesthetic as the reels
 * Screenshots at 1000x1500px, uploads to Cloudinary
 */

import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'fs';
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
  { devanagari: 'ॐ', iast: 'oṃ', meaning: 'The sacred syllable', fact: 'The Mandukya Upanishad says Om encompasses all of time — past, present, and future.', category: 'Spirituality' },
  { devanagari: 'चन्द्र', iast: 'candra', meaning: 'The Moon', fact: 'From √cand — to shine. The root of the name "Chandra" and the English word "candle".', category: 'Etymology' },
  { devanagari: 'गुरु', iast: 'guru', meaning: 'Dispeller of darkness', fact: 'gu = darkness, ru = dispeller. A guru is literally one who leads from darkness to light.', category: 'Wisdom' },
  { devanagari: 'माया', iast: 'māyā', meaning: 'Illusion', fact: 'The cosmic power that makes the infinite appear finite. The world is māyā — a divine play.', category: 'Philosophy' },
  { devanagari: 'प्राण', iast: 'prāṇa', meaning: 'Life force', fact: 'The breath that animates all living beings. The Upanishads say prāṇa is older than mind itself.', category: 'Spirituality' },
  { devanagari: 'कर्म', iast: 'karma', meaning: 'Action & consequence', fact: 'From √kṛ — to do. Every action creates an impression. Karma is the universe keeping score.', category: 'Philosophy' },
  { devanagari: 'आत्मन्', iast: 'ātman', meaning: 'The self', fact: 'The Chandogya Upanishad declares: tat tvam asi — "That thou art." You are the ātman.', category: 'Philosophy' },
  { devanagari: 'ब्रह्म', iast: 'brahman', meaning: 'Ultimate reality', fact: 'The infinite, unchanging ground of all existence. Everything arises from brahman and returns to it.', category: 'Philosophy' },
  { devanagari: 'तपस्', iast: 'tapas', meaning: 'Discipline & austerity', fact: 'From √tap — to burn. Tapas is the inner fire that purifies. The Vedas say creation itself began with tapas.', category: 'Spirituality' },
  { devanagari: 'श्रद्धा', iast: 'śraddhā', meaning: 'Faith & trust', fact: 'From √śrat + √dhā — to place the heart. Śraddhā is trust rooted in experience, not blind belief.', category: 'Values' },
  { devanagari: 'अनन्त', iast: 'ananta', meaning: 'Infinite, endless', fact: 'a (not) + anta (end). Ananta is one of Vishnu\'s names. The infinite serpent on which the cosmos rests.', category: 'Mythology' },
  { devanagari: 'क्षमा', iast: 'kṣamā', meaning: 'Forgiveness', fact: 'The Mahabharata says: forgiveness is the greatest virtue. The strong forgive; the weak cannot.', category: 'Values' },
  { devanagari: 'सेवा', iast: 'sevā', meaning: 'Selfless service', fact: 'To serve without expectation of return. The Bhagavad Gita calls this the path of karma yoga.', category: 'Values' },
  { devanagari: 'विश्व', iast: 'viśva', meaning: 'Universe, all', fact: 'The root of "Vishnu" — viśva-pati, lord of the universe. Also the root of the name "Vishwas".', category: 'Etymology' },
  { devanagari: 'जय', iast: 'jaya', meaning: 'Victory, glory', fact: 'From √ji — to conquer. Jaya refers to inner victory — the triumph of dharma over adharma.', category: 'Culture' },
  { devanagari: 'स्वर', iast: 'svara', meaning: 'Sound, note, vowel', fact: 'The 7 svaras of Indian music mirror the 7 notes of a scale. Music is Sanskrit in sound form.', category: 'Culture' },
  { devanagari: 'रस', iast: 'rasa', meaning: 'Essence, flavour, emotion', fact: 'The 9 rasas are the emotional essences of all art — from love to courage to wonder.', category: 'Culture' },
  { devanagari: 'नाद', iast: 'nāda', meaning: 'Sound, cosmic vibration', fact: 'The universe began with nāda — the primal vibration. Om is the nāda of creation itself.', category: 'Spirituality' },
  { devanagari: 'शक्ति', iast: 'śakti', meaning: 'Power, energy', fact: 'The divine feminine energy that animates the cosmos. Without śakti, even Shiva cannot move.', category: 'Mythology' },
  { devanagari: 'लीला', iast: 'līlā', meaning: 'Divine play', fact: 'The universe is Krishna\'s līlā — a joyful, creative play with no purpose beyond itself.', category: 'Philosophy' },
  { devanagari: 'संस्कार', iast: 'saṃskāra', meaning: 'Impression, refinement', fact: 'The 16 saṃskāras mark life\'s milestones. The word "culture" comes from the same Latin root.', category: 'Culture' },
  { devanagari: 'वेद', iast: 'veda', meaning: 'Knowledge', fact: 'From √vid — to know. The Vedas are not books but vibrations — heard by rishis in deep meditation.', category: 'Wisdom' },
  { devanagari: 'ऋषि', iast: 'ṛṣi', meaning: 'Sage, seer', fact: 'The rishis did not write the Vedas — they heard them. They were dṛṣṭas: seers of eternal truth.', category: 'Wisdom' },
  { devanagari: 'तीर्थ', iast: 'tīrtha', meaning: 'Sacred ford, pilgrimage', fact: 'A tīrtha is a crossing point between the human and divine. The word also means a holy person.', category: 'Spirituality' },
  { devanagari: 'मन्त्र', iast: 'mantra', meaning: 'Sacred sound formula', fact: 'man (mind) + tra (instrument). A mantra is a tool for the mind — sound that transforms consciousness.', category: 'Spirituality' },
  { devanagari: 'यन्त्र', iast: 'yantra', meaning: 'Sacred geometric form', fact: 'The visual counterpart to a mantra. A yantra is geometry as a map of divine consciousness.', category: 'Spirituality' },
  { devanagari: 'तन्त्र', iast: 'tantra', meaning: 'Weaving, system, method', fact: 'tan (weave) + tra (instrument). Tantra weaves the divine into everyday life — not what pop culture imagines.', category: 'Philosophy' },
  { devanagari: 'आश्रम', iast: 'āśrama', meaning: 'Stage of life, hermitage', fact: 'The 4 āśramas: student, householder, forest dweller, renunciant. A complete map of a human life.', category: 'Culture' },
  { devanagari: 'काम', iast: 'kāma', meaning: 'Desire, love, pleasure', fact: 'One of the 4 puruṣārthas. Kāma is not shameful — it is sacred when aligned with dharma.', category: 'Philosophy' },
  { devanagari: 'पूजा', iast: 'pūjā', meaning: 'Worship, reverence', fact: 'From √pū — to purify. Pūjā transforms everyday objects into sacred offerings. God is invited as a guest.', category: 'Culture' },
  { devanagari: 'प्रसाद', iast: 'prasāda', meaning: 'Grace, blessed offering', fact: 'What is offered to the divine and returned. Prasāda is grace made edible — the divine\'s gift back.', category: 'Culture' },
  { devanagari: 'स्मृति', iast: 'smṛti', meaning: 'Memory, tradition', fact: 'Shruti (heard) vs smṛti (remembered). The Vedas are shruti; the Mahabharata and Ramayana are smṛti.', category: 'Wisdom' },
  { devanagari: 'श्रुति', iast: 'śruti', meaning: 'That which is heard', fact: 'The Vedas are śruti — divine revelation heard by the rishis. They belong to no one; they come from silence.', category: 'Wisdom' },
  { devanagari: 'कवि', iast: 'kavi', meaning: 'Poet, seer', fact: 'A kavi is not just a poet but a seer. Sanskrit poetry (kāvya) is considered a path to moksha.', category: 'Culture' },
  { devanagari: 'सरस्वती', iast: 'sarasvatī', meaning: 'Goddess of wisdom', fact: 'saras (water/flow) + vatī (possessing). Saraswati flows — as river, as speech, as music, as knowledge.', category: 'Mythology' },
];

// ── HTML pin template (matches reel aesthetic exactly) ───────────────────────
function pinHTML(content, bgBase64) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Hindi:ital@0;1&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1000px; height: 1500px; overflow: hidden; background: #0a0202; }

.pin {
  width: 1000px; height: 1500px;
  position: relative; overflow: hidden;
  background-image: url('data:image/png;base64,${bgBase64}');
  background-size: cover;
  background-position: center 55%;
}
.pin::before {
  content: ''; position: absolute; inset: 0;
  background: rgba(6,2,1,0.62); z-index: 0;
}
.pin::after {
  content: ''; position: absolute; inset: 0;
  background:
    linear-gradient(to bottom, rgba(2,0,0,0.92) 0%, rgba(3,1,0,0.60) 22%, rgba(3,1,0,0.25) 40%, transparent 55%),
    radial-gradient(ellipse at 50% 60%, transparent 20%, rgba(3,1,0,0.50) 80%);
  z-index: 0;
}
.pin > * { position: relative; z-index: 1; }

.top-border {
  position: absolute; top: 10px; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, rgba(212,175,55,0.8), transparent);
}
.bot-border {
  position: absolute; bottom: 10px; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, rgba(212,175,55,0.8), transparent);
}

.category {
  position: absolute; top: 48px; left: 0; right: 0;
  text-align: center;
  font-family: 'Cormorant Garamond', serif;
  font-size: 20px; letter-spacing: 5px;
  color: rgba(212,175,55,0.60);
  text-transform: uppercase;
}
.logo {
  position: absolute; top: 88px; left: 0; right: 0;
  text-align: center;
  font-family: 'Cormorant Garamond', serif; font-weight: 600;
  font-size: 42px; color: #D4AF37;
  text-shadow: 0 0 28px rgba(212,175,55,0.55);
}
.tagline {
  position: absolute; top: 145px; left: 0; right: 0;
  text-align: center;
  font-family: 'Cormorant Garamond', serif; font-style: italic;
  font-size: 19px; color: rgba(212,175,55,0.42);
}
.divider-top {
  position: absolute; top: 188px; left: 50%; transform: translateX(-50%);
  width: 300px; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent);
}

.om-bg {
  position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%);
  font-family: 'Tiro Devanagari Hindi', serif;
  font-size: 520px; color: rgba(212,175,55,0.055);
  line-height: 1; white-space: nowrap;
  pointer-events: none;
}

.deva-word {
  position: absolute; top: 42%; left: 50%;
  transform: translate(-50%, -50%);
  font-family: 'Tiro Devanagari Hindi', serif;
  font-size: 148px; font-weight: 400;
  color: #F5E4B0;
  text-shadow:
    0 0 32px rgba(255,215,80,0.55),
    0 0 70px rgba(220,155,20,0.25),
    2px 3px 14px rgba(0,0,0,0.9);
  letter-spacing: 4px;
  text-align: center; width: 90%;
  line-height: 1.2;
}
.translit {
  position: absolute; top: 53.5%; left: 50%;
  transform: translate(-50%, -50%);
  font-family: 'Cormorant Garamond', serif; font-style: italic;
  font-size: 34px; color: rgba(212,175,55,0.80);
  letter-spacing: 2px; text-align: center;
}
.divider-mid {
  position: absolute; top: 57%; left: 50%; transform: translateX(-50%);
  width: 280px; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent);
}
.meaning {
  position: absolute; top: 62%; left: 50%;
  transform: translate(-50%, -50%);
  font-family: 'Cormorant Garamond', serif; font-weight: 600;
  font-size: 54px; color: #E8D8A0;
  text-align: center; width: 85%;
  text-shadow: 0 2px 16px rgba(0,0,0,0.75);
}
.fact {
  position: absolute; top: 70%; left: 50%;
  transform: translate(-50%, -50%);
  font-family: 'Cormorant Garamond', serif;
  font-size: 30px; color: rgba(245,228,176,0.75);
  text-align: center; width: 82%;
  line-height: 1.55;
}
.divider-bot {
  position: absolute; top: 85.5%; left: 50%; transform: translateX(-50%);
  width: 280px; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent);
}
.cta-url {
  position: absolute; top: 89%; left: 0; right: 0;
  text-align: center;
  font-family: 'Cormorant Garamond', serif; font-weight: 600;
  font-size: 30px; color: rgba(212,175,55,0.85);
}
.cta-sub {
  position: absolute; top: 92.5%; left: 0; right: 0;
  text-align: center;
  font-family: 'Cormorant Garamond', serif; font-style: italic;
  font-size: 22px; color: rgba(212,175,55,0.45);
}
</style>
</head>
<body>
<div class="pin">
  <div class="top-border"></div>
  <div class="bot-border"></div>
  <div class="category">${content.category}</div>
  <div class="logo">VedaLingo</div>
  <div class="tagline">Learn Sanskrit. Understand India.</div>
  <div class="divider-top"></div>
  <div class="om-bg">ॐ</div>
  <div class="deva-word">${content.devanagari}</div>
  <div class="translit">${content.iast}</div>
  <div class="divider-mid"></div>
  <div class="meaning">"${content.meaning}"</div>
  <div class="fact">${content.fact}</div>
  <div class="divider-bot"></div>
  <div class="cta-url">🌐 vedalingo.in</div>
  <div class="cta-sub">Free on Google Play · 10 min/day</div>
</div>
</body>
</html>`;
}

// ── Generator ────────────────────────────────────────────────────────────────
export async function generatePin(content) {
  const bgPath = join(__dirname, 'bg.png');
  const bgBase64 = readFileSync(bgPath).toString('base64');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 1500, deviceScaleFactor: 1 });
  await page.setContent(pinHTML(content, bgBase64), { waitUntil: 'networkidle0', timeout: 20000 });
  await new Promise(r => setTimeout(r, 800)); // let fonts paint

  const buffer = await page.screenshot({ type: 'png', fullPage: false });
  await browser.close();
  return buffer;
}

// ── Entry point (called by GitHub Action) ────────────────────────────────────
const stateFile = join(__dirname, 'post-state.json');
const state = JSON.parse(readFileSync(stateFile, 'utf8'));
const dayIndex = (state.currentDay - 1) % PIN_CONTENT.length;
const content = PIN_CONTENT[dayIndex];

const buffer = await generatePin(content);

const result = await new Promise((resolve, reject) => {
  cloudinary.uploader.upload_stream(
    { public_id: `vedalingo-pinterest/pinterest-day-${state.currentDay}`, overwrite: true, resource_type: 'image' },
    (err, res) => err ? reject(err) : resolve(res)
  ).end(buffer);
});

console.log(result.secure_url);
