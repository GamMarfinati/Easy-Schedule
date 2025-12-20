import React, { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const TourGuide: React.FC = () => {
  useEffect(() => {
    // Verificar se o tour já foi visto
    const tourSeen = localStorage.getItem("tourSeen");
    if (tourSeen) return;

    const driverObj = driver({
      showProgress: true,
      animate: true,
      doneBtnText: "Pronto, vamos começar!",
      nextBtnText: "Próximo",
      prevBtnText: "Anterior",
      steps: [
        {
          element: "#sidebar-container", 
          popover: {
            title: "Bem-vindo ao HoraProfe! 👋",
            description: "Aqui no menu lateral você navega entre suas Grades, cadastro de Professores e Turmas.",
            side: "right",
            align: "start"
          }
        },
        {
          element: "#btn-generate-schedule",
          popover: {
            title: "A Mágica da IA ✨",
            description: "Depois de cadastrar seus dados, clique aqui para que nossa IA gere a grade perfeita em segundos!",
            side: "bottom",
            align: "center"
          }
        },
        {
          element: "#schedule-display-area",
          popover: {
            title: "Seu Quadro de Horários 📅",
            description: "Aqui a grade gerada irá aparecer. Você poderá visualizar por Turma, Professor e até baixar em PDF ou Excel.",
            side: "top",
            align: "center"
          }
        }
      ],
      onDestroyed: () => {
        // Marcar como visto quando terminar ou fechar
        localStorage.setItem("tourSeen", "true");
      }
    });

    // Pequeno delay para garantir que a UI carregou
    const timer = setTimeout(() => {
      driverObj.drive();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return null; // Componente lógico, não renderiza nada visual diretamente
};
