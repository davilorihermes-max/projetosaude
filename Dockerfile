# Multi-stage Dockerfile para OmniSaúde Fastify Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copia arquivos de dependência
COPY package*.json ./
COPY prisma ./prisma/

# Instala dependências e gera o Prisma Client
RUN npm ci
COPY scripts ./scripts/
COPY src ./src/
COPY tsconfig.json ./

# Executa sincronização de provedor e build
RUN node scripts/sync-prisma-provider.js && npx prisma generate

# Runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src

EXPOSE 3001

CMD ["npx", "tsx", "src/main.ts"]
