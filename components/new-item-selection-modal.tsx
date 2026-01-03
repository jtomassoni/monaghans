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

type OptionId = 'event' | 'food-special' | 'drink-special' | 'announcement';

interface OptionColors {
  border: string;
  bg: string;
  bgHover: string;
  text: string;
  icon: string;
}

const colorMap: Record<OptionId, OptionColors> = {
  'event': {
    border: 'border-blue-500/40 dark:border-blue-500/30',
    bg: 'bg-blue-50/80 dark:bg-blue-900/25',
    bgHover: 'hover:bg-blue-100 dark:hover:bg-blue-900/35 hover:border-blue-500/60 dark:hover:border-blue-500/50',
    text: 'text-blue-700 dark:text-blue-200',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  'food-special': {
    border: 'border-orange-500/40 dark:border-orange-500/30',
    bg: 'bg-orange-50/80 dark:bg-orange-900/25',
    bgHover: 'hover:bg-orange-100 dark:hover:bg-orange-900/35 hover:border-orange-500/60 dark:hover:border-orange-500/50',
    text: 'text-orange-700 dark:text-orange-200',
    icon: 'text-orange-600 dark:text-orange-400',
  },
  'drink-special': {
    border: 'border-purple-500/40 dark:border-purple-500/30',
    bg: 'bg-purple-50/80 dark:bg-purple-900/25',
    bgHover: 'hover:bg-purple-100 dark:hover:bg-purple-900/35 hover:border-purple-500/60 dark:hover:border-purple-500/50',
    text: 'text-purple-700 dark:text-purple-200',
    icon: 'text-purple-600 dark:text-purple-400',
  },
  'announcement': {
    border: 'border-yellow-500/40 dark:border-yellow-500/30',
    bg: 'bg-yellow-50/80 dark:bg-yellow-900/25',
    bgHover: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/35 hover:border-yellow-500/60 dark:hover:border-yellow-500/50',
    text: 'text-yellow-700 dark:text-yellow-200',
    icon: 'text-yellow-600 dark:text-yellow-400',
  },
};

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
      id: 'event' as OptionId,
      label: 'Event',
      icon: FaCalendarAlt,
      onClick: onSelectEvent,
    },
    {
      id: 'food-special' as OptionId,
      label: 'Food Special',
      icon: FaDrumstickBite,
      onClick: onSelectFoodSpecial,
    },
    {
      id: 'drink-special' as OptionId,
      label: 'Drink Special',
      icon: FaWineGlass,
      onClick: onSelectDrinkSpecial,
    },
    {
      id: 'announcement' as OptionId,
      label: 'Announcement',
      icon: FaBullhorn,
      onClick: onSelectAnnouncement,
    },
  ];

  const handleSelect = (onClick: () => void) => {
    onClose();
    onClick();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New">
      <div className="space-y-2.5">
        {options.map((option) => {
          const Icon = option.icon;
          const colors = colorMap[option.id];
          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option.onClick)}
              className={`group w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl border ${colors.border} ${colors.bg} ${colors.bgHover} ${colors.text} transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md active:scale-[0.98]`}
            >
              <div className={`flex items-center justify-center w-9 h-9 rounded-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm ${colors.icon} group-hover:scale-110 transition-transform duration-200`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm flex-1 text-left">{option.label}</span>
              <FaChevronRight className={`w-3.5 h-3.5 ${colors.text} opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200`} />
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

