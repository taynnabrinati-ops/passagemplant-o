# Site da passagem de plantão + robô do Vivver, num container só.
# A imagem do Playwright já traz o Chromium e as bibliotecas que ele precisa.
FROM mcr.microsoft.com/playwright:v1.49.1-noble

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev --no-audit --no-fund || true

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    COOKIE_SEGURO=1 \
    VIVER_URL=https://macae-rj.vivver.com/login \
    VIVER_SETOR_PADRAO="Politrauma 3"

# Roda sem privilégios de administrador.
USER pwuser
EXPOSE 8080
CMD ["node", "server/index.mjs"]
