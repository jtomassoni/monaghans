'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/modal';
import { showToast } from '@/components/toast';
import { FaExclamationTriangle } from 'react-icons/fa';

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
}

export default function UserModalForm({ isOpen, onClose, user, onSuccess }: UserModalFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    role: user?.role || 'admin',
    isActive: user?.isActive ?? true,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        role: user.role || 'admin',
        isActive: user.isActive ?? true,
      });
    } else {
      setFormData({
        name: '',
        role: 'admin',
        isActive: true,
      });
    }
  }, [user, isOpen]);

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? 'Edit User' : 'New User'}
    >
      {user && (
        <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            {user.image && (
              <img
                src={user.image}
                alt={user.name || user.email}
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              <p className="font-semibold text-sm">{user.name || 'No name'}</p>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
          </div>
          {user.role === 'superadmin' && (
            <p className="text-xs text-yellow-400 mt-2 flex items-center gap-2">
              <FaExclamationTriangle className="w-3 h-3" />
              <span>Superadmin users cannot be modified or deleted</span>
            </p>
          )}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="name" className="block mb-1 text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
            disabled={user?.role === 'superadmin'}
          />
        </div>

        <div>
          <label htmlFor="role" className="block mb-1 text-sm font-medium">
            Role *
          </label>
          <select
            id="role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
            disabled={user?.role === 'superadmin'}
            required
          >
            <option value="admin">Admin</option>
            <option value="superadmin">Superadmin</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Admin: Can manage content. Superadmin: Can manage users and settings.
          </p>
        </div>

        {user && (
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
                disabled={user.role === 'superadmin'}
              />
              <span className="text-sm">Active</span>
            </label>
            <p className="text-xs text-gray-400 mt-1">
              Inactive users cannot log in
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-3 border-t border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || user?.role === 'superadmin'}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-semibold disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save User'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

