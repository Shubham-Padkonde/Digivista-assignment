const TABS = [
  { id: "home", label: "Home", icon: "M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  {
    id: "discover",
    label: "Discover",
    icon: "M12 20.5C6 16.5 3 13.2 3 9.6 3 7 5 5 7.4 5c1.8 0 3.5 1 4.6 2.8C13.1 6 14.8 5 16.6 5 19 5 21 7 21 9.6c0 3.6-3 6.9-9 10.9z",
  },
];

export default function TabBar({ active, onChange }) {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={`tab ${active === t.id ? "tab-active" : ""}`}
          aria-current={active === t.id ? "page" : undefined}
          onClick={() => onChange(t.id)}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path
              d={t.icon}
              fill={active === t.id ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
