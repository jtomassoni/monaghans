'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TimePickerProps {
  value: string; // time format: "HH:mm" (24-hour format)
  onChange: (value: string) => void;
}

const PICKER_Z_INDEX = 10000;
const BACKDROP_Z_INDEX = 9999;

export default function TimePicker({ value, onChange }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState(() => {
    if (value) {
      const [hours, minutes] = value.split(':').map(Number);
      return { hours: hours || 0, minutes: minutes || 0 };
    }
    return { hours: 12, minutes: 0 };
  });

  const pickerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoursListRef = useRef<HTMLDivElement>(null);
  const minutesListRef = useRef<HTMLDivElement>(null);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync internal state when value prop changes
  useEffect(() => {
    if (value) {
      const [hours, minutes] = value.split(':').map(Number);
      setSelectedTime({ hours: hours || 0, minutes: minutes || 0 });
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

  // Position picker to stay within viewport
  useEffect(() => {
    if (!isOpen || !containerRef.current || !pickerRef.current) return;

    const calculatePosition = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      const pickerWidth = 280;
      const pickerHeight = 280;
      const padding = 16;
      
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldPositionAbove = spaceBelow < pickerHeight + 20 && spaceAbove > pickerHeight;
      
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

    calculatePosition();

    // Scroll selected items into view after positioning
    requestAnimationFrame(() => {
      if (hoursListRef.current) {
        const selectedHourButton = hoursListRef.current.querySelector(
          `[data-hour="${selectedTime.hours}"]`
        ) as HTMLElement;
        selectedHourButton?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      if (minutesListRef.current) {
        const selectedMinuteButton = minutesListRef.current.querySelector(
          `[data-minute="${selectedTime.minutes}"]`
        ) as HTMLElement;
        selectedMinuteButton?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
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

  const handleTimeChange = (hours: number, minutes: number) => {
    setSelectedTime({ hours, minutes });
    const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    onChange(formatted);
  };

  // Format time for display in 12-hour format
  const formatTimeDisplay = (hours: number, minutes: number) => {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  const displayValue = value ? formatTimeDisplay(selectedTime.hours, selectedTime.minutes) : 'Select time';

  return (
    <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 bg-white dark:bg-gray-800/95 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-left flex items-center justify-between shadow-sm hover:shadow-md group backdrop-blur-sm"
        >
          <span className={`flex items-center gap-2 ${value ? 'font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
            {value ? (
              <>
                <svg className="w-4 h-4 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {displayValue}
              </>
            ) : (
              'Select time'
            )}
          </span>
          <svg className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} group-hover:text-blue-500 dark:group-hover:text-blue-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            
            {/* Picker */}
            <div
              ref={pickerRef}
              className="fixed bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-[280px]"
              style={{
                top: `${pickerPosition.top}px`,
                left: `${pickerPosition.left}px`,
                zIndex: PICKER_Z_INDEX,
                animation: 'fadeIn 200ms ease-in-out'
              }}
              onClick={(e) => e.stopPropagation()}
            >
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
  );
}

