'use client';

import React, { useState, useEffect } from 'react';
import { FaPlus, FaChevronLeft, FaChevronRight, FaEdit, FaTrash, FaCog } from 'react-icons/fa';
import Modal from '@/components/modal';
import ConfirmationDialog from '@/components/confirmation-dialog';
import { formatShiftTime } from '@/lib/schedule-helpers';
import { showToast } from '@/components/toast';

interface Employee {
  id: string;
  name: string;
  role: string;
  hourlyWage: number;
}

interface Schedule {
  id: string;
  employeeId: string;
  date: Date | string;
  shiftType: string;
  startTime: Date | string;
  endTime: Date | string;
  notes: string | null;
  employee: {
    id: string;
    name: string;
    role: string;
    hourlyWage: number;
  };
}

interface ShiftRequirement {
  id: string;
  date: Date | string;
  shiftType: string;
  cooks: number;
  bartenders: number;
  barbacks: number;
  notes: string | null;
  isFilled: boolean;
}

interface WeeklyTemplate {
  id: string;
  name: string;
  dayOfWeek: number;
  shiftType: string;
  cooks: number;
  bartenders: number;
  barbacks: number;
  notes: string | null;
  isActive: boolean;
}

interface EmployeeAvailability {
  id: string;
  employeeId: string;
  date: Date | string;
  shiftType: string | null;
  isAvailable: boolean;
  notes: string | null;
}

interface ScheduleTabProps {
  employees: Employee[];
  schedules: Schedule[];
  onSchedulesChange: (schedules: Schedule[]) => void;
}

