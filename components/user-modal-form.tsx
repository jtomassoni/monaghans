'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/modal';
import { showToast } from '@/components/toast';
import { FaExclamationTriangle, FaTrash, FaTimes, FaSave } from 'react-icons/fa';
import StatusToggle from '@/components/status-toggle';
import ConfirmationDialog from '@/components/confirmation-dialog';
import { useUnsavedChangesWarning } from '@/lib/use-unsaved-changes-warning';

interface User {
  id?: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  isActive: boolean;
}

interface UserModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User;
  onSuccess?: () => void;
  onDelete?: (userId: string) => void;
}

export default function UserModalForm({ isOpen, onClose, user, onSuccess, onDelete }: UserModalFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    role: user?.role || 'admin',
    isActive: user?.isActive ?? true,
  });

  const [initialFormData, setInitialFormData] = useState(formData);

  useEffect(() => {
    if (user) {
      const newFormData = {
        name: user.name || '',
        role: user.role || 'admin',
        isActive: user.isActive ?? true,
      };
      setFormData(newFormData);
      setInitialFormData(newFormData);
    } else {
      const newFormData = {
        name: '',
        role: 'admin',
        isActive: true,
      };
      setFormData(newFormData);
      setInitialFormData(newFormData);
    }
  }, [user, isOpen]);

  // Check if form is dirty
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormData);
  
  // Warn user before leaving page with unsaved changes
  useUnsavedChangesWarning(isDirty && isOpen);

  function handleCancel() {
    if (isDirty) {
      // Reset form to initial state
      if (user) {
        const newFormData = {
          name: user.name || '',
          role: user.role || 'admin',
          isActive: user.isActive ?? true,
        };
        setFormData(newFormData);
        setInitialFormData(newFormData);
      } else {
        const newFormData = {
          name: '',
          role: 'admin',
          isActive: true,
        };
        setFormData(newFormData);
        setInitialFormData(newFormData);
      }
    } else {
      // Close form if clean
      onClose();
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const url = user?.id ? `/api/users/${user.id}` : '/api/users';
      const method = user?.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          email: user?.email || '',
          image: user?.image || null,
        }),
      });

      if (res.ok) {
        router.refresh();
        showToast(
          user?.id ? 'User updated successfully' : 'User created successfully',
          'success'
        );
        onSuccess?.();
        onClose();
      } else {
        const error = await res.json();
        showToast(
          user?.id ? 'Failed to update user' : 'Failed to create user',
          'error',
          error.error || error.details || 'Please check your input and try again.'
        );
      }
    } catch (error) {
      showToast(
        'Request failed',
        'error',
        error instanceof Error ? error.message : 'An error occurred while saving the user.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!user?.id || user?.role === 'superadmin') return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('User deleted successfully', 'success');
        onDelete?.(user.id);
        onSuccess?.();
        onClose();
      } else {
        const error = await res.json();
        showToast('Failed to delete user', 'error', error.error || error.details || 'Please try again.');
      }
    } catch (error) {
      showToast('Delete failed', 'error', error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? 'Edit User' : 'New User'}
    >
      {user && (
        <div className="mb-6 rounded-3xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            {user.image && (
              <img
                src={user.image}
                alt={user.name || user.email}
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              <p className="font-semibold text-sm text-gray-900 dark:text-white">{user.name || 'No name'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
            </div>
          </div>
          {user.role === 'superadmin' && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
              <FaExclamationTriangle className="w-3 h-3" />
              <span>Superadmin users cannot be modified or deleted</span>
            </p>
          )}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-8">
        {user && (
          <div className="rounded-3xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-6 backdrop-blur-sm space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">User Status</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 max-w-sm">
                  Control whether this user account is active.
                </p>
              </div>
              <StatusToggle
                type="active"
                value={formData.isActive}
                onChange={(value) => setFormData({ ...formData, isActive: value })}
                className="shrink-0"
              />
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-6 backdrop-blur-sm space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">User Information</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 max-w-sm">
              Basic details for this user account.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-900 dark:text-white">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                disabled={user?.role === 'superadmin'}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-medium text-gray-900 dark:text-white">
                Role *
              </label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                disabled={user?.role === 'superadmin'}
                required
              >
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Admin: Can manage content. Superadmin: Can manage users and settings.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
          {user?.id && onDelete && user?.role !== 'superadmin' && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
            >
              <FaTrash className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer"
          >
            <FaTimes className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
          <button
            type="submit"
            disabled={!!(loading || user?.role === 'superadmin' || (user?.id && !isDirty))}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <FaSave className="w-3.5 h-3.5" />
                <span>Save User</span>
              </>
            )}
          </button>
        </div>
      </form>
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to delete "${user?.name || user?.email}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </Modal>
  );
}

