---
description: Retoma a fábrica — reabilita os workflows autônomos pausados por /pause. Uso: /resume
---

Você vai retomar a fábrica.

## Passos
1. `gh workflow enable supervisor.yml`
2. `gh workflow enable implement.yml`
3. `gh workflow enable daily-report.yml`
4. Confirme com `gh workflow list` e me diga o estado de cada um.

## Observação
Ao retomar, o Supervisor volta a criar issues no **próximo horário do cron**. Se quiser
disparar já, rode o Supervisor por `workflow_dispatch` (botão "Run workflow" na aba Actions).
