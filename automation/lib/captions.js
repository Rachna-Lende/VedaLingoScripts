// Caption + hashtag generator for each reel type

const BRAND_TAGS = '#VedaLingo #Sanskrit #SanskritLearning #LearnSanskrit #IndianHeritage';

const TYPE_TAGS = {
  word:    '#SanskritWord #DailyWord #AncientWisdom #VedicKnowledge #SanskritDaily #IndianCulture #WordOfTheDay #SanskritLanguage',
  grammar: '#SanskritGrammar #Linguistics #AncientLanguage #LanguageLearning #VedicStudies #SanskritLanguage #IndianLanguage #Grammar',
  myth:    '#IndianMythology #AncientIndia #VedicStories #Mahabharata #Ramayana #IndianCulture #Mythology #AncientWisdom #SanskritStories',
};

const TYPE_EMOJI = { word: '✨', grammar: '📚', myth: '🌸' };
const TYPE_LABEL = { word: 'Sanskrit Word of the Day', grammar: 'Sanskrit Grammar Gem', myth: 'Sanskrit Wisdom & Story' };

function generateCaption(type, content) {
  const e = TYPE_EMOJI[type];
  const label = TYPE_LABEL[type];

  let body;
  if (type === 'word') {
    body = `${e} ${label} ${e}\n\n${content.devanagari}  ·  ${content.translit}\n\n${content.screenText}\n\n💬 ${content.voice3}\n\n🙏 ${content.voice4}`;
  } else if (type === 'grammar') {
    body = `${e} ${label} ${e}\n\n${content.devanagari}  ·  ${content.translit}\n\n${content.screenText}\n\n💬 ${content.voice3}\n\n🙏 ${content.voice4}`;
  } else {
    body = `${e} ${label} ${e}\n\n${content.screenText}\n\n💬 ${content.voice3}\n\n🙏 ${content.voice4}`;
  }

  const tags = `${BRAND_TAGS} ${TYPE_TAGS[type]}`;
  return `${body}\n\n${tags}`;
}

function generateYouTubeTitle(type, content) {
  const labels = {
    word:    `${content.devanagari} (${content.translit}) — Sanskrit Word | VedaLingo`,
    grammar: `${content.screenText.slice(0, 60)} | Sanskrit Grammar | VedaLingo`,
    myth:    `${content.screenText.slice(0, 60)} | Sanskrit Story | VedaLingo`,
  };
  return labels[type].slice(0, 100);
}

function generateYouTubeTags(type) {
  const base = ['Sanskrit', 'VedaLingo', 'Learn Sanskrit', 'Sanskrit language', 'Indian culture', 'ancient wisdom', 'Shorts'];
  const extra = {
    word:    ['Sanskrit word', 'vocabulary', 'Vedic knowledge', 'Sanskrit daily'],
    grammar: ['Sanskrit grammar', 'linguistics', 'language learning', 'ancient language'],
    myth:    ['Indian mythology', 'Hindu mythology', 'ancient India', 'Vedic stories', 'Mahabharata'],
  };
  return [...base, ...extra[type]];
}

// ── Pinterest ────────────────────────────────────────────────────────────────
// Pin title, description, and board are all derived from the SAME content
// object — so they can never go out of sync.

const PINTEREST_BOARD = {
  word:    'Sanskrit Words and Meanings',
  grammar: 'Learn Sanskrit Grammar',
  myth:    'Indian Mythology and Stories',
};

function generatePinTitle(type, content) {
  if (type === 'word') {
    // "Viveka (विवेक) — Discernment: Sanskrit Word Meaning"
    const meaning = content.screenText.split('·')[0].trim();
    return `${content.translit.charAt(0).toUpperCase() + content.translit.slice(1)} (${content.devanagari}) — ${meaning}: Sanskrit Word Meaning`.slice(0, 100);
  }
  if (type === 'grammar') {
    return `${content.screenText.slice(0, 70)} | Sanskrit Grammar | VedaLingo`.slice(0, 100);
  }
  return `${content.screenText.slice(0, 70)} | Sanskrit Story | VedaLingo`.slice(0, 100);
}

function generatePinDescription(type, content) {
  if (type === 'word') {
    return [
      `✨ Sanskrit Word: ${content.devanagari} · ${content.translit} — ${content.screenText}`,
      `${content.voice2} ${content.voice3} ${content.voice4}`,
      `Learn Sanskrit words, grammar, stories from the Mahabharata & Ramayana — free on VedaLingo. 🌐 vedalingo.in 📱 Download free: https://play.google.com/store/apps/details?id=com.vedalingo.app`,
      `#Sanskrit #LearnSanskrit #VedaLingo #SanskritWords #IndianCulture #Vedic #Hinduism #AncientWisdom #SanskritDaily #IndianPhilosophy`,
    ].join('\n\n');
  }
  if (type === 'grammar') {
    return [
      `📚 Sanskrit Grammar: ${content.screenText}`,
      `${content.voice2} ${content.voice3} ${content.voice4}`,
      `Learn Sanskrit grammar, words, and stories free on VedaLingo. 🌐 vedalingo.in`,
      `#SanskritGrammar #LearnSanskrit #VedaLingo #Sanskrit #AncientLanguage #IndianCulture`,
    ].join('\n\n');
  }
  return [
    `🌸 ${content.screenText}`,
    `${content.voice2} ${content.voice3} ${content.voice4}`,
    `Explore Sanskrit stories, mythology, and wisdom free on VedaLingo. 🌐 vedalingo.in`,
    `#IndianMythology #Sanskrit #VedaLingo #AncientIndia #Mahabharata #Ramayana #VedicStories`,
  ].join('\n\n');
}

function getPinterestBoard(type) {
  return PINTEREST_BOARD[type] || 'Sanskrit Words and Meanings';
}

module.exports = {
  generateCaption, generateYouTubeTitle, generateYouTubeTags,
  generatePinTitle, generatePinDescription, getPinterestBoard,
};
