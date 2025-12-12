import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { logout } = useAuth();

  const navigation = [
    { name: 'Home', href: '/', icon: 'HomeIcon' },
    { name: 'Dashboard', href: '/app', icon: 'ChartBarIcon' },
    { name: 'Grades', href: '/app/schedules', icon: 'CalendarIcon' },
    { name: 'Usuários', href: '/app/users', icon: 'UsersIcon' },
    { name: 'Cobrança', href: '/app/billing', icon: 'CreditCardIcon' },
    { name: 'Configurações', href: '/app/settings', icon: 'CogIcon' },
  ];

  const isActive = (path: string) => {
    if (path === '/app' && location.pathname === '/app') return true;
    if (path !== '/app' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="flex flex-col w-64 bg-gray-800 h-screen fixed left-0 top-0 overflow-y-auto">
      <div className="flex items-center justify-center h-16 bg-gray-900">
        <span className="text-white font-bold text-xl">EasySchedule</span>
      </div>
      <div className="flex-1 flex flex-col p-4">
        <nav className="space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`${
                isActive(item.href)
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={() => logout()}
          className="w-full flex items-center px-2 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-700 hover:text-white"
        >
          Sair
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
