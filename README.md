# R1 Academia

Versão pronta para GitHub com visual mais forte para academia, logo incluída e painel com mensagem automática de WhatsApp.

## Melhorias desta versão
- Logo da academia incluída na pasta `assets`
- Tela de matrícula com visual mais tecnológico e fundo maromba
- Banner/hero com identidade fitness
- Área de cadastro com painéis visuais e destaque da marca
- Botão de WhatsApp automático no painel do proprietário
- Ao clicar no cliente ou no botão WhatsApp, a mensagem já vai pronta automaticamente

## Arquivos principais
- `index.html`
- `admin.html`
- `styles.css`
- `app.js`
- `admin.js`
- `config.js`
- `supabase-schema.sql`
- `assets/r1-logo.png`
- `assets/hero-gym.png`
- `assets/tech-gym.png`

## Publicação no GitHub Pages
1. Crie um repositório no GitHub.
2. Envie todos os arquivos para a raiz do repositório.
3. Vá em **Settings > Pages**.
4. Escolha **Deploy from a branch**.
5. Selecione a branch `main` e a pasta `/(root)`.

## Painel administrativo
Acesse:
`/admin.html`

O login usa o usuário criado no Supabase Authentication.

## Segurança
O `config.js` usa a chave publishable do Supabase, própria para frontend.
Nunca publique a chave `service_role`.
