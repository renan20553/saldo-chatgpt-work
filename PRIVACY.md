# Política de Privacidade — Saldo ChatGPT Work

Atualizada em 7 de setembro de 2026. Aplica-se à versão 1.1.4.

## Finalidade e dados processados

A extensão apresenta limites de uso da conta autenticada em `chatgpt.com`. Processa o token de sessão em memória, identificadores de usuário/workspace, identificação exibida pela sessão, percentuais, horários de redefinição, estados de bloqueio e quantidade de redefinições quando retornada.

O painel contém seções para créditos e redefinições. Nesta versão, a leitura de saldo de créditos, recarga automática e detalhes individuais de redefinições ainda não está habilitada por falta de validação do mapeamento HTTP. Os links abrem páginas do próprio ChatGPT para consultar ou concluir o gerenciamento. Nenhuma compra, consumo de redefinição ou alteração de recarga é executada automaticamente.

## Ambiente normal

Uma leitura normalizada pode ser armazenada em `chrome.storage.local`, com chave por usuário e workspace e validade de 15 minutos. Só é reutilizada depois de verificar a mesma sessão. Tokens, cabeçalhos de autenticação e respostas brutas não são persistidos.

A validade controla o reaproveitamento, não uma garantia de eliminação física instantânea: os dados expirados são removidos na próxima limpeza/acesso. Logout ou troca detectados, o comando **Apagar dados deste ambiente** e a desinstalação também removem o cache. Preferências de aparência permanecem até serem substituídas ou a extensão ser removida.

## Ambiente anônimo/InPrivate

Identidade, seleção de workspace, token, dados de uso, respostas e erros ficam somente na memória do contexto privado. Não são gravados em `local`, `sync`, armazenamento de sessão da extensão, IndexedDB, arquivos ou logs. O cache é perdido quando o worker é encerrado; uma retomada exige nova consulta. A extensão também limpa o estado ao detectar o fechamento da última janela privada.

O armazenamento `local` é compartilhado pelo navegador mesmo com `incognito: split`; por isso o caminho do cache privado não usa essa API. O privado pode ler exclusivamente a preferência de aparência e não persiste alterações feitas nela.

Alarmes têm nomes fixos por contexto. Um prazo operacional de espera para novas requisições pode ser mantido pelo navegador para respeitar falhas e `Retry-After` após suspensão; não contém identidade, token, resposta, saldo nem data de redefinição privada. Datas de redefinição privadas são usadas apenas em temporizadores de memória. A extensão não tenta alterar a retenção da própria sessão/cookies do ChatGPT gerenciada pelo navegador.

## Rede, compartilhamento e permissões

As únicas consultas de produção são GET para a sessão e o uso no próprio `chatgpt.com`, por HTTPS. Não há servidor próprio, telemetria, publicidade, venda de dados ou envio a terceiros. A extensão não lê conversas.

- `alarms`: agendamento periódico e espera antes de novas tentativas.
- `storage`: cache normal e preferências de aparência.
- `https://chatgpt.com/*`: consultar a sessão e os limites autenticados.

Não solicita `cookies`, `tabs`, `scripting`, histórico, notificações ou acesso a todos os sites. Usa recursos básicos das APIs de janelas/abas para preservar contexto dos links e direcionar o badge, sem a permissão ampla `tabs`.

## Controle e limitações

O uso privado exige habilitação manual nos detalhes da extensão. A extensão nunca habilita essa autorização por conta própria e nunca usa a conta normal como alternativa para o privado.

As interfaces do ChatGPT utilizadas são internas e podem mudar. A detecção de logout/troca depende de consultas e eventos de navegação. O código possui testes automatizados; a validação com a extensão instalada em Chrome/Edge e duas contas ainda é uma pendência desta candidata.

## Contato e independência

[Issues do projeto](https://github.com/renan20553/saldo-chatgpt-work/issues). Extensão independente, não afiliada, patrocinada ou endossada pela OpenAI. ChatGPT e Codex são marcas de seus respectivos titulares.
