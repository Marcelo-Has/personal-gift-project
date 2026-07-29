# Right-sizing — qualidade sem over-engineering

Princípio: construir para a **fase atual** e o **risco real**. Qualidade que importa =
correção, segurança de dado de usuário real, e decisões caras de reverter. Excesso = polir
o que não tem usuário, não tem dado, ou é barato de adicionar depois.

## O filtro para QUALQUER achado ou ideia de melhoria
1. Afeta **correção** ou **segurança de dado real**, no que está sendo entregue AGORA? → fazer.
2. É **caro de reverter** depois (arquitetura, modelo de dados, compromisso quase irreversível)? → fazer.
3. Nenhum dos dois? → **adiar ou descartar.** Não construir agora.

## Para quem implementa (Developer)
- **YAGNI:** entregue a DoD da issue, não futuros hipotéticos.
- Nenhuma abstração/camada nova sem um **segundo uso concreto**.
- **Prefira defaults do framework** (Svelte/SvelteKit); não reestruture o padrão para
  satisfazer um nitpick.
- PR pequeno e focado no escopo da issue. Achou algo fora do escopo? **Não faça junto** —
  registre como sugestão/issue; não inche o PR.

## Para revisores (review e security)
- Classifique cada achado por **severidade E por fase**: é blocker do que está sendo
  entregue, ou é melhoria futura?
- Marque LOW/INFO e riscos **hipotéticos** (sem superfície atual) explicitamente como
  **"ADIAR — não agir agora"**. Não os transforme em trabalho imediato.
- **NÃO proponha** hardening, abstração ou cobertura que não esteja ligada a um requisito
  da fase atual. Aviso para o futuro é bem-vindo, mas rotulado como tal.
- O **baseline de segurança** das issues da fase (regras do Firebase, URLs assinadas,
  validação de entrada, webhook verificado) **NÃO é "excesso"** — isso permanece obrigatório.

## Roteamento
- Achado de hardening/polimento **LOW/INFO → backlog da Fase 5** (endurecimento), **não**
  vira `status:ready`. Só crie issue quando for agir de fato.
- Em dúvida entre "fazer agora" e "adiar": **adiar** e anotar. É mais barato adicionar
  depois do que remover complexidade prematura.