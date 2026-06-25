# VedaLingo Automation — Setup Guide

Do this **once**. After setup, posting happens automatically every day at 8 AM and 6 PM — no action needed from you.

---

## What You Need to Set Up

| Platform | What to get | Time needed |
|----------|------------|-------------|
| Instagram | Long-lived access token + User ID | ~20 minutes |
| YouTube | OAuth refresh token | ~10 minutes |

---

## PART 1 — Instagram Setup

Instagram requires your account to be **Business or Creator** (not Personal). If it's currently Personal, switch it first: Instagram app → Settings → Account → Switch to Professional Account → Creator.

### Step 1 — Create a Facebook Developer App

1. Go to **https://developers.facebook.com**
2. Log in with the Facebook account linked to your Instagram
3. Click **My Apps → Create App**
4. Choose **"Other"** → **"Business"** → give it any name (e.g. "VedaLingo")
5. Click **Create App**

### Step 2 — Add Instagram Product

1. Inside your new app, click **"Add Product"**
2. Find **Instagram** → click **"Set Up"**
3. Go to **Instagram → API Setup with Instagram Login**

### Step 3 — Connect Your Instagram Account

1. Under **"Generate access tokens"**, click **Add Instagram Test User**
2. Add your VedaLingo Instagram account
3. Accept the invite inside the Instagram app (Settings → Apps and Websites → Tester Invites)
4. Back on the developer page, click **Generate Token** next to your account
5. **Copy the token shown** — this is your short-lived token (valid 1 hour)

### Step 4 — Convert to Long-Lived Token (valid 60 days)

Open this URL in your browser (replace `YOUR_SHORT_TOKEN` and `YOUR_APP_SECRET`):

```
https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&access_token=YOUR_SHORT_TOKEN
```

- App ID and Secret are on your app's **Basic Settings** page
- Copy the `access_token` from the response — this lasts 60 days

### Step 5 — Get Your Instagram User ID

Open this in browser (replace `YOUR_LONG_TOKEN`):
```
https://graph.instagram.com/me?fields=id,username&access_token=YOUR_LONG_TOKEN
```

Copy the `id` value shown.

### Step 6 — Save to credentials.json

Open `C:\SanskritClaude\vedalingo-reels\automation\credentials.json` and fill in:
```json
{
  "instagramAccessToken": "paste your long-lived token here",
  "instagramUserId":      "paste your numeric user ID here"
}
```

### ⚠ Token Renewal (every 60 days)

Instagram long-lived tokens expire in 60 days. To renew, call:
```
https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=YOUR_CURRENT_TOKEN
```

**The scheduled task will warn you 5 days before expiry.** You can also set up automatic renewal by running:
```powershell
node C:\SanskritClaude\vedalingo-reels\automation\renew-instagram-token.js
```

---

## PART 2 — YouTube Setup

### Step 1 — Create a Google Cloud Project

1. Go to **https://console.cloud.google.com**
2. Sign in with your VedaLingo Google account
3. Click **"Select a project" → "New Project"**
4. Name it `VedaLingo` → click **Create**

### Step 2 — Enable YouTube Data API

1. In the left menu → **"APIs & Services" → "Library"**
2. Search **"YouTube Data API v3"**
3. Click it → click **"Enable"**

### Step 3 — Create OAuth Credentials

1. Go to **"APIs & Services" → "Credentials"**
2. Click **"+ Create Credentials" → "OAuth client ID"**
3. If prompted, configure the consent screen first:
   - User Type: **External**
   - App name: `VedaLingo`
   - Add your email → Save
4. Back to Create Credentials → OAuth client ID:
   - Application type: **Desktop app**
   - Name: `VedaLingo Desktop`
   - Click **Create**
5. **Download the JSON file** — open it and copy:
   - `client_id` → paste into `youtubeClientId` in credentials.json
   - `client_secret` → paste into `youtubeClientSecret` in credentials.json

### Step 4 — Get the Refresh Token (one-time)

```powershell
cd C:\SanskritClaude\vedalingo-reels\automation
node setup-auth.js
```

- It will print a URL → open it in browser → sign in → allow access → copy the code
- Paste the code back in the terminal
- Your `youtubeRefreshToken` is automatically saved to credentials.json

YouTube refresh tokens **never expire** as long as you use them at least once every 6 months.

---

## PART 3 — Test Before Scheduling

Run a test post manually:
```powershell
cd C:\SanskritClaude\vedalingo-reels\automation

# Test morning post (Reel 1 of Day 1)
node daily-post.js morning

# Check it worked on Instagram and YouTube, then test evening:
node daily-post.js evening
```

Check your Instagram page and YouTube channel for the posted reels.

---

## PART 4 — Scheduling Is Already Done

Two scheduled tasks were already created by Claude:
- **`vedalingo-morning-post`** — runs every day at 8:00 AM → posts Reel 1
- **`vedalingo-evening-post`** — runs every day at 6:00 PM → posts Reel 2

To verify they exist:
```powershell
schtasks /query /tn "VedaLingo-MorningPost" /fo LIST
schtasks /query /tn "VedaLingo-EveningPost" /fo LIST
```

To pause posting (e.g. during holidays):
```powershell
schtasks /change /tn "VedaLingo-MorningPost" /disable
schtasks /change /tn "VedaLingo-EveningPost" /disable
```

To resume:
```powershell
schtasks /change /tn "VedaLingo-MorningPost" /enable
schtasks /change /tn "VedaLingo-EveningPost" /enable
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `daily-post.js` | Main runner — posts one reel to both platforms |
| `lib/instagram.js` | Instagram Graph API wrapper |
| `lib/youtube.js` | YouTube Data API wrapper |
| `lib/captions.js` | Caption + hashtag generator |
| `setup-auth.js` | One-time YouTube OAuth setup |
| `credentials.json` | Your API keys (never share/commit this) |
| `post-state.json` | Tracks progress — which day, which reel is next |
| `post-logs/` | Daily log files for each post |

---

## Troubleshooting

**"Invalid OAuth token" (Instagram):** Token expired — renew it (see Token Renewal above)

**"The caller does not have permission" (YouTube):** Re-run `node setup-auth.js` to refresh OAuth

**"Video URL not accessible" (Instagram):** localtunnel couldn't get a public URL — check internet connection and retry

**Reel posted to Instagram but not YouTube (or vice versa):** The script logs which one failed. Re-run `node daily-post.js morning/evening` — it will retry only the failed platform (state is already advanced for the successful one)

**Want to re-post a specific day manually:**
```powershell
# Edit post-state.json, set currentDay to the day you want, then:
node daily-post.js morning
node daily-post.js evening
```
