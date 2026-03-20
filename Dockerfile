FROM node:20.19.0-bookworm-slim

WORKDIR /app

ENV YOUTUBE_DL_SKIP_PYTHON_CHECK=1

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

CMD ["node", "index.js"]
