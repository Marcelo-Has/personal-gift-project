---
paths:
  - "src/**/auth/**"
  - "src/**/api/**"
  - "src/**/admin/**"
  - "**/*firebase*"
  - "**/*stripe*"
  - "**/*webhook*"
---
# Regras de segurança (carregam ao tocar código sensível)

Baseline obrigatório (detalhes em `docs/ARCHITECTURE.md`, Parte 3):
- AuthZ forte no `/admin` (+ MFA). Nenhuma rota administrativa exposta sem autorização.
- Regras mínimas de acesso no Firebase: cada usuário só acessa os próprios dados; nada público.
- URLs de foto sempre **assinadas e expiráveis**; nunca links públicos permanentes.
- Valide e sanitize TODA entrada. Webhooks Stripe: verifique a assinatura antes de confiar.
- Segredos só em variáveis de ambiente / GitHub Secrets. Menor privilégio nas chaves.
- Rate limiting e limites de upload em rotas públicas.
- Sem PII em logs. Criptografia em trânsito (TLS) e em repouso.

Enfraquecer este baseline é **Decision Gate** (ver `docs/AUTONOMY.md`). Aplicá-lo é livre.
