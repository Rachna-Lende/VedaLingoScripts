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

module.exports = { generateCaption, generateYouTubeTitle, generateYouTubeTags };
