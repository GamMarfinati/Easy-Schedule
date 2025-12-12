import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const InvitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token de convite inválido.');
      setLoading(false);
      return;
    }

    // Validate token (public endpoint)
    api.get(`/invitations/${token}`)
      .then(res => setInvite(res.data))
      .catch(err => setError('Convite inválido ou expirado.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    if (!isAuthenticated) {
      // Login first, ideally redirect back here after login
      // Auth0 handles returnTo if configured, or we pass it
      login(); 
      return;
    }

    setAccepting(true);
    try {
      await api.post(`/invitations/${token}/accept`);
      navigate('/app'); // Redirect to dashboard
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao aceitar convite.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Carregando...</div>;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <h2 className="text-3xl font-extrabold text-red-600 mb-4">Ops!</h2>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Convite para {invite.organization_name}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Você foi convidado para entrar como <span className="font-bold">{invite.role}</span>.
          </p>
          <p className="mt-4 text-gray-500">
            {invite.email}
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {accepting ? 'Processando...' : (isAuthenticated ? 'Aceitar Convite' : 'Entrar e Aceitar')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvitePage;
