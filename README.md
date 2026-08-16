# R1 Academia

Site institucional + sistema de gestão de alunos da **R1 Academia**, integrado ao Supabase.

## Funcionalidades

- Cadastro online de alunos
- Planos mensal, trimestral, semestral e anual
- Cálculo automático de vencimento
- Painel do proprietário
- Alunos ativos, próximos do vencimento e vencidos
- Aviso de vencimento pelo WhatsApp
- Renovação manual de plano
- Histórico de renovações
- Controle de pagamentos
- Cadastro e edição de planos
- Supabase Auth no painel administrativo
- Banco de dados online com RLS

## Arquivos principais

- `index.html` — site público e matrícula
- `admin.html` — painel do proprietário
- `styles.css` — identidade visual
- `app.js` — lógica do site público
- `admin.js` — lógica do painel
- `config.js` — conexão pública com Supabase
- `supabase-schema.sql` — estrutura do banco

## Publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie todos os arquivos deste projeto para a raiz do repositório.
3. Vá em **Settings → Pages**.
4. Em **Build and deployment**, selecione:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/(root)**
5. Salve.
6. O GitHub mostrará a URL pública do site.

## Painel administrativo

Depois da publicação, acesse:

`https://SEU-USUARIO.github.io/SEU-REPOSITORIO/admin.html`

O login utiliza o usuário criado em **Supabase → Authentication → Users**.

## Segurança

A chave utilizada em `config.js` é uma chave **publishable** do Supabase, própria para uso em frontend.
Nunca coloque uma `service_role` key no GitHub.

As permissões reais do banco são protegidas por **Row Level Security (RLS)**.

## Banco de dados

O projeto Supabase da R1 Academia já foi criado e o frontend está configurado para ele.
