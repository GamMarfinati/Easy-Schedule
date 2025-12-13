import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
  priceId?: string;
}

const PricingPage: React.FC = () => {
  const { isAuthenticated, login } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch plans from API
    const fetchPlans = async () => {
      try {
        // Note: This endpoint is protected in our current setup, so we might need to make it public
        // or handle the 403 if not logged in. For now, let's assume we fetch public plans.
        // If the backend requires auth, we should probably allow public access to GET /plans
        // For this MVP, let's hardcode or try to fetch.
        const response = await api.get('/billing/plans'); 
        setPlans(response.data);
      } catch (error) {
        console.error("Error fetching plans", error);
        // Fallback data if API fails (e.g. unauthenticated)
        setPlans([
            { id: 'freemium', name: 'Gratuito', price: 0, features: ['1 Grade/mês', 'Exportação PDF'] },
            { id: 'pro', name: 'Escola Pro', price: 9900, priceId: 'price_1Se1RV9WwxV5C10jCkyBLkV0', features: ['Grades Ilimitadas', 'Exportação Excel/ICS', 'Suporte Prioritário'] },
            { id: 'enterprise', name: 'Rede de Ensino', price: 29900, priceId: 'price_1Se1TA9WwxV5C10jxxWqmoNs', features: ['Múltiplas Unidades', 'API Access', 'SSO'] }
        ]);
      }
    };
    fetchPlans();
  }, []);

  const handleSubscribe = async (priceId?: string) => {
    if (!isAuthenticated) {
      login();
      return;
    }

    if (!priceId) return; // Free plan or contact sales

    setLoading(true);
    try {
      const response = await api.post('/billing/checkout-session', { priceId });
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
      <div className="text-center">
        <h2 className="text-base font-semibold text-indigo-400 tracking-wide uppercase">Preços</h2>
        <p className="mt-1 text-4xl font-extrabold text-white sm:text-5xl sm:tracking-tight lg:text-6xl">
          Escolha o plano ideal para sua escola
        </p>
        <p className="max-w-xl mt-5 mx-auto text-xl text-gray-400">
          Comece gratuitamente e faça o upgrade conforme sua necessidade.
        </p>
      </div>

      <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-3">
        {Array.isArray(plans) && plans.map((plan) => (
          <div key={plan.id} className="border border-gray-700 rounded-lg shadow-sm divide-y divide-gray-700 bg-gray-800">
            <div className="p-6">
              <h2 className="text-lg leading-6 font-medium text-white">{plan.name}</h2>
              <p className="mt-4">
                <span className="text-4xl font-extrabold text-white">R$ {plan.price / 100}</span>
                <span className="text-base font-medium text-gray-400">/mês</span>
              </p>
              <button
                onClick={() => handleSubscribe(plan.priceId)}
                disabled={loading}
                className={`mt-8 block w-full py-3 px-6 border border-transparent rounded-md text-center font-medium ${
                  plan.id === 'pro' 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                {loading ? 'Processando...' : (plan.price === 0 ? 'Começar Grátis' : 'Assinar Agora')}
              </button>
            </div>
            <div className="pt-6 pb-8 px-6">
              <h3 className="text-xs font-medium text-white tracking-wide uppercase">O que está incluído</h3>
              <ul className="mt-6 space-y-4">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex space-x-3">
                    {/* Check icon */}
                    <svg className="flex-shrink-0 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PricingPage;
