"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Wallet, Transaction, Category } from "@/types";

// ---------- helpers ----------
const fmt = (n: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);

function toNum(x: string | number | null | undefined) {
  if (typeof x === "number") return x;
  if (!x) return 0;
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

type PieDatum = { label: string; value: number; color: string };

function Donut({ data, size = 220, thickness = 22 }: { data: PieDatum[]; size?: number; thickness?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2;
  const ir = r - thickness;
  let angle = -Math.PI / 2;

  const arcs = data.map((d, i) => {
    const arc = (d.value / total) * Math.PI * 2;
    const a0 = angle;
    const a1 = angle + arc;
    angle = a1;

    const x0 = r + r * Math.cos(a0), y0 = r + r * Math.sin(a0);
    const x1 = r + r * Math.cos(a1), y1 = r + r * Math.sin(a1);
    const xi0 = r + ir * Math.cos(a0), yi0 = r + ir * Math.sin(a0);
    const xi1 = r + ir * Math.cos(a1), yi1 = r + ir * Math.sin(a1);
    const large = arc > Math.PI ? 1 : 0;

    const dPath = [
      `M ${xi0} ${yi0}`,
      `L ${x0} ${y0}`,
      `A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`,
      `L ${xi1} ${yi1}`,
      `A ${ir} ${ir} 0 ${large} 0 ${xi0} ${yi0}`,
      "Z",
    ].join(" ");
    return <path key={i} d={dPath} fill={d.color} opacity={0.9} />;
  });

  return (
    <svg width={size} height={size} className="drop-shadow-sm">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#glow)">{arcs}</g>
    </svg>
  );
}

function Bar({ value, total }: { value: number; total: number }) {
  const pct = total ? Math.round((100 * value) / total) : 0;
  return (
    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ---------- page ----------
export default function WalletDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [incCats, setIncCats] = useState<Category[]>([]);
  const [expCats, setExpCats] = useState<Category[]>([]);
  const [err, setErr] = useState("");

  // carga
  useEffect(() => {
    (async () => {
      try {
        setErr("");
        // intenta cargar la billetera (si tu backend no expone GET /wallets/:id,
        // no pasa nada; seguimos con id/currency por defecto)
        try {
          const w = await api<Wallet>(`/wallets/${id}`);
          setWallet(w);
        } catch {
          // fallback: al menos guarda el id para la vista
          setWallet({ id, name: "Billetera", type: "GROUP", currency: "COP" });
        }

        const [t, inc, exp] = await Promise.all([
          api<Transaction[]>(`/transactions?walletId=${id}`),
          api<Category[]>(`/categories?type=INCOME`),
          api<Category[]>(`/categories?type=EXPENSE`),
        ]);

        setTxs(t ?? []);
        setIncCats(inc ?? []);
        setExpCats(exp ?? []);
      } catch (e: any) {
        setErr(e.message || "Error cargando datos");
      }
    })();
  }, [id]);

  const currency = wallet?.currency || "COP";

  // índices de categorías
  const catMap = useMemo(() => {
    const map: Record<string, Category> = {};
    [...incCats, ...expCats].forEach(c => (map[c.id] = c));
    return map;
  }, [incCats, expCats]);

  // agregados
  const { income, expense, byCatExpense, recent } = useMemo(() => {
    let inc = 0, exp = 0;
    const groupExp: Record<string, number> = {};
    const sortedRecent = [...txs]
      .sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    for (const t of txs) {
      const v = toNum(t.amount);
      if (t.type === "INCOME") inc += v;
      else if (t.type === "EXPENSE") {
        exp += v;
        groupExp[t.categoryId] = (groupExp[t.categoryId] || 0) + v;
      }
    }
    const expArr = Object.entries(groupExp)
      .map(([catId, value]) => ({ catId, value }))
      .sort((a,b)=> b.value - a.value)
      .slice(0, 6);

    return { income: inc, expense: exp, byCatExpense: expArr, recent: sortedRecent };
  }, [txs]);

  // donut data (gastos por categoría)
  const pieData: PieDatum[] = useMemo(() => {
    const palette = [
      "#E879F9","#7C3AED","#22D3EE","#F472B6","#60A5FA","#34D399","#F59E0B","#F87171",
    ];
    const total = byCatExpense.reduce((s, c) => s + c.value, 0);
    return byCatExpense.map((row, i) => ({
      label: catMap[row.catId]?.name || "Otro",
      value: row.value,
      color: palette[i % palette.length],
    })).concat(total === 0 ? [{ label: "Sin gastos", value: 1, color: "#334155" }] : []);
  }, [byCatExpense, catMap]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <button
        onClick={() => router.push("/wallets")}
        className="rounded-xl bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
      >
        ← Volver
      </button>

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-display font-semibold">
          {wallet?.name ?? "Billetera"}
        </h1>
        <p className="text-sm text-slate-300">
          {wallet?.type === "GROUP" ? "Compartida" : "Personal"} • {currency}
        </p>
        {!!err && <p className="text-sm text-rose-300">{err}</p>}
      </header>

      {/* tarjetas resumen */}
      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Ingresos"
          value={fmt(income, currency)}
          sub="+ entradas"
          tone="emerald"
        />
        <SummaryCard
          label="Gastos"
          value={fmt(expense, currency)}
          sub="- salidas"
          tone="rose"
        />
        <SummaryCard
          label="Balance"
          value={fmt(income - expense, currency)}
          sub="Ingresos - Gastos"
          tone="indigo"
        />
      </section>

      {/* dos columnas */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* izquierda: gastos por categoría */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium">Gastos por categoría</h2>
          </div>
          {byCatExpense.length === 0 ? (
            <p className="text-slate-300">Aún no hay gastos registrados.</p>
          ) : (
            <ul className="space-y-4">
              {byCatExpense.map(({ catId, value }) => {
                const total = expense || 1;
                const pct = Math.round((100 * value) / total);
                const name = catMap[catId]?.name || "Otro";
                return (
                  <li key={catId} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{name}</span>
                      <span className="text-sm text-slate-300">
                        {fmt(value, currency)} • {pct}%
                      </span>
                    </div>
                    <Bar value={value} total={total} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* derecha: donut + actividad */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <h2 className="mb-4 text-lg font-medium">Distribución de gastos</h2>
          <div className="flex flex-col items-center gap-6 md:flex-row">
            <Donut data={pieData} />
            <ul className="flex-1 space-y-2">
              {pieData.map((d, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span
                    className="inline-block h-3 w-3 rounded"
                    style={{ background: d.color }}
                  />
                  <span className="flex-1">{d.label}</span>
                  <span className="text-slate-300">{fmt(d.value, currency)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 h-px w-full bg-white/10" />

          <h3 className="mt-6 mb-3 text-lg font-medium">Actividad reciente</h3>
          <ul className="space-y-2">
            {recent.length === 0 && <li className="text-slate-300">Sin movimientos aún.</li>}
            {recent.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10"
              >
                <div className="text-sm">
                  <p className="font-medium">
                    {t.description || "(sin descripción)"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(t.date).toLocaleString()}
                  </p>
                </div>
                <div
                  className={`font-semibold ${
                    t.type === "EXPENSE" ? "text-rose-300" : "text-emerald-300"
                  }`}
                >
                  {t.type === "EXPENSE" ? "-" : "+"}
                  {fmt(toNum(t.amount), currency)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
                       label,
                       value,
                       sub,
                       tone = "indigo",
                     }: {
  label: string;
  value: string;
  sub: string;
  tone?: "indigo" | "rose" | "emerald";
}) {
  const bg =
    tone === "rose"
      ? "from-rose-500/20 to-fuchsia-500/10"
      : tone === "emerald"
        ? "from-emerald-500/20 to-teal-500/10"
        : "from-indigo-500/20 to-fuchsia-500/10";

  return (
    <div className={`rounded-2xl border border-white/10 bg-gradient-to-br ${bg} p-5 backdrop-blur-md`}>
      <p className="text-sm text-slate-300">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}
