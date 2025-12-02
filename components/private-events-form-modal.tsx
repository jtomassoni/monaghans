'use client';

import { useState } from 'react';
import Modal from './modal';
import PrivateEventsForm from './private-events-form';

interface PrivateEventsFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivateEventsFormModal({ isOpen, onClose }: PrivateEventsFormModalProps) {
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleFormSuccess = () => {
    setFormSubmitted(true);
    // Close modal after 2 seconds on success
    setTimeout(() => {
      setFormSubmitted(false);
      onClose();
    }, 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request a Quote">
      <PrivateEventsForm onSuccess={handleFormSuccess} compact={true} />
    </Modal>
  );
}

