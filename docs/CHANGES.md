# Alterações da candidata 1.1.0

Base: `main` em `6c4ad91ee781df7c0c61d36366229083dbf1a456`, versão 1.0.0. Cópia de revisão local; nenhuma publicação na Chrome Web Store nem alteração de conta/faturamento.

## Mudanças por arquivo

- `manifest.json`: Manifest V3, versão 1.1.0, `incognito: split`, worker como módulo; mesmas duas permissões e mesmo host.
- `service-worker.js`: inicialização por eventos/popup, estado por processo, agendamento, portas/mensagens verificadas, navegação e encerramento privado.
- `lib/session.js`: identidade explícita, seleção em ambiguidade, contexto do token e assinatura da sessão.
- `lib/client.js`: consultas GET, timeout/cancelamento, HTTP 401/403/429, JSON incompatível e Retry-After.
- `lib/controller.js`: deduplicação, geração para descartar respostas antigas, verificação da sessão antes/depois e leitura desatualizada limitada por validade.
- `lib/cache.js`: cache normal por usuário/workspace, validação de conteúdo, migração do cache legado e caminho privado exclusivamente em memória.
- `lib/usage.js`: percentuais estritos, duração/timestamps, seções parciais e bloqueios explícitos, sem novos campos HTTP presumidos.
- `lib/badge.js`: cor branca explícita, atualização por aba/contexto e alternativa de desenho no ícone.
- `lib/links.js`: destinos verificados e verificação de janela normal/privada.
- `popup.html`, `popup.css`, `popup.js`, `lib/render.js`: painel em português, identificação, créditos/redefinições, datas completas, contagem regressiva, temas, foco e avisos acessíveis.
- `tests/`: lógica, privacidade, cliente, pacote, integração do worker em VMs e demonstração visual sintética.
- `scripts/`: preview local isolado e empacotamento reproduzível com lista explícita de arquivos de produção.
- `README.md`, `PRIVACY.md`, `docs/`: instalação, retenção, fontes, testes, pendências e rascunho da loja.

Ícones originais preservados. Nenhum serviço externo, telemetria ou dependência de produção adicionado. Os novos detalhes de créditos/recarga/redefinições permanecem indisponíveis até validação factual do HTTP. O ZIP da extensão exclui testes, fixtures, preview, scripts de desenvolvimento e Git.
