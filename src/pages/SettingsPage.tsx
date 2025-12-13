import React, { useState, useEffect } from 'react';
import api from '../services/api';

const SettingsPage: React.FC = () => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/organization').then(res => {
      setName(res.data.name || '');
    }).catch(err => {
      console.error('Erro ao carregar organização:', err);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await api.put('/organization', { name });
      setMessage('Configurações salvas com sucesso!');
    } catch (error) {
      setMessage('Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Configurações da Escola</h1>
      
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <form onSubmit={handleSave}>
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-4">
                <label htmlFor="org_name" className="block text-sm font-medium text-gray-700">Nome da Escola</label>
                <input
                  type="text"
                  name="org_name"
                  id="org_name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                />
              </div>

              {/* Campo timezone removido - não existe no banco de dados atual */}
              {/* TODO: Adicionar migration para incluir timezone se necessário */}
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
              >
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
            {message && <p className={`mt-2 text-sm ${message.includes('Erro') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>}
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

