'use client';

import { useState, useEffect, useRef } from 'react';
import { FaClock, FaSignInAlt, FaSignOutAlt, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

interface Shift {
  id: string;
  clockIn: Date | string;
  clockOut: Date | string | null;
  breakMin: number;
  notes: string | null;
  hoursWorked?: number | null;
  cost?: number | null;
}

interface Employee {
  id: string;
  name: string;
  role: string;
}

export default function TimeclockPage() {
  const [pin, setPin] = useState('');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [breakMin, setBreakMin] = useState(0);
  const [notes, setNotes] = useState('');
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Focus PIN input on mount
  useEffect(() => {
    pinInputRef.current?.focus();
  }, []);

  // Check for open shift when employee is set
  useEffect(() => {
    if (employee) {
      checkOpenShift();
    }
  }, [employee]);

  const checkOpenShift = async () => {
    if (!employee) return;

    try {
      const response = await fetch(`/api/timeclock/shift?employeeId=${employee.id}`);
      if (response.ok) {
        const shift = await response.json();
        setCurrentShift(shift);
      } else {
        setCurrentShift(null);
      }
    } catch (error) {
      console.error('Failed to check open shift:', error);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/timeclock/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid PIN');
      }

      setEmployee(data.employee);
      setPin('');
    } catch (err: any) {
      setError(err.message || 'Invalid PIN. Please try again.');
      setPin('');
      pinInputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (!employee) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/timeclock/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          action: 'clockIn',
          breakMin: breakMin || 0,
          notes: notes || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clock in');
      }

      setCurrentShift(data.shift);
      setBreakMin(0);
      setNotes('');
      setSuccess('Clocked in successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to clock in');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!employee || !currentShift) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/timeclock/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          action: 'clockOut',
          breakMin: breakMin || 0,
          notes: notes || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clock out');
      }

      setCurrentShift(null);
      setBreakMin(0);
      setNotes('');
      setSuccess(`Clocked out successfully! Worked ${data.hoursWorked?.toFixed(2) || '0.00'} hours.`);
      setTimeout(() => {
        setSuccess('');
        setEmployee(null);
        pinInputRef.current?.focus();
      }, 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to clock out');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setEmployee(null);
    setCurrentShift(null);
    setPin('');
    setError('');
    setSuccess('');
    setBreakMin(0);
    setNotes('');
    pinInputRef.current?.focus();
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <FaClock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Employee Timeclock
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Enter your PIN to clock in or out
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
              <FaTimesCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
              <FaCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
            </div>
          )}

          {/* PIN Entry */}
          {!employee && (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Enter Your PIN
                </label>
                <input
                  ref={pinInputRef}
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-4 py-3 text-2xl text-center border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition"
                  placeholder="0000"
                  maxLength={10}
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading || !pin}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition"
              >
                {loading ? 'Verifying...' : 'Continue'}
              </button>
            </form>
          )}

          {/* Employee Clock In/Out */}
          {employee && (
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {employee.name}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {employee.role}
                </p>
              </div>

              {/* Current Shift Status */}
              {currentShift && (
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FaSignInAlt className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Currently Clocked In
                    </h3>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p>Clocked in: {formatTime(currentShift.clockIn)}</p>
                    <p className="font-semibold text-orange-600 dark:text-orange-400">
                      Elapsed: {getElapsedTime(currentShift.clockIn)}
                    </p>
                  </div>
                </div>
              )}

              {/* Break Time and Notes */}
              <div className="space-y-4">
                <div>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Optional notes..."
                  />
                </div>
              </div>

              {/* Clock In/Out Buttons */}
              <div className="space-y-3">
                {!currentShift ? (
                  <button
                    onClick={handleClockIn}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    <FaSignInAlt className="w-5 h-5" />
                    {loading ? 'Processing...' : 'Clock In'}
                  </button>
                ) : (
                  <button
                    onClick={handleClockOut}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    <FaSignOutAlt className="w-5 h-5" />
                    {loading ? 'Processing...' : 'Clock Out'}
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

