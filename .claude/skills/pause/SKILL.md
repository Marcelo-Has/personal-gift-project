---
description: Pausa a fábrica — desliga os workflows que agem sozinhos, sem apagar nada. Uso: /pause
---

Você vai pausar a fábrica para que **nada rode autonomamente**.

## Passos
1. `gh workflow disable supervisor.yml`   (para de criar issues no cron)
2. `gh workflow disable implement.yml`     (para de implementar mesmo se aparecer status:ready)
3. `gh workflow disable daily-report.yml`  (para o relatório agendado)
4. Confirme com `gh workflow list` e me diga o estado de cada um.

## Observações
- `ci`, `review`, `security` e `fix` continuam ligados, mas são **passivos** — só rodam quando
  VOCÊ abre/atualiza um PR. Isso é intencional.
- Nada é apagado; reverter é `/resume`.
