# Couple Chess

Live two-player chess with chat, invite codes, reconnect, and a black & white Ink theme.

The web app and Socket.IO share the same origin, so an invite link is just the site URL plus `?code=`.

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

Host on **Vercel**. The Expo web export is a static site, and Socket.IO runs as a Fluid function at `api/socket.ts` on the same origin.

Do not set `EXPO_PUBLIC_SOCKET_URL` in production. The web client uses `window.location.origin` whenever it is not on localhost, and connects with WebSocket-only transport at `/api/socket`.

1. Push this repo to GitHub
2. On [vercel.com/new](https://vercel.com/new) import the repo (Hobby plan, no card)
3. Leave the build settings as `vercel.json` defines them
4. After deploy, the play link is `https://<project>.vercel.app`

The play link is [https://couple-chess-opal.vercel.app](https://couple-chess-opal.vercel.app).

Pushes to `main` redeploy when the project is connected to GitHub. `.github/workflows/redeploy.yml` can also deploy with the Vercel CLI when `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` are set as repository secrets.

A WebSocket stays on the function instance that accepted it, and the platform closes it after the Hobby max duration (60 seconds). The client reconnects. Games and move broadcasts are stored in Redis, so both players still see the same board when they land on different instances.

`.github/workflows/keepalive.yml` pings `/health` every 10 minutes when the `APP_URL` repository variable is set.

### Docker (same server, local or any container host)

```bash
npx expo export --platform web
docker build -t couple-chess .
docker run -p 3001:3001 couple-chess
```

## How to play

1. One person opens the live URL → **PLAY GAME**
2. Menu (⋯) → **Copy invite link** → send in iMessage
3. She opens the link and lands in the match. The code is in the URL, so she does not type it.

## Stack

- Expo / React Native Web
- `chess.js` rules
- Socket.IO rooms. Local games persist in `server/data/games.json`. On Vercel they persist on that function instance (`/tmp`).
- Themes in `src/theme/`
