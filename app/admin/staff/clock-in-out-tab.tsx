'use client';

import { useState, useEffect } from 'react';
import { FaClock, FaSignInAlt, FaSignOutAlt } from 'react-icons/fa';
import { calculateHoursWorked, calculateShiftCost } from '@/lib/schedule-helpers';

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
  notes: string | null;
  employee: {
    id: string;
    name: string;
    role: string;
    hourlyWage: number;
  };
  hoursWorked?: number | null;
  cost?: number | null;
}

interface ClockInOutTabProps {
  employees: Employee[];
  openShifts: Shift[];
  onOpenShiftsChange: (shifts: Shift[]) => void;
}

export default function ClockInOutTab({ employees, openShifts, onOpenShiftsChange }: ClockInOutTabProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [breakMin, setBreakMin] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [allShifts, setAllShifts] = useState<Shift[]>([]);
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');

  // Fetch all shifts
  const fetchShifts = async () => {
    try {
      const params = new URLSearchParams();
      if (filterEmployeeId !== 'all') {
        params.append('employeeId', filterEmployeeId);
      }
      if (filterDate) {
        const startDate = new Date(filterDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(filterDate);
        endDate.setHours(23, 59, 59, 999);
        params.append('startDate', startDate.toISOString());
        params.append('endDate', endDate.toISOString());
      }

      const response = await fetch(`/api/shifts?${params.toString()}`);
      if (response.ok) {
        const shifts = await response.json();
        setAllShifts(shifts);
      }
    } catch (error) {
      console.error('Failed to fetch shifts:', error);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, [filterEmployeeId, filterDate]);

  // Get open shift for an employee
  const getOpenShift = (employeeId: string) => {
    return openShifts.find(s => s.employeeId === employeeId);
  };

  const handleClockIn = async () => {
    if (!selectedEmployeeId) {
      alert('Please select an employee');
      return;
    }

    // Check if employee already has an open shift
    const openShift = getOpenShift(selectedEmployeeId);
    if (openShift) {
      alert('Employee already has an open shift. Please clock out first.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          action: 'clockIn',
          breakMin: breakMin || 0,
          notes: notes || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to clock in');
      }

      const newShift = await response.json();
      onOpenShiftsChange([...openShifts, newShift]);
      setSelectedEmployeeId('');
      setBreakMin(0);
      setNotes('');
      fetchShifts();
    } catch (error: any) {
      alert(error.message || 'Failed to clock in');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async (shiftId: string) => {
    setLoading(true);
    try {
      const shift = openShifts.find(s => s.id === shiftId);
      if (!shift) return;

      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: shift.employeeId,
          action: 'clockOut',
          breakMin: breakMin || 0,
          notes: notes || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to clock out');
      }

      const updatedShift = await response.json();
      onOpenShiftsChange(openShifts.filter(s => s.id !== shiftId));
      setBreakMin(0);
      setNotes('');
      fetchShifts();
    } catch (error: any) {
      alert(error.message || 'Failed to clock out');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getElapsedTime = (clockIn: Date | string) => {
    const start = new Date(clockIn);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Clock In Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FaSignInAlt className="w-5 h-5 text-green-600 dark:text-green-400" />
          Clock In
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Employee *
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select employee...</option>
              {employees
                .filter(emp => !getOpenShift(emp.id))
                .map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Break Time (minutes)
              </label>
              <input
                type="number"
                min="0"
                value={breakMin}
                onChange={(e) => setBreakMin(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Optional notes..."
            />
          </div>

          <button
            onClick={handleClockIn}
            disabled={loading || !selectedEmployeeId}
            className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
          >
            <FaClock className="w-5 h-5" />
            {loading ? 'Processing...' : 'Clock In'}
          </button>
        </div>
      </div>

      {/* Currently Clocked In */}
      {openShifts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FaClock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            Currently Clocked In ({openShifts.length})
          </h2>
          <div className="space-y-3">
            {openShifts.map(shift => (
              <div
                key={shift.id}
                className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {shift.employee.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {shift.employee.role} • ${shift.employee.hourlyWage.toFixed(2)}/hr
                    </p>
                  </div>
                  <button
                    onClick={() => handleClockOut(shift.id)}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition flex items-center gap-2"
                  >
                    <FaSignOutAlt className="w-4 h-4" />
                    Clock Out
                  </button>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>Clocked in: {formatTime(shift.clockIn)} on {formatDate(shift.clockIn)}</p>
                  <p className="font-semibold text-orange-600 dark:text-orange-400 mt-1">
                    Elapsed: {getElapsedTime(shift.clockIn)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shift History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Shift History
        </h2>

        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Employee
            </label>
            <select
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Shift List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {allShifts
            .filter(s => s.clockOut !== null) // Only show completed shifts
            .map(shift => {
              const hoursWorked = calculateHoursWorked(shift.clockIn, shift.clockOut, shift.breakMin);
              const cost = calculateShiftCost(hoursWorked, shift.employee.hourlyWage);

              return (
                <div
                  key={shift.id}
                  className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {shift.employee.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(shift.clockIn)} • {formatTime(shift.clockIn)} - {shift.clockOut ? formatTime(shift.clockOut) : 'In Progress'}
                      </p>
                      {shift.breakMin > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Break: {shift.breakMin} min
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {hoursWorked !== null && (
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {hoursWorked.toFixed(2)} hrs
                        </p>
                      )}
                      {cost !== null && (
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          ${cost.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {allShifts.filter(s => s.clockOut !== null).length === 0 && (
          <p className="text-center py-8 text-gray-500 dark:text-gray-400">
            No shift history found
          </p>
        )}
      </div>
    </div>
  );
}
