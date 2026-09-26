# Couple Chess server — serves the web app + Socket.IO on one port
FROM node:22-bookworm-slim

WORKDIR /app

# Server deps (tsx is a runtime dependency so the server can run TypeScript)
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

# App source + prebuilt web client
COPY server/src ./server/src
COPY server/tsconfig.json ./server/tsconfig.json
COPY dist ./dist

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

WORKDIR /app/server
CMD ["npx", "tsx", "src/index.ts"]
