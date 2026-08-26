# syntax=docker/dockerfile:1

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# O generate não consulta o banco, mas o Prisma 7 carrega a configuração e
# espera uma URL sintaticamente válida durante o build da imagem.
RUN DATABASE_URL=mysql://build:build@127.0.0.1:3306/build npx prisma generate \
    && npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    API_PORT=3000

RUN apk add --no-cache dumb-init wget
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
    && npm cache clean --force
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/generated ./generated
# O nest emite dist/src/... porque o client gerado entra no grafo de build.
# O import relativo ../../../generated a partir de dist/src/common/prisma
# resolve para dist/generated.
COPY --from=build --chown=node:node /app/generated ./dist/generated

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/saude >/dev/null || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]
