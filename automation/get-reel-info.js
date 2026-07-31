#!/usr/bin/env node
// Usage: node get-reel-info.js <day> <reelNum>
// Outputs JSON: { type, contentId, caption, ytTitle, ytTags }

const { WORDS, GRAMMAR, MYTHS, buildSchedule } = require('../content-data');
const { generateCaption, generateYouTubeTitle, generateYouTubeTags } = require('./lib/captions');

const day     = parseInt(process.argv[2], 10);
const reelNum = parseInt(process.argv[3], 10); // 1 or 2

if (!day || !reelNum) {
  console.error('Usage: node get-reel-info.js <day> <reelNum>');
  process.exit(1);
}

const schedule = buildSchedule();
const entry    = schedule.find(s => s.day === day);

if (!entry) {
  console.error(`No schedule entry for day ${day}`);
  process.exit(1);
}

const slot    = reelNum === 1 ? entry.reel1 : entry.reel2;
const type    = slot.type;
const content = slot.data;

const caption  = generateCaption(type, content);
const ytTitle  = generateYouTubeTitle(type, content);
const ytTags   = generateYouTubeTags(type);

process.stdout.write(JSON.stringify({
  type,
  contentId: content.id,
  caption,
  ytTitle,
  ytTags,
}));
