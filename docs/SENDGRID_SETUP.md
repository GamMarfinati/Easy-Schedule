# 📧 Configuração do SendGrid para Produção

## Pré-requisitos

- Conta SendGrid verificada
- Domínio `horaprofe.com.br` com acesso ao DNS (Cloudflare)

---

## 1. Verificação do Domínio (Sender Authentication)

### No SendGrid:

1. Acesse: https://app.sendgrid.com/
2. Vá em **Settings → Sender Authentication**
3. Clique em **Authenticate Your Domain**
4. Escolha **DNS Host: Cloudflare**
5. Insira o domínio: `horaprofe.com.br`

### No Cloudflare (adicione os registros DNS):

O SendGrid vai gerar registros como:

| Tipo  | Nome                            | Valor                              |
| ----- | ------------------------------- | ---------------------------------- |
| CNAME | em1234.horaprofe.com.br         | u1234.wl.sendgrid.net              |
| CNAME | s1.\_domainkey.horaprofe.com.br | s1.domainkey.u1234.wl.sendgrid.net |
| CNAME | s2.\_domainkey.horaprofe.com.br | s2.domainkey.u1234.wl.sendgrid.net |

Após adicionar, volte ao SendGrid e clique em **Verify**.

---

## 2. Criar API Key

1. Vá em **Settings → API Keys**
2. Clique em **Create API Key**
3. Nome: `HoraProfe Production`
4. Selecione **Full Access**
5. Copie a chave gerada (começa com `SG.`)

**⚠️ IMPORTANTE**: Salve a chave imediatamente, ela só aparece uma vez!

---

## 3. Criar Dynamic Templates

Vá em **Email API → Dynamic Templates** e crie os seguintes templates:

### Template 1: Boas-vindas (WELCOME)

**Subject**: Bem-vindo ao HoraProfe, {{user_name}}! 🎉

```html
<!DOCTYPE html>
<html>
  <body
    style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"
  >
    <div style="text-align: center; padding: 20px;">
      <h1 style="color: #4f46e5;">Bem-vindo ao HoraProfe!</h1>
    </div>
    <p>Olá, <strong>{{user_name}}</strong>!</p>
    <p>
      Sua conta na organização <strong>{{org_name}}</strong> foi criada com
      sucesso.
    </p>
    <p>
      Agora você pode gerar quadros de horários escolares de forma inteligente e
      automática.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a
        href="{{login_url}}"
        style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;"
      >
        Acessar Minha Conta
      </a>
    </div>
    <p style="color: #666;">Qualquer dúvida, estamos por aqui!</p>
    <p>Equipe HoraProfe</p>
  </body>
</html>
```

### Template 2: Pagamento Confirmado (PAYMENT)

**Subject**: Pagamento confirmado - HoraProfe ✅

```html
<!DOCTYPE html>
<html>
  <body
    style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"
  >
    <h1 style="color: #10b981;">Pagamento Confirmado! ✅</h1>
    <p>Recebemos seu pagamento de <strong>R$ {{amount}}</strong>.</p>
    <p>Sua assinatura do plano Pro está ativa.</p>
    {{#if invoice_url}}
    <p><a href="{{invoice_url}}">Baixar Fatura em PDF</a></p>
    {{/if}}
    <p style="color: #666;">Obrigado por confiar no HoraProfe!</p>
  </body>
</html>
```

### Template 3: Falha no Pagamento (PAYMENT_FAILED)

**Subject**: Ação necessária: Problema com seu pagamento ⚠️

```html
<p>Olá!</p>
<p>
  Não conseguimos processar seu pagamento de <strong>R$ {{amount}}</strong>.
</p>
<p>Vamos tentar novamente {{retry_date}}.</p>
<p>Por favor, verifique seus dados de pagamento:</p>
<a
  href="{{billing_url}}"
  style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;"
>
  Atualizar Forma de Pagamento
</a>
```

### Template 4: Grade Pronta (SCHEDULE)

**Subject**: Sua grade "{{schedule_name}}" está pronta! 📅

```html
<h1>Grade Gerada com Sucesso! 📅</h1>
<p>
  Sua grade <strong>{{schedule_name}}</strong> foi gerada e está pronta para
  visualização.
</p>
<a
  href="{{download_url}}"
  style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;"
>
  Ver Minha Grade
</a>
```

### Template 5: Convite para Organização (INVITE)

**Subject**: Você foi convidado para o HoraProfe! 📨

```html
<h1>Você recebeu um convite!</h1>
<p>Você foi convidado para fazer parte de uma organização no HoraProfe.</p>
<a
  href="{{invite_link}}"
  style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;"
>
  Aceitar Convite
</a>
<p style="color: #666; font-size: 12px;">Este link expira em 7 dias.</p>
```

---

## 4. Configurar Variáveis no Railway

Vá no Railway → Seu projeto → **Variables** e adicione:

```
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@horaprofe.com.br
SENDGRID_TEMPLATE_WELCOME=d-xxxxxx
SENDGRID_TEMPLATE_PAYMENT=d-xxxxxx
SENDGRID_TEMPLATE_PAYMENT_FAILED=d-xxxxxx
SENDGRID_TEMPLATE_SCHEDULE=d-xxxxxx
SENDGRID_TEMPLATE_INVITE=d-xxxxxx
```

---

## 5. Stripe: Sair do Modo Teste

### No Stripe Dashboard:

1. Ative o modo **Live** (toggle no canto superior)
2. Complete a verificação da empresa se necessário
3. Obtenha as chaves de produção:
   - Secret Key (começa com `sk_live_`)
   - Publishable Key (começa com `pk_live_` - se usar no frontend)

### Atualize no Railway:

```
STRIPE_SECRET_KEY=<sua_chave_secreta_live>
```

### Criar Webhook de Produção:

1. No Stripe, vá em **Developers → Webhooks**
2. **Add endpoint**
3. URL: `https://horaprofe.com.br/api/billing/webhook`
4. Eventos:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copie o **Signing Secret** (`whsec_...`)

### Atualize no Railway:

```
STRIPE_WEBHOOK_SECRET=<seu_webhook_secret>
```

---

## 6. Testar Envio de Email

Após configurar tudo, você pode testar:

1. Faça login na aplicação
2. Convide um usuário → Deve receber email de convite
3. Faça uma compra de teste (R$1 no modo live) → Deve receber confirmação

---

## Checklist Final

- [ ] Domínio verificado no SendGrid
- [ ] API Key criada e configurada
- [ ] Todos os 5 templates criados
- [ ] Variáveis no Railway atualizadas
- [ ] Stripe em modo Live
- [ ] Webhook de produção configurado
- [ ] Teste de email realizado
