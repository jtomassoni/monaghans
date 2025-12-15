'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

// Helper function to parse datetime-local format string (YYYY-MM-DDTHH:mm)
// This format has no timezone info, so we treat it as local time
function parseDateTimeLocal(dateTimeLocal: string): Date {
  if (!dateTimeLocal) return new Date();
  
  // Check if it's already a full ISO string with timezone
  if (dateTimeLocal.includes('Z') || dateTimeLocal.includes('+') || dateTimeLocal.match(/-\d{2}:\d{2}$/)) {
    return new Date(dateTimeLocal);
  }
  
  // Parse datetime-local format: "YYYY-MM-DDTHH:mm"
  const [datePart, timePart] = dateTimeLocal.split('T');
  if (!datePart) return new Date();
  
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours = 0, minutes = 0] = (timePart || '00:00').split(':').map(Number);
  
  // Create date in local timezone (datetime-local format is always local time)
  return new Date(year, month - 1, day, hours, minutes, 0);
}

export default function DateTimePicker({ value, onChange, min, max, label, required }: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    return value ? parseDateTimeLocal(value) : new Date();
  });
  const [selectedTime, setSelectedTime] = useState(() => {
    if (value) {
      const date = parseDateTimeLocal(value);
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
  const hoursListRef = useRef<HTMLDivElement>(null);
  const minutesListRef = useRef<HTMLDivElement>(null);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  const PICKER_Z_INDEX = 10001;
  const BACKDROP_Z_INDEX = 10000;

  // Mount check for portal and mobile detection
  useEffect(() => {
    setMounted(true);
    
    // Check if mobile on mount and resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync internal state when value prop changes
  useEffect(() => {
    if (value) {
      const date = parseDateTimeLocal(value);
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

  // Position picker to stay within viewport and scroll to selected time
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const calculatePosition = () => {
      if (!containerRef.current || !pickerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const pickerRect = pickerRef.current.getBoundingClientRect();
      const pickerWidth = pickerRect.width || 520;
      const pickerHeight = pickerRect.height || 400;
      const padding = 16;
      
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const viewportThreshold = viewportHeight * 0.6;
      
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
    const pickerWidth = 520;
    const pickerHeight = 400;
    const padding = 16;
    
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    const shouldPositionAbove = 
      (spaceBelow < pickerHeight + 20 && spaceAbove > pickerHeight) ||
      (rect.bottom > viewportHeight * 0.6 && spaceAbove > pickerHeight);
    
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
    
    // Recalculate with actual dimensions and scroll to selected time
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        calculatePosition();
        
        // Scroll to selected hour and minute using data attributes
        if (hoursListRef.current) {
          const hourButton = hoursListRef.current.querySelector(
            `button[data-hour="${selectedTime.hours}"]`
          ) as HTMLElement;
          hourButton?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        
        if (minutesListRef.current) {
          const minuteButton = minutesListRef.current.querySelector(
            `button[data-minute="${selectedTime.minutes}"]`
          ) as HTMLElement;
          minuteButton?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      });
    });
    
    // Recalculate on window resize and scroll
    const handleResize = () => requestAnimationFrame(calculatePosition);
    const handleScroll = () => requestAnimationFrame(calculatePosition);
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, selectedTime.hours, selectedTime.minutes]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i).filter(m => m % 5 === 0); // 5-minute increments

  const selectedDate = value ? parseDateTimeLocal(value) : null;
  const minDate = min ? parseDateTimeLocal(min) : null;
  const maxDate = max ? parseDateTimeLocal(max) : null;

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
        const date = parseDateTimeLocal(value);
        return format(date, "MMM d, yyyy 'at' h:mm a");
      })()
    : '';

  // Format time for display in 12-hour format
  const formatTimeDisplay = (hours: number, minutes: number) => {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  // On mobile, use native datetime-local input
  if (isMobile) {
    // Convert value to datetime-local format (YYYY-MM-DDTHH:mm)
    const getDateTimeLocalValue = () => {
      if (!value) return '';
      const date = parseDateTimeLocal(value);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    return (
      <div className="relative">
        {label && (
          <label className="block mb-2 text-sm font-semibold text-gray-900 dark:text-white">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <input
          type="datetime-local"
          value={getDateTimeLocalValue()}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          min={min}
          max={max}
          required={required}
          className="w-full px-4 py-3 bg-white dark:bg-gray-800/95 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-base cursor-pointer focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 touch-manipulation min-h-[44px]"
        />
      </div>
    );
  }

  return (
    <div className="relative">
      {label && (
        <label className="block mb-2 text-sm font-semibold text-gray-900 dark:text-white">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 sm:py-2.5 bg-white dark:bg-gray-800/95 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-base sm:text-sm cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-left flex items-center justify-between shadow-sm hover:shadow-lg group backdrop-blur-sm touch-manipulation min-h-[44px]"
        >
          <span className={`flex items-center gap-2 ${displayValue ? 'font-semibold' : 'text-gray-400 dark:text-gray-500'}`}>
            {displayValue ? (
              <>
                <svg className="w-4 h-4 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {displayValue}
              </>
            ) : (
              'Select date and time'
            )}
          </span>
          <svg className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} group-hover:text-blue-500 dark:group-hover:text-blue-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
              className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-4 w-[calc(100vw-2rem)] sm:w-[520px] max-w-[520px] min-w-[320px]"
              style={{ 
                top: `${pickerPosition.top}px`,
                left: `${pickerPosition.left}px`,
                zIndex: PICKER_Z_INDEX,
                maxWidth: 'min(520px, calc(100vw - 2rem))',
                animation: 'fadeIn 200ms ease-in-out'
              }}
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex flex-col sm:flex-row gap-4 min-w-0">
              {/* Calendar */}
              <div className="flex-1 min-w-0 sm:min-w-[220px]">
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-200 cursor-pointer group"
                    aria-label="Previous month"
                  >
                    <HiChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
                  </button>
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white whitespace-nowrap px-2">
                    {format(currentMonth, 'MMMM yyyy')}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-200 cursor-pointer group"
                    aria-label="Next month"
                  >
                    <HiChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 text-center py-1 uppercase tracking-wider">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 mb-3">
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
                          h-8 w-8 text-xs rounded-lg transition-all duration-200 flex items-center justify-center font-medium
                          ${isCurrentMonth ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600'}
                          ${isSelected 
                            ? 'bg-blue-600 text-white font-bold' 
                            : isCurrentDay
                            ? 'bg-gray-100 dark:bg-gray-700/60 text-gray-900 dark:text-white font-semibold ring-1 ring-gray-300 dark:ring-gray-600'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700/60'
                          }
                          ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
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
                    className="flex-1 px-3 py-2 text-xs font-medium text-white bg-blue-600 dark:bg-blue-600 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors duration-200 cursor-pointer"
                  >
                    Top of Hour
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSelect('now')}
                    className="flex-1 px-3 py-2 text-xs font-medium text-white bg-blue-600 dark:bg-blue-600 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors duration-200 cursor-pointer"
                  >
                    Now
                  </button>
                </div>
              </div>

              {/* Time Picker */}
              <div className="flex-1 sm:border-l sm:border-t border-gray-200 dark:border-gray-700 sm:pl-4 sm:pt-0 pt-4 min-w-0 sm:min-w-[220px]">
                <div className="flex gap-2.5">
                  {/* Hours - Scrollable list */}
                  <div className="flex-1 min-w-0">
                    <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wider text-center">HOUR</label>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50 overflow-hidden">
                      <div ref={hoursListRef} className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                        {hours.map((hour) => {
                          const displayHour = hour % 12 || 12;
                          const period = hour >= 12 ? 'PM' : 'AM';
                          return (
                            <button
                              key={hour}
                              type="button"
                              data-hour={hour}
                              onClick={() => handleTimeChange(hour, selectedTime.minutes)}
                              className={`
                                w-full px-3 py-2 text-xs rounded transition-all duration-150 cursor-pointer text-center font-medium
                                ${selectedTime.hours === hour
                                  ? 'bg-blue-600 text-white font-semibold'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/60'
                                }
                              `}
                            >
                              {displayHour} {period}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Minutes - Scrollable list */}
                  <div className="flex-1 min-w-0">
                    <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wider text-center">MINUTE</label>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50 overflow-hidden">
                      <div ref={minutesListRef} className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                        {minutes.map((minute) => (
                          <button
                            key={minute}
                            type="button"
                            data-minute={minute}
                            onClick={() => handleTimeChange(selectedTime.hours, minute)}
                            className={`
                              w-full px-3 py-2 text-xs rounded transition-all duration-150 cursor-pointer text-center font-medium
                              ${selectedTime.minutes === minute
                                ? 'bg-blue-600 text-white font-semibold'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/60'
                              }
                            `}
                          >
                            {String(minute).padStart(2, '0')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 dark:bg-blue-600 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors duration-200 cursor-pointer"
              >
                Done
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

