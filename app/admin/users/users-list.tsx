'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { showToast } from '@/components/toast';
import SearchSortFilter, { SortOption, FilterOption } from '@/components/search-sort-filter';
import StatusBadge from '@/components/status-badge';

interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function UsersList({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [filteredUsers, setFilteredUsers] = useState(initialUsers);
  const [showAll, setShowAll] = useState(false);
  const itemsToShow = 5;

  useEffect(() => {
    setUsers(initialUsers);
    setFilteredUsers(initialUsers);
  }, [initialUsers]);

  const sortOptions: SortOption<User>[] = [
    { label: 'Name (A-Z)', value: 'name', sortFn: (a, b) => (a.name || a.email).localeCompare(b.name || b.email) },
    { label: 'Email (A-Z)', value: 'email' },
    { label: 'Date Added (Newest)', value: 'createdAt', sortFn: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() },
    { label: 'Date Added (Oldest)', value: 'createdAt', sortFn: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() },
    { label: 'Role', value: 'role' },
  ];

  const filterOptions: FilterOption<User>[] = [
    { label: 'Active Only', value: 'active', filterFn: (u) => u.isActive },
    { label: 'Inactive Only', value: 'inactive', filterFn: (u) => !u.isActive },
    { label: 'Admins', value: 'admin', filterFn: (u) => u.role === 'admin' },
    { label: 'Superadmins', value: 'superadmin', filterFn: (u) => u.role === 'superadmin' },
  ];

  async function handleDelete(id: string, email: string) {
    if (!confirm(`Are you sure you want to delete ${email}? This action cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const updated = users.filter((u) => u.id !== id);
        setUsers(updated);
        showToast('User deleted successfully', 'success');
      } else {
        const error = await res.json();
        showToast('Failed to delete user', 'error', error.error || error.details || 'Please try again.');
      }
    } catch (error) {
      showToast('Delete failed', 'error', error instanceof Error ? error.message : 'An error occurred while deleting the user.');
    }
  }

  async function handleToggleActive(id: string, currentStatus: boolean, email: string) {
    try {
      const user = users.find((u) => u.id === id);
      if (!user) return;

      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...user, isActive: !currentStatus }),
      });

      if (res.ok) {
        const updated = users.map((u) => (u.id === id ? { ...u, isActive: !currentStatus } : u));
        setUsers(updated);
        showToast(
          `User ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
          'success',
          `${email} is now ${!currentStatus ? 'active' : 'inactive'}.`
        );
      } else {
        const error = await res.json();
        showToast('Failed to update user', 'error', error.error || error.details || 'Please try again.');
      }
    } catch (error) {
      showToast('Update failed', 'error', error instanceof Error ? error.message : 'An error occurred while updating the user.');
    }
  }

  const displayedUsers = showAll ? filteredUsers : filteredUsers.slice(0, itemsToShow);

  return (
    <div className="space-y-4">
      <SearchSortFilter
        items={users}
        onFilteredItemsChange={setFilteredUsers}
        searchFields={['name', 'email']}
        searchPlaceholder="Search users by name or email..."
        sortOptions={sortOptions}
        filterOptions={filterOptions}
        defaultSort={sortOptions[0]}
      />

      {filteredUsers.length === 0 ? (
        <p className="text-xs text-gray-400">
          {users.length === 0 
            ? 'No users yet.'
            : 'No users match your search or filter criteria.'}
        </p>
      ) : (
        <>
          <div className="grid gap-2">
            {displayedUsers.map((user) => (
              <div
                key={user.id}
                className="bg-gray-900 p-3 rounded-lg flex justify-between items-start gap-2"
              >
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  {user.image && (
                    <img
                      src={user.image}
                      alt={user.name || user.email}
                      className="w-8 h-8 rounded-full flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold truncate">{user.name || user.email}</h3>
                      <span
                        className={`px-1.5 py-0.5 text-xs rounded flex-shrink-0 ${
                          user.role === 'superadmin'
                            ? 'bg-purple-900 text-purple-200'
                            : 'bg-blue-900 text-blue-200'
                        }`}
                      >
                        {user.role}
                      </span>
                      <StatusBadge status={user.isActive ? 'active' : 'inactive'} className="px-1.5 py-0.5 text-xs" />
                    </div>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {user.role !== 'superadmin' && (
                    <>
                      <button
                        onClick={() => handleToggleActive(user.id, user.isActive, user.email)}
                        className={`px-3 py-1 text-xs rounded font-medium transition cursor-pointer ${
                          user.isActive
                            ? 'bg-green-700 hover:bg-green-600 text-white'
                            : 'bg-gray-700 hover:bg-gray-600 text-white'
                        }`}
                        title={user.isActive ? 'Click to deactivate this user' : 'Click to activate this user'}
                      >
                        {user.isActive ? '✓ Active' : '○ Inactive'}
                      </button>
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded text-white cursor-pointer transition"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(user.id, user.email)}
                        className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 rounded text-white cursor-pointer transition"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          {filteredUsers.length > itemsToShow && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-blue-400 hover:text-blue-300 w-full py-2 cursor-pointer transition"
            >
              {showAll ? 'Show Less' : `Show All (${filteredUsers.length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

