# Guia de Deploy Unificado no Railway 🚂

Este guia explica como hospedar **todo o projeto** (Frontend + Backend + Banco de Dados) no Railway.

## 1. Preparação (GitHub)

Antes de tudo, garanta que seu código está no GitHub.

1.  **Commit & Push**: Envie todas as alterações recentes (especialmente as mudanças no `package.json` e `server.ts`).
    ```bash
    git add .
    git commit -m "Configuração de deploy unificado"
    git push origin main
    ```

## 2. Criar Projeto no Railway (Novo)

1.  Acesse [railway.app](https://railway.app) e faça login.
2.  Clique em **"New Project"** -> **"Provision PostgreSQL"**.
    - Isso criará um novo projeto já com o banco de dados pronto.

## 3. Adicionar o Código (Serviço)

1.  No mesmo projeto, clique em **"Create"** (ou "New") -> **"GitHub Repo"**.
2.  Selecione o repositório do **Easy-Schedule**.
3.  O Railway vai importar o código e tentar fazer o deploy. **Ele vai falhar na primeira vez** porque faltam as variáveis. Isso é normal.

## 4. Configurar Variáveis de Ambiente

Clique no cartão do seu serviço (o código, não o banco) e vá na aba **"Variables"**. Adicione as seguintes chaves (copie do seu `.env` local):

| Variável                | Valor / Descrição                                                                          |
| :---------------------- | :----------------------------------------------------------------------------------------- |
| `NODE_ENV`              | `production` (Essencial para servir o React)                                               |
| `PORT`                  | `3000` (Ou deixe o Railway definir, mas padrão ajuda)                                      |
| `DATABASE_URL`          | **${{PostgreSQL.DATABASE_URL}}** (Escreva exatamente assim, o Railway preenche automático) |
| `AUTH0_DOMAIN`          | Seu domínio Auth0 (ex: `dev-xyz.us.auth0.com`)                                             |
| `AUTH0_AUDIENCE`        | Sua audiência da API                                                                       |
| `STRIPE_SECRET_KEY`     | Sua chave secreta (`sk_test_...`)                                                          |
| `STRIPE_WEBHOOK_SECRET` | Seu segredo do webhook (`whsec_...`)                                                       |
| `FRONTEND_URL`          | A URL que o Railway vai gerar (ver passo 6)                                                |

> **Nota:** Para o Frontend (Vite) ler as variáveis no build, você deve prefixar as públicas com `VITE_`. Se você usa as mesmas do backend, pode repetir os valores:
>
> - `VITE_AUTH0_DOMAIN` = (mesmo valor acima)
> - `VITE_AUTH0_AUDIENCE` = (mesmo valor acima)
> - `VITE_AUTH0_CLIENT_ID` = (Seu Client ID do Auth0)
> - `VITE_API_URL` = (Deixe em branco ou coloque a própria URL do site, pois é o mesmo domínio)

## 5. Configurar Build e Start

Vá na aba **"Settings"** do serviço:

1.  **Build Command**: `npm run build:all`
    - _Importante: Isso garante que ele construa o Site e o Servidor._
2.  **Start Command**: `npm start`
    - _Isso roda o servidor unificado._

## 6. Gerar Domínio (URL Pública)

Vá na aba **"Settings"** -> **"Networking"** -> **"Public Networking"**.

1.  Clique em **"Generate Domain"**.
2.  Copie esse domínio (ex: `easy-schedule-uk8d.up.railway.app`).
3.  Volte nas **Variables** e atualize o `FRONTEND_URL` com esse valor (com `https://` na frente).
4.  O deploy deve reiniciar automaticamente. Se não, clique em "Redeploy".

## 7. Banco de Dados (Migrações)

Quando o deploy estiver verde (Online), precisamos criar as tabelas.

1.  Instale a CLI do Railway no seu computador (se não tiver): `npm i -g @railway/cli`
2.  No seu terminal, faça login: `railway login`
3.  Vincule ao projeto: `railway link` (selecione o projeto da lista).
4.  Rode a migração:
    ```bash
    railway run npm run knex migrate:latest
    ```
    _(Isso roda o comando `knex` usando as credenciais do banco de produção lá na nuvem)_.

---

**Pronto!** Seu SaaS deve estar no ar. 🚀
Se alguma etapa falhar, verifique a aba **"Deploy Logs"** para ver o erro detalhado.
