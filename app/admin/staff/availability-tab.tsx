'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaChevronLeft, FaChevronRight, FaSync } from 'react-icons/fa';

interface Employee {
  id: string;
  name: string;
  role: string;
  email?: string | null;
}

interface AvailabilityEntry {
  id: string;
  employeeId: string;
  date: string;
  shiftType: 'open' | 'close' | null;
  isAvailable: boolean;
  notes: string | null;
  employee?: {
    id: string;
    name: string;
    role: string;
    email?: string | null;
  };
}

interface AvailabilityTabProps {
  employees: Employee[];
}

const shiftLabels: Record<'open' | 'close', string> = {
  open: 'Open (to 4pm)',
  close: 'Close (4pm to close)',
};

const getMonthStart = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getMonthEnd = (date: Date) => {
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return end;
};

const shiftSortOrder: Record<string, number> = {
  null: 0,
  open: 1,
  close: 2,
};

export default function AvailabilityTab({ employees }: AvailabilityTabProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    now.setDate(1);
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'unavailable'>('all');
  const [availabilityEntries, setAvailabilityEntries] = useState<AvailabilityEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const employeeLookup = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach((employee) => map.set(employee.id, employee));
    return map;
  }, [employees]);

  const loadAvailability = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const start = getMonthStart(currentMonth);
      const end = getMonthEnd(currentMonth);

      const params = new URLSearchParams({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });

      if (selectedEmployeeId !== 'all') {
        params.append('employeeId', selectedEmployeeId);
      }

      const response = await fetch(`/api/availability?${params.toString()}`);
      
      // Read response as text first to handle both JSON and non-JSON errors
      const responseText = await response.text();
      
      if (!response.ok) {
        // Try to parse error message from response
        let errorMessage = 'Failed to load availability';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.message || errorMessage;
          if (errorData.details) {
            errorMessage += `: ${errorData.details}`;
          }
        } catch {
          // If response is not JSON, use status text or response text
          errorMessage = `Failed to load availability: ${response.statusText || response.status}`;
          if (responseText && responseText.trim()) {
            errorMessage += ` - ${responseText.substring(0, 200)}`;
          }
        }
        throw new Error(errorMessage);
      }

      // Parse successful response
      const data: AvailabilityEntry[] = JSON.parse(responseText);
      setAvailabilityEntries(data);
    } catch (err) {
      console.error('Failed to load availability:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unable to load availability. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, selectedEmployeeId]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() - 1, 1);
      next.setHours(0, 0, 0, 0);
      return next;
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + 1, 1);
      next.setHours(0, 0, 0, 0);
      return next;
    });
  };

  const filteredEntries = useMemo(() => {
    return availabilityEntries.filter((entry) => {
      if (statusFilter === 'available') {
        return entry.isAvailable;
      }
      if (statusFilter === 'unavailable') {
        return !entry.isAvailable;
      }
      return true;
    });
  }, [availabilityEntries, statusFilter]);

  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;

      const aOrder = shiftSortOrder[a.shiftType ?? 'null'] ?? 3;
      const bOrder = shiftSortOrder[b.shiftType ?? 'null'] ?? 3;
      if (aOrder !== bOrder) return aOrder - bOrder;

      return a.employeeId.localeCompare(b.employeeId);
    });
  }, [filteredEntries]);

  const summary = useMemo(() => {
    const total = filteredEntries.length;
    const unavailable = filteredEntries.filter((entry) => !entry.isAvailable).length;
    const available = total - unavailable;
    const uniqueEmployees = new Set(filteredEntries.map((entry) => entry.employeeId)).size;

    return {
      total,
      available,
      unavailable,
      uniqueEmployees,
    };
  }, [filteredEntries]);

  const monthLabel = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const formatDate = (date: string) => {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatShift = (shiftType: 'open' | 'close' | null) => {
    if (!shiftType) {
      return 'All Day';
    }
    return shiftLabels[shiftType];
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden">
        <div className="p-4 sm:p-6 flex flex-col gap-4 sm:gap-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={goToPreviousMonth}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                title="Previous month"
              >
                <FaChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white min-w-[200px] text-center">
                {monthLabel}
              </h2>
              <button
                onClick={goToNextMonth}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                title="Next month"
              >
                <FaChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-gray-600 dark:text-gray-400">
                Employee
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(event) => setSelectedEmployeeId(event.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All employees</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} ({employee.role})
                  </option>
                ))}
              </select>
              <label className="text-sm text-gray-600 dark:text-gray-400">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All submissions</option>
                <option value="unavailable">Unavailable only</option>
                <option value="available">Available only</option>
              </select>
              <button
                onClick={loadAvailability}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white rounded-lg transition"
              >
                <FaSync className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="text-sm text-blue-700 dark:text-blue-300">Total submissions</div>
              <div className="text-2xl font-semibold text-blue-800 dark:text-blue-200">
                {summary.total}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="text-sm text-green-700 dark:text-green-300">Marked available</div>
              <div className="text-2xl font-semibold text-green-800 dark:text-green-200">
                {summary.available}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-900/20">
              <div className="text-sm text-rose-700 dark:text-rose-300">Marked unavailable</div>
              <div className="text-2xl font-semibold text-rose-800 dark:text-rose-200">
                {summary.unavailable}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <div className="text-sm text-purple-700 dark:text-purple-300">Employees represented</div>
              <div className="text-2xl font-semibold text-purple-800 dark:text-purple-200">
                {summary.uniqueEmployees}
              </div>
            </div>
          </div>
        </div>

        <div className="max-h-[600px] overflow-auto">
          {error && (
            <div className="px-4 sm:px-6 py-4 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-200">
              {error}
            </div>
          )}

          {!error && (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/60">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Shift
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading && sortedEntries.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 sm:px-6 py-8 text-center text-gray-500 dark:text-gray-400 text-sm"
                    >
                      Loading availability...
                    </td>
                  </tr>
                )}

                {!loading && sortedEntries.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 sm:px-6 py-8 text-center text-gray-500 dark:text-gray-400 text-sm"
                    >
                      No availability submissions for this month.
                    </td>
                  </tr>
                )}

                {sortedEntries.map((entry) => {
                  const employee = entry.employee ?? employeeLookup.get(entry.employeeId);
                  const employeeName = employee?.name ?? 'Unknown Employee';
                  const employeeRole = employee?.role ?? 'staff';

                  return (
                    <tr key={entry.id}>
                      <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDate(entry.date)}
                      </td>
                      <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {formatShift(entry.shiftType)}
                      </td>
                      <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        <div className="font-medium text-gray-900 dark:text-white">{employeeName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {employeeRole}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                            entry.isAvailable
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200'
                          }`}
                        >
                          {entry.isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {entry.notes ? (
                          <span>{entry.notes}</span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-sm italic">
                            No notes provided
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}


