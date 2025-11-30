'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FaCalendar, FaClock, FaDollarSign, FaCheck, FaTimes, FaEdit } from 'react-icons/fa';
import Modal from '@/components/modal';
import { getMountainTimeDateString, compareMountainTimeDates, getMountainTimeToday } from '@/lib/timezone';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  hourlyWage: number;
}

interface Availability {
  id: string;
  date: string;
  shiftType: string | null;
  isAvailable: boolean;
  notes: string | null;
}

interface HoursData {
  employee: Employee;
  shifts: Array<{
    id: string;
    clockIn: string;
    clockOut: string | null;
    breakMin: number;
    hours: number | null;
    cost: number | null;
    notes: string | null;
  }>;
  totals: {
    hours: number;
    cost: number;
    shiftCount: number;
  };
  upcomingSchedules: Array<{
    id: string;
    date: string;
    shiftType: string;
    startTime: string;
    endTime: string;
  }>;
}

export default function PortalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [hoursData, setHoursData] = useState<HoursData | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState<Availability | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedShiftType, setSelectedShiftType] = useState<'open' | 'close' | 'all' | null>(null);

  const [availabilityFormData, setAvailabilityFormData] = useState({
    date: '',
    shiftType: 'all' as 'open' | 'close' | 'all',
    isAvailable: true,
    notes: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    } else if (status === 'authenticated' && session?.user?.email) {
      loadData();
    }
  }, [status, session, router]);

  const loadData = async () => {
    if (!session?.user?.email) return;

    setLoading(true);
    try {
      // Find employee by email
      const employeesResponse = await fetch('/api/employees');
      if (employeesResponse.ok) {
        const employees = await employeesResponse.json();
        const foundEmployee = employees.find((e: Employee) => e.email === session.user.email);
        
        if (foundEmployee) {
          setEmployee(foundEmployee);

          // Load hours data
          const hoursResponse = await fetch(`/api/employees/${foundEmployee.id}/hours`);
          if (hoursResponse.ok) {
            const hours = await hoursResponse.json();
            setHoursData(hours);
          }

          // Load availability for current month
          await loadAvailability(foundEmployee.id, currentMonth);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailability = async (employeeId: string, month: Date) => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);

    try {
      const response = await fetch(
        `/api/availability?employeeId=${employeeId}&startDate=${start.toISOString()}&endDate=${end.toISOString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setAvailability(data);
      }
    } catch (error) {
      console.error('Failed to load availability:', error);
    }
  };

  useEffect(() => {
    if (employee) {
      loadAvailability(employee.id, currentMonth);
    }
  }, [currentMonth, employee]);

  const handleAvailabilityClick = (date: Date, shiftType: 'open' | 'close' | 'all' | null = null) => {
    const dateStr = getMountainTimeDateString(date);
    const existing = availability.find(
      a => {
        const availDate = new Date(a.date);
        return compareMountainTimeDates(availDate, date) && 
          (shiftType === 'all' || shiftType === null ? a.shiftType === null : a.shiftType === shiftType);
      }
    );

    if (existing) {
      setEditingAvailability(existing);
      setAvailabilityFormData({
        date: dateStr,
        shiftType: (existing.shiftType === 'open' || existing.shiftType === 'close' ? existing.shiftType : 'all') as 'open' | 'close' | 'all',
        isAvailable: existing.isAvailable,
        notes: existing.notes || '',
      });
    } else {
      setEditingAvailability(null);
      setAvailabilityFormData({
        date: dateStr,
        shiftType: shiftType || 'all',
        isAvailable: true,
        notes: '',
      });
    }
    setSelectedDate(date);
    setSelectedShiftType(shiftType);
    setIsAvailabilityModalOpen(true);
  };

  const handleAvailabilitySave = async () => {
    if (!employee) return;

    setLoading(true);
    try {
      const payload = {
        employeeId: employee.id,
        date: availabilityFormData.date,
        shiftType: availabilityFormData.shiftType === 'all' ? null : availabilityFormData.shiftType,
        isAvailable: availabilityFormData.isAvailable,
        notes: availabilityFormData.notes || null,
      };

      const url = editingAvailability
        ? `/api/availability/${editingAvailability.id}`
        : '/api/availability';
      const method = editingAvailability ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save availability');
      }

      await loadAvailability(employee.id, currentMonth);
      setIsAvailabilityModalOpen(false);
      setEditingAvailability(null);
    } catch (error: any) {
      alert(error.message || 'Failed to save availability');
    } finally {
      setLoading(false);
    }
  };

  const getAvailabilityForDate = (date: Date, shiftType: 'open' | 'close' | null = null) => {
    if (shiftType) {
      return availability.find(a => {
        const availDate = new Date(a.date);
        return compareMountainTimeDates(availDate, date) && a.shiftType === shiftType;
      });
    }
    // Check for all-day availability
    return availability.find(a => {
      const availDate = new Date(a.date);
      return compareMountainTimeDates(availDate, date) && a.shiftType === null;
    });
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-900 dark:text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Employee Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400">
            No employee record found for your email address. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  const days = getDaysInMonth();
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {employee.name}'s Portal
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)} • ${employee.hourlyWage.toFixed(2)}/hour
          </p>
        </div>

        {/* Hours and Pay Summary */}
        {hoursData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-2">
                <FaClock className="text-blue-500 text-xl" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Total Hours</h2>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {hoursData.totals.hours.toFixed(1)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {hoursData.totals.shiftCount} shifts
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-2">
                <FaDollarSign className="text-green-500 text-xl" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Total Pay</h2>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                ${hoursData.totals.cost.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Based on worked shifts
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-2">
                <FaCalendar className="text-purple-500 text-xl" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Shifts</h2>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {hoursData.upcomingSchedules.length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Scheduled shifts
              </p>
            </div>
          </div>
        )}

        {/* Availability Calendar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Availability</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                ←
              </button>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white min-w-[200px] text-center">
                {monthName}
              </h3>
              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-semibold text-gray-600 dark:text-gray-400 text-sm py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: days[0].getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {days.map((day, index) => {
              const openAvail = getAvailabilityForDate(day, 'open');
              const closeAvail = getAvailabilityForDate(day, 'close');
              const allDayAvail = getAvailabilityForDate(day, null);
              const isToday = compareMountainTimeDates(day, getMountainTimeToday());

              return (
                <div
                  key={index}
                  className={`aspect-square border-2 rounded-lg p-1 ${
                    isToday
                      ? 'border-blue-500 dark:border-blue-400'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className={`text-xs font-semibold mb-1 ${
                    isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                  }`}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    <button
                      onClick={() => handleAvailabilityClick(day, 'open')}
                      className={`w-full text-[9px] p-0.5 rounded ${
                        allDayAvail
                          ? allDayAvail.isAvailable
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                          : openAvail
                          ? openAvail.isAvailable
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                      title="Open shift availability"
                    >
                      O: {allDayAvail ? (allDayAvail.isAvailable ? '✓' : '✗') : openAvail ? (openAvail.isAvailable ? '✓' : '✗') : '?'}
                    </button>
                    <button
                      onClick={() => handleAvailabilityClick(day, 'close')}
                      className={`w-full text-[9px] p-0.5 rounded ${
                        allDayAvail
                          ? allDayAvail.isAvailable
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                          : closeAvail
                          ? closeAvail.isAvailable
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                      title="Close shift availability"
                    >
                      C: {allDayAvail ? (allDayAvail.isAvailable ? '✓' : '✗') : closeAvail ? (closeAvail.isAvailable ? '✓' : '✗') : '?'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 dark:bg-green-900/30 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 dark:bg-red-900/30 rounded"></div>
              <span>Unavailable</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 dark:bg-gray-700 rounded"></div>
              <span>Not Set</span>
            </div>
          </div>
        </div>
      </div>

      {/* Availability Modal */}
      <Modal
        isOpen={isAvailabilityModalOpen}
        onClose={() => {
          setIsAvailabilityModalOpen(false);
          setEditingAvailability(null);
        }}
        title={editingAvailability ? 'Edit Availability' : 'Set Availability'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date
            </label>
            <input
              type="date"
              value={availabilityFormData.date}
              onChange={(e) => setAvailabilityFormData({ ...availabilityFormData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Shift Type
            </label>
            <select
              value={availabilityFormData.shiftType}
              onChange={(e) => setAvailabilityFormData({ ...availabilityFormData, shiftType: e.target.value as 'open' | 'close' | 'all' })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Day</option>
              <option value="open">Open Shift</option>
              <option value="close">Close Shift</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={availabilityFormData.isAvailable}
                onChange={(e) => setAvailabilityFormData({ ...availabilityFormData, isAvailable: e.target.checked })}
                className="w-4 h-4"
              />
              Available
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={availabilityFormData.notes}
              onChange={(e) => setAvailabilityFormData({ ...availabilityFormData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., Doctor appointment"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                setIsAvailabilityModalOpen(false);
                setEditingAvailability(null);
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={handleAvailabilitySave}
              disabled={loading || !availabilityFormData.date}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