export default function ScheduleTab({ employees, schedules, onSchedulesChange }: ScheduleTabProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Requirements and templates state
  const [requirements, setRequirements] = useState<ShiftRequirement[]>([]);
  const [templates, setTemplates] = useState<WeeklyTemplate[]>([]);
  const [isRequirementModalOpen, setIsRequirementModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<ShiftRequirement | null>(null);
  const [templateFormData, setTemplateFormData] = useState<Record<string, { cooks: number; bartenders: number; barbacks: number }>>({});
  
  // Availability state
  const [availabilityEntries, setAvailabilityEntries] = useState<EmployeeAvailability[]>([]);

  const [formData, setFormData] = useState({
    employeeId: '',
    date: '',
    shiftType: 'open' as 'open' | 'close',
    notes: '',
  });

  const [requirementFormData, setRequirementFormData] = useState({
    date: '',
    shiftType: 'open' as 'open' | 'close',
    cooks: '',
    bartenders: '',
    barbacks: '',
    notes: '',
    isFilled: false,
  });

  // Get start of week (Sunday)
  const getStartOfWeek = (date: Date) => {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    start.setHours(0, 0, 0, 0);
    return start;
  };

  // Get week days
  const getWeekDays = () => {
    const start = getStartOfWeek(currentWeek);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays();

  // Load requirements and templates
  useEffect(() => {
    const loadData = async () => {
      await loadRequirements();
      await loadTemplates();
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeek]);

  const loadRequirements = async () => {
    try {
      const startOfWeek = getStartOfWeek(currentWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const response = await fetch(
        `/api/shift-requirements?startDate=${startOfWeek.toISOString()}&endDate=${endOfWeek.toISOString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setRequirements(data);
      }
    } catch (error) {
      console.error('Failed to load requirements:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/weekly-templates?activeOnly=true');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
        
        // Initialize template form data from loaded templates
        const formData: Record<string, { cooks: number; bartenders: number; barbacks: number }> = {};
        data.forEach((template: WeeklyTemplate) => {
          const key = `${template.dayOfWeek}-${template.shiftType}`;
          formData[key] = {
            cooks: template.cooks,
            bartenders: template.bartenders,
            barbacks: template.barbacks,
          };
        });
        
        // Initialize defaults if no templates exist
        if (data.length === 0) {
          await initializeDefaultTemplates();
          await loadTemplates(); // Reload after initialization
        } else {
          setTemplateFormData(formData);
        }
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const initializeDefaultTemplates = async () => {
    try {
      const defaultName = 'Default';
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      // Create templates for all days and shifts
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        // Open shift: 1 cook, 1 bartender for all days
        await fetch('/api/weekly-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: defaultName,
            dayOfWeek,
            shiftType: 'open',
            cooks: 1,
            bartenders: 1,
            barbacks: 0,
            isActive: true,
          }),
        });

        // Close shift: defaults vary by day
        const isFridayOrSaturday = dayOfWeek === 5 || dayOfWeek === 6; // Friday = 5, Saturday = 6
        await fetch('/api/weekly-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: defaultName,
            dayOfWeek,
            shiftType: 'close',
            cooks: isFridayOrSaturday ? 2 : 1,
            bartenders: 1,
            barbacks: isFridayOrSaturday ? 1 : 0,
            isActive: true,
          }),
        });
      }
    } catch (error) {
      console.error('Failed to initialize default templates:', error);
    }
  };

  const handleTemplateSave = async () => {
    setLoading(true);
    try {
      const defaultName = 'Default';
      const updates: Promise<Response>[] = [];

      // Update or create templates for each day/shift combination
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        for (const shiftType of ['open', 'close'] as const) {
          const key = `${dayOfWeek}-${shiftType}`;
          const formData = templateFormData[key] || { cooks: 0, bartenders: 0, barbacks: 0 };
          
          // Find existing template
          const existing = templates.find(
            t => t.dayOfWeek === dayOfWeek && t.shiftType === shiftType && t.name === defaultName
          );

          if (existing) {
            // Update existing template
            updates.push(
              fetch(`/api/weekly-templates/${existing.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  cooks: formData.cooks,
                  bartenders: formData.bartenders,
                  barbacks: formData.barbacks,
                }),
              })
            );
          } else {
            // Create new template
            updates.push(
              fetch('/api/weekly-templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: defaultName,
                  dayOfWeek,
                  shiftType,
                  cooks: formData.cooks,
                  bartenders: formData.bartenders,
                  barbacks: formData.barbacks,
                  isActive: true,
                }),
              })
            );
          }
        }
      }

      await Promise.all(updates);
      await loadTemplates();
      setIsTemplateModalOpen(false);
      showToast('Templates saved successfully', 'success');
    } catch (error: any) {
      showToast('Failed to save templates', 'error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Get requirement for a specific date and shift type
  const getRequirementForDate = (date: Date, shiftType: string) => {
    const dateStr = date.toISOString().split('T')[0];
    return requirements.find(req => {
      const reqDate = new Date(req.date);
      return reqDate.toISOString().split('T')[0] === dateStr && req.shiftType === shiftType;
    });
  };

  // Get template for a day of week and shift type
  const getTemplateForDay = (dayOfWeek: number, shiftType: string) => {
    return templates.find(t => t.dayOfWeek === dayOfWeek && t.shiftType === shiftType && t.isActive);
  };

  // Get actual scheduled count by role for a date/shift
  const getScheduledCounts = (date: Date, shiftType: string) => {
    const dateStr = date.toISOString().split('T')[0];
    const daySchedules = schedules.filter(s => {
      const scheduleDate = new Date(s.date);
      return scheduleDate.toISOString().split('T')[0] === dateStr && s.shiftType === shiftType;
    });

    return {
      cooks: daySchedules.filter(s => s.employee.role === 'cook').length,
      bartenders: daySchedules.filter(s => s.employee.role === 'bartender').length,
      barbacks: daySchedules.filter(s => s.employee.role === 'barback').length,
    };
  };

  // Navigate weeks
  const goToPreviousWeek = () => {
    setCurrentWeek(new Date(currentWeek.setDate(currentWeek.getDate() - 7)));
  };

  const goToNextWeek = () => {
    setCurrentWeek(new Date(currentWeek.setDate(currentWeek.getDate() + 7)));
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  // Get schedules for a specific date
  const getSchedulesForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return schedules.filter(schedule => {
      const scheduleDate = new Date(schedule.date);
      return scheduleDate.toISOString().split('T')[0] === dateStr;
    });
  };

  // Load availability for a specific date
  const loadAvailability = async (date: string) => {
    if (!date) return;
    
    try {
      const dateObj = new Date(date);
      dateObj.setHours(0, 0, 0, 0);
      const endDate = new Date(dateObj);
      endDate.setHours(23, 59, 59, 999);
      
      const response = await fetch(
        `/api/availability?startDate=${dateObj.toISOString()}&endDate=${endDate.toISOString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setAvailabilityEntries(data);
      }
    } catch (error) {
      console.error('Failed to load availability:', error);
    }
  };

  // Check if employee is available for a date/shift
  const isEmployeeAvailable = (employeeId: string, date: string, shiftType: string): boolean => {
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    const dateStr = dateObj.toISOString().split('T')[0];
    
    // Get all availability entries for this employee and date
    const relevantAvailabilities = availabilityEntries.filter(avail => {
      const availDate = new Date(avail.date);
      const availDateStr = availDate.toISOString().split('T')[0];
      return avail.employeeId === employeeId && availDateStr === dateStr;
    });
    
    if (relevantAvailabilities.length === 0) {
      // No availability entry exists, default to available
      return true;
    }
    
    // First check for all-day availability (shiftType is null)
    const allDayAvailability = relevantAvailabilities.find(avail => avail.shiftType === null);
    if (allDayAvailability) {
      // If all-day is marked unavailable, employee is unavailable for all shifts
      if (!allDayAvailability.isAvailable) {
        return false;
      }
    }
    
    // Then check for specific shift type availability
    const shiftSpecificAvailability = relevantAvailabilities.find(avail => avail.shiftType === shiftType);
    if (shiftSpecificAvailability) {
      // Specific shift type availability takes precedence
      return shiftSpecificAvailability.isAvailable;
    }
    
    // If no specific shift type entry exists but all-day exists and is available, employee is available
    if (allDayAvailability && allDayAvailability.isAvailable) {
      return true;
    }
    
    // Default to available if no matching entry found
    return true;
  };

  // Check if employee is already scheduled for a date/shift
  const isEmployeeScheduled = (employeeId: string, date: string, shiftType: string): boolean => {
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    const dateStr = dateObj.toISOString().split('T')[0];
    
    return schedules.some(schedule => {
      const scheduleDate = new Date(schedule.date);
      const scheduleDateStr = scheduleDate.toISOString().split('T')[0];
      return (
        schedule.employeeId === employeeId &&
        scheduleDateStr === dateStr &&
        schedule.shiftType === shiftType &&
        (!editingSchedule || schedule.id !== editingSchedule.id) // Allow if editing the same schedule
      );
    });
  };

  // Get filtered employees for dropdown
  const getAvailableEmployees = (): Employee[] => {
    if (!formData.date || !formData.shiftType) {
      return employees;
    }
    
    return employees.filter(emp => {
      // Exclude if unavailable
      if (!isEmployeeAvailable(emp.id, formData.date, formData.shiftType)) {
        return false;
      }
      
      // Exclude if already scheduled
      if (isEmployeeScheduled(emp.id, formData.date, formData.shiftType)) {
        return false;
      }
      
      return true;
    });
  };

  const handleNew = (date?: Date, shiftType?: 'open' | 'close') => {
    const targetDate = date || new Date();
    setEditingSchedule(null);
    setFormData({
      employeeId: '',
      date: targetDate.toISOString().split('T')[0],
      shiftType: shiftType || 'open',
      notes: '',
    });
    setIsModalOpen(true);
    // Load availability for the selected date
    loadAvailability(targetDate.toISOString().split('T')[0]);
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    const scheduleDate = new Date(schedule.date);
    setFormData({
      employeeId: schedule.employeeId,
      date: scheduleDate.toISOString().split('T')[0],
      shiftType: schedule.shiftType as 'open' | 'close',
      notes: schedule.notes || '',
    });
    setIsModalOpen(true);
    // Load availability for the selected date
    loadAvailability(scheduleDate.toISOString().split('T')[0]);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        employeeId: formData.employeeId,
        date: formData.date,
        shiftType: formData.shiftType,
        notes: formData.notes || null,
      };

      const url = editingSchedule
        ? `/api/schedules/${editingSchedule.id}`
        : '/api/schedules';
      const method = editingSchedule ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save schedule');
      }

      const savedSchedule = await response.json();
      
      // Refresh schedules
      const startOfWeek = getStartOfWeek(currentWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const schedulesResponse = await fetch(
        `/api/schedules?startDate=${startOfWeek.toISOString()}&endDate=${endOfWeek.toISOString()}`
      );
      if (schedulesResponse.ok) {
        const updatedSchedules = await schedulesResponse.json();
        onSchedulesChange(updatedSchedules);
      }

      const wasEditing = !!editingSchedule;
      setIsModalOpen(false);
      setEditingSchedule(null);
      showToast(wasEditing ? 'Schedule updated successfully' : 'Schedule created successfully', 'success');
    } catch (error: any) {
      showToast('Failed to save schedule', 'error', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmation) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/schedules/${deleteConfirmation.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }

      // Refresh schedules
      const startOfWeek = getStartOfWeek(currentWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const schedulesResponse = await fetch(
        `/api/schedules?startDate=${startOfWeek.toISOString()}&endDate=${endOfWeek.toISOString()}`
      );
      if (schedulesResponse.ok) {
        const updatedSchedules = await schedulesResponse.json();
        onSchedulesChange(updatedSchedules);
      }

      setDeleteConfirmation(null);
      showToast('Schedule deleted successfully', 'success');
    } catch (error: any) {
      showToast('Failed to delete schedule', 'error', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle requirement management
  const handleRequirementNew = (date: Date, shiftType: 'open' | 'close') => {
    setEditingRequirement(null);
    
    // Get template defaults for this day/shift
    const dayOfWeek = date.getDay();
    const template = getTemplateForDay(dayOfWeek, shiftType);
    
    setRequirementFormData({
      date: date.toISOString().split('T')[0],
      shiftType,
      cooks: template ? template.cooks.toString() : '',
      bartenders: template ? template.bartenders.toString() : '',
      barbacks: template ? template.barbacks.toString() : '',
      notes: '',
      isFilled: false,
    });
    setIsRequirementModalOpen(true);
  };

  const handleRequirementEdit = (requirement: ShiftRequirement) => {
    setEditingRequirement(requirement);
    const reqDate = new Date(requirement.date);
    setRequirementFormData({
      date: reqDate.toISOString().split('T')[0],
      shiftType: requirement.shiftType as 'open' | 'close',
      cooks: requirement.cooks.toString(),
      bartenders: requirement.bartenders.toString(),
      barbacks: requirement.barbacks.toString(),
      notes: requirement.notes || '',
      isFilled: requirement.isFilled,
    });
    setIsRequirementModalOpen(true);
  };

  const handleRequirementSave = async () => {
    setLoading(true);
    try {
      const payload = {
        date: requirementFormData.date,
        shiftType: requirementFormData.shiftType,
        cooks: parseInt(requirementFormData.cooks) || 0,
        bartenders: parseInt(requirementFormData.bartenders) || 0,
        barbacks: parseInt(requirementFormData.barbacks) || 0,
        notes: requirementFormData.notes || null,
      };

      const url = editingRequirement
        ? `/api/shift-requirements/${editingRequirement.id}`
        : '/api/shift-requirements';
      const method = editingRequirement ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save requirement');
      }

      await loadRequirements();
      const wasEditingRequirement = !!editingRequirement;
      setIsRequirementModalOpen(false);
      setEditingRequirement(null);
      showToast(wasEditingRequirement ? 'Requirement updated successfully' : 'Requirement created successfully', 'success');
    } catch (error: any) {
      showToast('Failed to save requirement', 'error', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFilled = async (requirement: ShiftRequirement) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/shift-requirements/${requirement.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFilled: !requirement.isFilled }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update requirement');
      }

      await loadRequirements();
      showToast('Requirement updated successfully', 'success');
    } catch (error: any) {
      showToast('Failed to update requirement', 'error', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'cook':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700';
      case 'bartender':
        return 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200 border-cyan-300 dark:border-cyan-700';
      case 'barback':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600';
    }
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <>
      <div className="space-y-4">
        {/* Week Navigation */}
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={goToPreviousWeek}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <FaChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white min-w-[200px] text-center">
              {getStartOfWeek(currentWeek).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
              {new Date(getStartOfWeek(currentWeek).setDate(getStartOfWeek(currentWeek).getDate() + 6)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </h2>
            <button
              onClick={goToNextWeek}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <FaChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTemplateModalOpen(true)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition flex items-center gap-2"
            >
              <FaCog className="w-4 h-4" />
              Weekly Defaults
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition"
            >
              Today
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, dayIndex) => {
            const daySchedules = getSchedulesForDate(day);
            const isToday = day.toISOString().split('T')[0] === today.toISOString().split('T')[0];
            
            // Render function for a shift tile
            const renderShiftTile = (shiftType: 'open' | 'close', shiftLabel: string) => {
              const requirement = getRequirementForDate(day, shiftType);
              const template = getTemplateForDay(day.getDay(), shiftType);
              const scheduled = getScheduledCounts(day, shiftType);
              const req = requirement || template;
              const shiftSchedules = daySchedules.filter(s => s.shiftType === shiftType);
              
              return (
                <div
                  key={`${dayIndex}-${shiftType}`}
                  className={`bg-white dark:bg-gray-800 rounded-lg border-2 ${
                    isToday
                      ? 'border-blue-500 dark:border-blue-400'
                      : 'border-gray-200 dark:border-gray-700'
                  } p-3 h-[500px] flex flex-col`}
                >
                  <div className="mb-3 flex-shrink-0">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      {dayNames[dayIndex]}
                    </div>
                    <div className={`text-lg font-bold ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                      {day.getDate()}
                    </div>
                  </div>

                  <div className="mb-3 flex-shrink-0">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      {shiftLabel}
                    </div>
                    {/* Requirements display - always show, using template as fallback */}
                    {(() => {
                      const isFromTemplate = !requirement && !!template;
                      const hasRequirement = !!req;
                      
                      // Check if all requirements are fully met
                      const isFullyStaffed = req ? (
                        scheduled.cooks >= req.cooks &&
                        scheduled.bartenders >= req.bartenders &&
                        scheduled.barbacks >= req.barbacks
                      ) : false;

                      // Check if requirement is marked as filled
                      const isFilled = requirement?.isFilled ?? false;

                      return (
                        <div className="mb-2 space-y-1">
                          {hasRequirement && (
                            <div
                              className={`w-full text-xs p-2.5 rounded-lg border-2 transition ${
                                isFilled
                                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-600'
                                  : isFullyStaffed
                                  ? 'bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-600'
                                  : 'bg-orange-50 dark:bg-orange-900/20 border-orange-400 dark:border-orange-600'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className={`font-semibold text-xs ${
                                    isFilled
                                      ? 'text-blue-700 dark:text-blue-300'
                                      : isFullyStaffed
                                      ? 'text-green-700 dark:text-green-300'
                                      : 'text-orange-700 dark:text-orange-300'
                                  }`}>
                                    {isFilled 
                                      ? '✓ Filled' 
                                      : isFullyStaffed 
                                      ? '✓ Fully Staffed' 
                                      : '⚠ Needs Staff'}
                                  </span>
                                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                    {isFromTemplate ? '(Default)' : '(Custom)'}
                                  </span>
                                </div>
                                {requirement && !isFullyStaffed && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleFilled(requirement);
                                    }}
                                    className={`px-2 py-0.5 text-[10px] rounded transition ${
                                      isFilled
                                        ? 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                    }`}
                                    title={isFilled ? 'Mark as unfilled' : 'Mark as filled'}
                                    disabled={loading}
                                  >
                                    {isFilled ? 'Filled' : 'Unfilled'}
                                  </button>
                                )}
                              </div>
                              <div className="space-y-1 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">Cooks:</span>
                                  <span className={scheduled.cooks >= req.cooks ? 'text-green-600 dark:text-green-400 font-medium' : 'text-orange-600 dark:text-orange-400 font-medium'}>
                                    {scheduled.cooks} / {req.cooks}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">Bartenders:</span>
                                  <span className={scheduled.bartenders >= req.bartenders ? 'text-green-600 dark:text-green-400 font-medium' : 'text-orange-600 dark:text-orange-400 font-medium'}>
                                    {scheduled.bartenders} / {req.bartenders}
                                  </span>
                                </div>
                                {(req.barbacks > 0 || scheduled.barbacks > 0) && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Barbacks:</span>
                                    <span className={scheduled.barbacks >= req.barbacks ? 'text-green-600 dark:text-green-400 font-medium' : 'text-orange-600 dark:text-orange-400 font-medium'}>
                                      {scheduled.barbacks} / {req.barbacks}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {!hasRequirement && (
                            <div className="w-full text-xs p-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                              <div className="text-gray-500 dark:text-gray-400 text-center py-1">
                                No requirements set
                              </div>
                            </div>
                          )}
                          <button
                            onClick={() => {
                              if (requirement) {
                                handleRequirementEdit(requirement);
                              } else {
                                handleRequirementNew(day, shiftType);
                              }
                            }}
                            className="w-full text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 py-1.5 underline transition"
                            title="Click to edit requirements"
                          >
                            {requirement ? 'Edit requirements' : hasRequirement ? 'Override default' : 'Set requirements'}
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex-1 min-h-0 space-y-2 overflow-y-auto">
                    {shiftSchedules.map(schedule => (
                      <div
                        key={schedule.id}
                        className={`p-2 rounded border text-xs ${getRoleColor(schedule.employee.role)} flex-shrink-0`}
                      >
                        <div className="font-semibold">{schedule.employee.name}</div>
                        <div className="text-[10px] opacity-75">
                          {formatShiftTime(new Date(schedule.startTime))} - {formatShiftTime(new Date(schedule.endTime))}
                        </div>
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={() => handleEdit(schedule)}
                            className="text-[10px] hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirmation(schedule)}
                            className="text-[10px] hover:underline text-red-600 dark:text-red-400"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleNew(day, shiftType)}
                    className="w-full text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded hover:border-gray-400 dark:hover:border-gray-500 transition mt-2 flex-shrink-0"
                  >
                    + Add
                  </button>
                </div>
              );
            };

            return (
              <div key={dayIndex} className="flex flex-col gap-2">
                {renderShiftTile('open', 'Open (to 4pm)')}
                {renderShiftTile('close', 'Close (4pm to close)')}
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSchedule(null);
        }}
        title={editingSchedule ? 'Edit Schedule' : 'Add Schedule'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Employee *
            </label>
            <select
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            >
              <option value="">Select employee...</option>
              {getAvailableEmployees().map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => {
                setFormData({ ...formData, date: e.target.value, employeeId: '' });
                // Load availability when date changes
                if (e.target.value) {
                  loadAvailability(e.target.value);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Shift Type *
            </label>
            <select
              value={formData.shiftType}
              onChange={(e) => {
                setFormData({ ...formData, shiftType: e.target.value as 'open' | 'close', employeeId: '' });
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="open">Open (open to 4pm)</option>
              <option value="close">Close (4pm to close)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                setIsModalOpen(false);
                setEditingSchedule(null);
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !formData.employeeId || !formData.date}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
            >
              {loading ? 'Saving...' : editingSchedule ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={!!deleteConfirmation}
        onClose={() => setDeleteConfirmation(null)}
        onConfirm={handleDelete}
        title="Delete Schedule"
        message={`Are you sure you want to delete this schedule for ${deleteConfirmation?.employee.name}?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Requirement Modal */}
      <Modal
        isOpen={isRequirementModalOpen}
        onClose={() => {
          setIsRequirementModalOpen(false);
          setEditingRequirement(null);
        }}
        title={editingRequirement ? 'Edit Shift Requirement' : 'Set Shift Requirement'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date *
            </label>
            <input
              type="date"
              value={requirementFormData.date}
              onChange={(e) => setRequirementFormData({ ...requirementFormData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Shift Type *
            </label>
            <select
              value={requirementFormData.shiftType}
              onChange={(e) => setRequirementFormData({ ...requirementFormData, shiftType: e.target.value as 'open' | 'close' })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="open">Open (open to 4pm)</option>
              <option value="close">Close (4pm to close)</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cooks
              </label>
              <input
                type="number"
                min="0"
                value={requirementFormData.cooks}
                onChange={(e) => setRequirementFormData({ ...requirementFormData, cooks: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bartenders
              </label>
              <input
                type="number"
                min="0"
                value={requirementFormData.bartenders}
                onChange={(e) => setRequirementFormData({ ...requirementFormData, bartenders: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Barbacks
              </label>
              <input
                type="number"
                min="0"
                value={requirementFormData.barbacks}
                onChange={(e) => setRequirementFormData({ ...requirementFormData, barbacks: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={requirementFormData.notes}
              onChange={(e) => setRequirementFormData({ ...requirementFormData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                setIsRequirementModalOpen(false);
                setEditingRequirement(null);
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={handleRequirementSave}
              disabled={loading || !requirementFormData.date}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
            >
              {loading ? 'Saving...' : editingRequirement ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Weekly Defaults Modal */}
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => {
          setIsTemplateModalOpen(false);
          loadTemplates();
        }}
        title="Weekly Staff Defaults"
      >
        <div className="space-y-5">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Set default staffing requirements for each day of the week. These defaults are used when no specific requirement is set for a date.
          </p>

          {(() => {
            const updateValue = (dayOfWeek: number, shiftType: 'open' | 'close', role: 'cooks' | 'bartenders' | 'barbacks', value: number) => {
              const key = `${dayOfWeek}-${shiftType}`;
              setTemplateFormData({
                ...templateFormData,
                [key]: {
                  ...templateFormData[key],
                  cooks: templateFormData[key]?.cooks ?? 0,
                  bartenders: templateFormData[key]?.bartenders ?? 0,
                  barbacks: templateFormData[key]?.barbacks ?? 0,
                  [role]: Math.max(0, value),
                },
              });
            };

            const copyDayToOthers = (sourceDayOfWeek: number, targetDays: number[]) => {
              const sourceOpen = templateFormData[`${sourceDayOfWeek}-open`] || { cooks: 0, bartenders: 0, barbacks: 0 };
              const sourceClose = templateFormData[`${sourceDayOfWeek}-close`] || { cooks: 0, bartenders: 0, barbacks: 0 };
              
              const updated = { ...templateFormData };
              targetDays.forEach(dayOfWeek => {
                updated[`${dayOfWeek}-open`] = { ...sourceOpen };
                updated[`${dayOfWeek}-close`] = { ...sourceClose };
              });
              setTemplateFormData(updated);
            };

            const NumberInput = ({ dayOfWeek, shiftType, role, label, fullLabel }: { dayOfWeek: number; shiftType: 'open' | 'close'; role: 'cooks' | 'bartenders' | 'barbacks'; label: string; fullLabel: string }) => {
              const key = `${dayOfWeek}-${shiftType}`;
              const value = templateFormData[key]?.[role] ?? 0;
              
              return (
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs text-gray-600 dark:text-gray-400 font-medium min-w-[80px]">{label}</label>
                  <div className="flex items-center bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => updateValue(dayOfWeek, shiftType, role, value - 1)}
                      className="px-2.5 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                      tabIndex={-1}
                      aria-label={`Decrease ${fullLabel}`}
                    >
                      <span className="text-sm">−</span>
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={value}
                      onChange={(e) => updateValue(dayOfWeek, shiftType, role, parseInt(e.target.value) || 0)}
                      className="w-12 px-2 py-1.5 text-sm text-center bg-transparent border-0 focus:ring-0 focus:outline-none text-gray-900 dark:text-white font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      aria-label={fullLabel}
                    />
                    <button
                      type="button"
                      onClick={() => updateValue(dayOfWeek, shiftType, role, value + 1)}
                      className="px-2.5 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                      tabIndex={-1}
                      aria-label={`Increase ${fullLabel}`}
                    >
                      <span className="text-sm">+</span>
                    </button>
                  </div>
                </div>
              );
            };

            return (
              <div className="grid grid-cols-7 gap-3">
                {[
                  { day: 'Sunday', dayOfWeek: 0, short: 'Sun' },
                  { day: 'Monday', dayOfWeek: 1, short: 'Mon' },
                  { day: 'Tuesday', dayOfWeek: 2, short: 'Tue' },
                  { day: 'Wednesday', dayOfWeek: 3, short: 'Wed' },
                  { day: 'Thursday', dayOfWeek: 4, short: 'Thu' },
                  { day: 'Friday', dayOfWeek: 5, short: 'Fri' },
                  { day: 'Saturday', dayOfWeek: 6, short: 'Sat' },
                ].map(({ day, dayOfWeek, short }) => (
                  <div
                    key={dayOfWeek}
                    className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{short}</h3>
                      {dayOfWeek > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const copyFrom = dayOfWeek - 1;
                            copyDayToOthers(copyFrom, [dayOfWeek]);
                          }}
                          className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                          title={`Copy from ${dayNames[dayOfWeek - 1]}`}
                        >
                          Copy
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                          Open
                        </div>
                        <div className="space-y-2">
                          <NumberInput dayOfWeek={dayOfWeek} shiftType="open" role="cooks" label="Cooks:" fullLabel="Cooks for Open shift" />
                          <NumberInput dayOfWeek={dayOfWeek} shiftType="open" role="bartenders" label="Bartenders:" fullLabel="Bartenders for Open shift" />
                          <NumberInput dayOfWeek={dayOfWeek} shiftType="open" role="barbacks" label="Barbacks:" fullLabel="Barbacks for Open shift" />
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                          Close
                        </div>
                        <div className="space-y-2">
                          <NumberInput dayOfWeek={dayOfWeek} shiftType="close" role="cooks" label="Cooks:" fullLabel="Cooks for Close shift" />
                          <NumberInput dayOfWeek={dayOfWeek} shiftType="close" role="bartenders" label="Bartenders:" fullLabel="Bartenders for Close shift" />
                          <NumberInput dayOfWeek={dayOfWeek} shiftType="close" role="barbacks" label="Barbacks:" fullLabel="Barbacks for Close shift" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                setIsTemplateModalOpen(false);
                loadTemplates();
              }}
              className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={handleTemplateSave}
              disabled={loading}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
            >
              {loading ? 'Saving...' : 'Save Defaults'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
