import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const DESKTOP = "(min-width: 1024px)";

export function useDesktop() {
  const [desktop, setDesktop] = useState(() => window.matchMedia(DESKTOP).matches);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP);
    const sync = () => setDesktop(media.matches);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return desktop;
}

export function FieldPopover({
  open,
  onClose,
  anchorRef,
  width,
  estimatedHeight = 280,
  children,
  panelClassName = ""
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: { current: HTMLElement | null };
  width?: number | "trigger";
  estimatedHeight?: number;
  children: ReactNode;
  panelClassName?: string;
}) {
  const desktop = useDesktop();
  const [box, setBox] = useState({ top: 0, left: 0, width: 280 });

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useLayoutEffect(() => {
    if (!open || !desktop) {
      return;
    }

    const update = () => {
      const el = anchorRef.current;
      if (!el) {
        return;
      }
      const rect = el.getBoundingClientRect();
      const panelWidth = width === "trigger" || width == null ? Math.max(rect.width, 176) : width;
      let left = rect.left;
      if (left + panelWidth > window.innerWidth - 16) {
        left = rect.right - panelWidth;
      }
      left = Math.min(Math.max(16, left), window.innerWidth - panelWidth - 16);

      let top = rect.bottom + 8;
      if (top + estimatedHeight > window.innerHeight - 16) {
        const above = rect.top - estimatedHeight - 8;
        if (above > 16) {
          top = above;
        }
      }
      setBox({ top, left, width: panelWidth });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, desktop, anchorRef, width, estimatedHeight]);

  if (!open) {
    return null;
  }

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[60] bg-zinc-900/40 lg:bg-transparent"
        aria-label="Cerrar"
        onClick={onClose}
      />
      {desktop ? (
        <div
          className={`fixed z-[70] rounded-[22px] bg-white p-2 shadow-float ring-1 ring-zinc-200/80 ${panelClassName}`}
          style={{ top: box.top, left: box.left, width: box.width }}
        >
          {children}
        </div>
      ) : (
        <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center p-6">
          <div
            className={`pointer-events-auto w-full max-w-xs rounded-[28px] bg-white p-4 shadow-float ring-1 ring-zinc-200/80 ${panelClassName}`}
          >
            {children}
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
