# Homologação manual obrigatória antes da publicação

Status desta candidata: testes abaixo ainda pendentes na extensão instalada. Chrome pessoal e Edge empresarial são perfis de navegadores diferentes; isso NÃO comprova isolamento normal/privado dentro de um mesmo navegador.

Use a versão exata do ZIP de revisão. Registre versão do navegador, versão da extensão, data, resultado, evidência e restrições. Use nomes fictícios A/B no relatório; nunca registre cookies, tokens, IDs reais ou respostas integrais.

## Preparação

1. Carregar o pacote no Chrome e no Edge, sem publicar.
2. Confirmar console do worker sem erros de inicialização. Não copiar logs de rede com credenciais.
3. Habilitar manualmente anônimo/InPrivate nos detalhes da extensão.
4. Entrar na conta A no normal e B no privado DO MESMO navegador. Repita invertendo as contas quando necessário. Não é necessário atribuir contas diferentes a cada janela privada: elas compartilham sessão conforme o navegador.
5. Inspecionar localmente respostas da sessão e do uso; registrar apenas a estrutura sanitizada necessária para confirmar o mapeamento de conta, créditos e redefinições.

## Matriz de aceite

| Cenário | Chrome | Edge | Evidência esperada |
|---|---|---|---|
| A normal e B privado simultaneamente | Pendente | Pendente | Popup, consulta e badge correspondem à sessão de cada ambiente |
| Alternar abas e janelas | Pendente | Pendente | Atualização de B não altera o badge de A, inclusive abas de outros sites |
| A normal conectada, privado sem login | Pendente | Pendente | Pedido de login privado; nenhum saldo/identidade de A |
| B privado conectado, normal sem login | Pendente | Pendente | B funciona; normal pede login |
| Somente janelas privadas abertas | Pendente | Pendente | Primeiro popup inicializa e consulta B |
| Logout privado durante consulta lenta | Pendente | Pendente | Saldo limpo e resposta anterior descartada; normal intacto |
| Troca de conta/workspace no privado | Pendente | Pendente | Seleção e cache antigos invalidados; novo contexto confirmado |
| Suspensão/retomada do worker privado | Pendente | Pendente | Nova consulta; nenhum reaproveitamento de dados normais |
| Fechar todas as privadas e iniciar nova sessão | Pendente | Pendente | Sem identidade, saldos ou datas da sessão anterior |
| Links de uso, créditos e redefinições no privado | Pendente | Pendente | Permanecem privados; workspace do site conferido pelo usuário |
| Autorização privada desabilitada | Pendente | Pendente | Instruções corretas no popup normal; nenhuma tentativa de habilitar automaticamente |
| Inspeção de armazenamento após atividade privada | Pendente | Pendente | Nenhum token, ID, saldo, resposta ou data de redefinição privada persistido |
| Badge branco: sucesso, carregando, erro, indisponível | Pendente | Pendente | Texto branco legível na barra real; tooltip coerente |
| Alternativa desenhada no ícone | Pendente | Pendente | Texto branco e nenhum badge nativo duplicado |
| Temas e escalas reais do sistema | Pendente | Pendente | Sem cortes; foco visível; rolagem funcional |

## Verificação factual de novos campos

Antes de habilitar créditos/recarga/detalhes individuais, confirmar endpoint real, escopo de conta, cabeçalhos necessários, unidade, formato, semântica de null/ausência, contagem total versus lista e vencimentos. Remover dados pessoais dos exemplos. Não traduzir automaticamente o esquema do App Server para o endpoint HTTP da extensão.

Confirmar que `account.id`/campos de conta ativa representam o workspace esperado e que os candidatos de `accounts` realmente são autorizados nessa sessão. Em ambiguidade, manter o pedido de seleção. Verificar se o GET autenticado no worker privado recebe a sessão B, inclusive com A ausente.

Os links só navegam. Não é necessário comprar créditos, alterar recarga ou consumir uma redefinição para homologar esta candidata.

## Critério de liberação

Não publicar até completar a matriz de isolamento/autenticação/badge real. Recursos sem fonte confirmada devem continuar indisponíveis e descritos como tal, ou ser implementados após validação factual e novos testes. Atualizar a política pública e os materiais da loja para refletir exatamente o pacote a enviar.
