# Plano de Implementação: Monetização (SaaS)

Transformar o "Easy-Schedule" em um produto por assinatura.

## Objetivo
Restringir a funcionalidade de "Gerar Grade" apenas para usuários pagantes (assinantes).

## Stack Sugerida
*   **Autenticação**: [Clerk](https://clerk.com) (Fácil integração, UI pronta, plano gratuito generoso).
*   **Pagamentos**: [Stripe](https://stripe.com) (Padrão de mercado, fácil de criar links de checkout).

## Roteiro

### 1. Autenticação (Clerk)
*   [ ] Instalar `@clerk/clerk-react`.
*   [ ] Envolver a aplicação com `<ClerkProvider>`.
*   [ ] Criar página de Login/Cadastro (ou usar os componentes modais do Clerk).
*   [ ] Adicionar botão de "Entrar/Sair" no cabeçalho.

### 2. Proteção de Rotas (Frontend)
*   [ ] Se o usuário não estiver logado, o botão "Gerar Grade" redireciona para o Login.
*   [ ] Se o usuário estiver logado mas sem assinatura, redireciona para a página de Planos.

### 3. Pagamentos (Stripe)
*   [ ] Criar um produto/assinatura no painel do Stripe.
*   [ ] Criar uma página de "Planos" no app com o link de checkout do Stripe.
*   [ ] Configurar o Stripe para redirecionar de volta para o app após o pagamento.

### 4. Integração Backend (Segurança Real)
*   [ ] Instalar `@clerk/backend` na API (`api/generate.ts`).
*   [ ] Verificar no backend se o usuário está autenticado antes de gerar a grade.
*   [ ] (Opcional/Avançado) Verificar via Webhook ou Metadata se a assinatura está ativa. *Para a primeira versão, podemos confiar no fluxo de "pagou -> liberou" ou verificar manualmente, mas o ideal é conectar o Stripe ao Clerk.*

## O que vou precisar de você
Para executar isso, você precisará criar contas nesses serviços (são gratuitos para começar):
1.  Conta no **Clerk.com** (para pegar a `CLERK_PUBLISHABLE_KEY`).
2.  Conta no **Stripe.com** (para pegar a `STRIPE_SECRET_KEY` e criar o produto).

## User Review Required
> [!IMPORTANT]
> Você concorda com o uso de **Clerk** e **Stripe**? São as ferramentas padrão para isso hoje em dia.
