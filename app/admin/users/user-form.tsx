'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { showToast } from '@/components/toast';
import { FaExclamationTriangle } from 'react-icons/fa';
import StatusToggle from '@/components/status-toggle';
import ConfirmationDialog from '@/components/confirmation-dialog';

interface User {
  id?: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  isActive: boolean;
}

export default function UserForm({ user }: { user?: User }) {
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
  }, [user]);

  // Check if form is dirty
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormData);

  function handleCancel(e: React.MouseEvent) {
    if (isDirty) {
      e.preventDefault();
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
    }
    // If clean, let Link navigate normally
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
        router.push('/admin/users');
        router.refresh();
        showToast(
          user?.id ? 'User updated successfully' : 'User created successfully',
          'success'
        );
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
        router.push('/admin/users');
        router.refresh();
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
    <div className="min-h-screen bg-[var(--color-background)] p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">{user ? 'Edit User' : 'New User'}</h1>
          <Link
            href="/admin/users"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Cancel
          </Link>
        </div>

        {user && (
          <div className="mb-6 p-4 bg-gray-900 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              {user.image && (
                <img
                  src={user.image}
                  alt={user.name || user.email}
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div>
                <p className="font-semibold">{user.name || 'No name'}</p>
                <p className="text-sm text-gray-400">{user.email}</p>
              </div>
            </div>
            {user.role === 'superadmin' && (
              <p className="text-sm text-yellow-400 mt-2 flex items-center gap-2">
                <FaExclamationTriangle className="w-4 h-4" />
                <span>Superadmin users cannot be modified or deleted</span>
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-900 p-6 rounded-lg">
          {user && (
            <StatusToggle
              type="active"
              value={formData.isActive}
              onChange={(value) => setFormData({ ...formData, isActive: value })}
              label="Status"
            />
          )}

          <div>
            <label htmlFor="name" className="block mb-2">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              disabled={user?.role === 'superadmin'}
            />
          </div>

          <div>
            <label htmlFor="role" className="block mb-2">
              Role *
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              disabled={user?.role === 'superadmin'}
              required
            >
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
            <p className="text-sm text-gray-400 mt-1">
              Admin: Can manage content. Superadmin: Can manage users and settings.
            </p>
          </div>

          <div className="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            {user?.id && user?.role !== 'superadmin' && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                className="px-4 py-2 bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-red-500/20 mr-auto"
              >
                Delete
              </button>
            )}
            <Link
              href="/admin/users"
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!!(loading || user?.role === 'superadmin' || (user?.id && !isDirty))}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-500/20"
            >
              {loading ? (user?.id ? 'Saving...' : 'Creating...') : (user?.id ? 'Save' : 'Create')}
            </button>
          </div>
        </form>
        {user?.id && user?.role !== 'superadmin' && (
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
        )}
      </div>
    </div>
  );
}

