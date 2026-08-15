import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SelectMenu } from "./SelectMenu";
import { INVOICE_STATUSES, StatusBadge, statusLabel } from "./StatusBadge";

export function StatusPicker({
  value,
  onChange,
  disabled
}: {
  value: string;
  onChange: (status: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const options = [
    ...INVOICE_STATUSES,
    ...(!INVOICE_STATUSES.some((item) => item.value === value) ? [{ value, label: statusLabel(value) }] : [])
  ];

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className="hidden items-center gap-2 lg:flex">
        <span className="text-xs font-medium text-zinc-500">Estado</span>
        <div className="w-40">
          <SelectMenu
            value={value}
            disabled={disabled}
            onChange={onChange}
            className="rounded-full py-2"
            options={options}
          />
        </div>
      </div>

      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 self-end rounded-full bg-zinc-100 py-1.5 pl-3 pr-2 disabled:opacity-60 lg:hidden"
      >
        <span className="text-xs font-medium text-zinc-500">Estado</span>
        <StatusBadge status={value} />
      </button>

      {open
        ? createPortal(
            <div className="lg:hidden">
              <button
                type="button"
                className="fixed inset-0 z-[60] bg-zinc-900/40"
                aria-label="Cerrar"
                onClick={() => setOpen(false)}
              />
              <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center p-6">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="status-picker-title"
                  className="pointer-events-auto w-full max-w-xs rounded-[28px] bg-white p-5 shadow-float ring-1 ring-zinc-200/80"
                >
                  <p id="status-picker-title" className="text-base font-semibold text-zinc-900">
                    Cambiar estado
                  </p>
                  <ul className="mt-4 space-y-1">
                    {options.map((option) => {
                      const active = option.value === value;
                      return (
                        <li key={option.value}>
                          <button
                            type="button"
                            disabled={disabled}
                            className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm transition ${
                              active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
                            }`}
                            onClick={() => {
                              onChange(option.value);
                              setOpen(false);
                            }}
                          >
                            <span className="font-medium">{option.label}</span>
                            {active ? <span className="text-xs text-zinc-300">Actual</span> : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <button
                    type="button"
                    className="mt-4 w-full rounded-full px-3 py-2.5 text-sm font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                    onClick={() => setOpen(false)}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
