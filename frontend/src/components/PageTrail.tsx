import { Link } from "react-router-dom";

type Crumb = {
  label: string;
  to?: string;
};

export function PageTrail({ items }: { items: Crumb[] }) {
  return (
    <nav
      aria-label="Ruta"
      className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[15px] font-semibold leading-tight tracking-tight sm:text-xl md:text-[1.65rem] md:leading-none"
    >
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
          {index > 0 ? <span className="font-light text-zinc-300">/</span> : null}
          {item.to ? (
            <Link to={item.to} className="font-medium text-zinc-400 transition hover:text-zinc-900">
              {item.label}
            </Link>
          ) : (
            <span className="text-zinc-900">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
