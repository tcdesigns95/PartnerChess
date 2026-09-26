# Couple Chess

Live two-player chess with chat, invite codes, reconnect, and a black & white Ink theme.

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

### Option A — Render (recommended)

1. Push this repo to GitHub
2. On [render.com](https://render.com) → **New → Blueprint** → select the repo (`render.yaml`)
3. After deploy, your live URL is `https://<service>.onrender.com`

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
