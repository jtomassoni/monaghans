'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/toast';
import SearchSortFilter, { SortOption, FilterOption } from '@/components/search-sort-filter';
import UserModalForm from '@/components/user-modal-form';

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
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [filteredUsers, setFilteredUsers] = useState(initialUsers);
  const [showAll, setShowAll] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
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
  ];

  function handleEdit(user: User) {
    setSelectedUser(user);
    setUserModalOpen(true);
  }

  function handleNewUser() {
    setSelectedUser(undefined);
    setUserModalOpen(true);
  }

  function handleUserSuccess() {
    router.refresh();
  }

  function handleUserDelete(userId: string) {
    const updated = users.filter((u) => u.id !== userId);
    setUsers(updated);
  }

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

  // Handle opening new user modal from custom event or query parameter
  useEffect(() => {
    const handleOpenNewUser = () => {
      setSelectedUser(undefined);
      setUserModalOpen(true);
    };

    // Listen for custom event
    window.addEventListener('openNewUser', handleOpenNewUser);

    // Check for newUser=true query parameter
    const params = new URLSearchParams(window.location.search);
    if (params.get('newUser') === 'true') {
      handleOpenNewUser();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    return () => window.removeEventListener('openNewUser', handleOpenNewUser);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-2">
        <button
          onClick={handleNewUser}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-xl text-white font-medium text-sm transition-all duration-200 hover:scale-105 cursor-pointer active:scale-95 border border-blue-400 dark:border-blue-500"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New User</span>
        </button>
      </div>
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
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            {users.length === 0 
              ? 'No users yet.'
              : 'No users match your search or filter criteria.'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Active</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {displayedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {user.image && (
                            <img
                              src={user.image}
                              alt={user.name || user.email}
                              className="w-8 h-8 rounded-full flex-shrink-0"
                            />
                          )}
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.name || user.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{user.email}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          user.isActive 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center justify-end">
                          {user.role !== 'admin' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleToggleActive(user.id, user.isActive, user.email)}
                                className={`px-3 py-1 text-xs rounded font-medium transition cursor-pointer ${
                                  user.isActive
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                                }`}
                                title={user.isActive ? 'Click to deactivate this user' : 'Click to activate this user'}
                              >
                                {user.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleEdit(user)}
                                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded text-white cursor-pointer transition font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(user.id, user.email)}
                                className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 rounded text-white cursor-pointer transition font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500 italic">Protected</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {filteredUsers.length > itemsToShow && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 w-full py-2 cursor-pointer transition"
            >
              {showAll ? 'Show Less' : `Show All (${filteredUsers.length})`}
            </button>
          )}
        </>
      )}

      <UserModalForm
        isOpen={userModalOpen}
        onClose={() => {
          setUserModalOpen(false);
          setSelectedUser(undefined);
        }}
        user={selectedUser}
        onSuccess={handleUserSuccess}
        onDelete={handleUserDelete}
      />
    </div>
  );
}

