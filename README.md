# R1 Academia — Premium V2

Esta versão foi atualizada com as mudanças pedidas:

## Novidades
- imagem ao lado do cadastro trocada por imagem de treino/academia;
- campo **Forma de pagamento** no cadastro do aluno:
  - PIX
  - Cartão
  - Dinheiro
- financeiro melhorado;
- página/aba para **clientes que vão vencer**;
- página/aba para **clientes que renovaram**;
- ao renovar, o sistema já lança o pagamento e **atualiza o financeiro automaticamente**;
- botão de WhatsApp continua enviando a mensagem automática pronta.

## Importante sobre o banco
Foi atualizado o arquivo `supabase-schema.sql` com:
- `students.payment_method_preference`
- `renewals.payment_method`

Se o seu banco já existia antes, rode novamente o SQL atualizado no Supabase para adicionar esses campos.

## Arquivos principais
- `index.html`
- `admin.html`
- `styles.css`
- `app.js`
- `admin.js`
- `config.js`
- `supabase-schema.sql`

## Publicação
Suba todos os arquivos para a raiz do repositório no GitHub.


## Premium V3
- nova aba **Matrículas pendentes**;
- botão **Confirmar matrícula e pagamento**;
- ao confirmar:
  - muda aluno de `pending` para `active`;
  - registra o pagamento no financeiro;
  - salva PIX, Cartão ou Dinheiro;
  - atualiza os KPIs;
  - redireciona o painel para a aba Financeiro;
- renovação continua atualizando o financeiro automaticamente.


## Premium V4 — Suspensão e reativação
- botão **Suspender matrícula** no aluno ativo;
- aluno suspenso permanece salvo no banco;
- nova aba **Matrículas suspensas**;
- busca por nome ou WhatsApp;
- reativação permite escolher:
  - novo plano;
  - PIX, Cartão ou Dinheiro;
- ao reativar:
  - status volta para `active`;
  - início passa a ser a data da reativação;
  - novo vencimento é calculado pelo novo plano;
  - pagamento entra no Financeiro automaticamente;
  - reativação entra no histórico.
