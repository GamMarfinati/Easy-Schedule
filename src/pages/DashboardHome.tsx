import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';

interface SavedSchedule {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const DashboardHome: React.FC = () => {
  const [org, setOrg] = useState<any>(null);
  const [schedules, setSchedules] = useState<SavedSchedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);

  useEffect(() => {
    api.get('/organization')
      .then(res => setOrg(res.data))
      .catch(err => {
        console.error(err);
        setOrg({ plan_id: 'Erro ao carregar' });
      });

    api.get('/schedules')
      .then(res => setSchedules(res.data))
      .catch(err => console.error('Error loading schedules:', err))
      .finally(() => setLoadingSchedules(false));
  }, []);

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta grade?')) return;
    
    try {
      await api.delete(`/schedules/${id}`);
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting schedule:', err);
      alert('Erro ao excluir grade.');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card Plano */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                <span className="text-white font-bold">P</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Plano Ativo</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900 capitalize">
                      {org?.subscription_status === 'active' ? 'Pro' : org?.subscription_status || 'Carregando...'}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link to="/app/billing" className="font-medium text-indigo-600 hover:text-indigo-500">
                Ver detalhes
              </Link>
            </div>
          </div>
        </div>

        {/* Card Grades */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <span className="text-white font-bold">G</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Grades Salvas</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {loadingSchedules ? '...' : schedules.length}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link to="/app/schedules" className="font-medium text-indigo-600 hover:text-indigo-500">
                Criar nova grade
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Grades Salvas */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Grades Salvas</h2>
        
        {loadingSchedules ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            Carregando grades...
          </div>
        ) : schedules.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500 mb-4">Nenhuma grade salva ainda.</p>
            <Link 
              to="/app/schedules" 
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Gerar primeira grade
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Criada em</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{schedule.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        schedule.status === 'published' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {schedule.status === 'published' ? 'Publicada' : 'Rascunho'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(schedule.created_at).toLocaleDateString('pt-BR')} às {new Date(schedule.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link 
                        to={`/app/schedules/${schedule.id}`} 
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Ver
                      </Link>
                      <button 
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardHome;

