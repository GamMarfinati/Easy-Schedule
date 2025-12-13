# 📊 Diagnóstico Completo - HoraProfe (Easy-Schedule)

**Data**: 13/12/2025  
**Status Geral**: 🟡 Parcialmente Funcional

---

## ✅ O QUE ESTÁ FUNCIONANDO

### Core Features

| Feature                       | Status | Notas                             |
| ----------------------------- | ------ | --------------------------------- |
| **Autenticação Auth0**        | ✅ OK  | Login/logout funcionando          |
| **Geração de Grade (Gemini)** | ✅ OK  | Leva ~9-10s, gera grades corretas |
| **Landing Page**              | ✅ OK  | Visual completo                   |
| **Dashboard Principal**       | ✅ OK  | Exibe grade gerada                |
| **Rotas Protegidas**          | ✅ OK  | PrivateRoute funcionando          |

### API Endpoints Funcionais

| Endpoint                  | Método | Status |
| ------------------------- | ------ | ------ |
| `/api/schedules/generate` | POST   | ✅ 200 |
| `/api/organization`       | GET    | ✅ 200 |
| `/api/billing/plans`      | GET    | ✅ 200 |
| `/api/billing/invoices`   | GET    | ✅ 200 |

---

## ❌ O QUE NÃO ESTÁ FUNCIONANDO

### Funcionalidades Quebradas

| Feature                    | Problema     | Causa Raiz                                      | Prioridade |
| -------------------------- | ------------ | ----------------------------------------------- | ---------- |
| **Listagem de Usuários**   | 500 Error    | ~~Query usava tabela inexistente~~ ✅ CORRIGIDO | Alta       |
| **Salvar Configurações**   | 500 Error    | ~~Campo timezone inexistente~~ ✅ CORRIGIDO     | Média      |
| **Portal de Cobrança**     | 400 Error    | Organização sem stripe_customer_id              | Esperado\* |
| **Botão Convidar Usuário** | Não funciona | Apenas UI, sem ação                             | Média      |

_\* O portal só funciona após primeira assinatura paga_

---

## 🔧 INCONSISTÊNCIAS CÓDIGO vs BANCO

### Schema do Banco (Migrations)

**Tabelas Existentes:**

1. `organizations` - id, name, slug, stripe_customer_id, subscription_status, created_at, updated_at
2. `users` - id, auth0_id, email, name, role, organization_id, created_at, updated_at
3. `schedules` - id, organization_id, name, status, data (JSON), created_at, updated_at
4. `invoices` - id, organization_id, stripe_invoice_id, amount_paid, currency, status, pdf_url, created_at
5. `audit_logs` - id, organization_id, user_id, action, details (JSON), created_at
6. `invitations` - id, email, token, role, organization_id, expires_at, created_by, created_at

**Tabelas Referenciadas no Código mas NÃO EXISTEM:**
| Tabela | Onde é usada | Correção |
|--------|--------------|----------|
| `organization_members` | ~~organization.ts~~ | ✅ Corrigido para usar `users` |

**Colunas Referenciadas no Código mas NÃO EXISTEM:**
| Coluna | Tabela | Onde é usada | Correção |
|--------|--------|--------------|----------|
| `timezone` | organizations | ~~SettingsPage~~ | ⚠️ Pendente (frontend) |
| `plan_id` | organizations | ~~auth.ts~~ | ✅ Corrigido |

---

## 📋 FRONTEND vs BACKEND ROUTES

### Páginas do Frontend

| Rota             | Componente    | API Chamada                 | Status                      |
| ---------------- | ------------- | --------------------------- | --------------------------- |
| `/`              | LandingPage   | -                           | ✅ OK                       |
| `/pricing`       | PricingPage   | GET /billing/plans          | ✅ OK                       |
| `/login`         | LoginPage     | Auth0                       | ✅ OK                       |
| `/invite`        | InvitePage    | GET /invitations/:token     | ⚠️ Não testado              |
| `/app`           | DashboardHome | GET /organization           | ✅ OK                       |
| `/app/schedules` | SchedulesPage | POST /schedules/generate    | ✅ OK                       |
| `/app/billing`   | BillingPage   | GET /invoices, POST /portal | 🔴 Portal 400               |
| `/app/settings`  | SettingsPage  | GET/PUT /organization       | 🟡 GET OK, PUT usa timezone |
| `/app/users`     | UsersPage     | GET /organization/users     | ✅ CORRIGIDO                |

