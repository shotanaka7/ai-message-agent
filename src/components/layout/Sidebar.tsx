import { NavLink } from "react-router-dom";
import { useSyncStore } from "../../store/sync-store";
import { useClassificationStore } from "../../store/classification-store";

const navItems = [
  { to: "/", label: "Dashboard", icon: "📊" },
  { to: "/inbox", label: "Inbox", icon: "📥" },
  { to: "/projects", label: "Projects", icon: "📁" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar() {
  const globalSyncing = useSyncStore((s) => s.globalSyncing);
  const isClassifying = useClassificationStore((s) => s.isClassifying);

  return (
    <aside className="w-[260px] bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold">AI Message Agent</h1>
        <p className="text-xs text-gray-400 mt-1">Chatwork & Slack Aggregator</p>
      </div>

      <nav className="flex-1 p-2">
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-gray-700 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`
            }
          >
            <span>{icon}</span>
            <span>{label}</span>
            {to === "/projects" && isClassifying && (
              <span className="ml-auto w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span
            className={`w-2 h-2 rounded-full ${
              globalSyncing || isClassifying
                ? "bg-yellow-400 animate-pulse"
                : "bg-green-400"
            }`}
          />
          <span>
            {globalSyncing
              ? "Syncing..."
              : isClassifying
                ? "Classifying..."
                : "Idle"}
          </span>
        </div>
      </div>
    </aside>
  );
}
