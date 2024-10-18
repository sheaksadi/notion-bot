FROM node:20

COPY . /notion-bot

WORKDIR /notion-bot
RUN npm install
RUN npm run build

WORKDIR /notion-bot/dist

ENTRYPOINT ["node", "index.js"]