// src/components/Navbar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import { fetchMe, doLogout } from "@/utils/session";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/wallets", label: "Billeteras" },
  { href: "/transactions", label: "Transacciones" },
  { href: "/categories", label: "Categorías" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe()
      .then((u) => setMe(u))
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await doLogout().catch(() => {});
    setMe(null);
    router.refresh(); // refresca layout
  };

  return (
    <header className="sticky top-0 z-40 mb-6">
      <nav className="mx-auto max-w-6xl rounded-2xl card-glass px-5 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Marca */}
          <Link href="/" className="flex items-center gap-2.5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-orange text-white font-bold text-sm">
              F
            </span>
            <span className="font-display text-lg font-semibold tracking-wide text-warm-dark">
              Finance
            </span>
          </Link>

          {/* Links */}
          <ul className="hidden md:flex items-center gap-2 text-sm">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={`rounded-lg px-3 py-1.5 transition ${
                      active
                        ? "bg-[#E8E2DE] text-warm-dark font-medium"
                        : "text-warm hover:text-warm-dark hover:bg-[#E8E2DE]/50"
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Auth */}
          <div className="flex items-center gap-2.5">
            {loading ? null : me ? (
              <>
                <span className="text-warm text-sm hidden sm:inline">
                  Hola, <b className="font-medium text-warm-dark">{me.name || me.email}</b>
                </span>
                <Link
                  href="/settings"
                  className="rounded-lg border border-[#E8E2DE] px-3 py-1.5 text-sm text-warm-dark hover:bg-[#E8E2DE]/50 transition flex items-center gap-1.5"
                >
                  <span>⚙️</span>
                  <span className="hidden sm:inline">Configuración</span>
                </Link>
                <button
                  onClick={logout}
                  className="rounded-lg border border-[#E8E2DE] px-3 py-1.5 text-sm text-warm-dark hover:bg-[#E8E2DE]/50 transition"
                >
                  Salir
                </button>
              </>
            ) : (
              <GoogleLoginButton />
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
