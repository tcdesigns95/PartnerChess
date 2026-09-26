# Couple Chess server — serves the web app + Socket.IO on one port
FROM node:22-bookworm-slim

WORKDIR /app

# Server deps
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

# App source + prebuilt web client
COPY server/src ./server/src
COPY server/tsconfig.json ./server/tsconfig.json
COPY dist ./dist

# tsx to run TypeScript in production without a separate build step
RUN cd server && npm install tsx@4.19.3 --no-save

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

WORKDIR /app/server
CMD ["npx", "tsx", "src/index.ts"]
