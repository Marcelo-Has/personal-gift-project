# Imagem do worker de geração pesada (F2-07b, issue #148) — a Opção C de [D-068].
#
# A premissa desta imagem é o oposto da que falhou na Netlify: **nada é empacotado**. O
# repositório é copiado com a estrutura de diretórios intacta e executado com `tsx`, porque
# `product-skills/loader.ts` resolve as skills a partir de `import.meta.url` e confirma o
# caminho no disco, e `render-shared.ts` acha a fonte por `require.resolve`. Um bundler
# destrói as duas coisas — foi exatamente o que reprovou a PoC de D-063.
FROM node:22-slim

# Google Chrome de verdade, não o Chromium do Playwright: [D-062] lança com
# `channel: 'chrome'`, que procura o binário do Chrome instalado no sistema
# (`/opt/google/chrome/chrome`) — foi a ausência dele que reprovou a PoC na Netlify.
# `fonts-liberation` cobre o fallback de fonte do Chrome; a fonte do PDF (Lora) é embutida
# em base64 pelo próprio render, vinda de `node_modules`.
RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates curl gnupg fonts-liberation \
	&& curl -fsSL https://dl.google.com/linux/linux_signing_key.pub \
		| gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
	&& echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] https://dl.google.com/linux/chrome/deb/ stable main" \
		> /etc/apt/sources.list.d/google-chrome.list \
	&& apt-get update \
	&& apt-get install -y --no-install-recommends google-chrome-stable \
	&& apt-get purge -y curl gnupg \
	&& apt-get autoremove -y \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

# `--omit=dev` funciona porque tudo que o worker usa em runtime está em `dependencies`:
# playwright-core, firebase-admin, pdf-lib, jimp, zod, @fontsource/lora e tsx. Foi por este
# motivo que [D-066] moveu `pdf-lib` para lá. Camada separada do código para aproveitar o
# cache do Docker entre builds que só mudam `src/`.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Sem `tsconfig.json` de propósito: ele estende `./.svelte-kit/tsconfig.json`, que só existe
# depois do `svelte-kit sync` e não faz sentido aqui. `tsx` apaga os tipos sem precisar dele.
COPY src ./src
COPY worker ./worker

ENV NODE_ENV=production
# O sandbox do Chrome não sobe dentro do container (sem namespaces de usuário), e
# `/dev/shm` é pequeno demais para o Chrome renderizando página grande. O isolamento aqui é
# o próprio container, não o sandbox do processo — ver o comentário em `render-shared.ts`.
ENV CHROME_NO_SANDBOX=1
# Porta que o Cloud Run injeta; o default existe para `docker run` local.
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "run", "worker"]