### Rotas do Backend

| Rota                            | Método  | Controlador              | Autenticação | Status             |
| ------------------------------- | ------- | ------------------------ | ------------ | ------------------ |
| `/auth/*`                       | \*      | authRoutes               | Público      | ✅                 |
| `/api/billing/webhook`          | POST    | webhookController        | Público      | ⚠️ Não testado     |
| `/api/billing/plans`            | GET     | billing.ts               | Protegido    | ✅                 |
| `/api/billing/checkout-session` | POST    | billing.ts               | Protegido    | ⚠️ Não testado     |
| `/api/billing/portal`           | POST    | billing.ts               | Protegido    | 🔴 Requer customer |
| `/api/billing/invoices`         | GET     | billing.ts               | Protegido    | ✅                 |
| `/api/invitations/*`            | \*      | invitations.ts           | Misto        | ⚠️ Não testado     |
| `/api/organization`             | GET/PUT | organization.ts          | Protegido    | ✅/🟡              |
| `/api/organization/users`       | GET     | organization.ts          | Protegido    | ✅ CORRIGIDO       |
| `/api/schedules/generate`       | POST    | geminiController         | Protegido    | ✅                 |
| `/api/schedules/:id/export`     | GET     | exportController         | Protegido    | ⚠️ Não testado     |
| `/api/generate`                 | POST    | generateHandler (Vercel) | Protegido    | ⚠️ Duplicado       |

---

## 🔐 VARIÁVEIS DE AMBIENTE

### Railway (Produção)

| Variável                | Status       | Nota                                   |
| ----------------------- | ------------ | -------------------------------------- |
| `DATABASE_URL`          | ✅ Correto   | Neon conectando                        |
| `AUTH0_DOMAIN`          | ✅ Correto   | Logs confirmam                         |
| `AUTH0_AUDIENCE`        | ✅ Correto   | Logs confirmam                         |
| `ISSUER_BASE_URL`       | ✅ Correto   | Fallback usado                         |
| `GOOGLE_API_KEY`        | ✅ Correto   | Gemini funcionando                     |
| `STRIPE_SECRET_KEY`     | ⚠️ Verificar | Valor real ou placeholder?             |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ Verificar | Precisa configurar no Stripe Dashboard |
| `SENDGRID_API_KEY`      | ⚠️ Verificar | Para convites por email                |
| `FRONTEND_URL`          | ✅           | Para CORS                              |

---

## 📝 PLANO DE AÇÃO

### Prioridade ALTA (Essencial)

1. [ ] **Remover campo `timezone` do SettingsPage.tsx** - Frontend envia mas backend não aceita
2. [ ] **Verificar STRIPE_SECRET_KEY** - Confirmar se é chave real
3. [ ] **Testar fluxo de Checkout Stripe** - Criar customer na primeira assinatura

### Prioridade MÉDIA (Melhorias)

4. [ ] **Implementar botão "Convidar Usuário"** - Conectar ao endpoint de invitations
5. [ ] **Adicionar tratamento de erro no UsersPage** - Mostrar loading/erro
6. [ ] **Remover rota duplicada `/api/generate`** - Usar apenas `/api/schedules/generate`

### Prioridade BAIXA (Cleanup)

7. [ ] **Remover código legado Dashboard.tsx** - Usar SchedulesPage
8. [ ] **Padronizar estrutura de pastas** - pages/ vs src/pages/
9. [ ] **Adicionar logs estruturados** - Melhor debugging

---

## 🧪 TESTES NECESSÁRIOS

1. [ ] Fluxo completo de convite de usuário
2. [ ] Checkout Stripe (criar assinatura)
3. [ ] Portal de cobrança (após assinatura)
4. [ ] Webhook do Stripe
5. [ ] Exportação de grade (PDF/Excel/ICS)
6. [ ] Envio de emails (SendGrid)

---

## 📚 NOTAS ADICIONAIS

### Arquitetura Mista

O projeto mistura duas arquiteturas:

1. **Vercel-style** (`api/generate.ts`) - Handler serverless
2. **Express tradicional** (`server.ts` + controllers)

Isso causa confusão e rotas duplicadas. Recomendação: migrar tudo para Express.

### Dupla Estrutura de Páginas

- `pages/` - Contém LandingPage.tsx e Dashboard.tsx (legado)
- `src/pages/` - Contém as páginas novas

Recomendação: consolidar em uma única pasta.

---

_Documento gerado automaticamente em 13/12/2025_
