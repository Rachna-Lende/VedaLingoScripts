// YouTube Data API v3 — upload Shorts directly from local file
// Requires: Google Cloud project + OAuth 2.0 credentials (one-time setup)

const { google } = require('googleapis');
const fs         = require('fs');

function getAuth(creds) {
  const auth = new google.auth.OAuth2(creds.youtubeClientId, creds.youtubeClientSecret, 'urn:ietf:wg:oauth:2.0:oob');
  auth.setCredentials({ refresh_token: creds.youtubeRefreshToken });
  return auth;
}

async function uploadShort(creds, videoPath, title, description, tags, log = console.log) {
  const auth    = getAuth(creds);
  const youtube = google.youtube({ version: 'v3', auth });

  // #Shorts in description + title under 100 chars = YouTube Shorts eligibility
  const fullDescription = `${description}\n\n#Shorts #VedaLingo`;
  const shortTitle      = title.slice(0, 100);

  log(`Uploading to YouTube: ${shortTitle}`);

  const res = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title:           shortTitle,
        description:     fullDescription,
        tags:            [...tags, 'Shorts'],
        categoryId:      '27',          // Education
        defaultLanguage: 'en',
      },
      status: {
        privacyStatus:            'public',
        selfDeclaredMadeForKids:  false,
      },
    },
    media: {
      mimeType: 'video/mp4',
      body:     fs.createReadStream(videoPath),
    },
  });

  const videoId = res.data.id;
  log(`✅ YouTube Short published: https://youtu.be/${videoId}`);
  return videoId;
}

module.exports = { uploadShort };
