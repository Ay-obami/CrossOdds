FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY scripts ./scripts
ENV NODE_ENV=production
ENV HOST=0.0.0.0
EXPOSE 10000
CMD ["npm", "run", "api"]
