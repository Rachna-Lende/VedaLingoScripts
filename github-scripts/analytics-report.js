// VedaLingo Daily Analytics Report
// Fetches GA4 data, uses Claude API to write a human-readable report,
// saves to vedalingo-app/analytics-reports/report-YYYY-MM-DD.md

import { BetaAnalyticsDataClient } from '@google-analytics/data';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const PROPERTY_ID  = process.env.GA_PROPERTY_ID || '541501284';
const KEY_FILE     = path.join(import.meta.dirname, 'ga-service-account.json');
const REPORT_DIR   = process.env.REPORT_OUTPUT_DIR || './analytics-reports';
const TODAY        = new Date().toISOString().split('T')[0];
const REPORT_FILE  = path.join(REPORT_DIR, `report-${TODAY}.md`);

if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

// ── Fetch GA4 data ──────────────────────────────────────────────────────────
async function fetchAnalytics() {
  const analytics = new BetaAnalyticsDataClient({
    keyFilename: KEY_FILE,
  });

  // 28-day overview
  const [overview] = await analytics.runReport({
    property: `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
    metrics: [
      { name: 'activeUsers' }, { name: 'newUsers' },
      { name: 'sessions' }, { name: 'screenPageViews' },
      { name: 'averageSessionDuration' }, { name: 'bounceRate' },
    ],
  });

  // 7-day trends
  const [week] = await analytics.runReport({
    property: `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
    metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
  });

  // Top pages
  const [pages] = await analytics.runReport({
    property: `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 10,
  });

  // Traffic sources
  const [sources] = await analytics.runReport({
    property: `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
  });

  // Countries
  const [countries] = await analytics.runReport({
    property: `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'country' }],
    metrics: [{ name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
    limit: 10,
  });

  return {
    overview: overview.rows?.[0]?.metricValues || [],
    week:     week.rows?.[0]?.metricValues || [],
    pages:    pages.rows || [],
    sources:  sources.rows || [],
    countries: countries.rows || [],
  };
}

// ── Ask Claude to write the report ──────────────────────────────────────────
async function writeReport(data) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const dataStr = JSON.stringify(data, null, 2);
  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr   = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are writing the daily analytics report for VedaLingo, a Sanskrit learning app.

Here is today's Google Analytics data (GA4):
${dataStr}

Write a markdown report in EXACTLY this format:

# VedaLingo Daily Analytics Report
**${dayOfWeek}, ${dateStr}**

---

## 28-Day Overview
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Active users | X | 200 | 🔴/🟡/✅ |
| New users | X | — | — |
| Sessions | X | 300 | 🔴/🟡/✅ |
| Page views | X | — | — |
| Avg session | Xs | >120s | 🔴/🟡/✅ |
| Bounce rate | X% | <60% | 🔴/🟡/✅ |

## Last 7 Days
- Active users: **X**
- Sessions: **X**

## Top Pages (7 days)
[list from data, format: path — N views]

## Traffic Sources (28 days)
[list from data]

## Top Countries (28 days)
[list from data]

---

## Today's Insights
[2-3 sharp, actionable observations about what the data actually means for VedaLingo]

## This Week's Priority Actions
**Do this week:**
[3 specific, concrete actions based on the data]

**This month:**
[2 strategic actions]

---
*Next report tomorrow at 9 AM · Property: ${PROPERTY_ID}*

Status: 🔴 = below target, 🟡 = within 50% of target, ✅ = at or above target`
    }],
  });

  return message.content[0].text;
}

// ── Main ────────────────────────────────────────────────────────────────────
try {
  console.log(`Fetching GA4 data for property ${PROPERTY_ID}...`);
  const data   = await fetchAnalytics();
  console.log('Data fetched. Writing report with Claude...');
  const report = await writeReport(data);

  fs.writeFileSync(REPORT_FILE, report);
  console.log(`✅ Report saved to ${REPORT_FILE}`);
  console.log(report.split('\n').slice(0, 8).join('\n')); // preview first 8 lines
} catch (err) {
  const errorReport = `# VedaLingo Analytics Report — ${TODAY}\n\n**ERROR:** ${err.message}\n\nCheck GitHub Actions logs for details.`;
  fs.writeFileSync(REPORT_FILE, errorReport);
  console.error('❌ Analytics report failed:', err.message);
  process.exit(1);
}
