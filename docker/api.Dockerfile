FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY src/data ./src/data
COPY official ./official
COPY elastic ./elastic
ENV PORT=43181
EXPOSE 43181
CMD ["npx", "tsx", "server/index.ts"]
