'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/modal';
import { showToast } from '@/components/toast';
import { FaExclamationTriangle } from 'react-icons/fa';
import StatusToggle from '@/components/status-toggle';
import ConfirmationDialog from '@/components/confirmation-dialog';
import { format } from 'date-fns';
import DatePicker from '@/components/date-picker';
import { canCreateRole } from '@/lib/permissions';

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
  // Combined fields (for compatibility with list component)
  role: string;
  isActive: boolean;
  phone?: string | null;
  pin?: string | null;
  hourlyWage?: number;
  hireDate?: string | null;
  notes?: string | null;
  userRole?: string;
}

interface UnifiedPersonModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  person?: UnifiedPerson;
  onSuccess?: () => void;
  onDelete?: (person: UnifiedPerson) => void;
  currentUserRole: string;
  existingUsers: User[];
  existingEmployees: Employee[];
}

export default function UnifiedPersonModalForm({
  isOpen,
  onClose,
  person,
  onSuccess,
  onDelete,
  currentUserRole,
  existingUsers,
  existingEmployees,
}: UnifiedPersonModalFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Get available roles based on current user's permissions
  const getAvailableRoles = () => {
    const roles: { value: string; label: string }[] = [];
    
    if (canCreateRole(currentUserRole, 'owner')) {
      roles.push({ value: 'owner', label: 'Owner' });
    }
    if (canCreateRole(currentUserRole, 'manager')) {
      roles.push({ value: 'manager', label: 'Manager' });
    }
    if (canCreateRole(currentUserRole, 'cook')) {
      roles.push({ value: 'cook', label: 'Cook' });
    }
    if (canCreateRole(currentUserRole, 'bartender')) {
      roles.push({ value: 'bartender', label: 'Bartender' });
    }
    if (canCreateRole(currentUserRole, 'barback')) {
      roles.push({ value: 'barback', label: 'Barback' });
    }
    
    return roles;
  };

  const availableRoles = getAvailableRoles();
  const defaultRole = availableRoles.length > 0 ? availableRoles[0].value : 'manager';

  // When editing, ensure the current role is in the available roles list (even if user can't create it)
  // This allows displaying the current role, but users can only select roles they have permission to create
  const getRolesForSelect = () => {
    const roles = [...availableRoles];
    const currentRole = person?.user?.role;
    if (currentRole && !roles.find(r => r.value === currentRole)) {
      // Add current role if it's not already in the list (for display purposes when editing)
      const roleLabels: Record<string, string> = {
        owner: 'Owner',
        manager: 'Manager',
        cook: 'Cook',
        bartender: 'Bartender',
        barback: 'Barback',
      };
      roles.unshift({ value: currentRole, label: roleLabels[currentRole] || currentRole });
    }
    return roles;
  };

  const rolesForSelect = getRolesForSelect();

  // Form state
  const [userFormData, setUserFormData] = useState({
    email: '',
    name: '',
    role: defaultRole,
    isActive: true,
  });

  const [employeeFormData, setEmployeeFormData] = useState({
    name: '',
    email: '',
    phone: '',
    pin: '',
    role: 'cook' as 'cook' | 'bartender' | 'barback',
    hourlyWage: '',
    hireDate: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    isActive: true,
  });

  const [createUserAccount, setCreateUserAccount] = useState(true);
  const [createEmployeeRecord, setCreateEmployeeRecord] = useState(true);

  // Initialize form when person changes
  useEffect(() => {
    if (person) {
      // Editing existing person - always show both sections
      if (person.user) {
        setUserFormData({
          email: person.user.email,
          name: person.user.name || '',
          role: person.user.role,
          isActive: person.user.isActive,
        });
        setCreateUserAccount(true);
      }
      if (person.employee) {
        setEmployeeFormData({
          name: person.employee.name,
          email: person.employee.email,
          phone: person.employee.phone || '',
          pin: person.employee.pin || '',
          role: person.employee.role as 'cook' | 'bartender' | 'barback',
          hourlyWage: person.employee.hourlyWage.toString(),
          hireDate: person.employee.hireDate ? new Date(person.employee.hireDate).toISOString().split('T')[0] : format(new Date(), 'yyyy-MM-dd'),
          notes: person.employee.notes || '',
          isActive: person.employee.isActive,
        });
        setCreateEmployeeRecord(true);
      }
      
      // If person only has one type, still show both sections so they can add the missing one
      if (!person.user && person.employee) {
        // Employee without user - prefill email for user creation
        setUserFormData({
          email: person.employee.email,
          name: person.employee.name || '',
          role: defaultRole,
          isActive: person.employee.isActive,
        });
        setCreateUserAccount(true);
      }
      if (person.user && !person.employee) {
        // User without employee - prefill email and name for employee creation
        setEmployeeFormData({
          name: person.user.name || '',
          email: person.user.email,
          phone: '',
          pin: '',
          role: 'cook' as 'cook' | 'bartender' | 'barback',
          hourlyWage: '',
          hireDate: format(new Date(), 'yyyy-MM-dd'),
          notes: '',
          isActive: person.user.isActive,
        });
        setCreateEmployeeRecord(true);
      }
    } else {
      // New person - always create both user and staff records
      setUserFormData({
        email: '',
        name: '',
        role: defaultRole,
        isActive: true,
      });
      setEmployeeFormData({
        name: '',
        email: '',
        phone: '',
        pin: '',
        role: 'cook',
        hourlyWage: '',
        hireDate: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
        isActive: true,
      });
      setCreateUserAccount(true);
      setCreateEmployeeRecord(true);
    }
  }, [person, isOpen, defaultRole]);

  // Generate random PIN
  const generateRandomPin = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  // Auto-generate PIN if creating new employee
  useEffect(() => {
    if (!person && createEmployeeRecord && !employeeFormData.pin) {
      const existingPins = existingEmployees.map(emp => emp.pin).filter(Boolean);
      let pin = generateRandomPin();
      let attempts = 0;
      while (existingPins.includes(pin) && attempts < 100) {
        pin = generateRandomPin();
        attempts++;
      }
      setEmployeeFormData(prev => ({ ...prev, pin }));
    }
  }, [person, createEmployeeRecord, existingEmployees]);

  // Sync email between forms
  useEffect(() => {
    if (createUserAccount && createEmployeeRecord) {
      if (person) {
        // When editing, keep emails in sync
        if (userFormData.email && !employeeFormData.email) {
          setEmployeeFormData(prev => ({ ...prev, email: userFormData.email }));
        } else if (employeeFormData.email && !userFormData.email) {
          setUserFormData(prev => ({ ...prev, email: employeeFormData.email }));
        }
      } else {
        // When creating new, sync emails
        if (userFormData.email) {
          setEmployeeFormData(prev => ({ ...prev, email: userFormData.email }));
        } else if (employeeFormData.email) {
          setUserFormData(prev => ({ ...prev, email: employeeFormData.email }));
        }
      }
    }
  }, [userFormData.email, employeeFormData.email, createUserAccount, createEmployeeRecord, person]);

  // Sync name between forms
  useEffect(() => {
    if (createUserAccount && createEmployeeRecord) {
      if (userFormData.name && !employeeFormData.name) {
        setEmployeeFormData(prev => ({ ...prev, name: userFormData.name }));
      } else if (employeeFormData.name && !userFormData.name) {
        setUserFormData(prev => ({ ...prev, name: employeeFormData.name }));
      }
    }
  }, [userFormData.name, employeeFormData.name, createUserAccount, createEmployeeRecord]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const errors: string[] = [];

      // Validate user account creation
      if (createUserAccount) {
        if (!userFormData.email) errors.push('Email is required for user account');
        if (!userFormData.role) errors.push('Role is required for user account');
      }

      // Validate employee record creation
      if (createEmployeeRecord) {
        if (!employeeFormData.name) errors.push('Name is required for employee record');
        if (!employeeFormData.email) errors.push('Email is required for employee record');
        if (!employeeFormData.role) errors.push('Role is required for employee record');
        if (!employeeFormData.hourlyWage) errors.push('Hourly wage is required for employee record');
      }

      if (errors.length > 0) {
        showToast('Validation failed', 'error', errors.join(', '));
        setLoading(false);
        return;
      }

      // Ensure emails match if creating both
      if (createUserAccount && createEmployeeRecord && userFormData.email !== employeeFormData.email) {
        showToast('Emails must match', 'error', 'User account and employee record must have the same email address.');
        setLoading(false);
        return;
      }

      const results: { user?: User; employee?: Employee } = {};

      // Create or update user account
      if (createUserAccount) {
        const userUrl = person?.user?.id ? `/api/users/${person.user.id}` : '/api/users';
        const userMethod = person?.user?.id ? 'PUT' : 'POST';

        const userRes = await fetch(userUrl, {
          method: userMethod,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userFormData.email,
            name: userFormData.name || null,
            role: userFormData.role,
            isActive: userFormData.isActive,
            image: person?.user?.image || null,
          }),
        });

        if (!userRes.ok) {
          const error = await userRes.json();
          throw new Error(error.error || error.details || 'Failed to save user account');
        }

        results.user = await userRes.json();
      }

      // Create or update employee record
      if (createEmployeeRecord) {
        const empUrl = person?.employee?.id ? `/api/employees/${person.employee.id}` : '/api/employees';
        const empMethod = person?.employee?.id ? 'PATCH' : 'POST';

        const empRes = await fetch(empUrl, {
          method: empMethod,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: employeeFormData.name,
            email: employeeFormData.email,
            phone: employeeFormData.phone || null,
            pin: employeeFormData.pin || null,
            role: employeeFormData.role,
            hourlyWage: parseFloat(employeeFormData.hourlyWage),
            hireDate: employeeFormData.hireDate || null,
            notes: employeeFormData.notes || null,
            isActive: employeeFormData.isActive,
          }),
        });

        if (!empRes.ok) {
          const error = await empRes.json();
          throw new Error(error.error || error.details || 'Failed to save employee record');
        }

        results.employee = await empRes.json();
      }

      router.refresh();
      showToast(
        person ? 'Person updated successfully' : 'Person created successfully',
        'success'
      );
      onSuccess?.();
      onClose();
    } catch (error) {
      showToast(
        'Request failed',
        'error',
        error instanceof Error ? error.message : 'An error occurred while saving.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!person) return;
    
    setLoading(true);
    try {
      const deletions: Promise<any>[] = [];

      if (person.user) {
        deletions.push(
          fetch(`/api/users/${person.user.id}`, { method: 'DELETE' })
        );
      }

      if (person.employee) {
        deletions.push(
          fetch(`/api/employees/${person.employee.id}`, { method: 'DELETE' })
        );
      }

      await Promise.all(deletions);
      showToast('Person deleted successfully', 'success');
      onDelete?.(person);
      onSuccess?.();
      onClose();
    } catch (error) {
      showToast('Delete failed', 'error', error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  }

  const canDelete = !!person;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={person ? 'Edit Person' : 'New Person'}
    >

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Shared Information Section */}
        <div className="rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-3 backdrop-blur-sm space-y-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Basic Information</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-900 dark:text-white">
                Full Name
              </label>
              <input
                type="text"
                value={employeeFormData.name || userFormData.name || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (createUserAccount) setUserFormData({ ...userFormData, name: value });
                  if (createEmployeeRecord) setEmployeeFormData({ ...employeeFormData, name: value });
                }}
                className="w-full rounded-lg border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-900 dark:text-white">
                Email Address <span className="text-red-500">*</span>
              </label>
              {person?.user || person?.employee ? (
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200/70 dark:border-gray-700/60 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                  {person.user?.email || person.employee?.email}
                </div>
              ) : (
                <input
                  type="email"
                  value={userFormData.email || employeeFormData.email || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (createUserAccount) setUserFormData({ ...userFormData, email: value });
                    if (createEmployeeRecord) setEmployeeFormData({ ...employeeFormData, email: value });
                  }}
                  className="w-full rounded-lg border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  required
                  placeholder="person@example.com"
                />
              )}
            </div>
          </div>
        </div>

        {/* User Account Section */}
        {createUserAccount && (
          <div className="rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-3 backdrop-blur-sm space-y-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Admin Account</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-900 dark:text-white">
                Account Role <span className="text-red-500">*</span>
              </label>
              <select
                value={userFormData.role}
                onChange={(e) => {
                  const newRole = e.target.value;
                  // Only allow selecting roles the user can create (unless it's the current role when editing)
                  if (availableRoles.find(r => r.value === newRole) || (person?.user && newRole === person.user.role)) {
                    setUserFormData({ ...userFormData, role: newRole });
                  }
                }}
                className="w-full rounded-lg border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                required={createUserAccount}
              >
                {rolesForSelect.map(role => {
                  const isAvailable = !!availableRoles.find(r => r.value === role.value);
                  const isCurrentRole = person?.user?.role === role.value;
                  return (
                    <option 
                      key={role.value} 
                      value={role.value}
                      disabled={!isAvailable && !isCurrentRole}
                    >
                      {role.label} {isCurrentRole && !isAvailable ? '(current)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {person?.user && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Account Status</p>
                </div>
                <StatusToggle
                  type="active"
                  value={userFormData.isActive}
                  onChange={(value) => setUserFormData({ ...userFormData, isActive: value })}
                  className="shrink-0"
                />
              </div>
            )}
          </div>
        )}

        {/* Staff Record Section */}
        {createEmployeeRecord && (
          <div className="rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-3 backdrop-blur-sm space-y-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Staff Record</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-900 dark:text-white">
                  Staff Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={employeeFormData.role}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, role: e.target.value as any })}
                  className="w-full rounded-lg border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  required={createEmployeeRecord}
                >
                  <option value="cook">Cook</option>
                  <option value="bartender">Bartender</option>
                  <option value="barback">Barback</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-900 dark:text-white">
                  Hourly Wage ($) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={employeeFormData.hourlyWage}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, hourlyWage: e.target.value })}
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    required={createEmployeeRecord}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-900 dark:text-white">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={employeeFormData.phone}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, phone: e.target.value })}
                  className="w-full rounded-lg border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-900 dark:text-white">
                  Timeclock PIN
                </label>
                <input
                  type="text"
                  value={employeeFormData.pin}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  className="w-full rounded-lg border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-mono text-center tracking-widest"
                  placeholder="0000"
                  maxLength={4}
                />
                <p className="text-[10px] text-gray-500 dark:text-gray-400">4-digit PIN</p>
              </div>
            </div>

            <div className="space-y-1">
              <DatePicker
                label="Hire Date"
                value={employeeFormData.hireDate}
                onChange={(value) => setEmployeeFormData({ ...employeeFormData, hireDate: value })}
                dateOnly={true}
              />
            </div>

            {person?.employee && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Employment Status</p>
                </div>
                <StatusToggle
                  type="active"
                  value={employeeFormData.isActive}
                  onChange={(value) => setEmployeeFormData({ ...employeeFormData, isActive: value })}
                  className="shrink-0"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-900 dark:text-white">
                Notes
              </label>
              <textarea
                value={employeeFormData.notes}
                onChange={(e) => setEmployeeFormData({ ...employeeFormData, notes: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all resize-none"
                placeholder="Additional notes..."
              />
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-3 backdrop-blur-sm flex flex-wrap items-center justify-end gap-2">
          {canDelete && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading}
              className="px-4 py-2 bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-red-500/20 cursor-pointer"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            {loading ? 'Saving...' : person ? 'Update' : 'Create'}
          </button>
        </div>
      </form>

      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Person"
        message={`Are you sure you want to delete "${person?.name || person?.email}"? This will delete both user account and employee record if they exist. This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </Modal>
  );
}

