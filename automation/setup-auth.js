// Run ONCE to get your YouTube refresh token.
// Usage: node setup-auth.js
// It will print a URL → open it → authorize → paste the code back here → saves refresh token.

const { google }  = require('googleapis');
const readline    = require('readline');
const fs          = require('fs');
const path        = require('path');

const CREDS_FILE = path.join(__dirname, 'credentials.json');
const creds      = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));

if (creds.youtubeClientId === 'PASTE_YOUR_GOOGLE_CLIENT_ID_HERE') {
  console.error('❌ Fill in youtubeClientId and youtubeClientSecret in credentials.json first.');
  process.exit(1);
}

const auth = new google.auth.OAuth2(
  creds.youtubeClientId,
  creds.youtubeClientSecret,
  'urn:ietf:wg:oauth:2.0:oob'
);

const url = auth.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/youtube.upload'],
});

console.log('\n=== YouTube OAuth Setup ===\n');
console.log('1. Open this URL in your browser:\n');
console.log('   ' + url);
console.log('\n2. Sign in with your VedaLingo Google account');
console.log('3. Allow access to YouTube');
console.log('4. Copy the code shown and paste it below\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Paste the authorization code: ', async (code) => {
  rl.close();
  try {
    const { tokens } = await auth.getToken(code.trim());
    creds.youtubeRefreshToken = tokens.refresh_token;
    fs.writeFileSync(CREDS_FILE, JSON.stringify(creds, null, 2));
    console.log('\n✅ Refresh token saved to credentials.json');
    console.log('   YouTube is now authorized. Run daily-post.js to start posting.');
  } catch (e) {
    console.error('❌ Failed:', e.message);
  }
});
