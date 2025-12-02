'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, addDays } from 'date-fns';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

interface DatePickerProps {
  value: string; // date format: "YYYY-MM-DD" or full datetime "YYYY-MM-DDTHH:mm"
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  label?: string;
  required?: boolean;
  dateOnly?: boolean; // If true, returns "YYYY-MM-DD", otherwise keeps datetime format
}

export default function DatePicker({ value, onChange, min, max, label, required, dateOnly = true }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Helper function to parse YYYY-MM-DD as local date (not UTC)
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      const dateStr = value.includes('T') ? value.split('T')[0] : value;
      return parseLocalDate(dateStr);
    }
    return new Date();
  });

  const pickerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  const PICKER_Z_INDEX = 10050; // Higher than Modal's z-50
  const BACKDROP_Z_INDEX = 10049;

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        pickerRef.current && 
        !pickerRef.current.contains(event.target as Node) &&
        containerRef.current && 
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Position picker to stay within viewport
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const calculatePosition = () => {
      if (!containerRef.current || !pickerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const pickerRect = pickerRef.current.getBoundingClientRect();
      const pickerWidth = pickerRect.width || 340;
      const pickerHeight = pickerRect.height || 320;
      const padding = 16;
      
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const viewportThreshold = window.innerHeight * 0.6;
      
      const shouldPositionAbove = 
        (spaceBelow < pickerHeight + 20 && spaceAbove > pickerHeight) ||
        (rect.bottom > viewportThreshold && spaceAbove > pickerHeight) ||
        (spaceAbove > spaceBelow + 50 && spaceAbove > pickerHeight);
      
      let left = rect.left;
      if (left + pickerWidth > window.innerWidth - padding) {
        left = window.innerWidth - padding - pickerWidth;
      }
      if (left < padding) {
        left = padding;
      }
      
      const top = shouldPositionAbove 
        ? rect.top - pickerHeight - 8
        : rect.bottom + 8;
      
      setPickerPosition({ top, left });
    };

    // Initial position calculation
    const rect = containerRef.current.getBoundingClientRect();
    const pickerWidth = 340;
    const pickerHeight = 320;
    const padding = 16;
    
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const viewportThreshold = window.innerHeight * 0.6;
    
    const shouldPositionAbove = 
      (spaceBelow < pickerHeight + 20 && spaceAbove > pickerHeight) ||
      (rect.bottom > viewportThreshold && spaceAbove > pickerHeight) ||
      (spaceAbove > spaceBelow + 50 && spaceAbove > pickerHeight);
    
    let left = rect.left;
    if (left + pickerWidth > window.innerWidth - padding) {
      left = window.innerWidth - padding - pickerWidth;
    }
    if (left < padding) {
      left = padding;
    }
    
    const top = shouldPositionAbove 
      ? rect.top - pickerHeight - 8
      : rect.bottom + 8;
    
    setPickerPosition({ top, left });
    
    // Recalculate with actual dimensions after render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        calculatePosition();
      });
    });
    
    // Recalculate on resize and scroll
    const handleResize = () => requestAnimationFrame(calculatePosition);
    const handleScroll = () => requestAnimationFrame(calculatePosition);
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const selectedDate = value ? (() => {
    const dateStr = value.includes('T') ? value.split('T')[0] : value;
    return parseLocalDate(dateStr);
  })() : null;
  const minDate = min && min.trim() ? (() => {
    try {
      const dateStr = min.includes('T') ? min.split('T')[0] : min;
      return parseLocalDate(dateStr);
    } catch {
      return null;
    }
  })() : null;
  const maxDate = max && max.trim() ? (() => {
    try {
      const dateStr = max.includes('T') ? max.split('T')[0] : max;
      return parseLocalDate(dateStr);
    } catch {
      return null;
    }
  })() : null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  // Always show 6 weeks (42 days) for consistent sizing
  const calendarEnd = addDays(calendarStart, 41); // 42 days total (0-41 inclusive)
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Helper function to normalize dates to midnight for accurate date-only comparison
  const normalizeDate = (d: Date) => {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  // Helper function to compare dates (returns -1 if a < b, 0 if a == b, 1 if a > b)
  const compareDates = (a: Date, b: Date): number => {
    const normalizedA = normalizeDate(a);
    const normalizedB = normalizeDate(b);
    if (normalizedA < normalizedB) return -1;
    if (normalizedA > normalizedB) return 1;
    return 0;
  };

  const handleDateSelect = (day: Date) => {
    // Check min date constraint (day must be >= minDate)
    if (minDate !== null) {
      if (compareDates(day, minDate) < 0) return;
    }
    // Check max date constraint (day must be <= maxDate)
    if (maxDate !== null) {
      if (compareDates(day, maxDate) > 0) return;
    }

    if (dateOnly) {
      const formatted = format(day, "yyyy-MM-dd");
      onChange(formatted);
    } else {
      // Preserve time if it exists
      const timePart = value && value.includes('T') ? value.split('T')[1] : '00:00';
      const formatted = format(day, "yyyy-MM-dd") + 'T' + timePart;
      onChange(formatted);
    }
    setIsOpen(false);
  };

  const handleQuickSelect = (type: 'today' | 'tomorrow') => {
    const now = new Date();
    const date = type === 'today' ? now : new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    if (dateOnly) {
      const formatted = format(date, "yyyy-MM-dd");
      onChange(formatted);
    } else {
      const timePart = value && value.includes('T') ? value.split('T')[1] : '00:00';
      const formatted = format(date, "yyyy-MM-dd") + 'T' + timePart;
      onChange(formatted);
    }
    setCurrentMonth(date);
    setIsOpen(false);
  };

  const displayValue = value 
    ? (() => {
        const dateStr = value.includes('T') ? value.split('T')[0] : value;
        const date = parseLocalDate(dateStr);
        return format(date, "MMM d, yyyy");
      })()
    : '';

  return (
    <div className="relative">
      {label && (
        <label className="block mb-0.5 text-xs font-medium text-gray-700 dark:text-gray-300">
          {label} {required && '*'}
        </label>
      )}
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 sm:px-2.5 sm:py-1.5 bg-white dark:bg-gray-800/95 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-base sm:text-sm cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-left flex items-center justify-between group touch-manipulation min-h-[44px]"
        >
          <span className={displayValue ? 'font-medium' : 'text-gray-400 dark:text-gray-500'}>
            {displayValue || 'Select date'}
          </span>
          <svg className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} group-hover:text-blue-500 dark:group-hover:text-blue-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>

        {isOpen && mounted && createPortal(
          <>
            {/* Backdrop overlay */}
            <div 
              className="fixed inset-0 bg-black/10 dark:bg-black/30"
              style={{ 
                zIndex: BACKDROP_Z_INDEX,
                animation: 'fadeIn 200ms ease-in-out'
              }}
              onClick={() => setIsOpen(false)}
            />
            <div
              ref={pickerRef}
              className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-4 w-[340px] max-w-[calc(100vw-2rem)] backdrop-blur-sm"
              style={{ 
                top: `${pickerPosition.top}px`,
                left: `${pickerPosition.left}px`,
                zIndex: PICKER_Z_INDEX,
                animation: 'fadeIn 200ms ease-in-out'
              }}
              onClick={(e) => e.stopPropagation()}
            >
            {/* Header with close button */}
            <div className="flex items-center justify-between mb-3 relative">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute right-0 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200 hover:scale-110 cursor-pointer"
                aria-label="Close"
              >
                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-center justify-between w-full pr-10">
                <button
                  type="button"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200 hover:scale-110 cursor-pointer"
                >
                  <HiChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {format(currentMonth, 'MMMM yyyy')}
                </h3>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200 hover:scale-110 cursor-pointer"
                >
                  <HiChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-center py-1.5">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 mb-3">
              {calendarDays.map((day, idx) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                // Check if date is disabled based on min/max constraints
                const isDisabled = 
                  (minDate !== null && compareDates(day, minDate) < 0) || 
                  (maxDate !== null && compareDates(day, maxDate) > 0);
                const isCurrentDay = isToday(day);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDateSelect(day)}
                    disabled={isDisabled}
                    className={`
                      h-9 w-9 text-sm rounded-lg transition-all duration-200 flex items-center justify-center
                      ${isCurrentMonth ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}
                      ${isSelected 
                        ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-500/50 scale-110' 
                        : isCurrentDay
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold ring-2 ring-blue-200 dark:ring-blue-800'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:scale-105'
                      }
                      ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => handleQuickSelect('today')}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200 cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect('tomorrow')}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200 cursor-pointer"
              >
                Tomorrow
              </button>
            </div>
          </div>
          </>,
          document.body
        )}
      </div>
    </div>
  );
}

