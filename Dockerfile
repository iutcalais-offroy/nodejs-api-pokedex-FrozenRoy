# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
RUN npm ci --quiet

# Copier le code source
COPY . .

# Générer le client Prisma et compiler TypeScript
RUN npx prisma generate
RUN npm run build

# Stage 2: Production
FROM node:22-alpine
WORKDIR /app

# Copier seulement les fichiers nécessaires
COPY package*.json ./
RUN npm ci --omit=dev --quiet

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/prisma ./prisma

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/index.js"]