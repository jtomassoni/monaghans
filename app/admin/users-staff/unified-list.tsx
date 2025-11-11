'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/toast';
import SearchSortFilter, { SortOption, FilterOption } from '@/components/search-sort-filter';
import UnifiedPersonModalForm from './unified-person-form';
import { FaUser, FaUserTie, FaEdit, FaTrash, FaBan, FaCheckCircle } from 'react-icons/fa';

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

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  pin: string | null;
  role: string;
  hourlyWage: number;
  isActive: boolean;
  hireDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UnifiedPerson {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  type: 'user' | 'employee' | 'both';
  user?: User;
  employee?: Employee;
  // Combined fields
  role: string; // User role or employee role
  isActive: boolean;
  // Employee-specific
  phone?: string | null;
  pin?: string | null;
  hourlyWage?: number;
  hireDate?: string | null;
  notes?: string | null;
  // User-specific
  userRole?: string;
}

interface UnifiedUsersStaffListProps {
  initialUsers: User[];
  initialEmployees: Employee[];
  currentUserRole: string;
}

export default function UnifiedUsersStaffList({ 
  initialUsers, 
  initialEmployees,
  currentUserRole 
}: UnifiedUsersStaffListProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [employees, setEmployees] = useState(initialEmployees);
  const [filteredPeople, setFilteredPeople] = useState<UnifiedPerson[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<UnifiedPerson | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'all' | 'users' | 'staff'>('all');
  const itemsToShow = 10;

  // Combine users and employees into unified list
  const unifiedPeople: UnifiedPerson[] = (() => {
    const peopleMap = new Map<string, UnifiedPerson>();

    // Add all users
    users.forEach(user => {
      const key = user.email.toLowerCase();
      peopleMap.set(key, {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        type: 'user',
        user,
        role: user.role,
        isActive: user.isActive,
        userRole: user.role,
      });
    });

    // Add or merge employees
    employees.forEach(emp => {
      const key = emp.email.toLowerCase();
      const existing = peopleMap.get(key);
      
      if (existing) {
        // Employee has a user account - merge them
        existing.type = 'both';
        existing.employee = emp;
        existing.phone = emp.phone;
        existing.pin = emp.pin;
        existing.hourlyWage = emp.hourlyWage;
        existing.hireDate = emp.hireDate;
        existing.notes = emp.notes;
        // Keep user's active status as primary, but show employee status too
      } else {
        // Employee without user account
        peopleMap.set(key, {
          id: emp.id,
          email: emp.email,
          name: emp.name,
          image: null,
          type: 'employee',
          employee: emp,
          role: emp.role,
          isActive: emp.isActive,
          phone: emp.phone,
          pin: emp.pin,
          hourlyWage: emp.hourlyWage,
          hireDate: emp.hireDate,
          notes: emp.notes,
        });
      }
    });

    return Array.from(peopleMap.values());
  })();

  useEffect(() => {
    let filtered = unifiedPeople;

    // Apply view mode filter
    switch (viewMode) {
      case 'users':
        filtered = filtered.filter(p => p.type === 'user' || p.type === 'both');
        break;
      case 'staff':
        filtered = filtered.filter(p => p.type === 'employee' || p.type === 'both');
        break;
    }

    setFilteredPeople(filtered);
  }, [users, employees, viewMode]);

  const sortOptions: SortOption<UnifiedPerson>[] = [
    { label: 'Name (A-Z)', value: 'name', sortFn: (a, b) => (a.name || a.email).localeCompare(b.name || b.email) },
    { label: 'Email (A-Z)', value: 'email' },
    { label: 'Type', value: 'type' },
    { label: 'Active Status', value: 'isActive', sortFn: (a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0) },
  ];

  const filterOptions: FilterOption<UnifiedPerson>[] = [
    { label: 'Active Only', value: 'active', filterFn: (p) => p.isActive },
    { label: 'Inactive Only', value: 'inactive', filterFn: (p) => !p.isActive },
    { label: 'Has User Account', value: 'hasUser', filterFn: (p) => p.type === 'user' || p.type === 'both' },
    { label: 'Has Employee Record', value: 'hasEmployee', filterFn: (p) => p.type === 'employee' || p.type === 'both' },
  ];

  function handleEdit(person: UnifiedPerson) {
    setSelectedPerson(person);
    setModalOpen(true);
  }

  function handleNew() {
    setSelectedPerson(undefined);
    setModalOpen(true);
  }

  function handleSuccess() {
    router.refresh();
  }

  function handleDelete(person: UnifiedPerson) {
    if (person.type === 'both' || person.type === 'user') {
      const updated = users.filter((u) => u.id !== person.id);
      setUsers(updated);
    }
    if (person.type === 'both' || person.type === 'employee') {
      const updated = employees.filter((e) => e.id !== person.id);
      setEmployees(updated);
    }
  }

  async function handleToggleActive(person: UnifiedPerson) {
    try {
      if (person.user) {
        const res = await fetch(`/api/users/${person.user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...person.user, isActive: !person.isActive }),
        });
        if (res.ok) {
          const updated = users.map((u) => (u.id === person.user!.id ? { ...u, isActive: !person.isActive } : u));
          setUsers(updated);
          showToast(`User ${!person.isActive ? 'activated' : 'deactivated'} successfully`, 'success');
        }
      }
      if (person.employee) {
        const res = await fetch(`/api/employees/${person.employee.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: !person.isActive }),
        });
        if (res.ok) {
          const updated = employees.map((e) => (e.id === person.employee!.id ? { ...e, isActive: !person.isActive } : e));
          setEmployees(updated);
          showToast(`Employee ${!person.isActive ? 'activated' : 'deactivated'} successfully`, 'success');
        }
      }
    } catch (error) {
      showToast('Update failed', 'error', error instanceof Error ? error.message : 'An error occurred.');
    }
  }

  const displayedPeople = showAll ? filteredPeople : filteredPeople.slice(0, itemsToShow);

  const getTypeBadge = (person: UnifiedPerson) => {
    if (person.type === 'both') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-200">
          <FaUserTie className="w-3 h-3" />
          User & Staff
        </span>
      );
    } else if (person.type === 'user') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200">
          <FaUser className="w-3 h-3" />
          User (No Staff Record)
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-200">
          <FaUserTie className="w-3 h-3" />
          Staff (No User Account)
        </span>
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">All People</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({filteredPeople.length} {filteredPeople.length === 1 ? 'person' : 'people'})
          </span>
        </div>
        <button
          onClick={handleNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-xl text-white font-medium text-sm transition-all duration-200 hover:scale-105 cursor-pointer active:scale-95 border border-blue-400 dark:border-blue-500"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Person</span>
        </button>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        {[
          { id: 'all', label: 'All' },
          { id: 'users', label: 'Users' },
          { id: 'staff', label: 'Staff' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id as any)}
            className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
              viewMode === tab.id
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <SearchSortFilter
        items={filteredPeople}
        onFilteredItemsChange={setFilteredPeople}
        searchFields={['name', 'email', 'role']}
        searchPlaceholder="Search by name, email, or role..."
        sortOptions={sortOptions}
        filterOptions={filterOptions}
        defaultSort={sortOptions[0]}
      />

      {filteredPeople.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            {unifiedPeople.length === 0 
              ? 'No users or staff members yet.'
              : 'No people match your search or filter criteria.'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Person</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {displayedPeople.map((person) => (
                    <tr key={`${person.type}-${person.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {person.image && (
                            <img
                              src={person.image}
                              alt={person.name || person.email}
                              className="w-8 h-8 rounded-full flex-shrink-0"
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {person.name || person.email}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{person.email}</div>
                            {person.phone && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">{person.phone}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getTypeBadge(person)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {person.userRole && (
                            <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200">
                              User: {person.userRole}
                            </span>
                          )}
                          {person.employee && (
                            <span className="px-2 py-1 text-xs font-medium rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-200">
                              Staff: {person.employee.role}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          person.isActive 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {person.isActive ? (
                            <span className="flex items-center gap-1">
                              <FaCheckCircle className="w-3 h-3" />
                              Active
                            </span>
                          ) : (
                            'Inactive'
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleActive(person)}
                            className={`px-3 py-1 text-xs rounded font-medium transition cursor-pointer ${
                              person.isActive
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-gray-600 hover:bg-gray-700 text-white'
                            }`}
                            title={person.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {person.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleEdit(person)}
                            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded text-white cursor-pointer transition font-medium"
                          >
                            <FaEdit className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {filteredPeople.length > itemsToShow && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 w-full py-2 cursor-pointer transition"
            >
              {showAll ? 'Show Less' : `Show All (${filteredPeople.length})`}
            </button>
          )}
        </>
      )}

      <UnifiedPersonModalForm
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedPerson(undefined);
        }}
        person={selectedPerson}
        onSuccess={handleSuccess}
        onDelete={handleDelete}
        currentUserRole={currentUserRole}
        existingUsers={users}
        existingEmployees={employees}
      />
    </div>
  );
}

