"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { Wallet, WalletType } from "@/types";

const currencies = ["COP","USD","EUR","MXN","ARS"];

export default function WalletsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems]   = useState<Wallet[]>([]);
  const [name, setName]     = useState("");
  const [type, setType]     = useState<WalletType>("GROUP");
  const [currency, setCur]  = useState("COP");
  const [err, setErr]       = useState<string>("");

  const canCreate = useMemo(() => name.trim().length >= 3, [name]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      // adapta al endpoint real de tu backend:
      const data = await api<Wallet[]>("/wallets");
      setItems(data ?? []);
    } catch (e:any) { setErr(e.message); }
    setLoading(false);
  }

  async function createWallet() {
    if (!canCreate) return;
    setErr("");
    try {
      const body = { name: name.trim(), type, currency };
      await api("/wallets", { method: "POST", body: JSON.stringify(body) });
      setName("");
      await load();
    } catch (e:any) { setErr(e.message); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <h1 className="text-3xl font-display font-semibold">Billeteras</h1>

      {/* Crear */}
      <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-[0_10px_40px_-10px_rgba(168,85,247,0.2)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="text-sm text-slate-300">Nombre</label>
            <input
              value={name}
              onChange={(e)=>setName(e.target.value)}
              placeholder="Ej: Viaje a la costa"
              className="mt-1 w-full rounded-xl bg-white/10 px-4 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-fuchsia-500"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">Tipo</label>
            <select
              value={type}
              onChange={(e)=>setType(e.target.value as WalletType)}
              className="mt-1 rounded-xl bg-white/10 px-4 py-2 ring-1 ring-white/10"
            >
              <option value="PERSONAL">Personal</option>
              <option value="GROUP">Compartida (grupo)</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-300">Moneda</label>
            <select
              value={currency}
              onChange={(e)=>setCur(e.target.value)}
              className="mt-1 rounded-xl bg-white/10 px-4 py-2 ring-1 ring-white/10"
            >
              {currencies.map(c=> <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <button
            onClick={createWallet}
            disabled={!canCreate}
            className="rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 px-4 py-2 font-medium"
          >
            Crear
          </button>
        </div>
        {!!err && <p className="mt-3 text-sm text-rose-300">{err}</p>}
      </section>

      {/* Listado */}
      <section className="grid gap-4 sm:grid-cols-2">
        {loading && <CardSkeleton />}
        {!loading && items.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-slate-300">
            Aún no tienes billeteras.
          </div>
        )}
        {items.map(w=>(
          <article key={w.id}
                   className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.03] p-5 hover:from-white/[0.07] transition"
          >
            <header className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-medium">{w.name}</h3>
                <p className="text-xs text-slate-400">
                  {w.type === "GROUP" ? "GROUP" : "PERSONAL"} • {w.currency}
                </p>
              </div>
              <a
                href={`/wallets/${w.id}`}
                className="rounded-xl bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
              >
                Ver balances
              </a>
            </header>
          </article>
        ))}
      </section>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="h-28 animate-pulse rounded-2xl bg-white/5 ring-1 ring-white/10" />
  );
}
