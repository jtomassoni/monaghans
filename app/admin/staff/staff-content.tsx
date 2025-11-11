'use client';

import { useState } from 'react';
import { FaUsers, FaCalendarAlt, FaClock, FaDollarSign } from 'react-icons/fa';
import EmployeesTab from './employees-tab';
import ScheduleTab from './schedule-tab';
import ClockInOutTab from './clock-in-out-tab';
import PayrollTab from './payroll-tab';

interface Employee {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  pin: string | null;
  role: string;
  hourlyWage: number;
  isActive: boolean;
  hireDate: Date | string | null;
  notes: string | null;
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

interface Shift {
  id: string;
  employeeId: string;
  clockIn: Date | string;
  clockOut: Date | string | null;
  breakMin: number;
  notes: string | null;
  employee: {
    id: string;
    name: string;
    role: string;
    hourlyWage: number;
  };
}

interface StaffContentProps {
  initialEmployees: Employee[];
  initialSchedules: Schedule[];
  initialOpenShifts: Shift[];
}

type TabId = 'employees' | 'schedule' | 'clock' | 'payroll';

export default function StaffContent({
  initialEmployees,
  initialSchedules,
  initialOpenShifts,
}: StaffContentProps) {
  const [activeTab, setActiveTab] = useState<TabId>('employees');
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules);
  const [openShifts, setOpenShifts] = useState<Shift[]>(initialOpenShifts);

  const tabs = [
    { id: 'employees' as TabId, label: 'Employees', icon: FaUsers },
    { id: 'schedule' as TabId, label: 'Schedule', icon: FaCalendarAlt },
    { id: 'clock' as TabId, label: 'Clock In/Out', icon: FaClock },
    { id: 'payroll' as TabId, label: 'Payroll', icon: FaDollarSign },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'employees' && (
          <EmployeesTab
            employees={employees}
            onEmployeesChange={setEmployees}
          />
        )}
        {activeTab === 'schedule' && (
          <ScheduleTab
            employees={employees}
            schedules={schedules}
            onSchedulesChange={setSchedules}
          />
        )}
        {activeTab === 'clock' && (
          <ClockInOutTab
            employees={employees}
            openShifts={openShifts}
            onOpenShiftsChange={setOpenShifts}
          />
        )}
        {activeTab === 'payroll' && (
          <PayrollTab employees={employees} />
        )}
      </div>
    </div>
  );
}

