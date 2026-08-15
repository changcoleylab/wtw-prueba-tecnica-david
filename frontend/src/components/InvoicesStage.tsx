import { useEffect, useRef, useState } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { DashboardPage } from "../pages/DashboardPage";

const EXIT_MS = 720;

export function InvoicesStage() {
  const location = useLocation();
  const outlet = useOutlet();
  const overlay = location.pathname.startsWith("/invoices");
  const cache = useRef(outlet);
  const [mounted, setMounted] = useState(overlay);
  const [entered, setEntered] = useState(false);
  const [settled, setSettled] = useState(false);

  if (outlet) {
    cache.current = outlet;
  }

  useEffect(() => {
    if (overlay) {
      setMounted(true);
      setSettled(false);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true));
      });
      const done = window.setTimeout(() => setSettled(true), EXIT_MS);
      return () => {
        cancelAnimationFrame(frame);
        window.clearTimeout(done);
      };
    }

    setSettled(false);
    const leave = window.requestAnimationFrame(() => setEntered(false));
    const timeout = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => {
      window.cancelAnimationFrame(leave);
      window.clearTimeout(timeout);
    };
  }, [overlay]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className={`ih-stage-list absolute inset-0 overflow-hidden ${entered ? "is-dimmed" : ""}`}>
        <div className="ih-sheet">
          <DashboardPage />
        </div>
      </div>
      {mounted && cache.current ? (
        <div
          className={`ih-stage-panel absolute inset-0 overflow-hidden bg-white ${entered ? "is-in" : ""} ${
            settled ? "is-settled" : ""
          }`}
        >
          <div className="ih-sheet">{cache.current}</div>
        </div>
      ) : null}
    </div>
  );
}
