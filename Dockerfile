FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ENV DATABASE_URL="postgresql://tcg_user:tcg_password@localhost:5432/tcg_database"

RUN npx prisma generate
RUN npm run prebuild
RUN npm run build

WORKDIR /app

ENV MODE_ENV=production

CMD ["node", "dist/index.js"]