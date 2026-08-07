"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DateRangeValue {
  from: string;
  to: string;
}

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (range: DateRangeValue) => void;
  allowClear?: boolean;
  placeholder?: string;
}

const DAY_MS = 86_400_000;
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fromDateKey = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const getPresetRanges = () => {
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const thisWeekStart = addDays(today, mondayOffset);
  const thisWeekEnd = addDays(thisWeekStart, 6);

  return [
    { label: "Today", from: today, to: today },
    { label: "Yesterday", from: addDays(today, -1), to: addDays(today, -1) },
    { label: "This week", from: thisWeekStart, to: thisWeekEnd },
    { label: "Last week", from: addDays(thisWeekStart, -7), to: addDays(thisWeekEnd, -7) },
    { label: "Past two weeks", from: addDays(today, -13), to: today },
    { label: "This month", from: startOfMonth(today), to: endOfMonth(today) },
    { label: "Last month", from: startOfMonth(new Date(today.getFullYear(), today.getMonth() - 1, 1)), to: endOfMonth(new Date(today.getFullYear(), today.getMonth() - 1, 1)) },
    { label: "This year", from: new Date(today.getFullYear(), 0, 1), to: new Date(today.getFullYear(), 11, 31) },
    { label: "Last year", from: new Date(today.getFullYear() - 1, 0, 1), to: new Date(today.getFullYear() - 1, 11, 31) },
  ];
};

function MonthCalendar({ month, range, onSelect }: { month: Date; range: DateRangeValue; onSelect: (key: string) => void }) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstGridDate = addDays(new Date(year, monthIndex, 1), -new Date(year, monthIndex, 1).getDay());
  const todayKey = toDateKey(new Date());

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-3 text-center text-sm font-bold text-gray-900 dark:text-slate-100">
        {monthNames[monthIndex]} {year}
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase text-gray-400 dark:text-slate-500">
        {weekDays.map(day => <div key={day} className="py-1">{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: 42 }).map((_, index) => {
          const date = addDays(firstGridDate, index);
          const key = toDateKey(date);
          const outside = date.getMonth() !== monthIndex;
          const selectedEdge = key === range.from || key === range.to;
          const inRange = Boolean(range.from && range.to && key > range.from && key < range.to);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className={cn(
                "mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors",
                outside && "text-gray-300 dark:text-slate-700",
                !outside && !selectedEdge && !inRange && "text-gray-700 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-blue-950/50 dark:hover:text-blue-300",
                inRange && "rounded-none bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
                selectedEdge && "bg-blue-600 text-white shadow-sm hover:bg-blue-700",
                key === todayKey && !selectedEdge && "ring-1 ring-inset ring-blue-500"
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DateRangePicker({ value, onChange, allowClear = false, placeholder = "Select date range" }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(value.from ? fromDateKey(value.from) : new Date()));
  const containerRef = useRef<HTMLDivElement>(null);
  const presets = useMemo(getPresetRanges, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setDraft(value);
  }, [value, open]);

  const formatDate = (key: string) => fromDateKey(key).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const rangeDays = value.from && value.to
    ? Math.max(1, Math.round((fromDateKey(value.to).getTime() - fromDateKey(value.from).getTime()) / DAY_MS) + 1)
    : 1;

  const shiftRange = (direction: number) => {
    if (!value.from || !value.to) return;
    onChange({
      from: toDateKey(addDays(fromDateKey(value.from), direction * rangeDays)),
      to: toDateKey(addDays(fromDateKey(value.to), direction * rangeDays)),
    });
  };

  const selectDate = (key: string) => {
    if (!selectingEnd) {
      setDraft({ from: key, to: "" });
      setSelectingEnd(true);
      return;
    }
    setDraft(key < draft.from ? { from: key, to: draft.from } : { from: draft.from, to: key });
    setSelectingEnd(false);
  };

  const openPicker = () => {
    setDraft(value);
    setSelectingEnd(false);
    setViewMonth(startOfMonth(value.from ? fromDateKey(value.from) : new Date()));
    setOpen(prev => !prev);
  };

  return (
    <div ref={containerRef} className="relative flex w-full items-stretch sm:w-auto">
      <button
        type="button"
        onClick={openPicker}
        aria-expanded={open}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-l-xl border border-gray-200 bg-white px-3 py-2 text-left text-sm font-semibold text-gray-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-blue-700 dark:hover:bg-blue-950/30 sm:min-w-[285px]"
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
        <span className={cn("truncate", (!value.from || !value.to) && "font-normal text-gray-400 dark:text-slate-500")}>
          {value.from && value.to ? `${formatDate(value.from)} – ${formatDate(value.to)}` : placeholder}
        </span>
      </button>
      <button type="button" disabled={!value.from || !value.to} aria-label="Previous date range" onClick={() => shiftRange(-1)} className="border-y border-r border-gray-200 bg-white px-2.5 text-gray-500 transition hover:bg-gray-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button type="button" disabled={!value.from || !value.to} aria-label="Next date range" onClick={() => shiftRange(1)} className="rounded-r-xl border-y border-r border-gray-200 bg-white px-2.5 text-gray-500 transition hover:bg-gray-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400">
        <ChevronRight className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[80] mt-2 w-[min(46rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col md:flex-row">
            <div className="grid grid-cols-2 gap-1 border-b border-gray-100 bg-gray-50/70 p-3 md:w-40 md:grid-cols-1 md:border-b-0 md:border-r dark:border-slate-800 dark:bg-slate-950/50">
              {presets.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    const next = { from: toDateKey(preset.from), to: toDateKey(preset.to) };
                    setDraft(next);
                    setViewMonth(startOfMonth(preset.from));
                    setSelectingEnd(false);
                  }}
                  className="rounded-lg px-3 py-2 text-left text-xs font-medium text-gray-600 transition hover:bg-white hover:text-blue-700 hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="min-w-0 flex-1 p-4">
              <div className="mb-2 flex items-center justify-between">
                <button type="button" aria-label="Previous month" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"><ChevronLeft className="h-4 w-4" /></button>
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400">{selectingEnd ? "Select an end date" : "Select a start date"}</span>
                <button type="button" aria-label="Next month" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"><ChevronRight className="h-4 w-4" /></button>
              </div>
              <div className="flex gap-6 overflow-x-auto">
                <MonthCalendar month={viewMonth} range={draft} onSelect={selectDate} />
                <div className="hidden min-w-0 flex-1 sm:block">
                  <MonthCalendar month={new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1)} range={draft} onSelect={selectDate} />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-slate-800">
                <span className="text-xs text-gray-500 dark:text-slate-400">{draft.from && draft.to ? `${formatDate(draft.from)} – ${formatDate(draft.to)}` : "Choose both dates"}</span>
                <div className="flex gap-2">
                  {allowClear && (value.from || value.to) && <button type="button" onClick={() => { onChange({ from: "", to: "" }); setOpen(false); }} className="rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30">Clear</button>}
                  <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
                  <button type="button" disabled={!draft.from || !draft.to} onClick={() => { onChange(draft); setOpen(false); }} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">Apply</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
