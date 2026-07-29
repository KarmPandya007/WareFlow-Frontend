"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  value = "",
  onChange,
  placeholder = "Select date...",
  className,
  disabled = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parsed initial date or today
  const initialDate = value ? new Date(value) : new Date();
  const [viewDate, setViewDate] = useState<Date>(
    isNaN(initialDate.getTime()) ? new Date() : initialDate
  );

  useEffect(() => {
    if (value) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        setViewDate(parsed);
      }
    }
  }, [value]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const selectedMonth = String(month + 1).padStart(2, "0");
    const selectedDay = String(day).padStart(2, "0");
    const formatted = `${year}-${selectedMonth}-${selectedDay}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const formatted = today.toISOString().split("T")[0];
    onChange(formatted);
    setViewDate(today);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setIsOpen(false);
  };

  // Format display text
  const formattedDisplay = value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Selected date components for highlighting
  const selectedDateObj = value ? new Date(value) : null;
  const isSelected = (day: number) => {
    if (!selectedDateObj || isNaN(selectedDateObj.getTime())) return false;
    return (
      selectedDateObj.getFullYear() === year &&
      selectedDateObj.getMonth() === month &&
      selectedDateObj.getDate() === day
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  };

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 font-medium",
          className
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <CalendarIcon className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <span className={cn("truncate", !value && "text-gray-400 dark:text-slate-500 font-normal")}>
            {formattedDisplay || placeholder}
          </span>
        </div>
        {value && (
          <span
            onClick={handleClear}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-72 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
            <span className="text-sm font-bold text-gray-900 dark:text-slate-100">
              {monthNames[month]} {year}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 my-2 text-center text-xs font-semibold text-gray-400 dark:text-slate-500">
            {dayNames.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-sm">
            {/* Blank leading cells */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const active = isSelected(dayNum);
              const today = isToday(dayNum);

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center font-medium text-xs transition-all",
                    active
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold"
                      : today
                      ? "border border-blue-500 text-blue-600 dark:text-blue-400 font-semibold bg-blue-50/50 dark:bg-blue-950/30"
                      : "text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                  )}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100 dark:border-slate-800 text-xs">
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 font-medium"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-blue-600 dark:text-blue-400 hover:underline font-bold"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
