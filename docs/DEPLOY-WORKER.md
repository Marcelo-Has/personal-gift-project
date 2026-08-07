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
| Serviço | `worker-geracao` (mesmo nome da SA anexada, [D-072]) |
| Região | `us-east1` (a mesma do Firestore) |
| Service account anexada | `worker-geracao@personal-gift-project.iam.gserviceaccount.com` |
| Autenticação | exigida — só `worker-geracao` tem `roles/run.invoker` |
| Concorrência | 1 (cada spread lança um processo do Chrome) |
| Instâncias | máximo 3 |
| CPU / memória | 2 vCPU / 4 GiB (o Chrome não sobe com menos) |
| Ambiente de execução | gen2 |
| Timeout | 3600 s |
| Segredos | `ANTHROPIC_API_KEY` e `OPENAI_API_KEY` via Secret Manager |
| Usuário do container | `node` (uid 1000), não root |

## Deploy

O deploy é automático: o trigger do Cloud Build
`rmgpgab-hello-us-east1-Marcelo-Has-personal-gift-project--fegzg`
(id `15a60c5b-a449-4709-a852-f11e9bf9d53a`, região `global`) constrói a imagem a partir do
`Dockerfile` **a cada push na `main`** e implanta com `gcloud run services update`.

O **nome** do trigger ainda contém `hello` — ele foi gerado pelo console quando o serviço tinha
esse nome, e renomear um trigger significa recriá-lo com outro id, invalidando a referência
acima. O que importa é a substituição `_SERVICE_NAME`, que aponta para `worker-geracao`. Vá pelo
id, não pelo nome ([D-072]).

⚠️ O passo de deploy do trigger é `run services update`, não `run deploy`: ele **não cria** o
serviço. Se o serviço for apagado, o trigger passa a falhar — recrie com o comando abaixo antes.

```bash
gcloud run deploy worker-geracao \
  --source . \
  --region us-east1 \
  --no-allow-unauthenticated \
  --service-account worker-geracao@personal-gift-project.iam.gserviceaccount.com \
  --concurrency 1 \
  --timeout 3600 \
  --memory 4Gi \
  --cpu 2 \
  --max-instances 3 \
  --execution-environment gen2 \
  --set-env-vars FIREBASE_PROJECT_ID=personal-gift-project,FIREBASE_STORAGE_BUCKET=personal-gift-project.firebasestorage.app \
  --set-secrets ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest
```

`--no-allow-unauthenticated` é obrigatório e não é default do prompt interativo.

⚠️ **`--source .` não funciona hoje.** Ele sobe um zip para
`gs://run-sources-personal-gift-project-us-east1` e a SA de build
(`416249419814-compute@developer.gserviceaccount.com`) **não tem nenhuma permissão de
Storage** — o build morre em `403 storage.objects.get denied`. O trigger do GitHub funciona
porque o Cloud Build busca o código do repositório, não do bucket. Para deploy manual da árvore
local, ou se concede `roles/storage.objectViewer` àquela SA, ou se usa
`gcloud builds triggers run <trigger> --branch=<branch>` a partir de uma branch empurrada.

### Verificação em PR

O trigger `worker-geracao-build-pr` (id `1a352ae6-b049-4b55-8e6d-a2adde3f6135`) roda em PRs
para a `main` e **só constrói a imagem — não implanta**. Existe porque nenhum job de
`.github/workflows/ci.yml` toca o `Dockerfile`: sem ele, uma imagem quebrada só apareceria
depois do merge, e o modo de falha é o pior possível (o worker congela na revisão antiga e
nada avisa). Não é required check no branch protection: é sinal, não portão ([D-072]).

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

**Um HTTP 500 com latência `0s` nas entregas é esperado e não é falha do worker.** Com
`containerConcurrency: 1`, uma entrega que chega enquanto a instância já está gerando é recusada
pelo Cloud Run *antes* do container, com `The request was aborted because there was no available
instance`. O Eventarc reentrega em ~20 s, e aí o corte de idempotência de `worker/server.ts`
responde `ignorado`. Medido em [D-072]: 5 entregas para 3 escritas, uma delas 500 e reentregue.

Em Git Bash, `--destination-run-path=/eventos/pedido` é convertido em caminho do Windows. Use
`MSYS2_ARG_CONV_EXCL='--destination-run-path' gcloud ...`.

## Como renomear o serviço (o Cloud Run não renomeia no lugar)

Registrado porque foi feito uma vez ([D-072], `hello` → `worker-geracao`) e a ordem importa:
apagar o serviço antigo antes de verificar o novo derruba a fila em silêncio.

1. `gcloud run deploy <novo>` com **todos** os parâmetros da tabela acima.
2. Conferir o IAM do novo (seção anterior) — `roles/run.invoker` **não** é herdado; um serviço
   recém-criado tem política vazia e o Eventarc leva 403 até o binding existir.
3. Reapontar o trigger do Eventarc para o novo serviço e conferir com `triggers describe`.
4. Provar com um ponta a ponta de verdade.
5. Atualizar `_SERVICE_NAME` no trigger do Cloud Build.
6. **Só então** apagar o antigo.

Nunca deixe dois triggers do Eventarc vivos sobre o mesmo documento: o filtro é por caminho, não
por campo, e os dois serviços disputariam `iniciarGeracao` — um pode gastar a geração paga
enquanto o outro observa.

## Dívida conhecida (não é trabalho desta entrega)

1. **Não há verificação no CI** de que o serviço exige autenticação. Enquanto não houver, a
   conferência acima é manual e obrigatória.
2. **A configuração do build vive no console**, não no repositório: não existe `cloudbuild.yaml`
   versionado, então o que os triggers fazem só é auditável por `gcloud beta builds triggers
   export`. Foi exatamente isso que deixou a dívida da branch invisível até quebrar. Migrar para
   um `cloudbuild.yaml` versionado é melhoria conhecida e adiada ([D-072], `right-sizing.md`).
3. **A SA de build não tem permissão de Storage**, o que impede `gcloud run deploy --source .`
   (ver acima).
