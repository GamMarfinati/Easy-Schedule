import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="flex justify-center items-center h-full min-h-[200px]">
      <style>{`
        :root {
          /* Cores extraídas da imagem do logo */
          --hp-purple-bg: #311b62; /* Roxo escuro do fundo (opcional, se quiser usar um container) */
          --hp-lilac: #b39ddb;     /* Lilás claro do ícone */
          
          /* Configurações do Loader */
          --loader-size: 64px;     /* Tamanho total do ícone */
          --gap-size: 8px;         /* Espaço entre os quadrados */
          --corner-radius: 6px;    /* Arredondamento dos cantos */
          --border-thickness: 4px; /* Espessura da linha do quadrado vazado */
          --cycle-duration: 2.4s;  /* Tempo total para uma volta completa (sentido horário) */
        }

        /* Container principal do ícone (a grade 2x2) */
        .hp-loader-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
          gap: var(--gap-size);
          width: var(--loader-size);
          height: var(--loader-size);
        }

        /* Estilo base para os 4 quadrados */
        .hp-square {
          width: 100%;
          height: 100%;
          border-radius: var(--corner-radius);
          /* Truque para evitar pulos: sempre tem borda, mas começa transparente */
          border: var(--border-thickness) solid transparent;
          background-color: var(--hp-lilac); /* Estado inicial: sólido */
          box-sizing: border-box; 
          
          /* Aplica a animação a todos, o 'delay' define a ordem */
          animation: clockwisePulse var(--cycle-duration) infinite ease-in-out;
        }

        /* --- DEFININDO A ORDEM SENTIDO HORÁRIO --- */
        
        /* 1. Topo Direita (Começa aqui, como no logo original) */
        .sq-tr {
          animation-delay: 0s;
        }

        /* 2. Baixo Direita (Segundo passo) */
        .sq-br {
          /* Atrasa 1/4 do tempo total */
          animation-delay: calc(var(--cycle-duration) * 0.25);
        }

        /* 3. Baixo Esquerda (Terceiro passo) */
        .sq-bl {
          /* Atrasa 2/4 do tempo total */
          animation-delay: calc(var(--cycle-duration) * 0.5);
        }
        
        /* 4. Topo Esquerda (Último passo) */
        .sq-tl {
          /* Atrasa 3/4 do tempo total */
          animation-delay: calc(var(--cycle-duration) * 0.75);
        }


        /* --- KEYFRAMES DA ANIMAÇÃO --- */
        /* Esta animação define o que acontece durante 1/4 do ciclo (o turno do quadrado) */
        @keyframes clockwisePulse {
          /* INÍCIO DO TURNO (0% a 25% do ciclo total) */
          0% {
            background-color: transparent;        /* Fica vazado */
            border-color: var(--hp-lilac);        /* Borda aparece */
            transform: scale(1);                  /* Tamanho normal */
            box-shadow: 0 0 0 0 rgba(179, 157, 219, 0.7); /* Sombra para ajudar no pulso */
          }
          12.5% { /* Ponto alto do pulso (metade do turno) */
            transform: scale(1.15);               /* Cresce um pouco */
            box-shadow: 0 0 10px 2px rgba(179, 157, 219, 0.4); /* "Brilho" do pulso */
          }
          25% { /* Fim do turno do quadrado */
            background-color: transparent;
            border-color: var(--hp-lilac);
            transform: scale(1);                  /* Volta ao tamanho normal */
            box-shadow: 0 0 0 0 rgba(179, 157, 219, 0);
          }

          /* RESTANTE DO CICLO (25.01% a 100%) - O quadrado fica sólido e parado esperando a vez */
          25.01%, 100% {
            background-color: var(--hp-lilac);    /* Volta a ser sólido */
            border-color: transparent;            /* Borda some */
            transform: scale(1);                  /* Tamanho normal */
            box-shadow: none;
          }
        }
      `}</style>
      
      <div className="hp-loader-grid">
        <div className="hp-square sq-tl"></div>
        <div className="hp-square sq-tr"></div>
        <div className="hp-square sq-bl"></div>
        <div className="hp-square sq-br"></div>
      </div>
    </div>
  );
};

export default Loader;
