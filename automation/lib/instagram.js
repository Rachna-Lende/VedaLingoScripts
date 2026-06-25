// Instagram Graph API — post Reels via official Meta API
// Requires: Instagram Business/Creator account + Facebook Developer App
// Video is served temporarily via localtunnel so Meta can download it

const axios       = require('axios');
const http        = require('http');
const fs          = require('fs');
const localtunnel = require('localtunnel');

const IG_API = 'https://graph.instagram.com/v18.0';

// Serve a local video file publicly for ~2 minutes so Meta can fetch it
async function serveVideoTemporarily(videoPath) {
  const server = http.createServer((req, res) => {
    const stat = fs.statSync(videoPath);
    res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': stat.size });
    fs.createReadStream(videoPath).pipe(res);
  });
  await new Promise(resolve => server.listen(8787, resolve));

  const tunnel = await localtunnel({ port: 8787 });
  // localtunnel appends a path; we want root
  const videoUrl = `${tunnel.url}/reel.mp4`;

  const cleanup = () => { try { tunnel.close(); server.close(); } catch (_) {} };
  return { videoUrl, cleanup };
}

// Poll until container is FINISHED processing (Instagram transcodes async)
async function waitForContainer(containerId, accessToken, log) {
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 5000)); // wait 5s between polls
    const { data } = await axios.get(`${IG_API}/${containerId}`, {
      params: { fields: 'status_code,status', access_token: accessToken },
    });
    log(`  IG container status: ${data.status_code}`);
    if (data.status_code === 'FINISHED') return;
    if (data.status_code === 'ERROR') throw new Error(`Instagram container error: ${data.status}`);
  }
  throw new Error('Instagram container timed out after 200 seconds');
}

async function postReel(accessToken, userId, videoPath, caption, log = console.log) {
  log(`Serving video via tunnel: ${videoPath}`);
  const { videoUrl, cleanup } = await serveVideoTemporarily(videoPath);

  try {
    log(`Public URL: ${videoUrl}`);

    // Step 1: Create media container
    const { data: container } = await axios.post(`${IG_API}/${userId}/media`, null, {
      params: {
        media_type:    'REELS',
        video_url:     videoUrl,
        caption,
        share_to_feed: true,
        access_token:  accessToken,
      },
    });
    log(`Container created: ${container.id}`);

    // Step 2: Wait for Meta to download + transcode
    await waitForContainer(container.id, accessToken, log);

    // Step 3: Publish
    const { data: published } = await axios.post(`${IG_API}/${userId}/media_publish`, null, {
      params: { creation_id: container.id, access_token: accessToken },
    });
    log(`✅ Instagram Reel published: ${published.id}`);
    return published.id;

  } finally {
    cleanup(); // always close tunnel + server
  }
}

module.exports = { postReel };
