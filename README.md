# Saldo ChatGPT Work — 1.1.0 (candidata a revisão)

Uma única extensão Manifest V3 para Chrome e Microsoft Edge, em português brasileiro. Exibe os limites de uso retornados pela sessão do ChatGPT e oferece links para concluir o gerenciamento no próprio ChatGPT. Extensão independente, sem afiliação, patrocínio ou endosso da OpenAI.

**Não publicada.** O pacote foi preparado para revisão. A homologação com a extensão instalada, duas contas e ambientes privados ainda está pendente. Veja [os resultados e limites da validação](docs/TEST_RESULTS.md).

## Instalação para revisão

1. Extraia o ZIP de revisão para uma pasta permanente. O `manifest.json` deve ficar na raiz dessa pasta.
2. Chrome: abra `chrome://extensions`. Edge: abra `edge://extensions`.
3. Ative **Modo do desenvolvedor** e escolha **Carregar sem compactação** (ou **Carregar descompactado**).
4. Selecione a pasta extraída, fixe o ícone e entre no ChatGPT nesse perfil do navegador.
5. Após alterar os arquivos, recarregue a extensão na página de extensões.

Distribuição pretendida: Chrome Web Store, usando o mesmo pacote no Chrome e no Edge. No Edge, a instalação pela loja do Chrome pode exigir permitir extensões de outras lojas; políticas da organização podem restringi-la. Esta revisão não foi enviada a nenhuma loja.

## Anônimo e InPrivate

A permissão é habilitada **manualmente pelo usuário**:

- Chrome: `chrome://extensions` → Detalhes da extensão → **Permitir no modo anônimo**.
- Edge: `edge://extensions` → Detalhes da extensão → **Permitir no InPrivate**.

Abra uma janela privada e entre no ChatGPT nela. O login normal não serve de alternativa quando a sessão privada está desconectada. O popup identifica **Modo anônimo** ou **InPrivate**. As janelas privadas seguem a sessão compartilhada pelo próprio navegador, não uma conta independente por janela.

`incognito: split` cria contextos separados. O cache privado não recebe uma referência ao armazenamento persistente. Identidade, seleção, token, respostas, percentuais, créditos/redefinições e erros de uso ficam somente em memória nesse contexto. Suspender o worker descarta esse cache; a próxima consulta valida novamente a sessão privada. Ao fechar a última janela privada, a extensão cancela requisições, limpa a memória e remove seus agendamentos privados.

Apenas preferências não sensíveis de aparência podem ser lidas do armazenamento compartilhado. Alterações feitas no popup privado não são persistidas. O navegador pode manter um alarme operacional com o prazo de espera de uma falha/`Retry-After`; ele não contém conta, token, saldo ou data de redefinição de uso. Datas de redefinição privadas não são gravadas em alarmes: o temporizador é apenas em memória.

## Como interpretar o painel

- O badge mostra o **menor percentual restante válido** entre os limites principais; o tooltip descreve os dois valores e o determinante.
- Texto branco explícito e fundos escuros. No Edge, o número ocupa automaticamente o ícone inteiro para melhorar a leitura. O símbolo `%` permanece no tooltip e no painel. São gerados ícones para diferentes escalas de tela.
- No Chrome, o badge nativo continua como padrão; **Aparência e dados locais → Mostrar número maior no ícone** ativa a alternativa. Ela também é usada se a API de texto branco não existir, falhar ou reportar outra cor. O badge nativo é apagado quando o número é desenhado no ícone.
- `…`: carregamento sem leitura; `—`: indisponível; `!`: erro ou bloqueio; `~`: leitura desatualizada. Um limite vencido não é automaticamente redefinido para 100%.
- Duração vem de `limit_window_seconds`, sem pressupor que toda janela primária dura 5 horas. O painel mostra contagem regressiva e data/hora completa no fuso do navegador.
- Percentuais ausentes ou inválidos são indisponíveis. Zero válido continua zero. Estados explícitos de bloqueio são preservados.
- Se a sessão não identificar um workspace inequívoco, o painel pede seleção entre os identificadores fornecidos por ela. A extensão não escolhe a primeira conta silenciosamente. Essa seleção não altera o workspace do site; confira-o ao abrir gerenciamento.

## Créditos e redefinições nesta revisão

A quantidade `rate_limit_reset_credits.available_count`, já usada no repositório, é apresentada quando válida. A origem HTTP do saldo de créditos, estado de recarga, tipo/alcance e vencimentos individuais **ainda não foi validada nas contas reais**. Esses novos mapeamentos estão desativados; o painel informa a limitação e oferece links verificados para `https://chatgpt.com/#settings/Usage` e, em planos empresariais reconhecidos, `https://chatgpt.com/admin/billing`.

Os links abrem na mesma janela/contexto do popup. Compras, recarga e uso de redefinições só são concluídos no ChatGPT. A extensão não executa essas operações e não anuncia promoções. O cenário com 100%, 58%, zero créditos e duas redefinições é uma demonstração fictícia excluída do ZIP da extensão.

## Atualização e retenção

Atualização periódica a cada 5 minutos; também na primeira abertura do popup, retomadas relevantes e durante o uso do painel. Cada consulta verifica a sessão antes e depois da resposta. A atualização mantém a leitura anterior identificada como desatualizada; logout/troca detectados cancelam a requisição e invalidam o cache. Não há acesso à API de cookies: mudanças são detectadas em consultas e eventos de navegação, não instantaneamente em toda alteração de sessão no site.

O cache normal tem chave por usuário e workspace, validade de 15 minutos e é recuperado somente após confirmar a mesma sessão. Dados expirados são removidos na próxima limpeza/acesso, ou ao detectar logout/troca, apagar dados ou desinstalar a extensão. Com o navegador fechado, não há execução para remover bytes exatamente no vencimento. Tokens e respostas brutas nunca são gravados.

Há timeout de 12 segundos por requisição, deduplicação, cancelamento e respeito a `Retry-After`. O navegador pode atrasar alarmes/suspender workers; a próxima retomada consulta a fonte. No privado, perder o temporizador em memória não permite recuperar saldos do contexto normal.

## Desenvolvimento

Requer Node.js 20+ para os testes e Python 3.10+ para empacotar. Não há dependências de produção nem instalação de pacotes.

```sh
npm test
node scripts/preview.mjs
python scripts/package.py
```

O preview em `http://127.0.0.1:8765/preview` usa o mesmo HTML/CSS/renderizador, mas dados fictícios e nenhum acesso ao ChatGPT. Não é um teste de instalação, sessão ou badge nativo.

Veja [mapeamento e fontes](docs/DATA_MAPPING.md), [roteiro de homologação](docs/MANUAL_TESTS.md), [texto da loja e permissões](docs/STORE_LISTING.md) e [privacidade](PRIVACY.md). As interfaces HTTP do ChatGPT são internas e podem mudar; não há promessa de API pública estável.
