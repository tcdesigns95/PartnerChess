# Couple Chess

Live two-player chess with chat, invite codes, reconnect, and swappable themes.

## Run locally

### 1. Start the realtime server

```bash
cd server
npm install
npm run dev
```

Server listens on `http://localhost:3001` and saves games to `server/data/games.json`.

### 2. Start the app

```bash
# from repo root
npm install
npx expo start
```

- Press `w` for web (easiest two-browser test)
- Scan the QR with Expo Go on phones (same Wi‑Fi)

### Phone play on your LAN

Create `.env` in the repo root (or set when starting Expo):

```bash
EXPO_PUBLIC_SOCKET_URL=http://YOUR_LAN_IP:3001
```

Example: `http://192.168.1.20:3001`. Both phones and the server must reach that address.

## How to play

1. One person taps **Start a live match** and copies the invite code
2. Partner taps **Join with a code** and enters it
3. Moves sync live; chat is in the same room
4. Backgrounding or briefly losing network: reopen and **Resume current match**

## Themes

Open **Change look & theme** (or Theme in-game). Choices persist on device via AsyncStorage.

## Ship / installs

```bash
npx eas-cli build --platform ios
npx eas-cli build --platform android
```

Or share the web build. Host the `server` on Railway / Render / Fly and set `EXPO_PUBLIC_SOCKET_URL` to that HTTPS URL (use a Socket.IO-capable host).
