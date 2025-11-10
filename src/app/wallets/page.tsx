// src/app/wallets/page.tsx
"use client";
import { useState } from "react";
import GlassCard from "@/components/GlassCard";

export default function WalletsPage() {
  const [name, setName] = useState("");
  const [type, setType] = useState<"PERSONAL"|"GROUP">("GROUP");

  async function createWallet(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/wallets", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ name, type }) });
    setName("");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Billeteras</h1>

      <GlassCard title="Crear billetera">
        <form onSubmit={createWallet} className="grid md:grid-cols-3 gap-4">
          <div>
            <label>Nombre</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Viaje a la costa" />
          </div>
          <div>
            <label>Tipo</label>
            <select value={type} onChange={e=>setType(e.target.value as any)}>
              <option value="PERSONAL">Personal</option>
              <option value="GROUP">Compartida (grupo)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full">Crear</button>
          </div>
        </form>
      </GlassCard>

      {/* Lista (placeholder) */}
      <GlassCard title="Tus billeteras" subtitle="Últimas creadas">
        <ul className="divide-y divide-white/10">
          {/* renderiza desde tu fetch real */}
          <li className="py-3 flex items-center justify-between">
            <div>
              <p className="font-medium">Viaje</p>
              <p className="text-xs text-white/60">GROUP • COP</p>
            </div>
            <a className="btn-ghost" href="/wallets/1/balances">Ver balances</a>
          </li>
        </ul>
      </GlassCard>
    </div>
  );
}
