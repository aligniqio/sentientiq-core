FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm i --omit=dev
COPY tsconfig.json ./tsconfig.json
COPY src ./src
RUN npx tsc -p tsconfig.json
ENV PORT=8787
EXPOSE 8787
CMD ["node","dist/server.js"]