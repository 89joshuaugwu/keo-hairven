"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const weekdayNames = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

type CalendarDay = {
  iso: string;
  day: number;
  inMonth: boolean;
  disabled: boolean;
};

function partsInLagos(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return { year: Number(map.year), month: Number(map.month), day: Number(map.day) };
}

export function lagosTodayIso() {
  const { year, month, day } = partsInLagos();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function toIso(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return { year, monthIndex: month - 1, day };
}

function displayDate(value: string) {
  const parsed = parseIso(value);
  if (!parsed) return "Choose a date";
  return `${String(parsed.day).padStart(2, "0")}/${String(parsed.monthIndex + 1).padStart(2, "0")}/${parsed.year}`;
}

function buildGrid(year: number, monthIndex: number, minIso: string): CalendarDay[] {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const firstDayMondayIndex = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const prevMonthDays = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const days: CalendarDay[] = [];

  for (let cell = 0; cell < 42; cell += 1) {
    let cellYear = year;
    let cellMonth = monthIndex;
    let day = cell - firstDayMondayIndex + 1;
    let inMonth = true;

    if (day < 1) {
      cellMonth -= 1;
      if (cellMonth < 0) { cellMonth = 11; cellYear -= 1; }
      day = prevMonthDays + day;
      inMonth = false;
    } else if (day > daysInMonth) {
      day -= daysInMonth;
      cellMonth += 1;
      if (cellMonth > 11) { cellMonth = 0; cellYear += 1; }
      inMonth = false;
    }

    const iso = toIso(cellYear, cellMonth, day);
    days.push({ iso, day, inMonth, disabled: iso < minIso });
  }
  return days;
}

type BrandCalendarProps = {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
};

export function BrandCalendar({ value, onChange, min = lagosTodayIso(), ariaLabel = "Preferred date", ariaDescribedBy }: BrandCalendarProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const initial = parseIso(value || min) ?? parseIso(min)!;
  const [monthCursor, setMonthCursor] = useState({ year: initial.year, monthIndex: initial.monthIndex });
  const grid = useMemo(() => buildGrid(monthCursor.year, monthCursor.monthIndex, min), [monthCursor, min]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    const parsed = parseIso(value);
    if (parsed) setMonthCursor({ year: parsed.year, monthIndex: parsed.monthIndex });
  }, [value]);

  const shiftMonth = (delta: number) => {
    setMonthCursor((current) => {
      const next = new Date(Date.UTC(current.year, current.monthIndex + delta, 1));
      return { year: next.getUTCFullYear(), monthIndex: next.getUTCMonth() };
    });
  };

  const chooseToday = () => {
    const today = lagosTodayIso();
    const parsed = parseIso(today)!;
    onChange(today);
    setMonthCursor({ year: parsed.year, monthIndex: parsed.monthIndex });
    setOpen(false);
  };

  return (
    <div className={`brand-calendar ${open ? "is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="brand-calendar-trigger"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={ariaDescribedBy}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={value ? "has-value" : ""}>{displayDate(value)}</span>
        <span className="brand-calendar-icon" aria-hidden="true">▦</span>
      </button>

      {open && (
        <div className="brand-calendar-popover" role="dialog" aria-label={`${monthNames[monthCursor.monthIndex]} ${monthCursor.year}`}>
          <div className="brand-calendar-head">
            <strong>{monthNames[monthCursor.monthIndex]} {monthCursor.year}</strong>
            <div>
              <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)}>←</button>
              <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)}>→</button>
            </div>
          </div>
          <div className="brand-calendar-weekdays" aria-hidden="true">
            {weekdayNames.map((name) => <span key={name}>{name}</span>)}
          </div>
          <div className="brand-calendar-grid" role="grid">
            {grid.map((item) => (
              <button
                key={item.iso}
                type="button"
                role="gridcell"
                aria-selected={item.iso === value}
                className={`${item.inMonth ? "" : "is-outside"} ${item.iso === value ? "is-selected" : ""}`.trim()}
                disabled={item.disabled}
                onClick={() => {
                  onChange(item.iso);
                  setOpen(false);
                }}
              >
                {item.day}
              </button>
            ))}
          </div>
          <div className="brand-calendar-foot">
            <button type="button" onClick={() => { onChange(""); setOpen(false); }}>Clear</button>
            <button type="button" onClick={chooseToday}>Today</button>
          </div>
        </div>
      )}
    </div>
  );
}
