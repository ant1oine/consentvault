export function Breadcrumb({ items }: { items: string[] }) {
  return (
    <nav className="text-xs text-slate-500 mb-3 flex items-center gap-1">
      {items.map((item, idx) => (
        <span key={idx}>
          {idx > 0 && <span className="mx-1 text-slate-400">/</span>}
          <span>{item}</span>
        </span>
      ))}
    </nav>
  );
}

