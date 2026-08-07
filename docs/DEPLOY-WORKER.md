# Deploy do worker de geração (Cloud Run)

Este documento existe porque o controle de acesso do worker **é da plataforma, não da
aplicação** ([D-069]): `worker/handler.ts` não implementa autenticação de propósito. Se o
serviço subir com `--allow-unauthenticated`, `POST /gerar` vira um endpoint público que dispara
o pipeline pago sobre o pedido de qualquer usuário, lendo rascunho e fotos com credencial de
admin — as regras do Firebase não participam dessa decisão.

Achado A-1 da revisão de segurança da PR #150: esse controle não estava em lugar nenhum do
repositório — era uma caixinha marcada à mão no console, e `gcloud run deploy` oferece
`--allow-unauthenticated` como o caminho de menor atrito. Este arquivo é o registro mínimo
para que a escolha certa seja repetível e conferível. **Não é IaC** — quando o deploy virar
automação de verdade, este documento vira a especificação dela.

## Estado atual

| Item | Valor |
|---|---|
| Serviço | `hello` — **nome herdado do quickstart**, ver dívida abaixo |
| Região | `us-east1` (a mesma do Firestore) |
| Service account anexada | `worker-geracao@personal-gift-project.iam.gserviceaccount.com` |
| Autenticação | exigida — só `worker-geracao` tem `roles/run.invoker` |
| Concorrência | 1 (cada spread lança um processo do Chrome) |
| Timeout | 3600 s |
| Segredos | `ANTHROPIC_API_KEY` e `OPENAI_API_KEY` via Secret Manager |
| Usuário do container | `node` (uid 1000), não root |

## Deploy

O deploy hoje é automático: um trigger do Cloud Build constrói a imagem a partir do
`Dockerfile` e implanta. Para deploy manual, ou para recriar o serviço:

```bash
gcloud run deploy <servico> \
  --source . \
  --region us-east1 \
  --no-allow-unauthenticated \
  --service-account worker-geracao@personal-gift-project.iam.gserviceaccount.com \
  --concurrency 1 \
  --timeout 3600 \
  --set-env-vars FIREBASE_PROJECT_ID=personal-gift-project,FIREBASE_STORAGE_BUCKET=personal-gift-project.firebasestorage.app \
  --set-secrets ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest
```

`--no-allow-unauthenticated` é obrigatório e não é default do prompt interativo.

## Conferência obrigatória depois de qualquer deploy

```bash
gcloud run services get-iam-policy <servico> --region us-east1
```

**Não pode existir** binding de `roles/run.invoker` para `allUsers` nem
`allAuthenticatedUsers`. O esperado é apenas a service account que invoca (hoje
`worker-geracao`, que é também quem o trigger do Eventarc usa).

Conferência empírica, que não depende de ler a política certo:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://<servico>.run.app/          # espera 403
TOKEN=$(gcloud auth print-identity-token)
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $TOKEN" \
  https://<servico>.run.app/                                                 # espera 200
```

## Gatilho

O worker não é chamado pelo webhook do Stripe ([D-070]): a escrita de `aguardando_geracao` no
Firestore é a própria fila, e um trigger do Eventarc entrega o evento.

```bash
gcloud eventarc triggers describe pedido-aguardando-geracao --location us-east1
```

O destino precisa apontar para o serviço certo, no path `/eventos/pedido`. O
`--event-data-content-type` tem de ser `application/protobuf`: o Eventarc **recusa**
`application/json` para `google.cloud.firestore.document.v1.written` ([D-071]).

Em Git Bash, `--destination-run-path=/eventos/pedido` é convertido em caminho do Windows. Use
`MSYS2_ARG_CONV_EXCL='--destination-run-path' gcloud ...`.

## Dívida conhecida (não é trabalho desta entrega)

1. **O serviço se chama `hello`**, nome do quickstart do Cloud Run. Renomear exige criar o
   serviço novo, reapontar o trigger do Eventarc, verificar e só então apagar o antigo — o
   Cloud Run não renomeia serviço no lugar.
2. **O trigger do Cloud Build está preso a uma branch de feature**
   (`^feat/f2-07b-worker-cloud-run$`). Depois que essa branch for mergeada e apagada, nenhum
   push constrói ou implanta o worker: ele congela no último commit dela. Precisa apontar para
   `^main$`.
3. **Não há verificação no CI** de que o serviço exige autenticação. Enquanto não houver, a
   conferência acima é manual e obrigatória.
