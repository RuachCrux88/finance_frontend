// src/components/Navbar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import { fetchMe, doLogout } from "@/utils/session";
import { useLanguage } from "@/contexts/LanguageContext";
import { Gear, SignOut, House, ChartBar, Wallet, ArrowsClockwise, Tag } from "phosphor-react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const links = [
    { href: "/", label: t("navbar.home"), icon: House },
    { href: "/dashboard", label: t("navbar.dashboard"), icon: ChartBar },
    { href: "/wallets", label: t("navbar.wallets"), icon: Wallet },
    { href: "/transactions", label: t("navbar.transactions"), icon: ArrowsClockwise },
    { href: "/categories", label: t("navbar.categories"), icon: Tag },
  ];

  useEffect(() => {
    fetchMe()
      .then((u) => setMe(u))
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await doLogout().catch(() => {});
    setMe(null);
    router.refresh();
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 z-50">
      <nav className="h-full card-glass rounded-none rounded-r-2xl flex flex-col p-4">
        {/* Logo y marca */}
        <Link href="/" className="flex items-center gap-2.5 mb-8 px-2">
          <div className="relative h-10 w-10 flex-shrink-0">
            <Image
              src="/coin-f.svg"
              alt="Finance Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="font-display text-xl font-semibold tracking-wide text-warm-dark">
            Finance
          </span>
        </Link>

        {/* Links de navegación */}
        <ul className="flex-1 space-y-1">
          {links.map((l) => {
            const active = pathname === l.href;
            const Icon = l.icon;
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-r from-[#C7366F] to-[#B82E5F] text-white shadow-lg shadow-[#C7366F]/30"
                      : "text-warm hover:text-warm-dark hover:bg-white/60"
                  }`}
                >
                  <Icon size={20} weight={active ? "fill" : "regular"} />
                  <span className="font-financial text-sm">{l.label}</span>
                </Link>
              </li>
            );
          })}
          <li className="mt-2">
            <a
              href="https://drive.google.com/drive/folders/1fYgAQwcilhWWhJ4wDVInSbErAiw-H5Q9?usp=drive_link"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-warm hover:text-warm-dark hover:bg-white/60 transition-all duration-200"
            >
              <span className="text-sm">{t("navbar.mobile")}</span>
            </a>
          </li>
        </ul>

        {/* Sección de usuario */}
        <div className="border-t border-[#FFB6C1]/30 pt-4 mt-4">
          {loading ? (
            <div className="px-4 py-2">
              <div className="h-4 bg-[#E8E2DE]/50 rounded animate-pulse" />
            </div>
          ) : me ? (
            <>
              <div className="px-4 py-2 mb-3">
                <p className="text-warm-dark text-sm font-financial">
                  {t("home.greeting", { name: me.name || me.email })}
                </p>
              </div>
              <div className="space-y-1">
                <Link
                  href="/settings"
                  className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-warm-dark hover:bg-white/60 transition-all duration-200"
                >
                  <Gear size={18} weight="regular" />
                  <span className="font-financial text-sm">{t("navbar.settings")}</span>
                </Link>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 rounded-xl px-4 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-warm-dark transition-all duration-200 font-financial-bold shadow-md shadow-yellow-400/30"
                >
                  <SignOut size={18} weight="regular" />
                  <span className="font-financial text-sm">{t("navbar.logout")}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="px-2">
              <GoogleLoginButton />
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}
