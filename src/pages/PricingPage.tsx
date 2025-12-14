import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { PRICING_TIERS, PricingTier } from '../constants/pricing';

const PricingPage: React.FC = () => {
  const { isAuthenticated, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubscribe = async (tier: PricingTier) => {
    // Free plan - redirect to app/login
    if (tier.key === 'free') {
      if (isAuthenticated) {
        navigate('/app');
      } else {
        login();
      }
      return;
    }

    // Pro plan - Stripe checkout
    if (!isAuthenticated) {
      login();
      return;
    }

    if (!tier.priceId) {
      console.error('No priceId for tier:', tier.key);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/billing/checkout-session', { priceId: tier.priceId });
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error("Error creating checkout session", error);
      alert("Erro ao iniciar pagamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="text-gray-400 hover:text-white text-sm">
          ← Voltar para Home
        </Link>
      </div>

      <div className="text-center mt-8">
        <h2 className="text-base font-semibold text-indigo-400 tracking-wide uppercase">Preços</h2>
        <p className="mt-1 text-4xl font-extrabold text-white sm:text-5xl sm:tracking-tight lg:text-6xl">
          Escolha o plano ideal para sua escola
        </p>
        <p className="max-w-xl mt-5 mx-auto text-xl text-gray-400">
          Comece gratuitamente e faça o upgrade conforme sua necessidade.
        </p>
      </div>

      <div className="mt-12 max-w-4xl mx-auto grid gap-8 lg:grid-cols-2">
        {PRICING_TIERS.map((tier) => (
          <div 
            key={tier.key} 
            className={`relative rounded-2xl shadow-xl overflow-hidden ${
              tier.popular 
                ? 'border-2 border-indigo-500 bg-gray-800 transform scale-105' 
                : 'border border-gray-700 bg-gray-800'
            }`}
          >
            {/* Popular Badge */}
            {tier.popular && (
              <div className="absolute top-0 right-0 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                POPULAR
              </div>
            )}

            <div className="p-8">
              <h3 className="text-2xl font-bold text-white">{tier.name}</h3>
              <p className="mt-2 text-gray-400">{tier.description}</p>
              
              <div className="mt-6">
                <span className="text-5xl font-extrabold text-white">{tier.price}</span>
                <span className="text-lg text-gray-400">{tier.frequency}</span>
              </div>

              <button
                onClick={() => handleSubscribe(tier)}
                disabled={loading}
                className={`mt-8 w-full py-4 px-6 rounded-lg font-bold text-lg transition-all duration-200 ${
                  tier.buttonVariant === 'default'
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/50'
                    : 'bg-transparent border-2 border-gray-600 text-white hover:border-indigo-500 hover:text-indigo-400'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? 'Processando...' : tier.cta}
              </button>
            </div>

            <div className="px-8 pb-8">
              <h4 className="text-xs font-medium text-gray-400 tracking-wide uppercase mb-4">
                O que está incluído
              </h4>
              <ul className="space-y-3">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <svg 
                      className={`flex-shrink-0 h-5 w-5 mt-0.5 ${tier.popular ? 'text-indigo-400' : 'text-green-500'}`} 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ/Contact Section */}
      <div className="mt-16 text-center">
        <p className="text-gray-400">
          Precisa de um plano personalizado para sua rede de ensino?{' '}
          <a href="mailto:contato@horaprofe.com.br" className="text-indigo-400 hover:text-indigo-300">
            Entre em contato
          </a>
        </p>
      </div>
    </div>
  );
};

export default PricingPage;

