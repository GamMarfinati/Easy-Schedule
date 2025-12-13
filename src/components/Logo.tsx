import React from 'react';

// Aceita className para podermos estilizar tamanho e cor via Tailwind
interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-8 h-8" }) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className} // Aplica as classes do Tailwind aqui
    >
        {/* Bloco Superior Esquerdo (Preenchido) */}
        <rect x="5" y="5" width="6" height="6" rx="1.5" fill="currentColor"/>
        {/* Bloco Inferior Esquerdo (Preenchido) */}
        <rect x="5" y="13" width="6" height="6" rx="1.5" fill="currentColor"/>
        {/* Bloco Inferior Direito (Preenchido) */}
        <rect x="13" y="13" width="6" height="6" rx="1.5" fill="currentColor"/>
        
        {/* Bloco Superior Direito (O Encaixe - Contorno) */}
        {/* strokeWidth="2" garante que a linha fique visível */}
        <rect x="13" y="5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="2.5"/>
    </svg>
  );
};
