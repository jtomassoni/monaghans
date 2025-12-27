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
      onClick: onSelectEvent,
    },
    {
      id: 'food-special',
      label: 'Food Special',
      icon: FaDrumstickBite,
      onClick: onSelectFoodSpecial,
    },
    {
      id: 'drink-special',
      label: 'Drink Special',
      icon: FaWineGlass,
      onClick: onSelectDrinkSpecial,
    },
    {
      id: 'announcement',
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
      <div className="space-y-0.5">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option.onClick)}
              className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white cursor-pointer"
            >
              <Icon className="w-4 h-4 group-hover:scale-110 transition-transform duration-200 flex-shrink-0 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
              <span className="font-medium text-sm flex-1 text-left">{option.label}</span>
              <FaChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors duration-200" />
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

