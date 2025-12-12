import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';

const DashboardHome: React.FC = () => {
  const [org, setOrg] = useState<any>(null);

  useEffect(() => {
    api.get('/organization').then(res => setOrg(res.data)).catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card Plano */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                {/* Icon placeholder */}
                <span className="text-white font-bold">P</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Plano Ativo</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900 capitalize">{org?.plan_id || 'Carregando...'}</div>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Grades Geradas</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">0</div>
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
    </div>
  );
};

export default DashboardHome;
