'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface MenuSection {
  id?: string;
  name: string;
  description: string;
  menuType: string;
  displayOrder: number;
  isActive: boolean;
}

export default function MenuSectionForm({ section }: { section?: MenuSection }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: section?.name || '',
    description: section?.description || '',
    menuType: section?.menuType || 'dinner',
    displayOrder: section?.displayOrder ?? 0,
    isActive: section?.isActive ?? true,
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const url = section?.id ? `/api/menu-sections/${section.id}` : '/api/menu-sections';
      const method = section?.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push('/admin/menu');
        router.refresh();
      } else {
        alert('Failed to save menu section');
      }
    } catch (error) {
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">{section ? 'Edit Section' : 'New Section'}</h1>
          <Link
            href="/admin/menu"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Cancel
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-900 p-6 rounded-lg">
          <div>
            <label htmlFor="name" className="block mb-2">
              Section Name *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
            />
          </div>

          <div>
            <label htmlFor="description" className="block mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
            />
          </div>

          <div>
            <label htmlFor="menuType" className="block mb-2">
              Menu Type
            </label>
            <select
              id="menuType"
              value={formData.menuType}
              onChange={(e) => setFormData({ ...formData, menuType: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
            >
              <option value="breakfast">Breakfast</option>
              <option value="dinner">Dinner</option>
              <option value="both">Both</option>
            </select>
          </div>

          <div>
            <label htmlFor="displayOrder" className="block mb-2">
              Display Order
            </label>
            <input
              id="displayOrder"
              type="number"
              value={formData.displayOrder}
              onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
            />
            <p className="text-sm text-gray-400 mt-1">Lower numbers appear first</p>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <span>Active</span>
            </label>
          </div>

          <div className="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <Link
              href="/admin/menu"
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-500/20"
            >
              {loading ? (section?.id ? 'Saving...' : 'Creating...') : (section?.id ? 'Save' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

