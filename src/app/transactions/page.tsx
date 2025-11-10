"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { Wallet, Category, CategoryType, Transaction } from "@/types";

export default function TransactionsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [cats, setCats]       = useState<Category[]>([]);
  const [type, setType]       = useState<CategoryType>("EXPENSE");
  const [walletId, setWid]    = useState<string>("");
  const [catId, setCat]       = useState<string>("");
  const [amount, setAmt]      = useState<string>("");
  const [desc, setDesc]       = useState("");
  const [feed, setFeed]       = useState<Transaction[]>([]);
  const [err, setErr]         = useState("");

  // cargar combos
  useEffect(() => {
    (async () => {
      try {
        const ws = await api<Wallet[]>("/wallets");
        setWallets(ws);
        if (ws[0]) setWid(ws[0].id);
      } catch (e:any) { setErr(e.message); }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!type) return;
      try {
        const list = await api<Category[]>(`/categories?type=${type}`);
        setCats(list ?? []);
        setCat(list?.[0]?.id ?? "");
      } catch (e:any) { setErr(e.message); }
    })();
  }, [type]);

  async function submit() {
    setErr("");
    try {
      // ajusta al DTO de tu backend
      await api("/transactions", {
        method: "POST",
        body: JSON.stringify({
          walletId,
          categoryId: catId,
          type, // 'EXPENSE' o 'INCOME'
          amount: Number(amount).toFixed(2), // manda string decimal
          description: desc || null,
        }),
      });
      setAmt(""); setDesc("");
      await refreshFeed();
    } catch (e:any) { setErr(e.message); }
  }

  async function refreshFeed() {
    if (!walletId) return;
    const list = await api<Transaction[]>(`/transactions?walletId=${walletId}`);
    setFeed(list ?? []);
  }

  useEffect(()=>{ refreshFeed(); }, [walletId]);

  const ready = useMemo(
    () => walletId && catId && Number(amount) > 0,
    [walletId, catId, amount]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <h1 className="text-3xl font-display font-semibold">Transacciones</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Registrar */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <h2 className="mb-4 text-lg font-medium">Registrar</h2>

          <div className="grid gap-4">
            <div>
              <label className="text-sm text-slate-300">Billetera</label>
              <select
                value={walletId}
                onChange={(e)=>setWid(e.target.value)}
                className="mt-1 w-full rounded-xl bg-white/10 px-4 py-2 ring-1 ring-white/10"
              >
                {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-300">Tipo</label>
                <select
                  value={type}
                  onChange={(e)=>setType(e.target.value as CategoryType)}
                  className="mt-1 w-full rounded-xl bg-white/10 px-4 py-2 ring-1 ring-white/10"
                >
                  <option value="EXPENSE">Gasto</option>
                  <option value="INCOME">Ingreso</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-slate-300">Categoría</label>
                <select
                  value={catId}
                  onChange={(e)=>setCat(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-white/10 px-4 py-2 ring-1 ring-white/10"
                >
                  {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-300">Monto</label>
              <input
                type="number" step="0.01" min="0"
                value={amount}
                onChange={(e)=>setAmt(e.target.value)}
                className="mt-1 w-full rounded-xl bg-white/10 px-4 py-2 ring-1 ring-white/10"
              />
            </div>

            <div>
              <label className="text-sm text-slate-300">Descripción (opcional)</label>
              <input
                value={desc}
                onChange={(e)=>setDesc(e.target.value)}
                placeholder="Ej: Mercado, Netflix..."
                className="mt-1 w-full rounded-xl bg-white/10 px-4 py-2 ring-1 ring-white/10"
              />
            </div>

            <button
              onClick={submit}
              disabled={!ready}
              className="mt-2 rounded-xl bg-fuchsia-600 px-4 py-2 font-medium hover:bg-fuchsia-500 disabled:opacity-50"
            >
              Agregar transacción
            </button>

            {!!err && <p className="text-sm text-rose-300">{err}</p>}
          </div>
        </section>

        {/* Actividad */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-lg font-medium">Actividad</h2>
          <ul className="space-y-2">
            {feed.length === 0 && (
              <li className="text-slate-300">No hay transacciones aún.</li>
            )}
            {feed.map(tx => (
              <li key={tx.id}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
                <div className="text-sm">
                  <p className="font-medium">{tx.description || "(sin descripción)"}</p>
                  <p className="text-xs text-slate-400">
                    {tx.type === "EXPENSE" ? "Gasto" : tx.type === "INCOME" ? "Ingreso" : "Liquidación"} • {new Date(tx.date).toLocaleDateString()}
                  </p>
                </div>
                <div className={`font-semibold ${tx.type==="EXPENSE"?"text-rose-300":"text-emerald-300"}`}>
                  {tx.type==="EXPENSE"?"-":"+"}${Number(tx.amount).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
