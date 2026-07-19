# Saldo ChatGPT Work

Extensão local para Google Chrome que consulta o uso da conta conectada no ChatGPT e mostra:

- percentual **restante** na janela de 5 horas;
- percentual **restante** no limite semanal;
- horário de reinício de cada janela;
- limites adicionais retornados para a conta, quando existirem;
- no ícone da extensão, o menor saldo entre os dois limites principais.

## Instalação

1. Extraia o arquivo ZIP para uma pasta permanente.
2. No Chrome, abra `chrome://extensions`.
3. Ative o **Modo do desenvolvedor**, no canto superior direito.
4. Clique em **Carregar sem compactação**.
5. Selecione a pasta extraída `saldo-chatgpt-work`.
6. Fixe a extensão **Saldo ChatGPT Work** na barra do Chrome.
7. Confirme que `https://chatgpt.com` está conectado na conta correta.

## Como interpretar

- O número mostrado sobre o ícone é o **menor percentual restante** entre a janela de 5 horas e a janela semanal.
- Verde: mais de 25% restante.
- Laranja: de 11% a 25% restante.
- Vermelho: 10% ou menos restante.
- A atualização automática ocorre a cada 5 minutos. O botão **Atualizar** força uma nova consulta.

## Escopo e limitações

- O painel acompanha os limites compartilhados de recursos agentivos do ChatGPT Work e do Codex retornados para a conta.
- Ele não representa os limites separados de conversa comum, geração de imagens, voz, pesquisa profunda ou upload de arquivos.
- A consulta usa uma interface interna do próprio ChatGPT. Como não é uma API pública estável, uma mudança futura da OpenAI pode exigir atualização da extensão.
- A extensão não guarda o token da sessão e não envia dados a terceiros. O token é usado apenas em memória para consultar o próprio `chatgpt.com`.
