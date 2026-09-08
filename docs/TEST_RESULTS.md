# Resultados de validação

## Candidata 1.1.4 — disposição vertical

- 89 testes automatizados passaram, incluindo todos os 10.201 pares de inteiros de 0 a 100 e seis resoluções. Testes verificam a independência das linhas, o espaçamento entre elas e entre os dígitos de 100.
- Prévia PNG em tamanho de 16 pixels e ampliada, gerada com os pixels do código de produção. HTML independente com as seis resoluções. Conferência visual da imagem; a barra da extensão instalada permanece pendente de avaliação pelo usuário.
- Esta rodada altera o desenho do ícone; não foi repetida a execução nos navegadores. Os resultados da rodada 1.1.3 abaixo referem-se ao desenho horizontal anterior.
- O mantenedor aprovou a prévia empilhada e autorizou a publicação no GitHub e o envio à Chrome Web Store em 7 de setembro de 2026. A aprovação não substitui os testes reais pendentes.

## Candidata 1.1.3 — dois valores, aprovação do GitHub pendente

- **88 testes automatizados passaram**, sem falhas ou ignorados. Um teste percorre **10.201 pares** de inteiros de 0 a 100, validando texto e geração do ícone. Cobertura de ordem invertida, dados ausentes/inválidos, zero, bloqueios, cache desatualizado e transições duplo/simples/ícone original.
- Prévia executada no Chrome e no Edge: **120/120 desenhos em cada navegador**, cobrindo 20 rótulos e seis resoluções (16, 20, 24, 32, 40 e 48 px). Inspeção em tema claro e escuro. As resoluções representam os fatores 100–300%; não foi alterada a escala do Windows.
- Popup no Edge: sucesso 10/10; 5 horas esgotadas 9/9; semanal esgotado 9/9; parcial 8/8; carregamento 8/8; falha 6/6; sem autenticação 8/8. Fonte computada preservada em 13 px. Dados explicitamente fictícios.
- **Limitação visual:** `100|100` ocupa quase toda a largura de 16 pixels e permanece compacto. O desenho especial preserva os três dígitos e o separador; a legibilidade na barra da extensão instalada deve ser confirmada pelo usuário. A prévia não substitui instalação real, acessibilidade assistiva ou testes de sessão privada.
- Prévia independente em `indicador-1.1.3-preview.html`, imagem comparativa em `indicador-1.1.3-preview.png` e resultado completo em `validation/automated-tests-1.1.3.txt`, junto aos pacotes. Nenhuma publicação no GitHub nesta etapa, conforme solicitado.


## Correção 1.1.2 — Chrome e Edge padronizados

- **72 testes automatizados passaram, sem falhas ou ignorados.** O teste de equivalência compara todas as chamadas do indicador em Chrome/Edge com preferências antigas diferentes; o teste de VMs confirma que ambos os contextos realmente desenharam o ícone nas abas corretas.
- Prévia do indicador em Chrome e Edge: **48/48 desenhos com texto branco em cada navegador**, em seis resoluções. As duas capturas foram inspecionadas e mostram o mesmo desenho arredondado. Isso valida a renderização de canvas, não a barra de uma extensão instalada.
- Prévia do popup: **10/10 verificações em cada navegador**, incluindo a remoção da linha de workspace. Estilo computado do corpo: **13 px** nos dois; a fonte foi preservada.
- A consulta oficial de redefinições foi localizada, mas a tentativa de acesso no Chrome pela automação retornou `net::ERR_BLOCKED_BY_CLIENT`. Os campos individuais continuam desativados até confirmar uma resposta real, conforme o requisito original. O contrato e a pendência estão em [DATA_MAPPING.md](DATA_MAPPING.md).
- Saída automatizada: `validation/automated-tests-1.1.2.txt`, junto aos ZIPs entregues. As pendências de teste da extensão instalada e de autenticação privada descritas no histórico continuam aplicáveis.

## Correção 1.1.1 — indicador no Edge

- As capturas do usuário mostraram o percentual pequeno na barra do Edge. O número agora ocupa automaticamente o ícone inteiro nesse navegador, com a unidade no tooltip e no popup.
- Fonte do popup restaurada aos mesmos tamanhos da versão 1.1.0 integrada no GitHub. A ampliação local do texto foi desfeita.
- **72 testes automatizados aprovados**, incluindo o uso automático do ícone no Edge com a preferência anterior desativada e a preservação do badge nativo no Chrome.
- Prévia de `iconPixels` executada no Edge: **48/48 desenhos com texto branco**, cobrindo oito rótulos em seis resoluções (16, 20, 24, 32, 40 e 48 pixels). Captura inspecionada em tamanho de ícone e ampliada; nenhum caractere ausente.
- Reproduzir: `node scripts/preview.mjs` e abrir `http://127.0.0.1:8765/badge-preview`.
- A prévia confere o desenho em uma página de teste. A confirmação do indicador atualizado na barra real do Edge permanece pendente após recarregar a extensão. As limitações de homologação da 1.1.0 abaixo continuam aplicáveis.

## Histórico da candidata 1.1.0

Data: 06/09/2026, horário local de São Paulo. **Preparada para revisão; homologação de sessão privada e badge nativo ainda pendente.**

## Testes automatizados

Execução: Node.js **24.19.0**, Windows. Comando:

