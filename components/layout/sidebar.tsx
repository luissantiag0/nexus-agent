"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/* ── Inline SVG Icons ── */

function GridIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="6" height="6" rx="1" />
      <rect x="12" y="2" width="6" height="6" rx="1" />
      <rect x="2" y="12" width="6" height="6" rx="1" />
      <rect x="12" y="12" width="6" height="6" rx="1" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="5 3 17 10 5 17 5 3" />
    </svg>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.5 6.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path d="M17 17a5 5 0 0 0-10 0" />
      <path d="M19.5 14.5a3.5 3.5 0 0 0-5-1" />
      <path d="M3 13.5a3.5 3.5 0 0 1 5-1" />
    </svg>
  );
}

/* ── Nav Items ── */

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: <GridIcon className="h-4 w-4 shrink-0" />,
    exact: true,
  },
  {
    href: "/dashboard/runs",
    label: "Runs",
    icon: <PlayIcon className="h-4 w-4 shrink-0" />,
  },
  {
    href: "/dashboard/diagnostics",
    label: "Diagnostics",
    icon: <ActivityIcon className="h-4 w-4 shrink-0" />,
  },
  {
    href: "/dashboard/agents",
    label: "Agents",
    icon: <UsersIcon className="h-4 w-4 shrink-0" />,
  },
];

/* ── Component ── */

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <aside
      className="fixed top-0 left-0 z-30 hidden h-screen w-56 flex-col border-r border-gray-200 bg-white lg:flex dark:border-gray-800 dark:bg-gray-950"
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-gray-200 px-5 dark:border-gray-800">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-[11px] font-bold leading-none text-white">
          N
        </span>
        <span className="text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          Nexus
        </span>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-0.5 px-2.5 py-4">
        {navItems.map((item) => {
          const active = isActive(item);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-gray-200"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 px-5 py-3.5 dark:border-gray-800">
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          Nexus Agent Platform
        </p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500">v0.1.0</p>
      </div>
    </aside>
  );
}
