'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FaPlus, FaEdit, FaTrash, FaPowerOff, FaEllipsisV } from 'react-icons/fa';
import Modal from '@/components/modal';
import ConfirmationDialog from '@/components/confirmation-dialog';
import DatePicker from '@/components/date-picker';
import SearchSortFilter, { SortOption, FilterOption } from '@/components/search-sort-filter';
import StatusToggle from '@/components/status-toggle';

interface Employee {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  pin: string | null;
  role: string;
  hourlyWage: number;
  isActive: boolean;
  hireDate: Date | string | null;
  notes: string | null;
}

interface EmployeesTabProps {
  employees: Employee[];
  onEmployeesChange: (employees: Employee[]) => void;
}

export default function EmployeesTab({ employees, onEmployeesChange }: EmployeesTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deactivateConfirmation, setDeactivateConfirmation] = useState<Employee | null>(null);
  const [deleteStep1, setDeleteStep1] = useState<Employee | null>(null);
  const [deleteStep2, setDeleteStep2] = useState<Employee | null>(null);
  const [showDeleteMenu, setShowDeleteMenu] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>(employees);

  // Close delete menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDeleteMenu) {
        setShowDeleteMenu(null);
      }
    };

    if (showDeleteMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDeleteMenu]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    pin: '',
    role: 'cook' as 'cook' | 'bartender' | 'barback',
    hourlyWage: '',
    hireDate: '',
    notes: '',
    isActive: true,
  });

  // Filter employees based on showInactive toggle
  const visibleEmployees = showInactive 
    ? employees 
    : employees.filter(emp => emp.isActive);

  // Update filtered employees when employees list or showInactive changes
  useEffect(() => {
    const filtered = showInactive 
      ? employees 
      : employees.filter(emp => emp.isActive);
    setFilteredEmployees(filtered);
  }, [employees, showInactive]);

  // Sort and filter options
  const sortOptions: SortOption<Employee>[] = [
    { label: 'Name (A-Z)', value: 'name' },
    { label: 'Name (Z-A)', value: 'name', sortFn: (a, b) => b.name.localeCompare(a.name) },
    { label: 'Role (A-Z)', value: 'role' },
    { label: 'Hourly Wage (Low to High)', value: 'hourlyWage' },
    { label: 'Hourly Wage (High to Low)', value: 'hourlyWage', sortFn: (a, b) => b.hourlyWage - a.hourlyWage },
    { label: 'Hire Date (Newest)', value: 'hireDate', sortFn: (a, b) => {
      const aDate = a.hireDate ? new Date(a.hireDate).getTime() : 0;
      const bDate = b.hireDate ? new Date(b.hireDate).getTime() : 0;
      return bDate - aDate;
    }},
    { label: 'Hire Date (Oldest)', value: 'hireDate', sortFn: (a, b) => {
      const aDate = a.hireDate ? new Date(a.hireDate).getTime() : 0;
      const bDate = b.hireDate ? new Date(b.hireDate).getTime() : 0;
      return aDate - bDate;
    }},
  ];

  const filterOptions: FilterOption<Employee>[] = [
    { label: 'All Employees', value: 'all', filterFn: () => true },
    { label: 'Active Only', value: 'active', filterFn: (e) => e.isActive },
    { label: 'Inactive Only', value: 'inactive', filterFn: (e) => !e.isActive },
    { label: 'Cooks', value: 'cook', filterFn: (e) => e.role === 'cook' },
    { label: 'Bartenders', value: 'bartender', filterFn: (e) => e.role === 'bartender' },
    { label: 'Barbacks', value: 'barback', filterFn: (e) => e.role === 'barback' },
  ];

  const defaultSort: SortOption<Employee> = { 
    label: 'Name (A-Z)', 
    value: 'name' 
  };

  // Generate a random 4-digit PIN
  const generateRandomPin = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handleNew = () => {
    setEditingEmployee(null);
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Generate a random 4-digit PIN
    let pin = generateRandomPin();
    
    // Check if PIN is unique by fetching existing employees
    const existingPins = employees.map(emp => emp.pin).filter(Boolean);
    let attempts = 0;
    while (existingPins.includes(pin) && attempts < 100) {
      pin = generateRandomPin();
      attempts++;
    }
    
    setFormData({
      name: '',
      email: '',
      phone: '',
      pin: pin,
      role: 'cook',
      hourlyWage: '',
      hireDate: today,
      notes: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email || '',
      phone: employee.phone || '',
      pin: employee.pin || '',
      role: employee.role as 'cook' | 'bartender' | 'barback',
      hourlyWage: employee.hourlyWage.toString(),
      hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : '',
      notes: employee.notes || '',
      isActive: employee.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        pin: formData.pin || null,
        role: formData.role,
        hourlyWage: parseFloat(formData.hourlyWage),
        hireDate: formData.hireDate || null,
        notes: formData.notes || null,
        isActive: formData.isActive,
      };

      const url = editingEmployee
        ? `/api/employees/${editingEmployee.id}`
        : '/api/employees';
      const method = editingEmployee ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save employee');
      }

      const savedEmployee = await response.json();
      
      if (editingEmployee) {
        onEmployeesChange(
          employees.map(e => e.id === savedEmployee.id ? savedEmployee : e)
        );
      } else {
        onEmployeesChange([...employees, savedEmployee]);
      }

      setIsModalOpen(false);
      setEditingEmployee(null);
    } catch (error: any) {
      alert(error.message || 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateConfirmation) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/employees/${deactivateConfirmation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to deactivate employee');
      }

      const updatedEmployee = await response.json();
      onEmployeesChange(
        employees.map(e => e.id === updatedEmployee.id ? updatedEmployee : e)
      );
      setDeactivateConfirmation(null);
    } catch (error: any) {
      alert(error.message || 'Failed to deactivate employee');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStep1Confirm = () => {
    // Move to second confirmation step
    if (deleteStep1) {
      setDeleteStep2(deleteStep1);
      setDeleteStep1(null);
      setShowDeleteMenu(null);
    }
  };

  const handleDeleteStep2Confirm = async () => {
    if (!deleteStep2) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/employees/${deleteStep2.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete employee');
      }

      // Remove from UI (soft deleted employees are filtered out by API)
      onEmployeesChange(employees.filter(e => e.id !== deleteStep2.id));
      setDeleteStep2(null);
      setShowDeleteMenu(null);
    } catch (error: any) {
      alert(error.message || 'Failed to delete employee');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'cook':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200';
      case 'bartender':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200';
      case 'barback':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Employees ({visibleEmployees.length})
          </h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Show Inactive
              </span>
            </label>
            <button
              onClick={handleNew}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
              <FaPlus className="w-4 h-4" />
              Add Employee
            </button>
          </div>
        </div>

        <SearchSortFilter
          items={visibleEmployees}
          onFilteredItemsChange={setFilteredEmployees}
          searchFields={['name', 'email', 'phone', 'role', 'pin']}
          searchPlaceholder="Search employees by name, email, phone, role, or PIN..."
          sortOptions={sortOptions}
          filterOptions={filterOptions}
          defaultSort={defaultSort}
        />

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Wage
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                    Hire Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    onClick={() => handleEdit(employee)}
                    className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      !employee.isActive 
                        ? 'bg-orange-50/50 dark:bg-orange-900/10' 
                        : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {employee.name}
                          </span>
                          {!employee.isActive && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200">
                              Inactive
                            </span>
                          )}
                        </div>
                        {employee.notes && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 italic line-clamp-2" title={employee.notes}>
                            {employee.notes}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getRoleColor(employee.role)}`}>
                        {employee.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">
                      {employee.email || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                      {employee.phone || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      ${employee.hourlyWage.toFixed(2)}/hr
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                      {employee.hireDate 
                        ? format(new Date(employee.hireDate), 'MMM d, yyyy')
                        : '-'
                      }
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div 
                        className="flex items-center justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {employee.isActive ? (
                          <button
                            onClick={() => setDeactivateConfirmation(employee)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/50 hover:border-orange-300 dark:hover:border-orange-700 rounded-md transition-all"
                            title="Deactivate employee"
                          >
                            <FaPowerOff className="w-3 h-3" />
                            <span>Deactivate</span>
                          </button>
                        ) : (
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDeleteMenu(showDeleteMenu === employee.id ? null : employee.id);
                              }}
                              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                              title="More options"
                            >
                              <FaEllipsisV className="w-4 h-4" />
                            </button>
                            {showDeleteMenu === employee.id && (
                              <div 
                                className="absolute right-0 top-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-[160px]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => {
                                    setDeleteStep1(employee);
                                    setShowDeleteMenu(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                >
                                  <FaTrash className="w-3 h-3" />
                                  Delete Permanently
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredEmployees.length === 0 && visibleEmployees.length > 0 && (
            <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
              No employees match your search or filter criteria
            </div>
          )}
          {filteredEmployees.length === 0 && visibleEmployees.length === 0 && (
            <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
              <p className="mb-4">No employees yet</p>
              <button
                onClick={handleNew}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
              >
                Add Your First Employee
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Employee Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEmployee(null);
        }}
        title={editingEmployee ? 'Edit Employee' : 'Add Employee'}
      >
        <div className="space-y-2.5">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="cook">Cook</option>
                <option value="bartender">Bartender</option>
                <option value="barback">Barback</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                Wage ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.hourlyWage}
                onChange={(e) => setFormData({ ...formData, hourlyWage: e.target.value })}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                PIN
              </label>
              <input
                type="text"
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="4 digits"
                maxLength={4}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <DatePicker
              label="Hire Date"
              value={formData.hireDate}
              onChange={(value) => setFormData({ ...formData, hireDate: value })}
              dateOnly={true}
            />
          </div>

          {editingEmployee && (
            <div>
              <StatusToggle
                type="active"
                value={formData.isActive}
                onChange={(value) => setFormData({ ...formData, isActive: value })}
                label="Employee Status"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                setIsModalOpen(false);
                setEditingEmployee(null);
              }}
              className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !formData.name || !formData.hourlyWage || !formData.email}
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
            >
              {loading ? 'Saving...' : editingEmployee ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Deactivate Confirmation */}
      <ConfirmationDialog
        isOpen={!!deactivateConfirmation}
        onClose={() => setDeactivateConfirmation(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Employee"
        message={`Are you sure you want to deactivate "${deactivateConfirmation?.name}"? They will no longer appear in active employee lists but their data will be preserved.`}
        confirmText="Deactivate"
        cancelText="Cancel"
        variant="warning"
      />

      {/* Delete Step 1 - First Confirmation */}
      <ConfirmationDialog
        isOpen={!!deleteStep1}
        onClose={() => setDeleteStep1(null)}
        onConfirm={handleDeleteStep1Confirm}
        title="Delete Employee - Step 1 of 2"
        message={`Are you absolutely sure you want to delete "${deleteStep1?.name}"? This action will hide them from the UI but preserve all their data. This cannot be easily undone.`}
        confirmText="Yes, Continue"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Delete Step 2 - Final Confirmation */}
      <ConfirmationDialog
        isOpen={!!deleteStep2}
        onClose={() => setDeleteStep2(null)}
        onConfirm={handleDeleteStep2Confirm}
        title="Delete Employee - Final Confirmation"
        message={`FINAL WARNING: You are about to delete "${deleteStep2?.name}". This will hide them from all views. Their data will be preserved in the database but they will not appear in the UI. Are you absolutely certain?`}
        confirmText="Yes, Delete Permanently"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}

