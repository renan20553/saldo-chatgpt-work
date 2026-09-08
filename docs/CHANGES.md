# Alterações

## 1.1.4 — valores empilhados

- 5 horas na linha superior e semanal na inferior, sem percentual ou separador. Cada linha usa a largura inteira do ícone; os dígitos têm 4 × 7 pixels e espaçamento inteiro, inclusive em 100.
- Ordem dos dados, cores, estados de erro e leitura com apenas um limite preservados. Fonte do popup preservada.
- Publicação da versão 1.1.4 no GitHub e envio à Chrome Web Store autorizados pelo mantenedor em 7 de setembro de 2026.

## 1.1.3 — dois valores separados por barra vertical

- Indicador `5 horas|semanal`, sem símbolo de percentual e sem médias. Ordem determinada pela duração, zero preservado, valor único quando só uma janela está disponível.
- Desenho próprio com algarismos fixos; o caso 100 usa espaçamento fracionário determinístico para manter os três dígitos. Mesma implementação no Chrome e Edge.
- Atualizações idênticas não redesenham o ícone; novas abas recebem o indicador, e a ausência de dados restaura o ícone original.
- Alterações preparadas localmente. Envio ao GitHub aguarda autorização explícita do usuário após a revisão.


## 1.1.2 — indicador padronizado e popup mais simples

- Avisos no popup distinguem espera de 5 horas de esgotamento semanal. A duração vem dos dados, sem presumir a posição das janelas.

- Mesmo desenho arredondado do indicador no Chrome e no Edge, com texto branco e seis resoluções; configurações antigas não causam divergência entre os navegadores.
- Removida a linha “Workspace consultado” da identificação no popup. A conta e a seleção necessária para resolver ambiguidade continuam disponíveis; o isolamento interno por workspace permanece.
- Removida a opção de aparência que alternava entre indicadores diferentes. A fonte do popup continua igual à 1.1.0.
- Localizada e documentada a consulta oficial de detalhes das redefinições. A ativação continua pendente da confirmação de uma resposta real; a navegação de automação foi bloqueada pelo navegador.

## 1.1.1 — número maior na barra do Edge

- Edge desenha o percentual como número grande no ícone, automaticamente. A unidade permanece no tooltip e no painel.
- Desenho com ajuste pela largura real do texto, centralização e seis resoluções para diferentes escalas de tela.
- Chrome mantém seu badge nativo por padrão, com opção de número maior.
- Popup conserva a fonte da 1.1.0. Incluída prévia reproduzível do indicador em `/badge-preview`.

## Histórico da candidata 1.1.0

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
