'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from './modal';

const privateEventsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  groupSize: z.string().min(1, 'Group size is required'),
  date: z.string().min(1, 'Date is required'),
  message: z.string().optional(),
});

type PrivateEventsFormData = z.infer<typeof privateEventsSchema>;

interface PrivateEventsFormProps {
  onSuccess?: () => void;
  compact?: boolean;
}

export default function PrivateEventsForm({ onSuccess, compact = false }: PrivateEventsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PrivateEventsFormData>({
    resolver: zodResolver(privateEventsSchema),
  });

  const onSubmit = async (data: PrivateEventsFormData) => {
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      const response = await fetch('/api/private-events/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message');
      }

      // Show success modal
      setShowSuccessModal(true);
      reset();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formClasses = compact 
    ? "space-y-3" 
    : "space-y-6";
  
  const inputClasses = compact
    ? "w-full px-3 py-2 text-sm bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all"
    : "w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all";
  
  const selectClasses = compact
    ? "w-full px-3 py-2 text-sm bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent cursor-pointer appearance-none transition-all bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23ffffff%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpolyline points=%226 9 12 15 18 9%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:1em] bg-[right_0.75rem_center] bg-no-repeat pr-10 hover:bg-gray-700/50"
    : "w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent cursor-pointer appearance-none transition-all bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23ffffff%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpolyline points=%226 9 12 15 18 9%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:1.25em] bg-[right_1rem_center] bg-no-repeat pr-10 hover:bg-gray-700/50";
  
  const dateInputClasses = compact
    ? "w-full px-3 py-2 text-sm bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent cursor-pointer transition-all hover:bg-gray-700/50 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:ml-2 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
    : "w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent cursor-pointer transition-all hover:bg-gray-700/50 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:ml-2 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert";
  
  const labelClasses = compact
    ? "block text-xs font-semibold text-white mb-1"
    : "block text-sm font-semibold text-white mb-2";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={formClasses}>
      {compact ? (
        <>
          {/* Compact Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Name */}
            <div>
              <label htmlFor="name" className={labelClasses}>
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="name"
                {...register('name')}
                className={inputClasses}
                placeholder="Your name"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className={labelClasses}>
                Phone <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                {...register('phone')}
                className={inputClasses}
                placeholder="(303) 555-1234"
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.phone.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className={labelClasses}>
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                id="email"
                {...register('email')}
                className={inputClasses}
                placeholder="your@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Group Size */}
            <div>
              <label htmlFor="groupSize" className={labelClasses}>
                Group Size <span className="text-red-400">*</span>
              </label>
              <select
                id="groupSize"
                {...register('groupSize')}
                className={selectClasses}
                defaultValue=""
              >
                <option value="" disabled className="bg-gray-800 text-gray-400">Select group size</option>
                <option value="10-20" className="bg-gray-800 text-white">10-20 guests</option>
                <option value="21-30" className="bg-gray-800 text-white">21-30 guests</option>
                <option value="31-50" className="bg-gray-800 text-white">31-50 guests</option>
                <option value="51-75" className="bg-gray-800 text-white">51-75 guests</option>
                <option value="76-100" className="bg-gray-800 text-white">76-100 guests</option>
                <option value="100+" className="bg-gray-800 text-white">100+ guests</option>
              </select>
              {errors.groupSize && (
                <p className="mt-1 text-xs text-red-400">{errors.groupSize.message}</p>
              )}
            </div>
          </div>

          {/* Date - Full Width */}
          <div>
            <label htmlFor="date" className={labelClasses}>
              Preferred Date <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                id="date"
                {...register('date')}
                className={dateInputClasses}
                min={new Date().toISOString().split('T')[0]}
                onClick={(e) => {
                  const input = e.currentTarget;
                  // Try to use showPicker() if available (modern browsers)
                  if (input && typeof (input as any).showPicker === 'function') {
                    try {
                      (input as any).showPicker();
                    } catch (err) {
                      // Fallback: focus the input which will open the picker on most browsers
                      input.focus();
                    }
                  } else {
                    // Fallback: focus the input which will open the picker on most browsers
                    input.focus();
                  }
                }}
              />
            </div>
            {errors.date && (
              <p className="mt-1 text-xs text-red-400">{errors.date.message}</p>
            )}
          </div>

          {/* Message (Optional) */}
          <div>
            <label htmlFor="message" className={labelClasses}>
              Additional Details (Optional)
            </label>
            <textarea
              id="message"
              {...register('message')}
              rows={3}
              className={inputClasses + " resize-none"}
              placeholder="Tell us about your event, special requests, or any questions..."
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isSubmitting ? 'Sending...' : 'Submit Request'}
          </button>
        </>
      ) : (
        <>
          {/* Name */}
          <div>
            <label htmlFor="name" className={labelClasses}>
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="name"
              {...register('name')}
              className={inputClasses}
              placeholder="Your name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className={labelClasses}>
              Phone <span className="text-red-400">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              {...register('phone')}
              className={inputClasses}
              placeholder="(303) 555-1234"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className={labelClasses}>
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              id="email"
              {...register('email')}
              className={inputClasses}
              placeholder="your@email.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
            )}
          </div>

          {/* Group Size */}
          <div>
            <label htmlFor="groupSize" className={labelClasses}>
              Group Size <span className="text-red-400">*</span>
            </label>
            <select
              id="groupSize"
              {...register('groupSize')}
              className={selectClasses}
              defaultValue=""
            >
              <option value="" disabled className="bg-gray-800 text-gray-400">Select group size</option>
              <option value="10-20" className="bg-gray-800 text-white">10-20 guests</option>
              <option value="21-30" className="bg-gray-800 text-white">21-30 guests</option>
              <option value="31-50" className="bg-gray-800 text-white">31-50 guests</option>
              <option value="51-75" className="bg-gray-800 text-white">51-75 guests</option>
              <option value="76-100" className="bg-gray-800 text-white">76-100 guests</option>
              <option value="100+" className="bg-gray-800 text-white">100+ guests</option>
            </select>
            {errors.groupSize && (
              <p className="mt-1 text-sm text-red-400">{errors.groupSize.message}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label htmlFor="date" className={labelClasses}>
              Preferred Date <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                id="date"
                {...register('date')}
                className={dateInputClasses}
                min={new Date().toISOString().split('T')[0]}
                onClick={(e) => {
                  const input = e.currentTarget;
                  // Try to use showPicker() if available (modern browsers)
                  if (input && typeof (input as any).showPicker === 'function') {
                    try {
                      (input as any).showPicker();
                    } catch (err) {
                      // Fallback: focus the input which will open the picker on most browsers
                      input.focus();
                    }
                  } else {
                    // Fallback: focus the input which will open the picker on most browsers
                    input.focus();
                  }
                }}
              />
            </div>
            {errors.date && (
              <p className="mt-1 text-sm text-red-400">{errors.date.message}</p>
            )}
          </div>

          {/* Message (Optional) */}
          <div>
            <label htmlFor="message" className={labelClasses}>
              Additional Details (Optional)
            </label>
            <textarea
              id="message"
              {...register('message')}
              rows={4}
          className={inputClasses + " resize-none"}
          placeholder="Tell us about your event, special requests, or any questions..."
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-8 py-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isSubmitting ? 'Sending...' : 'Submit Request'}
      </button>
        </>
      )}

      {/* Error Message */}
      {submitStatus.type === 'error' && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200">
          <p className={compact ? "text-xs" : "text-sm"}>{submitStatus.message}</p>
        </div>
      )}

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
      >
        <div className="flex flex-col items-center justify-center text-center py-4">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
            <svg className="h-10 w-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Thank You!
          </h3>
          <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto leading-relaxed">
            We&apos;ve received your request and will be in touch soon to discuss your private event. Our team will review your inquiry and get back to you as soon as possible.
          </p>
          <button
            onClick={() => setShowSuccessModal(false)}
            className="px-8 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white rounded-lg transition-all font-semibold text-base shadow-lg hover:shadow-xl hover:scale-105"
          >
            Close
          </button>
        </div>
      </Modal>
    </form>
  );
}

