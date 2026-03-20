FROM node:20.19.0-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN chmod +x tools/yt-dlp || true

CMD ["node", "index.js"]
