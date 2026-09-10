FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server ./server
COPY migrations ./migrations
COPY dist ./dist
RUN test -s dist/index.html && test -s dist/app.js && test -s dist/assets/scenes.png && test -s dist/assets/portraits.png
USER node
EXPOSE 3000
CMD ["node", "server/index.js"]
