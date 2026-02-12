'use client';

import { useState } from 'react';
import Modal from '@/components/modal';
import EventModalForm from '@/components/event-modal-form';
import SpecialModalForm from '@/components/special-modal-form';
import DrinkSpecialModalForm from '@/components/drink-special-modal-form';
import AnnouncementModalForm from '@/components/announcement-modal-form';

export type NewItemType = 'event' | 'food' | 'drink' | 'announcement';

const TYPE_OPTIONS: { value: NewItemType; label: string }[] = [
  { value: 'event', label: 'Event' },
  { value: 'food', label: 'Food Special' },
  { value: 'drink', label: 'Drink Special' },
  { value: 'announcement', label: 'Announcement' },
];

interface NewItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onEventAdded?: (event: any) => void;
  onEventUpdated?: (event: any) => void;
  onEventDeleted?: (eventId: string) => void;
  onExceptionAdded?: (eventId: string, updatedEvent: any) => void;
  onSpecialDeleted?: (specialId: string) => void;
  onAnnouncementAdded?: (announcement: any) => void;
  onAnnouncementUpdated?: (announcement: any) => void;
  onAnnouncementDeleted?: (announcementId: string) => void;
}

export default function NewItemFormModal({
  isOpen,
  onClose,
  onSuccess,
  onEventAdded,
  onEventUpdated,
  onEventDeleted,
  onExceptionAdded,
  onSpecialDeleted,
  onAnnouncementAdded,
  onAnnouncementUpdated,
  onAnnouncementDeleted,
}: NewItemFormModalProps) {
  const [itemType, setItemType] = useState<NewItemType>('food');

  const handleSuccess = () => {
    onSuccess?.();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New" maxHeight="75vh">
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-4 backdrop-blur-sm">
          <label htmlFor="new-item-type" className="block text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400 mb-2">
            Type
          </label>
          <select
            id="new-item-type"
            value={itemType}
            onChange={(e) => setItemType(e.target.value as NewItemType)}
            className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all min-h-[44px] touch-manipulation"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col min-h-0 flex-1 min-w-0 overflow-hidden">
          {itemType === 'event' && (
            <EventModalForm
              isOpen={true}
              onClose={onClose}
              event={undefined}
              onSuccess={handleSuccess}
              onEventAdded={onEventAdded}
              onEventUpdated={onEventUpdated}
              onDelete={onEventDeleted}
              onExceptionAdded={onExceptionAdded}
              embed
            />
          )}
          {itemType === 'food' && (
            <SpecialModalForm
              isOpen={true}
              onClose={onClose}
              special={undefined}
              defaultType="food"
              onSuccess={handleSuccess}
              onDelete={onSpecialDeleted}
              embed
            />
          )}
          {itemType === 'drink' && (
            <DrinkSpecialModalForm
              isOpen={true}
              onClose={onClose}
              special={undefined}
              onSuccess={handleSuccess}
              onDelete={onSpecialDeleted}
              embed
            />
          )}
          {itemType === 'announcement' && (
            <AnnouncementModalForm
              isOpen={true}
              onClose={onClose}
              announcement={undefined}
              onSuccess={handleSuccess}
              onDelete={onAnnouncementDeleted}
              onAnnouncementAdded={onAnnouncementAdded}
              onAnnouncementUpdated={onAnnouncementUpdated}
              embed
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
