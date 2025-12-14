import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext';
import { Header } from '../src/components/Header';
import { Hero } from '../src/components/Hero';

const LandingPage: React.FC = () => {
  const { isAuthenticated, login } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header Component */}
      <Header />
      
      {/* Hero Section Component */}
      <main>
        <Hero />
      </main>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Por que escolher o HoraProfe?</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">Ferramentas poderosas para simplificar a rotina da coordenação pedagógica.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl bg-slate-50 hover:bg-indigo-50 transition duration-300 border border-slate-100">
              <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect width="7" height="7" x="3" y="3" rx="1" ry="1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  <rect width="7" height="7" x="14" y="3" rx="1" ry="1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  <rect width="7" height="7" x="14" y="14" rx="1" ry="1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  <rect width="7" height="7" x="3" y="14" rx="1" ry="1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Inteligência Artificial</h3>
              <p className="text-slate-600 leading-relaxed">
                Nosso algoritmo avançado analisa milhares de combinações em segundos para encontrar a grade ideal, respeitando todas as restrições.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl bg-slate-50 hover:bg-purple-50 transition duration-300 border border-slate-100">
              <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Zero Conflitos</h3>
              <p className="text-slate-600 leading-relaxed">
                Garantimos que nenhum professor tenha duas aulas ao mesmo tempo e que nenhuma turma fique sem professor.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl bg-slate-50 hover:bg-green-50 transition duration-300 border border-slate-100">
              <div className="w-14 h-14 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Exportação Simples</h3>
              <p className="text-slate-600 leading-relaxed">
                Exporte a grade pronta para PDF ou Excel e compartilhe facilmente com professores e alunos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-100">
         <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Planos e Preços</h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                  Escolha o plano ideal para sua escola. Comece gratuitamente e faça upgrade quando precisar.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {/* Free Plan */}
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Gratuito</h3>
                <p className="text-slate-600 text-sm mb-4">Para conhecer a ferramenta</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-slate-900">R$ 0</span>
                  <span className="text-slate-500">/mês</span>
                </div>
                <ul className="space-y-2 mb-6 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    1 grade demonstrativa
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Visualização em tela
                  </li>
                </ul>
                {!isAuthenticated ? (
                  <button 
                    onClick={() => login()} 
                    className="w-full py-3 border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:border-indigo-500 hover:text-indigo-600 transition"
                  >
                    Começar Grátis
                  </button>
                ) : (
                  <Link 
                    to="/app" 
                    className="block w-full py-3 border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:border-indigo-500 hover:text-indigo-600 transition text-center"
                  >
                    Ir para o App
                  </Link>
                )}
              </div>

              {/* Pro Plan */}
              <div className="bg-indigo-600 rounded-2xl p-8 shadow-xl text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-yellow-400 text-slate-900 text-xs font-bold px-3 py-1 rounded-bl-lg">
                  POPULAR
                </div>
                <h3 className="text-xl font-bold mb-2">Pro</h3>
                <p className="text-indigo-100 text-sm mb-4">Acesso total para sua escola</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">R$ 99,90</span>
                  <span className="text-indigo-200">/mês</span>
                </div>
                <ul className="space-y-2 mb-6 text-sm text-indigo-100">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Grades ilimitadas
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Exportação PDF/Excel
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Suporte prioritário
                  </li>
                </ul>
                <Link 
                  to="/pricing" 
                  onClick={() => window.scrollTo(0, 0)}
                  className="block w-full py-3 bg-white text-indigo-600 rounded-lg font-bold hover:bg-indigo-50 transition text-center"
                >
                  Assinar Pro
                </Link>
              </div>
            </div>
         </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 bg-white">
         <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-12">O que dizem nossos clientes</h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <div className="p-6 bg-slate-50 rounded-xl shadow-sm border border-slate-100">
                    <p className="text-slate-600 italic mb-4">"O HoraProfe salvou minha vida! Antes eu levava semanas para montar a grade, agora faço em minutos."</p>
                    <p className="font-bold text-slate-900">- Maria Silva, Diretora Escolar</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-xl shadow-sm border border-slate-100">
                    <p className="text-slate-600 italic mb-4">"A melhor ferramenta que já usamos. Os professores adoraram a transparência e a falta de conflitos."</p>
                    <p className="font-bold text-slate-900">- João Santos, Coordenador Pedagógico</p>
                </div>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              {/* Logo 4 quadrados */}
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-indigo-400">
                <rect x="5" y="5" width="6" height="6" rx="1.5" fill="currentColor"/>
                <rect x="5" y="13" width="6" height="6" rx="1.5" fill="currentColor"/>
                <rect x="13" y="13" width="6" height="6" rx="1.5" fill="currentColor"/>
                <rect x="13" y="5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="2.5"/>
              </svg>
              <span className="text-xl font-bold">
                <span className="text-white">Hora</span>
                <span className="text-indigo-400">Profe</span>
              </span>
            </div>
            <div className="text-slate-400 text-sm">
              © 2025 HoraProfe. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

