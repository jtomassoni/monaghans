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
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [clockInTime, setClockInTime] = useState<string>('');
  const [confirmationMessage, setConfirmationMessage] = useState<string>('');
  const [notes, setNotes] = useState('');
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Kiosk mode setup - fullscreen and prevent zoom
  useEffect(() => {
    // Set viewport meta tag for kiosk mode
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
      document.getElementsByTagName('head')[0].appendChild(meta);
    }

    // Prevent context menu (right-click)
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    // Prevent text selection
    const handleSelectStart = (e: Event) => e.preventDefault();
    // Prevent drag
    const handleDragStart = (e: DragEvent) => e.preventDefault();
    // Prevent keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow F11 for fullscreen, but block other shortcuts
      if (e.key === 'F11') return;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R' || e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('keydown', handleKeyDown);

    // Try to enter fullscreen if supported
    const requestFullscreen = async () => {
      try {
        const docEl = document.documentElement as any;
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        } else if (docEl.mozRequestFullScreen) {
          await docEl.mozRequestFullScreen();
        } else if (docEl.msRequestFullscreen) {
          await docEl.msRequestFullscreen();
        }
      } catch (err) {
        // Fullscreen may fail if not user-initiated, that's okay
      }
    };

    // Request fullscreen after a short delay (some browsers require user interaction)
    const timeoutId = setTimeout(() => {
      requestFullscreen();
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Focus PIN input on mount and when returning to PIN entry
  useEffect(() => {
    if (!showConfirmation && !employee) {
      pinInputRef.current?.focus();
    }
  }, [showConfirmation, employee]);

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
      setCurrentShift(null);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
    setLoading(true);

    try {
      const response = await fetch('/api/timeclock/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          action: 'clockIn',
          notes: notes || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clock in');
      }

      // Show confirmation screen
      setClockInTime(formatTime(data.shift.clockIn));
      setConfirmationMessage('Clocked In Successfully!');
      setShowConfirmation(true);
      setCurrentShift(data.shift);
      setNotes('');

      // Reset after 3 seconds
      setTimeout(() => {
        setShowConfirmation(false);
        setEmployee(null);
        setCurrentShift(null);
        setPin('');
        pinInputRef.current?.focus();
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to clock in');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!employee || !currentShift) return;

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/timeclock/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          action: 'clockOut',
          notes: notes || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clock out');
      }

      // Show confirmation screen
      const hoursWorked = data.hoursWorked?.toFixed(2) || '0.00';
      setClockInTime(`${hoursWorked} hours`);
      setConfirmationMessage('Clocked Out Successfully!');
      setShowConfirmation(true);
      setCurrentShift(null);
      setNotes('');

      // Reset after 3 seconds
      setTimeout(() => {
        setShowConfirmation(false);
        setEmployee(null);
        setCurrentShift(null);
        setPin('');
        pinInputRef.current?.focus();
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to clock out');
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

  const getElapsedTime = (clockIn: Date | string) => {
    const start = new Date(clockIn);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}m`;
  };

  // Inject kiosk styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        height: 100% !important;
        width: 100% !important;
        position: fixed !important;
        touch-action: manipulation !important;
        -webkit-touch-callout: none !important;
        -webkit-user-select: none !important;
        user-select: none !important;
      }
      #__next {
        height: 100vh !important;
        width: 100vw !important;
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="fixed inset-0 h-screen w-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center overflow-hidden">
      <div className="w-full h-full max-w-4xl max-h-screen flex items-center justify-center px-4 py-3">
        <div className="w-full h-full flex flex-col">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-blue-600 rounded-full mb-4 sm:mb-5">
              <FaClock className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 sm:mb-3">
              Employee Timeclock
            </h1>
            <p className="text-base sm:text-lg text-gray-400">
              Enter your PIN to clock in or out
            </p>
          </div>

          {/* Confirmation Screen */}
          {showConfirmation && (
            <div className="flex-1 flex flex-col justify-center items-center space-y-6">
              <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center">
                <FaCheckCircle className="w-16 h-16 text-white" />
              </div>
              <div className="text-center">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
                  {confirmationMessage}
                </h2>
                <p className="text-xl sm:text-2xl text-gray-400">
                  {clockInTime}
                </p>
              </div>
            </div>
          )}

          {/* Error Messages */}
          {error && !showConfirmation && (
            <div className="mb-4 p-3 sm:p-4 bg-red-900/30 border border-red-700 rounded-lg flex items-center gap-2">
              <FaTimesCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm sm:text-base text-red-400 font-semibold">{error}</p>
            </div>
          )}

          {/* PIN Entry */}
          {!employee && !showConfirmation && (
            <form onSubmit={handlePinSubmit} className="space-y-4 sm:space-y-6 flex-1 flex flex-col justify-center">
              <div>
                <label className="block text-lg sm:text-xl font-semibold text-gray-300 mb-3 text-center">
                  Enter Your PIN
                </label>
                <input
                  ref={pinInputRef}
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-4 py-3 sm:px-6 sm:py-4 text-3xl sm:text-4xl text-center border-2 border-gray-700 rounded-xl bg-gray-800 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-all touch-manipulation"
                  placeholder="0000"
                  maxLength={10}
                  required
                  autoFocus
                  inputMode="numeric"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !pin}
                className="w-full px-4 py-3 sm:px-6 sm:py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl font-bold text-base sm:text-lg transition-all touch-manipulation shadow-lg hover:shadow-xl active:scale-95"
              >
                {loading ? 'Verifying...' : 'Continue'}
              </button>
            </form>
          )}

          {/* Employee Clock In/Out */}
          {employee && !showConfirmation && (
            <div className="space-y-4 sm:space-y-6 flex-1 flex flex-col justify-center min-h-0">
              {/* Employee Info */}
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
                  {employee.name}
                </h2>
                <p className="text-base sm:text-lg text-gray-400 capitalize">
                  {employee.role}
                </p>
              </div>

              {/* Current Shift Status */}
              {currentShift && (
                <div className="p-3 sm:p-4 bg-orange-900/30 border-2 border-orange-700 rounded-xl">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <FaSignInAlt className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      Currently Clocked In
                    </h3>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400 space-y-1 text-center">
                    <p>Clocked in: <span className="font-bold text-white">{formatTime(currentShift.clockIn)}</span></p>
                    <p className="text-base sm:text-lg font-bold text-orange-400">
                      Elapsed: {getElapsedTime(currentShift.clockIn)}
                    </p>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm sm:text-base font-semibold text-gray-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 text-sm sm:text-base border-2 border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-all touch-manipulation resize-none"
                  placeholder="Optional notes..."
                />
              </div>

              {/* Clock In/Out Button */}
              <div className="mt-4 sm:mt-6">
                {!currentShift ? (
                  <button
                    onClick={handleClockIn}
                    disabled={loading}
                    className="w-full px-4 py-3 sm:px-6 sm:py-4 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl font-bold text-base sm:text-lg transition-all touch-manipulation shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-2"
                  >
                    <FaSignInAlt className="w-5 h-5 sm:w-6 sm:h-6" />
                    {loading ? 'Processing...' : 'Clock In'}
                  </button>
                ) : (
                  <button
                    onClick={handleClockOut}
                    disabled={loading}
                    className="w-full px-4 py-3 sm:px-6 sm:py-4 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl font-bold text-base sm:text-lg transition-all touch-manipulation shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-2"
                  >
                    <FaSignOutAlt className="w-5 h-5 sm:w-6 sm:h-6" />
                    {loading ? 'Processing...' : 'Clock Out'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

