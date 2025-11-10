// app/page.tsx
import Link from "next/link";
import './globals.css';
import NavBar from '@/components/NavBar';

const glass =
  "rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-fuchsia-500/10";
export default function Home() {
  return (
    <div className="space-y-8">
      {/* Encabezado + CTA */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold">Dashboard</h1>
          <p className="text-slate-300">Resumen rápido de tu economía</p>
        </div>
        <Link
          href="/transactions/new"
          className="inline-flex w-fit items-center justify-center rounded-xl bg-fuchsia-600 px-4 py-2 text-sm font-medium text-white hover:bg-fuchsia-500 transition shadow"
        >
          + Nueva transacción
        </Link>
      </div>

      {/* KPIs / Stats */}
      <div className="grid grid-cols-12 gap-6">
        <Stat
          title="Gasto del mes"
          value="$ 0,00"
          hint="0% vs. mes pasado"
        />
        <Stat title="Ingresos del mes" value="$ 0,00" hint="—" />
        <Stat title="Saldo neto" value="$ 0,00" hint="—" />
        <Stat title="Billeteras activas" value="0" hint="—" />
      </div>

      {/* Tarjetas principales */}
      <div className="grid grid-cols-12 gap-6">
        <FeatureCard
          className="col-span-12 md:col-span-4"
          title="Billeteras"
          desc="Crea, comparte y gestiona billeteras personales o grupales."
          href="/wallets"
        />
        <FeatureCard
          className="col-span-12 md:col-span-4"
          title="Transacciones"
          desc="Registra gastos/ingresos y divide cuentas entre miembros."
          href="/transactions"
        />
        <FeatureCard
          className="col-span-12 md:col-span-4"
          title="Categorías"
          desc="Administra categorías del sistema y tus categorías personalizadas."
          href="/categories"
        />
      </div>

      {/* Actividad reciente */}
      <div className={`${glass} p-6`}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl">Actividad reciente</h3>
          <Link
            href="/transactions"
            className="text-sm text-fuchsia-300 hover:text-fuchsia-200"
          >
            Ver todo
          </Link>
        </div>
        <p className="mt-2 text-slate-300">Aún no hay movimientos.</p>
      </div>
    </div>
  );
}

/* ---------- UI helpers ---------- */

function Stat({
                title,
                value,
                hint,
              }: {
  title: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className={`${glass} col-span-12 sm:col-span-6 lg:col-span-3 p-5`}>
      <div className="text-sm text-slate-300">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-400">{hint}</div> : null}
    </div>
  );
}

function FeatureCard({
                       title,
                       desc,
                       href,
                       className = "",
                     }: {
  title: string;
  desc: string;
  href: string;
  className?: string;
}) {
  return (
    <div className={`${glass} ${className}`}>
      <div className="flex min-h-[180px] flex-col justify-between p-6">
        <div>
          <h3 className="font-display text-xl mb-1">{title}</h3>
          <p className="text-sm text-slate-300">{desc}</p>
        </div>
        <div className="mt-4">
          <Link
            href={href}
            className="inline-flex rounded-xl bg-fuchsia-600 px-4 py-2 text-sm font-medium text-white hover:bg-fuchsia-500 transition shadow"
          >
            Abrir
          </Link>
        </div>
      </div>
    </div>
  );
}
