import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Hero: React.FC = () => {
  const { isAuthenticated, login } = useAuth();

  return (
    <section className="max-w-7xl mx-auto px-8 py-12 lg:py-24">
      <div className="flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-16">
        
        {/* --- Coluna da Esquerda: TEXTO --- */}
        <div className="flex-1 text-center lg:text-left">
          <h1 className="text-4xl lg:text-6xl font-extrabold text-slate-900 leading-tight tracking-tight">
            Grades horárias escolares em <span className="text-indigo-600">minutos</span>, não dias.
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
            O HoraProfe usa inteligência artificial para organizar professores, turmas e restrições automaticamente. Diga adeus aos conflitos e olá para a eficiência na gestão escolar.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
            {!isAuthenticated ? (
              <button 
                onClick={() => login()}
                className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200/50 active:scale-95"
              >
                Gerar Minha Primeira Grade
              </button>
            ) : (
              <Link 
                to="/app/schedules"
                className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200/50 active:scale-95 text-center"
              >
                Gerar Minha Primeira Grade
              </Link>
            )}
            <a 
              href="#features"
              className="text-indigo-700 bg-indigo-50 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-indigo-100 transition-colors border border-indigo-100 active:scale-95 text-center"
            >
              Ver Como Funciona
            </a>
          </div>
          
          <p className="mt-6 text-sm text-slate-500 font-medium">
            ⚡ Configuração rápida. Não requer cartão de crédito.
          </p>
        </div>

        {/* --- Coluna da Direita: IMAGEM --- */}
        <div className="flex-1 w-full relative perspective-1000">
            {/* Efeito de fundo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-indigo-600/10 rounded-full blur-3xl -z-10"></div>
            
            <img 
              src="/hero-image.png" 
              alt="Laptop mostrando o painel do HoraProfe com uma grade horária organizada" 
              className="w-full h-auto rounded-2xl shadow-2xl border border-slate-200/50 transform transition-all duration-500 hover:scale-[1.02] hover:rotate-1"
              onError={(e) => {
                // Fallback se a imagem não existir
                e.currentTarget.src = '/images/dashboard-mockup.png';
              }}
            />
        </div>

      </div>
    </section>
  );
};
