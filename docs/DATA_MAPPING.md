# Mapeamento de dados e limites de evidência

Data: 06/09/2026. Base examinada: `renan20553/saldo-chatgpt-work`, branch `main`, commit `6c4ad91ee781df7c0c61d36366229083dbf1a456` (1.0.0). A API do GitHub não retornou PRs abertos na inspeção inicial. O código foi baixado como arquivo oficial do GitHub; o Git local possui um commit de baseline do snapshot, não o histórico remoto original.

## Evidência utilizada

1. Código existente: chamadas `/api/auth/session` e `/backend-api/wham/usage`, percentuais, timestamps, contagem de redefinições e seleção antiga de conta. Isso comprova o contrato que o repositório tentava consumir, não a resposta atual de uma conta.
2. Modelos publicados pela OpenAI no commit `455318c2020d75ae7d66d6ccf19defda97edec34` de [openai/codex](https://github.com/openai/codex/tree/455318c2020d75ae7d66d6ccf19defda97edec34/codex-rs/codex-backend-openapi-models/src/models): `rate_limit_window_snapshot.rs`, `rate_limit_status_details.rs`, `rate_limit_status_payload.rs`, `additional_rate_limit_details.rs`. Confirmam nomes estruturais de limites e bloqueios. Não são capturas das contas do usuário.
3. A [documentação do App Server](https://learn.chatgpt.com/docs/app-server#6-rate-limits-chatgpt) descreve uma interface local com limites e detalhes opcionais de redefinições. Não autoriza tratar seus campos camelCase como o contrato HTTP `wham/usage`, nem substituir a sessão do navegador pela conta do Codex.
4. Páginas reais verificadas pela interface: `https://chatgpt.com/#settings/Usage` no Chrome com conta pessoal e `https://chatgpt.com/admin/billing` no Edge com workspace empresarial. As páginas mostram categorias de créditos, recarga e redefinições. Valores/identificadores pessoais observados não foram copiados para fixtures ou documentação.

A leitura direta de `/api/auth/session` pelo navegador de automação foi bloqueada com `ERR_BLOCKED_BY_CLIENT`. **Nenhuma resposta HTTP autenticada completa foi capturada ou validada nesta execução.** Não se tentou extrair cookies ou contornar o bloqueio. Os testes usam fixtures explicitamente sintéticas.

## Contrato implementado

| Entrada | Saída/regra | Evidência e limite |
|---|---|---|
| `accessToken` | Usado em memória como Bearer, nunca enviado ao popup | Consulta já existente; validação real pendente |
| `user.id` ou claim autenticada de usuário | Parte da chave usuário/workspace | Falta implica identidade indisponível |
| `active_account_id`, `activeAccountId`, `account.id` | Contexto explícito; conflitos exigem seleção | Mapeamento defensivo; confirmar formato da sessão real antes de publicar |
| Claim `https://api.openai.com/auth.chatgpt_account_id` | Contexto do token, se inequívoco | Formato publicado no [código de login do Codex](https://github.com/openai/codex/blob/main/codex-rs/login/src/token_data.rs); não é verificação criptográfica local, o servidor valida a autorização |
| `accounts[].account_id/id`, `name` | Candidatos à seleção; nunca escolhe posição zero | Legado com escolha explícita; lista deve vir da sessão autenticada |
| `rate_limit.*_window.used_percent` | Número finito de 0 a 100; restante = 100 − usado | Ausência/invalidade = indisponível; sem conversão de strings |
| `limit_window_seconds` | Duração informada, reconhece 18.000 e 604.800 segundos | Modelos oficiais; não inferir pela posição |
| `reset_at` | Epoch em segundos → milissegundos válidos | Se presente e inválido, não inventa alternativa |
| `reset_after_seconds` | Prazo relativo à leitura, somente se `reset_at` ausente | Zero válido; negativos/formatos inválidos recusados |
| `allowed: false`, `limit_reached: true` | Bloqueio explícito | Modelos oficiais; não fabricar percentual zero |
| `rate_limit_reached_type.type` | Cinco tipos reconhecidos de limites/créditos esgotados | Preserva mensagem de bloqueio independente dos percentuais |
| `additional_rate_limits[].rate_limit`, `limit_name` | Janelas adicionais com duração própria | Modelos oficiais; mantém compatibilidade com formato antigo |
| `code_review_rate_limit` | Seção adicional independente | Campo legado, quando objeto válido |
| `plan_type` | Identificação do plano informado | Sem presumir plano quando ausente |
| `rate_limit_reset_credits.available_count` | Inteiro seguro ≥ 0 | Campo legado; conferir retorno real antes de publicar |

## Campos novos deliberadamente não ativados

Saldo de créditos, estado de recarga, detalhes individuais de redefinições e promoções não têm mapeamento HTTP validado nesta execução. O parser retorna `credits.balance = null`, `credits.autoRecharge = null`, `resets.details = null`. O renderer informa que a consulta/detalhes não estão disponíveis nesta versão e encaminha ao ChatGPT. Não transforma desconhecido em zero, desativado, ilimitado ou não aplicável.

Para habilitá-los: confirmar na conta empresarial e na pessoal o endpoint efetivamente usado, autorização/workspace, formato, unidade do saldo, significado de ausência/null, tipo/alcance de cada redefinição, paginação e vencimento. Criar exemplos sanitizados desse contrato confirmado, sem tokens, cabeçalhos, IDs reais ou respostas integrais. Só então ampliar o parser e seus testes. A oferta promocional não é exibida pela extensão, mesmo tendo sido observada em uma página, pois falta uma fonte dinâmica aplicável à conta consultada.

## Sessão, isolamento e links

A extensão depende de [split e seu cookie store separado](https://developer.chrome.com/docs/extensions/reference/manifest/incognito), com [inIncognitoContext](https://developer.chrome.com/docs/extensions/reference/api/extension). Essa documentação fundamenta a arquitetura; a confirmação com duas contas no mesmo navegador ainda é pendente.

Cada consulta verifica a sessão antes e depois, compara a assinatura de usuário/contextos e descarta resultados que mudaram. Requisições canceladas também têm uma geração que impede publicação tardia. A seleção manual se vincula à assinatura da sessão, não a uma preferência compartilhada.

Os links usam a janela de origem, verificam `window.incognito` e só aceitam destinos predefinidos. Falta de janela cria explicitamente uma janela normal ou privada correspondente. A seleção de workspace no popup não muda o workspace do site. O [uso básico de tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs) não exige a permissão ampla `tabs`.
