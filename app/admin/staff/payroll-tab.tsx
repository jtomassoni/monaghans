'use client';

import { useState, useEffect } from 'react';
import { FaDollarSign, FaClock, FaUsers, FaChartLine } from 'react-icons/fa';
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
    const hours = calculateHoursWorked(shift.clockIn, shift.clockOut, shift.breakMin);
    return sum + (hours || 0);
  }, 0);

  const totalCost = completedShifts.reduce((sum, shift) => {
    const hours = calculateHoursWorked(shift.clockIn, shift.clockOut, shift.breakMin);
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
    const hours = calculateHoursWorked(shift.clockIn, shift.clockOut, shift.breakMin);
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

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading payroll data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Period:
          </label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
            <option value="60">Last 60 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Role:
          </label>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            <option value="cook">Cook</option>
            <option value="bartender">Bartender</option>
            <option value="barback">Barback</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FaDollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Labor Cost</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                ${totalCost.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FaClock className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Hours</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {totalHours.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <FaUsers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Shifts Worked</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {completedShifts.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <FaChartLine className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Hourly Cost</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                ${totalHours > 0 ? (totalCost / totalHours).toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* By Role Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Labor Cost by Role
        </h2>
        <div className="space-y-3">
          {Object.entries(shiftsByRole).map(([role, data]) => (
            <div
              key={role}
              className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white capitalize">
                    {role}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {data.employeeCount} {data.employeeCount === 1 ? 'employee' : 'employees'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {data.totalHours.toFixed(2)} hrs
                  </p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    ${data.totalCost.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* By Employee Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Labor Cost by Employee
        </h2>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {Object.values(shiftsByEmployee)
            .sort((a, b) => b.totalCost - a.totalCost)
            .map((empData) => (
              <div
                key={empData.employee.id}
                className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {empData.employee.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {empData.employee.role} • ${empData.employee.hourlyWage.toFixed(2)}/hr
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {empData.totalHours.toFixed(2)} hrs
                    </p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
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
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Shifts
        </h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {completedShifts
            .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime())
            .slice(0, 20)
            .map(shift => {
              const hours = calculateHoursWorked(shift.clockIn, shift.clockOut, shift.breakMin);
              const cost = calculateShiftCost(hours, shift.employee.hourlyWage);

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
                      {hours !== null && (
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {hours.toFixed(2)} hrs
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
      </div>
    </div>
  );
}
