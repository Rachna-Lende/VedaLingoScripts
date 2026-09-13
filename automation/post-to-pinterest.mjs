/**
 * Posts a VedaLingo pin to Pinterest via API v5
 * Called by GitHub Action after generate-pinterest-pin.mjs
 */

const PIN_CONTENT = [
  { devanagari: 'अहिंसा', iast: 'ahiṃsā', meaning: 'Non-violence', fact: 'The highest dharma — Mahabharata calls it the greatest gift one can give the world.', category: 'Values' },
  { devanagari: 'धर्म', iast: 'dharma', meaning: 'Righteous duty', fact: 'From √dhṛ — to hold, sustain. Dharma is what holds the cosmos together.', category: 'Philosophy' },
  { devanagari: 'करुणा', iast: 'karuṇā', meaning: 'Compassion', fact: 'One of the four divine abodes (brahma-vihāra) in both Hindu and Buddhist traditions.', category: 'Values' },
  { devanagari: 'विद्या', iast: 'vidyā', meaning: 'Knowledge', fact: 'From √vid — to know. The root of the word "video" in Latin. Sanskrit lives in English.', category: 'Wisdom' },
  { devanagari: 'शान्ति', iast: 'śānti', meaning: 'Peace', fact: 'Chanted three times in Vedic tradition — for peace in body, mind, and spirit.', category: 'Spirituality' },
  { devanagari: 'सत्य', iast: 'satya', meaning: 'Truth', fact: 'From √as — to be. Satya literally means "that which is". Truth = existence itself.', category: 'Philosophy' },
  { devanagari: 'प्रेम', iast: 'prema', meaning: 'Divine love', fact: 'Unlike kāma (desire), prema is selfless love — the love a parent feels for a child.', category: 'Values' },
  { devanagari: 'ज्ञान', iast: 'jñāna', meaning: 'Wisdom', fact: 'The root "jñā" is the same as "gnosis" in Greek and "know" in English.', category: 'Wisdom' },
  { devanagari: 'मोक्ष', iast: 'mokṣa', meaning: 'Liberation', fact: 'The fourth and ultimate goal of life in Hindu philosophy — freedom from rebirth.', category: 'Spirituality' },
  { devanagari: 'सूर्य', iast: 'sūrya', meaning: 'The Sun', fact: 'Cognate with Latin "sol" and English "solar". The Indo-European root *sóh₂wl̥ connects all.', category: 'Etymology' },
  { devanagari: 'नमस्ते', iast: 'namaste', meaning: 'I bow to you', fact: 'namas + te — literally "reverence to you". The divine in me recognises the divine in you.', category: 'Culture' },
  { devanagari: 'योग', iast: 'yoga', meaning: 'Union', fact: 'From √yuj — to yoke, join. The same root as English "yoke". Yoga = joining self to the divine.', category: 'Etymology' },
  { devanagari: 'अग्नि', iast: 'agni', meaning: 'Fire', fact: 'Identical to Latin "ignis" and English "ignite". One of the oldest preserved Indo-European words.', category: 'Etymology' },
  { devanagari: 'वायु', iast: 'vāyu', meaning: 'Wind, air', fact: 'Father of Hanuman in the Ramayana. The breath (prāṇa) is Vāyu within every living being.', category: 'Mythology' },
  { devanagari: 'आनन्द', iast: 'ānanda', meaning: 'Bliss', fact: 'The Taittiriya Upanishad says the ultimate reality is sat-chit-ānanda — being, consciousness, bliss.', category: 'Spirituality' },
];

async function postViaWebhook(webhookUrl, payload) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Webhook error ${response.status}: ${err}`);
  }
  return response.text();
}

// ── Main ─────────────────────────────────────────────────────────────────────
const webhookUrl = process.env.MAKE_PINTEREST_WEBHOOK;
const imageUrl = process.argv[2];
const dayNum = parseInt(process.argv[3] || '1');

if (!webhookUrl) {
  console.error('Missing MAKE_PINTEREST_WEBHOOK secret');
  process.exit(1);
}

if (!imageUrl) {
  console.error('Usage: node post-to-pinterest.mjs <image_url> <day_number>');
  process.exit(1);
}

const content = PIN_CONTENT[(dayNum - 1) % PIN_CONTENT.length];

const title = `${content.devanagari} (${content.iast}) — ${content.meaning} | Sanskrit Word of the Day`;

const description = `✨ Sanskrit Word: ${content.devanagari}
📖 ${content.iast} — ${content.meaning}

${content.fact}

Learn Sanskrit words, grammar, stories from the Mahabharata & Ramayana — free on VedaLingo.

🌐 vedalingo.in
📱 Download free: https://play.google.com/store/apps/details?id=com.vedalingo.app

#Sanskrit #LearnSanskrit #VedaLingo #SanskritWords #IndianCulture #Vedic #Hinduism #AncientWisdom #SanskritDaily #IndianPhilosophy`;

const link = 'https://vedalingo.in?utm_source=pinterest&utm_medium=pin&utm_campaign=word-of-day';

try {
  const result = await postViaWebhook(webhookUrl, { image_url: imageUrl, title, description, link, day: dayNum });
  console.log('✅ Sent to Make.com webhook:', result);
} catch (err) {
  console.error('❌ Failed to send to webhook:', err.message);
  process.exit(1);
}
