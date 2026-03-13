FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules

COPY frontend/package.json frontend/package-lock.json* ./
COPY frontend/next.config.ts frontend/tsconfig.json frontend/next-env.d.ts ./
COPY frontend/public ./public
COPY frontend/src ./src
# .version lives in the repo root — generate .env.local from it for Next.js build
COPY .version ./
RUN APP_NAME=$(grep '^APP_NAME=' .version | cut -d= -f2) && \
    VERSION=$(grep '^VERSION=' .version | cut -d= -f2) && \
    RELEASE_DATE=$(grep '^RELEASE_DATE=' .version | cut -d= -f2) && \
    printf 'NEXT_PUBLIC_APP_NAME=%s\nNEXT_PUBLIC_APP_VERSION=%s\nNEXT_PUBLIC_APP_RELEASE_DATE=%s\n' \
      "${APP_NAME:-EduGen}" "${VERSION:-1.0.0}" "${RELEASE_DATE:-}" > .env.local

ENV NEXT_TELEMETRY_DISABLED 1
ARG BACKEND_URL=http://backend:8000
ENV BACKEND_URL=$BACKEND_URL
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# create mount point for shared common files
RUN mkdir -p /app/common_filles && chown nextjs:nodejs /app/common_filles

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
