'use client';

import { useState, useEffect } from 'react';
import { FaDollarSign, FaClock, FaUsers, FaChartLine, FaEdit } from 'react-icons/fa';
import { calculateHoursWorked, calculateShiftCost } from '@/lib/schedule-helpers';
import Modal from '@/components/modal';

interface Employee {
  id: string;
  name: string;
  role: string;
  hourlyWage: number;
}

interface Shift {
  id: string;
  employeeId: string;
  clockIn: Date | string;
  clockOut: Date | string | null;
  breakMin: number;
  employee: {
    id: string;
    name: string;
    role: string;
    hourlyWage: number;
  };
  hoursWorked?: number | null;
  cost?: number | null;
}

interface PayrollTabProps {
  employees: Employee[];
}

export default function PayrollTab({ employees }: PayrollTabProps) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7'); // days
  const [filterRole, setFilterRole] = useState<string>('all');
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editClockIn, setEditClockIn] = useState('');
  const [editClockOut, setEditClockOut] = useState('');
  const [editBreakMin, setEditBreakMin] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchShifts();
  }, [period, filterRole]);

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(period));

      const params = new URLSearchParams();
      params.append('startDate', startDate.toISOString());
      params.append('endDate', endDate.toISOString());

      if (filterRole !== 'all') {
        // Filter by role - we'll need to get employee IDs for this role
        const roleEmployees = employees.filter(e => e.role === filterRole);
        if (roleEmployees.length > 0) {
          // For now, we'll filter client-side
        }
      }

      const response = await fetch(`/api/shifts?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        // Filter by role if needed
        let filteredData = data;
        if (filterRole !== 'all') {
          filteredData = data.filter((shift: Shift) => shift.employee.role === filterRole);
        }
        setShifts(filteredData);
      }
    } catch (error) {
      console.error('Failed to fetch shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const completedShifts = shifts.filter(s => s.clockOut !== null);
  const totalHours = completedShifts.reduce((sum, shift) => {
    const clockInDate = shift.clockIn instanceof Date ? shift.clockIn : new Date(shift.clockIn);
    const clockOutDate = shift.clockOut instanceof Date ? shift.clockOut : new Date(shift.clockOut!);
    const hours = calculateHoursWorked(clockInDate, clockOutDate, shift.breakMin);
    return sum + (hours || 0);
  }, 0);

  const totalCost = completedShifts.reduce((sum, shift) => {
    const clockInDate = shift.clockIn instanceof Date ? shift.clockIn : new Date(shift.clockIn);
    const clockOutDate = shift.clockOut instanceof Date ? shift.clockOut : new Date(shift.clockOut!);
    const hours = calculateHoursWorked(clockInDate, clockOutDate, shift.breakMin);
    const cost = calculateShiftCost(hours, shift.employee.hourlyWage);
    return sum + (cost || 0);
  }, 0);

  // Group by employee
  const shiftsByEmployee = completedShifts.reduce((acc, shift) => {
    const empId = shift.employeeId;
    if (!acc[empId]) {
      acc[empId] = {
        employee: shift.employee,
        shifts: [],
        totalHours: 0,
        totalCost: 0,
      };
    }
    acc[empId].shifts.push(shift);
    const clockInDate = shift.clockIn instanceof Date ? shift.clockIn : new Date(shift.clockIn);
    const clockOutDate = shift.clockOut instanceof Date ? shift.clockOut : new Date(shift.clockOut!);
    const hours = calculateHoursWorked(clockInDate, clockOutDate, shift.breakMin);
    const cost = calculateShiftCost(hours, shift.employee.hourlyWage);
    acc[empId].totalHours += hours || 0;
    acc[empId].totalCost += cost || 0;
    return acc;
  }, {} as Record<string, { employee: any; shifts: Shift[]; totalHours: number; totalCost: number }>);

  // Group by role
  const shiftsByRole = Object.values(shiftsByEmployee).reduce((acc, empData) => {
    const role = empData.employee.role;
    if (!acc[role]) {
      acc[role] = { totalHours: 0, totalCost: 0, employeeCount: 0 };
    }
    acc[role].totalHours += empData.totalHours;
    acc[role].totalCost += empData.totalCost;
    acc[role].employeeCount += 1;
    return acc;
  }, {} as Record<string, { totalHours: number; totalCost: number; employeeCount: number }>);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDateTimeLocal = (date: Date | string) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setEditClockIn(formatDateTimeLocal(shift.clockIn));
    setEditClockOut(shift.clockOut ? formatDateTimeLocal(shift.clockOut) : '');
    setEditBreakMin(shift.breakMin);
  };

  const handleSaveShift = async () => {
    if (!editingShift) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/shifts/${editingShift.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clockIn: editClockIn,
          clockOut: editClockOut || null,
          breakMin: editBreakMin,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update shift');
      }

      // Refresh shifts
      await fetchShifts();
      setEditingShift(null);
    } catch (error: any) {
      alert(error.message || 'Failed to update shift');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading payroll data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Period Selector */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Period:
          </label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
            <option value="60">Last 60 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Role:
          </label>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            <option value="cook">Cook</option>
            <option value="bartender">Bartender</option>
            <option value="barback">Barback</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
              <FaDollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Labor Cost</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                ${totalCost.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg flex-shrink-0">
              <FaClock className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Hours</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                {totalHours.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex-shrink-0">
              <FaUsers className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Shifts Worked</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                {completedShifts.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex-shrink-0">
              <FaChartLine className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Avg Hourly Cost</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                ${totalHours > 0 ? (totalCost / totalHours).toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* By Role Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Labor Cost by Role
        </h2>
        <div className="space-y-2 sm:space-y-3">
          {Object.entries(shiftsByRole).map(([role, data]) => (
            <div
              key={role}
              className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white capitalize truncate">
                    {role}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    {data.employeeCount} {data.employeeCount === 1 ? 'employee' : 'employees'}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                    {data.totalHours.toFixed(2)} hrs
                  </p>
                  <p className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">
                    ${data.totalCost.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* By Employee Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Labor Cost by Employee
        </h2>
        <div className="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
          {Object.values(shiftsByEmployee)
            .sort((a, b) => b.totalCost - a.totalCost)
            .map((empData) => (
              <div
                key={empData.employee.id}
                className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0 mb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                      {empData.employee.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {empData.employee.role} • ${empData.employee.hourlyWage.toFixed(2)}/hr
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                      {empData.totalHours.toFixed(2)} hrs
                    </p>
                    <p className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">
                      ${empData.totalCost.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  {empData.shifts.length} {empData.shifts.length === 1 ? 'shift' : 'shifts'}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Recent Shifts */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Recent Shifts
        </h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {completedShifts
            .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime())
            .slice(0, 20)
            .map(shift => {
              const clockInDate = shift.clockIn instanceof Date ? shift.clockIn : new Date(shift.clockIn);
              const clockOutDate = shift.clockOut instanceof Date ? shift.clockOut : new Date(shift.clockOut!);
              const hours = calculateHoursWorked(clockInDate, clockOutDate, shift.breakMin);
              const cost = calculateShiftCost(hours, shift.employee.hourlyWage);

              return (
                <div
                  key={shift.id}
                  className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                        {shift.employee.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-words">
                        {formatDate(shift.clockIn)} • {formatTime(shift.clockIn)} - {shift.clockOut ? formatTime(shift.clockOut) : 'In Progress'}
                      </p>
                      {shift.breakMin > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Break: {shift.breakMin} min
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-left sm:text-right flex-shrink-0">
                        {hours !== null && (
                          <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                            {hours.toFixed(2)} hrs
                          </p>
                        )}
                        {cost !== null && (
                          <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                            ${cost.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleEditShift(shift)}
                        className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition flex items-center gap-1"
                        title="Override shift times"
                      >
                        <FaEdit className="w-3 h-3" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Edit Shift Modal */}
      <Modal
        isOpen={editingShift !== null}
        onClose={() => setEditingShift(null)}
        title="Override Shift Times"
      >
        {editingShift && (
          <div className="space-y-4 p-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Employee
              </label>
              <p className="text-sm text-gray-900 dark:text-white">
                {editingShift.employee.name} ({editingShift.employee.role})
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Clock In *
              </label>
              <input
                type="datetime-local"
                value={editClockIn}
                onChange={(e) => setEditClockIn(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Clock Out
              </label>
              <input
                type="datetime-local"
                value={editClockOut}
                onChange={(e) => setEditClockOut(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Leave empty if shift is still in progress
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Break Time (minutes)
              </label>
              <input
                type="number"
                min="0"
                value={editBreakMin}
                onChange={(e) => setEditBreakMin(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setEditingShift(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveShift}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
