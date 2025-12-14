import React from 'react';
import { Logo } from './Logo';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Header: React.FC = () => {
  const { isAuthenticated, login, logout, user } = useAuth();

  return (
    <header className="flex items-center justify-between py-6 px-8 max-w-7xl mx-auto w-full bg-white border-b border-slate-100 sm:border-none">
      <div className="flex items-center gap-3">
        <Logo className="w-10 h-10 text-indigo-600" />
        <span className="text-2xl font-bold text-slate-900">HoraProfe</span>
      </div>

      <nav className="hidden md:flex items-center gap-8">
        <a href="#features" className="text-slate-600 hover:text-indigo-600 font-medium transition">Recursos</a>
        <a href="#pricing" className="text-slate-600 hover:text-indigo-600 font-medium transition">Preços</a>
        <a href="#testimonials" className="text-slate-600 hover:text-indigo-600 font-medium transition">Depoimentos</a>
      </nav>

      <div className="flex items-center gap-4">
        {!isAuthenticated ? (
          <>
            <button 
              onClick={() => login()} 
              className="text-slate-600 hover:text-indigo-600 font-semibold transition hidden sm:block"
            >
              Entrar
            </button>
            <button 
              onClick={() => login()} 
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Começar Agora
            </button>
          </>
        ) : (
          <div className="flex items-center gap-4">
            <Link 
              to="/app" 
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Ir para o App
            </Link>
            <div className="flex items-center gap-2">
              {user?.picture && <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />}
              <button onClick={() => logout()} className="text-sm text-red-600 hover:text-red-800">Sair</button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
