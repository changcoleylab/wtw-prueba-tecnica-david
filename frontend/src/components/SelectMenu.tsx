import { useRef, useState } from "react";
import { FieldPopover } from "./FieldPopover";

export type SelectOption = {
  value: string;
  label: string;
};

export function SelectMenu({
  value,
  onChange,
  options,
  disabled,
  className = "",
  "aria-label": ariaLabel
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((option) => option.value === value);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
        className={`ih-input mt-0 flex items-center justify-between gap-2 text-left disabled:opacity-60 ${className}`}
      >
        <span className="min-w-0 truncate">{selected?.label ?? "Seleccionar"}</span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className={`h-4 w-4 shrink-0 text-zinc-400 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path
            d="M5.5 7.5 10 12l4.5-4.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <FieldPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        width="trigger"
        estimatedHeight={Math.min(options.length * 48 + 16, 280)}
      >
        <ul role="listbox" className="space-y-1">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <li key={option.value || "empty"}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`w-full rounded-2xl px-3 py-2.5 text-left text-sm transition ${
                    active ? "bg-zinc-900 font-medium text-white" : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      </FieldPopover>
    </>
  );
}
