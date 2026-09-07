# Texto para a Chrome Web Store — rascunho

Não enviar à loja antes de concluir os itens bloqueantes em MANUAL_TESTS.md. Esta execução não publicou a extensão.

## Nome

Saldo ChatGPT Work

## Descrição curta

Acompanhe os limites do ChatGPT Work e Codex no navegador, com percentuais restantes e horários de redefinição.

## Descrição detalhada

Consulte os limites retornados pela conta conectada ao ChatGPT sem sair do navegador. O ícone mostra o menor percentual restante válido, e o painel apresenta janelas de uso, contagem regressiva, data completa da próxima redefinição e horário da última leitura.

Recursos:

- Interface em português brasileiro, temas claro/escuro e navegação por teclado.
- Identificação da conta/workspace e aviso quando a sessão exigir uma escolha explícita.
- Avisos de carregamento, falha, bloqueio e leitura desatualizada, sem presumir saldo disponível.
- Quantidade de redefinições quando fornecida pela fonte consultada.
- Links para consultar créditos, recarga e gerenciar redefinições no próprio ChatGPT. A extensão não faz compras nem usa redefinições automaticamente.
- Arquitetura para ambientes normal e anônimo/InPrivate separados, mediante habilitação manual e login no ChatGPT em cada ambiente.

Créditos, recarga automática e detalhes individuais de redefinições ainda não têm leitura validada nesta versão; consulte-os pelos links para o ChatGPT. Os recursos disponíveis e o compartilhamento de limites dependem do plano/workspace. Conversas comuns não fazem parte destes limites de uso agentivo.

Esta extensão depende de interfaces internas do ChatGPT, que podem mudar. Não é um produto oficial e não é afiliada, patrocinada ou endossada pela OpenAI. Sem publicidade, telemetria ou servidores próprios.

## Finalidade única

Consultar e apresentar os limites de uso da sessão do ChatGPT no contexto do navegador e encaminhar o usuário ao gerenciamento correspondente no próprio ChatGPT.

## Justificativas de permissões

| Permissão | Necessidade concreta |
|---|---|
| `alarms` | Atualizar periodicamente, retomar consultas e respeitar intervalos de espera após falhas. |
| `storage` | Manter cache normal por usuário/workspace e preferências de aparência. Dados de uso privados não usam armazenamento persistente. |
| `https://chatgpt.com/*` | Consultar a sessão e os limites no próprio ChatGPT; reconhecer eventos desse site para invalidar dados potencialmente antigos. |

A API `tabs` é usada apenas em operações básicas para obter IDs/contexto, aplicar indicadores por aba e abrir páginas na janela correta. Não é solicitada a permissão ampla `tabs`. Não há `cookies`, `scripting`, `<all_urls>`, código remoto ou telemetria.

## Declaração de dados para revisão

O processamento inclui autenticação em memória, identificação da conta/workspace e informações de uso. Identificação e uso normalizados podem ficar no cache normal local; dados de uso privados não são persistidos. Não confundir ausência de transferência a servidores próprios com ausência de processamento de dados. Preencher as categorias efetivamente aplicáveis no formulário vigente da loja, de acordo com PRIVACY.md.

Hospedar a política de privacidade em URL pública acessível antes do envio. A política atual no GitHub remoto ainda pode ser a versão anterior; esta revisão não atualizou essa página remota.

## Instalação e material visual

Usar o mesmo ZIP no Chrome/Edge. Para revisão local, carregar a pasta extraída pela página de extensões. Para distribuição futura no Edge pela Chrome Web Store, seguir a autorização de extensões de outras lojas e as políticas administrativas do navegador.

Gerar capturas finais da extensão instalada após homologação. As imagens do preview são fictícias e não comprovam consultas reais nem a cor do badge nativo. Se usadas em material de divulgação, identificá-las como demonstração e mostrar somente recursos realmente habilitados no pacote publicado.
