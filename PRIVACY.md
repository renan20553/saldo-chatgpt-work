# Política de Privacidade — Saldo ChatGPT Work

Última atualização: 19 de julho de 2026.

## Resumo

O Saldo ChatGPT Work exibe, no próprio navegador, o percentual restante dos limites compartilhados de uso do ChatGPT Work e do Codex para a conta que já está autenticada em `chatgpt.com`. A extensão não vende dados, não exibe publicidade, não cria perfis e não envia informações a servidores próprios ou de terceiros.

## Dados processados

Para consultar e apresentar o saldo, a extensão processa:

- o estado da sessão autenticada do ChatGPT;
- um token de acesso usado somente em memória durante a consulta;
- identificadores técnicos da conta ou do workspace retornados pela sessão;
- percentuais utilizados, percentuais restantes e horários de reinício dos limites;
- a última leitura de uso e o horário da atualização.

O token de acesso não é gravado no armazenamento da extensão. A última leitura de uso pode ser mantida localmente para que o painel apresente o resultado mais recente e reduza consultas repetidas.

## Compartilhamento e venda

Nenhum dado é vendido, transferido ou compartilhado com terceiros. As únicas comunicações de rede são feitas diretamente com `chatgpt.com` para consultar a sessão e os dados de uso da própria conta autenticada. A extensão não utiliza ferramentas de análise, rastreamento, publicidade ou telemetria.

## Permissões

- `alarms`: agenda atualizações periódicas do saldo;
- `storage`: guarda localmente a última leitura e informações de atualização;
- acesso a `https://chatgpt.com/*`: consulta a sessão e os limites da conta já autenticada.

## Retenção e exclusão

O token de acesso permanece somente em memória durante a consulta. A última leitura de uso fica no armazenamento local do Chrome até ser substituída, até o usuário limpar os dados da extensão ou até remover a extensão.

## Segurança e limitações

Todo o processamento ocorre localmente, e os dados trafegam diretamente entre o navegador e o ChatGPT. A extensão depende de interfaces do ChatGPT que podem mudar ou deixar de estar disponíveis.

## Alterações

Esta política poderá ser atualizada se o funcionamento ou as exigências legais mudarem; a data acima indicará a versão vigente.

## Contato

Dúvidas sobre privacidade podem ser enviadas pela área de issues do projeto: https://github.com/renan20553/saldo-chatgpt-work/issues

## Independência

Esta é uma extensão independente e não é afiliada, patrocinada ou endossada pela OpenAI. ChatGPT e Codex são marcas de seus respectivos proprietários.
