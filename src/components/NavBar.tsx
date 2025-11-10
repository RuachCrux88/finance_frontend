// components/Navbar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from 'react';
import { GoogleLoginButton, logout } from '@/components/AuthButtons';
import { fetchMe } from '@/utils/session';

const links = [
  { href: "/", label: "Inicio" },
  { href: "/wallets", label: "Billeteras" },
  { href: "/transactions", label: "Transacciones" },
  { href: "/categories", label: "Categorías" },
];

export function NavAuth() {
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    fetchMe().then(setMe).catch(() => setMe(null));
  }, []);

  if (!me) return <GoogleLoginButton />;

  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-200">Hola, {me.email}</span>
      <button
        onClick={logout}
        className="rounded-xl bg-white/10 px-3 py-2 hover:bg-white/20"
      >
        Cerrar sesión
      </button>
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40">
      <nav className="mx-auto mt-3 max-w-6xl rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-md shadow-lg shadow-fuchsia-500/10">
        <div className="flex items-center justify-between gap-4">
          {/* Marca */}
          <Link href="/" className="flex items-center gap-2">
            {/* Logo simple */}
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-fuchsia-500 to-indigo-500 font-semibold">
              F
            </span>
            <span className="font-display text-lg font-semibold tracking-wide">
              Finance
            </span>
          </Link>

          {/* Links */}
          <ul className="hidden md:flex items-center gap-4 text-sm">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={`rounded-xl px-3 py-2 transition ${
                      active
                        ? "bg-white/15 text-white"
                        : "text-slate-200 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Acciones (placeholder) */}
          <div className="flex items-center gap-2">
            {/* Si tienes sesión, muestra nombre / botón salir */}
            <Link
              href="/login"
              className="rounded-xl bg-fuchsia-600 px-3 py-2 text-sm font-medium text-white hover:bg-fuchsia-500 transition"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