```sh
node --experimental-vm-modules --test --test-reporter=tap tests/*.test.js
```

Resultado final: **70 testes passaram, 0 falhas, 0 ignorados**, incluindo:

- Percentuais ausentes/inválidos, zero válido, timestamps inválidos, duração desconhecida e seções parciais.
- Contas ambíguas, seleção verificada, cache por identidade, sessão ausente e expirada.
- Consultas concorrentes e respostas atrasadas depois de logout/troca de conta.
- Timeout, HTTP 401/403/429/500, JSON incompatível e Retry-After em segundos/data.
- Retomada do worker respeitando um prazo de espera operacional, sem identidade/saldo privado em armazenamento.
- Caminho de cache privado testado contra um objeto que falha caso qualquer API persistente seja acessada.
- Worker de produção carregado em **VMs JavaScript distintas com APIs do navegador e rede simuladas**, ambas compartilhando o mesmo mock de storage.
- Badge restrito às abas de cada contexto; API de texto branco e alternativas por ausência, falha, cor reportada incorreta e opção manual.
- Destinos permitidos, janela privada, bloqueio de mensagens cruzadas, cache corrompido e integridade do manifest/imports.

A saída completa está em `validation/automated-tests.txt` junto aos ZIPs entregues. O aviso de módulos VM experimentais pertence ao executor de testes Node; esse executor não integra a extensão.

Os mocks comprovam propriedades do código; **não comprovam o cookie store real, sessões de duas contas, suspensão real de worker ou cor efetivamente desenhada na barra do navegador**.

## Revisão de interface em navegadores reais com dados fictícios

Versões dos executáveis em uso: **Chrome 152.0.7977.76** e **Microsoft Edge 152.0.4191.66**.

Foi servido localmente o HTML/CSS/renderizador do popup, com um módulo de demonstração sem acesso a sessões ou APIs da extensão. Cenário solicitado: 100% na janela de 5 horas, 58% na semanal, zero créditos, duas redefinições completas com vencimentos diferentes. São valores fictícios e não pertencem ao parser de produção.

| Dimensão | Executado |
|---|---|
| Navegadores | Chrome e Edge |
| Viewport de revisão | 400 × 600 CSS px |
| Temas | Claro e escuro |
| Escala simulada do conteúdo | CSS zoom 100%, 125% e 150% |
| Estados | Sucesso, atualizando, falha temporária, sem login privado e dados parciais |
| Total | **60 combinações** |
| Verificações de DOM | **360/360 aprovadas** |
| Rolagem horizontal | Ausente nas 60 combinações após correção |

Também foram inspecionadas capturas completas nos temas claro (Chrome, 100%) e escuro (Edge, 150%), com nomes longos, datas, créditos/redefinições e rolagem vertical. O foco por Tab foi observado no Edge, com contorno sólido visível. O cenário de atualização manteve os dados visíveis e o botão desabilitado. Foram conferidos os papéis acessíveis `status`, `alert` e `progressbar`.

**Limites:** preview de página comum, não popup instalado. A ampliação foi feita por CSS zoom; não foi alterado o DPI/escala de exibição do Windows. Não houve teste com leitor de tela nem inspeção da barra real da extensão.

## Verificações reais de páginas e contas

A interface confirmou a conta pessoal no Chrome e o workspace empresarial no Edge, conforme informado pelo usuário. Destinos verificados:

- Chrome: `https://chatgpt.com/#settings/Usage`, com categorias de limites, créditos e redefinições.
- Edge: `https://chatgpt.com/admin/billing`, com saldo de créditos e gerenciamento de recarga.

Nenhuma compra, alteração de recarga ou uso de redefinição foi executado. Valores e identidades reais não foram copiados para fixtures/documentação.

## Limitações encontradas

- A leitura direta de `/api/auth/session` pelo navegador de automação retornou `ERR_BLOCKED_BY_CLIENT`. Não foram capturadas respostas autenticadas completas de sessão/uso.
- A ferramenta recusou controlar a aba interna `chrome://extensions` com a mensagem de que abas internas não podem ser assumidas. A candidata não foi carregada automaticamente nos perfis do usuário.
- A automação disponível não forneceu controle de janelas anônimas/InPrivate para completar a matriz com duas contas no mesmo navegador.

Portanto, os cenários de [MANUAL_TESTS.md](MANUAL_TESTS.md) continuam pendentes. A existência de contas diferentes no Chrome e no Edge não substitui os testes normal/privado dentro de cada navegador.

## Correções originadas pela validação

O teste de encerramento privado revelou uma corrida em que o agendamento podia ser recriado depois da limpeza. A implementação agora marca o contexto encerrado, cancela o temporizador e aguarda a fila de agendamento antes de limpar os alarmes. O teste passou após a correção.

A revisão de 400 px revelou rolagem horizontal causada por `max-width: 100vw` em conjunto com a barra vertical. A largura foi limitada ao contêiner, e a inspeção confirmou `scrollWidth == clientWidth` nos dois navegadores e nas três escalas.

## Antes de enviar à loja

Concluir os testes da extensão instalada, confirmar o mapeamento real da sessão e dos campos novos, verificar badge branco/fallback em ambos os navegadores e disponibilizar a política atualizada em URL pública. Os ZIPs são de revisão e não significam aprovação para publicação.
