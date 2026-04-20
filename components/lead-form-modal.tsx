'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from './modal';
import { showToast } from './toast';

const leadFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  groupSize: z.string().min(1, 'Group size is required'),
  preferredDate: z.string().min(1, 'Preferred date is required'),
  message: z.string().optional(),
  status: z.enum(['new', 'contacted', 'quoted', 'booked', 'cancelled', 'lost']),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LeadFormModal({ isOpen, onClose, onSuccess }: LeadFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fieldBaseClass =
    'w-full rounded-xl border border-slate-300/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent)]/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white';

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      status: 'new',
    },
  });

  const onSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/private-dining-leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create lead');
      }

      showToast('Lead created successfully', 'success');
      reset();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to create lead',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Lead">
      <div className="-mx-1 mb-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Lead intake</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Capture contact details first, then event preferences and notes.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Name <span className="text-red-500">*</span>
            </label>
            <input type="text" id="name" {...register('name')} className={fieldBaseClass} placeholder="John Doe" />
            {errors.name && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Email <span className="text-red-500">*</span>
            </label>
            <input type="email" id="email" {...register('email')} className={fieldBaseClass} placeholder="john@example.com" />
            {errors.email && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Phone <span className="text-red-500">*</span>
            </label>
            <input type="tel" id="phone" {...register('phone')} className={fieldBaseClass} placeholder="(555) 123-4567" />
            {errors.phone && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errors.phone.message}</p>}
          </div>

          <div>
            <label htmlFor="groupSize" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Group Size <span className="text-red-500">*</span>
            </label>
            <input type="text" id="groupSize" {...register('groupSize')} className={fieldBaseClass} placeholder="25-30 guests" />
            {errors.groupSize && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errors.groupSize.message}</p>}
          </div>

          <div>
            <label htmlFor="preferredDate" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Preferred Date <span className="text-red-500">*</span>
            </label>
            <input type="date" id="preferredDate" {...register('preferredDate')} className={fieldBaseClass} />
            {errors.preferredDate && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errors.preferredDate.message}</p>}
          </div>

          <div>
            <label htmlFor="status" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Status
            </label>
            <select id="status" {...register('status')} className={fieldBaseClass}>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="quoted">Quoted</option>
              <option value="booked">Booked</option>
              <option value="cancelled">Cancelled</option>
              <option value="lost">Lost</option>
            </select>
            {errors.status && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errors.status.message}</p>}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="message" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Message / Notes
            </label>
            <textarea
              id="message"
              {...register('message')}
              rows={4}
              className={`${fieldBaseClass} resize-y`}
              placeholder="Additional details or notes..."
            />
            {errors.message && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errors.message.message}</p>}
          </div>
        </div>

        <div className="sticky bottom-0 -mx-1 border-t border-slate-200 bg-white/95 px-1 pt-4 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Lead'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

