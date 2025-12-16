'use client';

import Modal from './modal';
import { FaCalendarAlt, FaDrumstickBite, FaWineGlass, FaBullhorn, FaChevronRight } from 'react-icons/fa';

interface NewItemSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEvent: () => void;
  onSelectFoodSpecial: () => void;
  onSelectDrinkSpecial: () => void;
  onSelectAnnouncement: () => void;
}

export default function NewItemSelectionModal({
  isOpen,
  onClose,
  onSelectEvent,
  onSelectFoodSpecial,
  onSelectDrinkSpecial,
  onSelectAnnouncement,
}: NewItemSelectionModalProps) {
  const options = [
    {
      id: 'event',
      label: 'Event',
      icon: FaCalendarAlt,
      gradient: 'from-blue-500 via-blue-600 to-indigo-600 dark:from-blue-600 dark:via-blue-700 dark:to-indigo-700',
      hoverGradient: 'hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 dark:hover:from-blue-700 dark:hover:via-blue-800 dark:hover:to-indigo-800',
      iconBg: 'bg-blue-400/25 dark:bg-blue-500/25',
      shadow: 'shadow-blue-500/25 dark:shadow-blue-600/35',
      onClick: onSelectEvent,
    },
    {
      id: 'food-special',
      label: 'Food Special',
      icon: FaDrumstickBite,
      gradient: 'from-amber-500 via-orange-500 to-orange-600 dark:from-amber-600 dark:via-orange-600 dark:to-orange-700',
      hoverGradient: 'hover:from-amber-600 hover:via-orange-600 hover:to-orange-700 dark:hover:from-amber-700 dark:hover:via-orange-700 dark:hover:to-orange-800',
      iconBg: 'bg-amber-400/25 dark:bg-amber-500/25',
      shadow: 'shadow-amber-500/25 dark:shadow-amber-600/35',
      onClick: onSelectFoodSpecial,
    },
    {
      id: 'drink-special',
      label: 'Drink Special',
      icon: FaWineGlass,
      gradient: 'from-teal-500 via-cyan-500 to-cyan-600 dark:from-teal-600 dark:via-cyan-600 dark:to-cyan-700',
      hoverGradient: 'hover:from-teal-600 hover:via-cyan-600 hover:to-cyan-700 dark:hover:from-teal-700 dark:hover:via-cyan-700 dark:hover:to-cyan-800',
      iconBg: 'bg-teal-400/25 dark:bg-teal-500/25',
      shadow: 'shadow-teal-500/25 dark:shadow-teal-600/35',
      onClick: onSelectDrinkSpecial,
    },
    {
      id: 'announcement',
      label: 'Announcement',
      icon: FaBullhorn,
      gradient: 'from-rose-500 via-pink-500 to-pink-600 dark:from-rose-600 dark:via-pink-600 dark:to-pink-700',
      hoverGradient: 'hover:from-rose-600 hover:via-pink-600 hover:to-pink-700 dark:hover:from-rose-700 dark:hover:via-pink-700 dark:hover:to-pink-800',
      iconBg: 'bg-rose-400/25 dark:bg-rose-500/25',
      shadow: 'shadow-rose-500/25 dark:shadow-rose-600/35',
      onClick: onSelectAnnouncement,
    },
  ];

  const handleSelect = (onClick: () => void) => {
    onClose();
    onClick();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="relative flex flex-col items-center justify-center min-h-full py-8 sm:py-12 px-4">
        {/* Elegant close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 w-10 h-10 rounded-full bg-gray-100/80 dark:bg-gray-700/80 hover:bg-gray-200 dark:hover:bg-gray-600 backdrop-blur-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-xl leading-none cursor-pointer flex items-center justify-center touch-manipulation transition-all duration-200 hover:scale-110 hover:shadow-lg border border-gray-200/50 dark:border-gray-600/50"
          aria-label="Close modal"
          type="button"
        >
          ×
        </button>
        
        <div className="w-full max-w-md space-y-3.5">
          {options.map((option, index) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => handleSelect(option.onClick)}
                className={`group relative w-full bg-gradient-to-r ${option.gradient} ${option.hoverGradient} text-white font-semibold text-base rounded-2xl px-6 py-5 transition-all duration-300 active:scale-[0.98] flex items-center justify-between gap-4 touch-manipulation shadow-lg ${option.shadow} hover:shadow-2xl hover:scale-[1.01] border-0 overflow-hidden`}
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                {/* Enhanced shine effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                
                {/* Subtle inner glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="flex items-center gap-5 relative z-10">
                  <div className={`w-12 h-12 rounded-xl ${option.iconBg} backdrop-blur-md flex items-center justify-center flex-shrink-0 ring-2 ring-white/40 group-hover:ring-white/60 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg`}>
                    <Icon className="w-6 h-6 text-white drop-shadow-sm" />
                  </div>
                  <span className="text-lg font-semibold tracking-tight drop-shadow-sm">{option.label}</span>
                </div>
                
                <div className="relative z-10 flex items-center">
                  <div className="w-9 h-9 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center group-hover:bg-white/35 transition-all duration-300 group-hover:translate-x-1 group-hover:scale-110 shadow-md ring-1 ring-white/30">
                    <FaChevronRight className="w-4 h-4 text-white drop-shadow-sm" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

