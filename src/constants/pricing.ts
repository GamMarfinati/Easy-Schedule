export const PRICING_TIERS = [
  {
    key: 'free',
    name: 'Gratuito',
    price: 'R$ 0,00',
    frequency: '/mês',
    description: 'Para conhecer a ferramenta e validar a lógica.',
    features: [
      'Criação de 1 grade demonstrativa',
      'Visualização apenas em tela',
      'Sem exportação (PDF/Excel)',
      'Suporte comunitário'
    ],
    cta: 'Começar Grátis',
    popular: false,
    buttonVariant: 'outline' as const,
    // Logic: Redirect to dashboard/login
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 'R$ 99,90',
    frequency: '/mês',
    description: 'Acesso total para resolver a grade da sua escola.',
    features: [
      'Geração Ilimitada de Grades',
      'Exportação para PDF e Excel',
      'Ajustes finos com IA',
      'Múltiplas turmas e professores',
      'Suporte Prioritário'
    ],
    cta: 'Assinar Pro',
    popular: true,
    buttonVariant: 'default' as const, // Highlighted
    priceId: 'price_1Se1RV9WwxV5C10jCkyBLkV0', // Stripe Price ID
    // Logic: Trigger Stripe Checkout
  }
];

// Note: The 'Enterprise' plan (R$ 299) exists in Stripe but should NOT be rendered in the UI for now.

export type PricingTier = typeof PRICING_TIERS[number];
