FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package*.json ./
# Instala dependências mas DESABILITA postinstall do Prisma para não gerar engine aqui
RUN npm ci --ignore-scripts

FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

ARG DATABASE_URL
ARG DIRECT_URL
ARG SUPABASE_URL
ARG SUPABASE_ANON_KEY
ARG SUPABASE_SERVICE_ROLE_KEY
ARG OPENCLAW_API_URL

# Variáveis de Build
ENV DATABASE_URL=$DATABASE_URL
ENV DIRECT_URL=$DIRECT_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV OPENCLAW_API_URL=$OPENCLAW_API_URL

COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma/
COPY . .

# Gera o engine correto (linux-musl-openssl-3.0.x) para Alpine
RUN npx prisma generate

RUN npm run build

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Variáveis de Runtime (Prisma, Supabase e OpenClaw precisam disso no servidor)
ARG DATABASE_URL
ARG SUPABASE_URL
ARG SUPABASE_ANON_KEY
ARG SUPABASE_SERVICE_ROLE_KEY
ARG OPENCLAW_API_URL

ENV DATABASE_URL=$DATABASE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV OPENCLAW_API_URL=$OPENCLAW_API_URL

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma/client ./node_modules/.prisma/client
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder --chown=nextjs:nodejs /app/prisma/schema.prisma ./prisma/schema.prisma

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
