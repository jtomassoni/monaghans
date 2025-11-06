'use client';

import { useState, useRef, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
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
  const [positionAbove, setPositionAbove] = useState(false);

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Position picker above if not enough space below or if input is in lower portion of viewport
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const pickerHeight = 320; // Approximate height of the picker
      const viewportThreshold = window.innerHeight * 0.6; // 60% down the viewport
      
      // Position above if:
      // 1. Not enough space below (less than picker height + buffer)
      // 2. Input is past 60% down the viewport AND there's enough space above
      // 3. There's significantly more space above than below
      const shouldPositionAbove = 
        (spaceBelow < pickerHeight + 20 && spaceAbove > pickerHeight) ||
        (rect.bottom > viewportThreshold && spaceAbove > pickerHeight) ||
        (spaceAbove > spaceBelow + 50 && spaceAbove > pickerHeight);
      
      setPositionAbove(shouldPositionAbove);
      
      // If positioning above, scroll the input into view to ensure it's visible
      if (shouldPositionAbove) {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    } else {
      setPositionAbove(false);
    }
  }, [isOpen]);

  const selectedDate = value ? (() => {
    const dateStr = value.includes('T') ? value.split('T')[0] : value;
    return parseLocalDate(dateStr);
  })() : null;
  const minDate = min ? (() => {
    const dateStr = min.includes('T') ? min.split('T')[0] : min;
    return parseLocalDate(dateStr);
  })() : null;
  const maxDate = max ? (() => {
    const dateStr = max.includes('T') ? max.split('T')[0] : max;
    return parseLocalDate(dateStr);
  })() : null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handleDateSelect = (day: Date) => {
    if (minDate !== null && day < minDate) return;
    if (maxDate !== null && day > maxDate) return;

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
        <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
          {label} {required && '*'}
        </label>
      )}
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors text-left flex items-center justify-between"
        >
          <span className={displayValue ? '' : 'text-gray-400 dark:text-gray-500'}>
            {displayValue || 'Select date'}
          </span>
          <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>

        {isOpen && (
          <div
            ref={pickerRef}
            className={`absolute z-50 ${positionAbove ? 'bottom-full mb-2' : 'top-full mt-2'} bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl p-3 w-[350px] max-w-[calc(100vw-2rem)]`}
          >
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <HiChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {format(currentMonth, 'MMMM yyyy')}
              </h3>
              <button
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <HiChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1.5">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center py-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                const isDisabled = (minDate !== null && day < minDate) || (maxDate !== null && day > maxDate);
                const isCurrentDay = isToday(day);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDateSelect(day)}
                    disabled={isDisabled}
                    className={`
                      h-8 text-xs rounded transition-colors
                      ${isCurrentMonth ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}
                      ${isSelected 
                        ? 'bg-blue-600 text-white font-semibold' 
                        : isCurrentDay
                        ? 'bg-blue-100 dark:bg-blue-900/30 font-semibold'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }
                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => handleQuickSelect('today')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect('tomorrow')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Tomorrow
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

