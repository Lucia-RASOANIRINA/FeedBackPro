'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Building2,
  Bell,
  TrendingUp,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

const nav = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/feedbacks', label: 'Feedbacks', icon: MessageSquare },
  { href: '/dashboard/establishments', label: 'Établissements', icon: Building2 },
  { href: '/dashboard/improvements', label: 'Améliorations', icon: TrendingUp },
  { href: '/dashboard/alerts', label: 'Alertes', icon: Bell },
];

/**
 * Barre latérale responsive du dashboard admin.
 * - Desktop : colonne fixe à gauche.
 * - Mobile : barre supérieure + panneau coulissant (hamburger).
 * La page active est mise en évidence (fond vert + barre latérale).
 */
export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (item: (typeof nav)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const NavLinks = () => (
    <nav className="flex-1 p-3 space-y-1">
      {nav.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? 'page' : undefined}
            className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? 'bg-brand-light font-semibold text-brand'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-6 -translate-y-1/2 rounded-r bg-brand w-1" />
            )}
            <item.icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const SignOut = () => (
    <form action="/auth/signout" method="post" className="p-3 border-t">
      <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50">
        <LogOut size={18} /> Déconnexion
      </button>
    </form>
  );

  return (
    <>
      {/* Barre supérieure mobile */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-white border-b px-4 py-3">
        <h1 className="text-lg font-bold text-brand">AnonyFeedback</h1>
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-60 shrink-0 bg-white border-r flex-col sticky top-0 h-screen">
        <div className="p-5 border-b">
          <h1 className="text-lg font-bold text-brand">AnonyFeedback</h1>
        </div>
        <NavLinks />
        <SignOut />
      </aside>

      {/* Panneau coulissant mobile */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="relative w-64 max-w-[80%] bg-white flex flex-col h-full shadow-xl">
            <div className="p-5 border-b flex items-center justify-between">
              <h1 className="text-lg font-bold text-brand">AnonyFeedback</h1>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            <NavLinks />
            <SignOut />
          </aside>
        </div>
      )}
    </>
  );
}
