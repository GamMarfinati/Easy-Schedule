import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext';

const LandingPage: React.FC = () => {
  const { isAuthenticated, login, logout, user } = useAuth();

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">HoraProfe</h1>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-primary font-medium transition">Recursos</a>
            <a href="#pricing" className="text-gray-600 hover:text-primary font-medium transition">Preços</a>
            <a href="#testimonials" className="text-gray-600 hover:text-primary font-medium transition">Depoimentos</a>
          </nav>

          <div className="flex items-center gap-4">
            {!isAuthenticated ? (
              <>
                <button onClick={() => login()} className="text-gray-600 hover:text-primary font-semibold transition">Entrar</button>
                <button onClick={() => login()} className="bg-primary hover:bg-blue-700 text-white px-5 py-2.5 rounded-full font-semibold transition shadow-lg shadow-blue-500/30">
                  Começar Grátis
                </button>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/app" className="text-gray-600 hover:text-primary font-semibold">Ir para o App</Link>
                <div className="flex items-center gap-2">
                  {user?.picture && <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />}
                  <button onClick={() => logout()} className="text-sm text-red-600 hover:text-red-800">Sair</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-white -z-10"></div>
        <div className="container mx-auto px-4 text-center">
          <div className="inline-block mb-6 px-4 py-1.5 bg-blue-100 text-primary rounded-full text-sm font-semibold tracking-wide">
            🚀 A revolução na gestão escolar chegou
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-8 leading-tight">
            Crie Grades Horárias <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">Sem Conflitos em Segundos</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Nossa Inteligência Artificial analisa a disponibilidade dos professores e cria a grade perfeita para sua escola. Diga adeus às planilhas manuais.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
             {!isAuthenticated ? (
                <button onClick={() => login()} className="w-full sm:w-auto bg-primary hover:bg-blue-700 text-white text-lg px-8 py-4 rounded-full font-bold transition transform hover:scale-105 shadow-xl shadow-blue-500/30">
                  Gerar Minha Grade Agora
                </button>
            ) : (
               <Link to="/app" className="w-full sm:w-auto bg-primary hover:bg-blue-700 text-white text-lg px-8 py-4 rounded-full font-bold transition transform hover:scale-105 shadow-xl shadow-blue-500/30">
                  Acessar Painel
               </Link>
            )}
            <a href="#features" className="w-full sm:w-auto bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 text-lg px-8 py-4 rounded-full font-bold transition flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Ver Demonstração
            </a>
          </div>

          {/* Hero Image / Mockup */}
          <div className="mt-20 relative mx-auto max-w-5xl">
             <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-20"></div>
            <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 ring-1 ring-gray-900/5">
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <div className="ml-4 bg-white rounded-md px-3 py-1 text-xs text-gray-400 flex-1 text-center font-mono border border-gray-100 shadow-sm">
                    horaprofe.com.br
                  </div>
                </div>
                <div className="aspect-w-16 aspect-h-9 bg-gray-50">
                    <img 
                      src="/images/dashboard-mockup.png" 
                      alt="Interface do HoraProfe - Gerador de Grades" 
                      className="w-full h-auto object-cover" 
                    />
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Por que escolher o HoraProfe?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Ferramentas poderosas para simplificar a rotina da coordenação pedagógica.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl bg-gray-50 hover:bg-blue-50 transition duration-300 border border-gray-100">
              <div className="w-14 h-14 bg-blue-100 text-primary rounded-xl flex items-center justify-center mb-6">
                {/* LayoutGrid Icon */}
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect width="7" height="7" x="3" y="3" rx="1" ry="1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  <rect width="7" height="7" x="14" y="3" rx="1" ry="1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  <rect width="7" height="7" x="14" y="14" rx="1" ry="1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  <rect width="7" height="7" x="3" y="14" rx="1" ry="1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Inteligência Artificial</h3>
              <p className="text-gray-600 leading-relaxed">
                Nosso algoritmo avançado analisa milhares de combinações em segundos para encontrar a grade ideal, respeitando todas as restrições.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl bg-gray-50 hover:bg-purple-50 transition duration-300 border border-gray-100">
              <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Zero Conflitos</h3>
              <p className="text-gray-600 leading-relaxed">
                Garantimos que nenhum professor tenha duas aulas ao mesmo tempo e que nenhuma turma fique sem professor.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl bg-gray-50 hover:bg-green-50 transition duration-300 border border-gray-100">
              <div className="w-14 h-14 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Exportação Simples</h3>
              <p className="text-gray-600 leading-relaxed">
                Exporte a grade pronta para PDF ou Excel e compartilhe facilmente com professores e alunos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-gray-50">
         <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Planos e Preços</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Escolha o plano ideal para sua escola. Comece gratuitamente e faça upgrade quando precisar.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {/* Free Plan */}
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Gratuito</h3>
                <p className="text-gray-600 text-sm mb-4">Para conhecer a ferramenta</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">R$ 0</span>
                  <span className="text-gray-500">/mês</span>
                </div>
                <ul className="space-y-2 mb-6 text-sm text-gray-600">
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
                    className="w-full py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-primary hover:text-primary transition"
                  >
                    Começar Grátis
                  </button>
                ) : (
                  <Link 
                    to="/app" 
                    className="block w-full py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-primary hover:text-primary transition text-center"
                  >
                    Ir para o App
                  </Link>
                )}
              </div>

              {/* Pro Plan */}
              <div className="bg-primary rounded-2xl p-8 shadow-xl text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-yellow-400 text-gray-900 text-xs font-bold px-3 py-1 rounded-bl-lg">
                  POPULAR
                </div>
                <h3 className="text-xl font-bold mb-2">Pro</h3>
                <p className="text-blue-100 text-sm mb-4">Acesso total para sua escola</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">R$ 99,90</span>
                  <span className="text-blue-200">/mês</span>
                </div>
                <ul className="space-y-2 mb-6 text-sm text-blue-100">
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
                  className="block w-full py-3 bg-white text-primary rounded-lg font-bold hover:bg-blue-50 transition text-center"
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
            <h2 className="text-3xl font-bold mb-12">O que dizem nossos clientes</h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <div className="p-6 bg-gray-50 rounded-xl shadow-sm">
                    <p className="text-gray-600 italic mb-4">"O HoraProfe salvou minha vida! Antes eu levava semanas para montar a grade, agora faço em minutos."</p>
                    <p className="font-bold text-gray-900">- Maria Silva, Diretora Escolar</p>
                </div>
                <div className="p-6 bg-gray-50 rounded-xl shadow-sm">
                    <p className="text-gray-600 italic mb-4">"A melhor ferramenta que já usamos. Os professores adoraram a transparência e a falta de conflitos."</p>
                    <p className="font-bold text-gray-900">- João Santos, Coordenador Pedagógico</p>
                </div>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="bg-primary p-1.5 rounded-lg">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold">HoraProfe</span>
            </div>
            <div className="text-gray-400 text-sm">
              © 2025 HoraProfe. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
