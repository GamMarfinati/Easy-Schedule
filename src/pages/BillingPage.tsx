import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface Invoice {
  id: string;
  amount_cents: number;
  status: string;
  created_at: string;
  pdf_url?: string; // In a real app, we'd have this
}

const BillingPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const response = await api.get('/billing/invoices');
        setInvoices(response.data);
      } catch (error) {
        console.error("Error fetching invoices", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const response = await api.post('/billing/portal');
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error("Error opening portal", error);
      alert("Erro ao abrir portal de cobrança.");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-2xl font-semibold text-gray-900">Gerenciar Assinatura</h1>
        
        <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">Plano Atual</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Detalhes da sua assinatura e faturas.</p>
            </div>
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
            >
              {portalLoading ? 'Carregando...' : 'Gerenciar no Stripe'}
            </button>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
            <dl className="sm:divide-y sm:divide-gray-200">
              {/* Here we would ideally fetch the current plan details from the API */}
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">Ativo</dd>
              </div>
            </dl>
          </div>
        </div>

        <h2 className="mt-10 text-xl font-semibold text-gray-900">Histórico de Faturas</h2>
        <div className="mt-4 flex flex-col">
          <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
              <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                       <tr><td colSpan={3} className="px-6 py-4 text-center">Carregando...</td></tr>
                    ) : invoices.length === 0 ? (
                      <tr><td colSpan={3} className="px-6 py-4 text-center text-gray-500">Nenhuma fatura encontrada.</td></tr>
                    ) : Array.isArray(invoices) ? (
                      invoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(invoice.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            R$ {(invoice.amount_cents / 100).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {invoice.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;
