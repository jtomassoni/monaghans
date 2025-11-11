'use client';

import { useState, useRef, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, addDays } from 'date-fns';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

interface DateTimePickerProps {
  value: string; // datetime-local format: "YYYY-MM-DDTHH:mm"
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  label?: string;
  required?: boolean;
}

export default function DateTimePicker({ value, onChange, min, max, label, required }: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
  const [selectedTime, setSelectedTime] = useState(() => {
    if (value) {
      const date = new Date(value);
      return {
        hours: date.getHours(),
        minutes: date.getMinutes(),
      };
    }
    const now = new Date();
    return {
      hours: now.getHours(),
      minutes: now.getMinutes(),
    };
  });

  const pickerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [positionAbove, setPositionAbove] = useState(false);
  const [horizontalOffset, setHorizontalOffset] = useState(0);

  // Sync internal state when value prop changes
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setCurrentMonth(date);
      setSelectedTime({
        hours: date.getHours(),
        minutes: date.getMinutes(),
      });
    }
  }, [value]);

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

  // Function to calculate and set picker position
  const calculatePosition = () => {
    if (!containerRef.current || !pickerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const pickerRect = pickerRef.current.getBoundingClientRect();
    const pickerWidth = pickerRect.width || 700;
    const pickerHeight = pickerRect.height || 450;
    const padding = 16;
    
    // Check vertical positioning
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const viewportThreshold = window.innerHeight * 0.6;
    
    const shouldPositionAbove = 
      (spaceBelow < pickerHeight + 20 && spaceAbove > pickerHeight) ||
      (rect.bottom > viewportThreshold && spaceAbove > pickerHeight) ||
      (spaceAbove > spaceBelow + 50 && spaceAbove > pickerHeight);
    
    setPositionAbove(shouldPositionAbove);
    
    // Calculate horizontal positioning
    let offset = 0;
    const naturalLeft = rect.left;
    const naturalRight = naturalLeft + pickerWidth;
    
    // If picker overflows on the right, shift it left
    if (naturalRight > window.innerWidth - padding) {
      offset = window.innerWidth - padding - pickerWidth - naturalLeft;
    }
    
    // If picker overflows on the left after shifting, align to left edge of viewport
    if (naturalLeft + offset < padding) {
      offset = padding - naturalLeft;
    }
    
    // Final safety check: if still overflowing, use right alignment
    const finalLeft = naturalLeft + offset;
    if (finalLeft + pickerWidth > window.innerWidth - padding) {
      offset = window.innerWidth - padding - pickerWidth - naturalLeft;
    }
    
    setHorizontalOffset(offset);
  };

  // Position picker to stay within viewport
  useEffect(() => {
    if (isOpen && containerRef.current && pickerRef.current) {
      // Use requestAnimationFrame to ensure the picker is fully rendered
      requestAnimationFrame(() => {
        calculatePosition();
      });
      
      // Also recalculate on window resize
      const handleResize = () => {
        requestAnimationFrame(() => {
          calculatePosition();
        });
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    } else {
      setPositionAbove(false);
      setHorizontalOffset(0);
    }
  }, [isOpen]);

  const selectedDate = value ? new Date(value) : null;
  const minDate = min ? new Date(min) : null;
  const maxDate = max ? new Date(max) : null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handleDateSelect = (day: Date) => {
    if (minDate !== null && day < minDate) return;
    if (maxDate !== null && day > maxDate) return;

    const newDate = new Date(day);
    newDate.setHours(selectedTime.hours);
    newDate.setMinutes(selectedTime.minutes);
    
    const formatted = format(newDate, "yyyy-MM-dd'T'HH:mm");
    onChange(formatted);
  };

  const handleTimeChange = (hours: number, minutes: number) => {
    setSelectedTime({ hours, minutes });
    const dateToUse = selectedDate || new Date();
    const newDate = new Date(dateToUse);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    const formatted = format(newDate, "yyyy-MM-dd'T'HH:mm");
    onChange(formatted);
  };

  const handleQuickSelect = (type: 'now' | 'topOfHour') => {
    const now = new Date();
    let date: Date;
    
    if (type === 'topOfHour') {
      date = new Date(now);
      date.setMinutes(0, 0, 0);
    } else {
      date = now;
    }

    const formatted = format(date, "yyyy-MM-dd'T'HH:mm");
    onChange(formatted);
    setCurrentMonth(date);
    setSelectedTime({
      hours: date.getHours(),
      minutes: date.getMinutes(),
    });
  };

  const displayValue = value 
    ? (() => {
        const date = new Date(value);
        return format(date, "MMM d, yyyy 'at' h:mm a");
      })()
    : '';

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

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
          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors text-left flex items-center justify-between"
        >
          <span className={displayValue ? '' : 'text-gray-400 dark:text-gray-500'}>
            {displayValue || 'Select date and time'}
          </span>
          <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>

        {isOpen && (
          <div
            ref={pickerRef}
            className={`absolute z-50 ${positionAbove ? 'bottom-full mb-2' : 'top-full mt-2'} bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl p-2.5 w-[700px] max-w-full`}
            style={{ 
              left: `${horizontalOffset}px`
            }}
          >
            <div className="flex gap-3 min-w-0">
              {/* Calendar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    <HiChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap px-1">
                    {format(currentMonth, 'MMMM yyyy')}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    <HiChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-0.5 mb-1.5">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center py-0.5">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-0.5 mb-2">
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
                          h-7 text-xs rounded transition-colors
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

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickSelect('topOfHour')}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Top of Hour
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSelect('now')}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Now
                  </button>
                </div>
              </div>

              {/* Time Picker */}
              <div className="flex-1 border-l border-gray-200 dark:border-gray-700 pl-3 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">Time</h4>
                <div className="flex gap-2 mb-2">
                  {/* Hours - Grid layout, no scrolling needed */}
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Hour</label>
                    <div className="grid grid-cols-6 gap-0.5 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900 p-1">
                      {hours.map((hour) => (
                        <button
                          key={hour}
                          type="button"
                          onClick={() => handleTimeChange(hour, selectedTime.minutes)}
                          className={`
                            px-1 py-0.5 text-xs rounded transition-colors
                            ${selectedTime.hours === hour
                              ? 'bg-blue-600 text-white font-semibold'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }
                          `}
                        >
                          {String(hour).padStart(2, '0')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Minutes - Grid layout, no scrolling needed */}
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Minute</label>
                    <div className="grid grid-cols-4 gap-0.5 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900 p-1">
                      {minutes.filter(m => m % 5 === 0).map((minute) => (
                        <button
                          key={minute}
                          type="button"
                          onClick={() => handleTimeChange(selectedTime.hours, minute)}
                          className={`
                            px-1 py-0.5 text-xs rounded transition-colors
                            ${selectedTime.minutes === minute
                              ? 'bg-blue-600 text-white font-semibold'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }
                          `}
                        >
                          {String(minute).padStart(2, '0')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AM/PM Toggle */}
                {selectedTime.hours < 12 ? (
                  <button
                    type="button"
                    onClick={() => handleTimeChange(selectedTime.hours + 12, selectedTime.minutes)}
                    className="w-full px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Switch to PM
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleTimeChange(selectedTime.hours - 12, selectedTime.minutes)}
                    className="w-full px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Switch to AM
                  </button>
                )}
              </div>
            </div>

            <div className="mt-2 flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

