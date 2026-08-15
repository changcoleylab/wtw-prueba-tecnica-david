import { useRef, useState } from "react";
import { NavLink, Outlet, Navigate } from "react-router-dom";
import { swaggerUrl } from "../lib/api";
import { useAuth } from "../auth/AuthProvider";
import { FieldPopover } from "./FieldPopover";

export function RequireAuth() {
  const { session } = useAuth();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

export function AppShell() {
  const { session, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const initials = (session?.displayName ?? "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="h-full overflow-hidden bg-canvas p-3 md:p-5">
      <div className="relative mx-auto h-full max-w-[1400px] overflow-hidden rounded-[28px] bg-white shadow-float">
        <div className="absolute inset-0">
          <Outlet />
        </div>

        <nav className="absolute inset-x-3 top-3 z-30 flex items-center justify-between gap-2 rounded-2xl bg-white/90 px-3 py-2.5 shadow-float ring-1 ring-zinc-200/80 backdrop-blur-md md:inset-x-5 md:top-4">
          <NavLink to="/" className="flex min-w-0 items-center gap-3 rounded-xl pr-1">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-zinc-900 text-xs font-semibold text-white">
              IH
            </div>
            <span className="hidden text-sm font-semibold tracking-tight sm:block">InvoiceHub</span>
          </NavLink>

          <div className="flex items-center rounded-full bg-zinc-100 p-1 text-sm">
            <NavLink to="/" className="rounded-full bg-zinc-900 px-3 py-1.5 text-white md:px-4">
              Facturas
            </NavLink>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <a
              href={swaggerUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 md:px-3"
            >
              Swagger
            </a>
            <button
              ref={avatarRef}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="grid h-9 w-9 place-items-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-300"
              title={session?.displayName}
              aria-label="Cuenta"
              aria-expanded={menuOpen}
            >
              {initials || "U"}
            </button>
            <FieldPopover
              open={menuOpen}
              onClose={closeMenu}
              anchorRef={avatarRef}
              width={224}
              estimatedHeight={180}
              panelClassName="p-5 lg:p-3"
            >
              <p className="text-sm font-semibold text-zinc-900">{session?.displayName}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{session?.role === "Admin" ? "Admin" : "Usuario"}</p>
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  logout();
                }}
                className="mt-4 w-full rounded-full bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 lg:mt-3"
              >
                Cerrar sesión
              </button>
            </FieldPopover>
          </div>
        </nav>
      </div>
    </div>
  );
}
