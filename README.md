# Couple Chess

Live two-player chess with chat, invite codes, reconnect, and a black & white Ink theme.

The live site is one Node process: the exported web app and Socket.IO share the same origin, so an invite link is just the site URL plus `?code=`.

## Play locally

```bash
# terminal 1 — realtime server (also serves the web build)
cd server && npm install && npm run dev

# terminal 2 — rebuild web when you change the UI
npm install
npx expo export --platform web
```

Open `http://localhost:3001`.

## Deploy (stable live link)

This app is **one Node service**: Socket.IO + the exported Expo web app from `dist/`.

Do not set `EXPO_PUBLIC_SOCKET_URL` in production. The web client uses `window.location.origin` whenever it is not on localhost, so moves and chat stay on the same host as the page.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/tcdesigns95/PartnerChess)

### Option A — Render (recommended)

1. Push this repo to GitHub
2. On [render.com](https://render.com) → **New → Blueprint** → select the repo (`render.yaml`)
3. After deploy, your live URL is `https://<service>.onrender.com`

Pushes to `main` redeploy automatically (`autoDeployTrigger: commit`). `.github/workflows/redeploy.yml` can also call the Render API when `RENDER_API_KEY` and `RENDER_SERVICE_ID` are set as repository secrets.

The free instance sleeps after 15 minutes without HTTP or WebSocket traffic, and the local `server/data/games.json` file is wiped on sleep or redeploy. `.github/workflows/keepalive.yml` pings `/health` every 10 minutes when the `APP_URL` repository variable is set (for example `https://<service>.onrender.com`). That uses the monthly free-instance hours so the link opens without a cold start.

### Option B — Docker

```bash
npx expo export --platform web
docker build -t couple-chess .
docker run -p 3001:3001 couple-chess
```

## How to play

1. One person opens the live URL → **PLAY GAME**
2. Menu (⋯) → **Copy invite link** → send in iMessage
3. Partner opens the link → joins

## Stack

- Expo / React Native Web
- `chess.js` rules
- Socket.IO rooms + `server/data/games.json` persistence
- Themes in `src/theme/`
