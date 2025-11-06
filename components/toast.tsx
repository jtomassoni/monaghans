'use client';

import { useState, useEffect, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  details?: string;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, details?: string) => void;
  removeToast: (id: string) => void;
}

let toastIdCounter = 0;
let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toastState: Toast[] = [];

function notifyListeners() {
  toastListeners.forEach(listener => listener([...toastState]));
}

export function showToast(message: string, type: ToastType = 'error', details?: string) {
  const id = `toast-${++toastIdCounter}`;
  const toast: Toast = { id, message, type, details };
  toastState.push(toast);
  notifyListeners();

  // Auto-remove after 5 seconds for success, 7 seconds for errors
  const duration = type === 'success' ? 5000 : 7000;
  setTimeout(() => {
    removeToast(id);
  }, duration);
}

export function removeToast(id: string) {
  toastState = toastState.filter(t => t.id !== id);
  notifyListeners();
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setToasts(newToasts);
    };
    toastListeners.push(listener);
    setToasts([...toastState]);

    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  }, []);

  const showToastCallback = useCallback((message: string, type?: ToastType, details?: string) => {
    showToast(message, type || 'error', details);
  }, []);

  const removeToastCallback = useCallback((id: string) => {
    removeToast(id);
  }, []);

  return {
    toasts,
    showToast: showToastCallback,
    removeToast: removeToastCallback,
  };
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto min-w-[300px] max-w-[500px] rounded-lg shadow-lg border p-4 flex items-start gap-3 animate-slide-in-right ${
            toast.type === 'success'
              ? 'bg-green-900 border-green-700 text-white'
              : toast.type === 'error'
              ? 'bg-red-900 border-red-700 text-white'
              : 'bg-blue-900 border-blue-700 text-white'
          }`}
        >
          <div className="flex-1">
            <div className="font-semibold">{toast.message}</div>
            {toast.details && (
              <div className="text-sm mt-1 opacity-90">{toast.details}</div>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-current opacity-70 hover:opacity-100 transition cursor-pointer"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

