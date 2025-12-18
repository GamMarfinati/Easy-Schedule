import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <style>{`
        :root { --hp-lilac: #b39ddb; --loader-size: 64px; --gap-size: 8px; --corner-radius: 6px; --border-thickness: 4px; --cycle-duration: 2.4s; }
        .hp-loader-grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 8px; width: 64px; height: 64px; }
        .hp-square { width: 100%; height: 100%; border-radius: 6px; border: 4px solid transparent; background-color: #b39ddb; box-sizing: border-box; animation: clockwisePulse 2.4s infinite ease-in-out; }
        .sq-tr { animation-delay: 0s; } .sq-br { animation-delay: 0.6s; } .sq-bl { animation-delay: 1.2s; } .sq-tl { animation-delay: 1.8s; }
        @keyframes clockwisePulse { 0% { background-color: transparent; border-color: #b39ddb; transform: scale(1); box-shadow: 0 0 0 0 rgba(179, 157, 219, 0.7); } 12.5% { transform: scale(1.15); box-shadow: 0 0 10px 2px rgba(179, 157, 219, 0.4); } 25% { background-color: transparent; border-color: #b39ddb; transform: scale(1); box-shadow: 0 0 0 0 rgba(179, 157, 219, 0); } 25.01%, 100% { background-color: #b39ddb; border-color: transparent; transform: scale(1); box-shadow: none; } }
      `}</style>
      <div className="hp-loader-grid">
        <div className="hp-square sq-tl"></div>
        <div className="hp-square sq-tr"></div>
        <div className="hp-square sq-bl"></div>
        <div className="hp-square sq-br"></div>
      </div>
      <p className="mt-4 text-gray-600 font-medium">Gerando o melhor horário para você...</p>
    </div>
  );
};

export default Loader;
