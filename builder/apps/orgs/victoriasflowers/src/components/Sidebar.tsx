"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getModules } from "@/lib/modules";

export function Sidebar({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const modules = getModules();

  return (
    <aside className="h-full bg-white border-r border-gray-200 flex flex-col">
      {/* App title */}
      <div className="px-6 py-5 border-b border-gray-100">
        <Link href="/" onClick={onClose}>
          <h1 className="text-xl font-extrabold gradient-brand-text">
            {process.env.NEXT_PUBLIC_APP_NAME || "GO4IT App"}
          </h1>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* Dashboard */}
        <NavLink
          href="/"
          icon="📊"
          label="Dashboard"
          active={pathname === "/"}
          onClick={onClose}
        />

        {/* Module sections */}
        {modules.map((mod) => (
          <div key={mod.id} className="mt-5">
            <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {mod.icon} {mod.name}
            </div>
            {mod.entities.map((entity) => (
              <NavLink
                key={entity.slug}
                href={`/m/${mod.id}/${entity.slug}`}
                icon={entity.icon || "•"}
                label={entity.name + "s"}
                active={pathname.startsWith(`/m/${mod.id}/${entity.slug}`)}
                onClick={onClose}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* Settings */}
      <div className="border-t border-gray-100 px-3 py-3">
        <NavLink
          href="/settings"
          icon="⚙️"
          label="Settings"
          active={pathname === "/settings"}
          onClick={onClose}
        />
      </div>
    </aside>
  );
}

function NavLink({
  href,
  icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-purple-50 text-purple-700"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <span className="text-base">{icon}</span>
      {label}
    </Link>
  );
}
