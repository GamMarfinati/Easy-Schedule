import React from 'react';

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    stripeLink: string;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, stripeLink }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100">
                <div className="bg-gradient-to-r from-primary to-purple-600 p-6 text-white text-center">
                    <h2 className="text-3xl font-bold mb-2">Seja Premium 💎</h2>
                    <p className="opacity-90">Desbloqueie todo o poder da IA</p>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-gray-700">
                            <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            <span>Geração ilimitada de quadros</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-700">
                            <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            <span>Algoritmo de IA avançado</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-700">
                            <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            <span>Suporte prioritário</span>
                        </div>
                    </div>

                    <div className="pt-4">
                        <a
                            href={stripeLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full bg-primary hover:bg-primary-dark text-white text-center font-bold py-4 px-6 rounded-xl shadow-lg transform transition hover:scale-105 hover:shadow-xl"
                        >
                            Assinar por R$ 29,90/mês
                        </a>
                        <p className="text-xs text-center text-gray-400 mt-3">
                            Cancelamento a qualquer momento. Ambiente seguro Stripe.
                        </p>
                    </div>
                </div>

                <div className="bg-gray-50 p-4 text-center border-t">
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 font-medium text-sm"
                    >
                        Talvez depois
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionModal;
