import { useMemo, useRef, useState, type ReactNode } from "react";
import { formatDate } from "../lib/format";
import { FieldPopover } from "./FieldPopover";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];
const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
];

function toIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIso(iso: string): Date | null {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function calendarDays(month: Date): Date[] {
  const first = startOfMonth(month);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - startOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function DatePicker({
  value,
  onChange,
  className = ""
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = parseIso(value);
  const [visible, setVisible] = useState(() => startOfMonth(selected ?? new Date()));

  const days = useMemo(() => calendarDays(visible), [visible]);
  const todayIso = toIso(new Date());

  function openMenu() {
    setVisible(startOfMonth(selected ?? new Date()));
    setOpen(true);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={`ih-input mt-0 flex items-center justify-between gap-2 text-left ${className}`}
      >
        <span className={value ? "text-zinc-900" : "text-zinc-400"}>{value ? formatDate(value) : "Elegir fecha"}</span>
        <CalendarIcon />
      </button>
      <FieldPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        width={320}
        estimatedHeight={360}
        panelClassName="p-3 lg:p-3"
      >
        <div className="flex items-center justify-between gap-2">
          <IconButton label="Mes anterior" onClick={() => setVisible(new Date(visible.getFullYear(), visible.getMonth() - 1, 1))}>
            <Chevron dir="left" />
          </IconButton>
          <p className="text-sm font-semibold tracking-tight text-zinc-900">
            {MONTHS[visible.getMonth()]} {visible.getFullYear()}
          </p>
          <IconButton label="Mes siguiente" onClick={() => setVisible(new Date(visible.getFullYear(), visible.getMonth() + 1, 1))}>
            <Chevron dir="right" />
          </IconButton>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400">
          {WEEKDAYS.map((day) => (
            <span key={day} className="py-1">
              {day}
            </span>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const iso = toIso(day);
            const inMonth = day.getMonth() === visible.getMonth();
            const isSelected = iso === value;
            const isToday = iso === todayIso;
            return (
              <button
                key={`${iso}-${index}`}
                type="button"
                onClick={() => {
                  onChange(iso);
                  setOpen(false);
                }}
                className={`grid h-9 w-full place-items-center rounded-full text-sm transition ${
                  isSelected
                    ? "bg-zinc-900 font-medium text-white"
                    : isToday
                      ? "bg-zinc-100 font-medium text-zinc-900"
                      : inMonth
                        ? "text-zinc-700 hover:bg-zinc-100"
                        : "text-zinc-300 hover:bg-zinc-50"
                }`}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className="rounded-full px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            onClick={() => {
              const today = toIso(new Date());
              onChange(today);
              setVisible(startOfMonth(new Date()));
              setOpen(false);
            }}
          >
            Hoy
          </button>
        </div>
      </FieldPopover>
    </>
  );
}

function IconButton({
  label,
  onClick,
  children
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
    >
      {children}
    </button>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d={dir === "left" ? "M12.5 5.5 8 10l4.5 4.5" : "M7.5 5.5 12 10l-4.5 4.5"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden>
      <path
        d="M6 3.5V5M14 3.5V5M4.5 7.5h11M5.5 4h9A1.5 1.5 0 0 1 16 5.5v10A1.5 1.5 0 0 1 14.5 17h-9A1.5 1.5 0 0 1 4 15.5v-10A1.5 1.5 0 0 1 5.5 4Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
