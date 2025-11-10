"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Category, CategoryType } from "@/types";

export default function CategoriesPage() {
  const [type, setType] = useState<CategoryType>("EXPENSE");
  const [list, setList] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const data = await api<Category[]>(`/categories?type=${type}`);
      setList(data ?? []);
    } catch (e:any) { setErr(e.message); }
  }

  async function create() {
    setErr("");
    try {
      await api("/categories", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), type, description: desc || null }),
      });
      setName(""); setDesc("");
      await load();
    } catch (e:any) { setErr(e.message); }
  }

  async function remove(id: string) {
    setErr("");
    try {
      await api(`/categories/${id}`, { method: "DELETE" });
      await load();
    } catch (e:any) { setErr(e.message); }
  }

  useEffect(()=>{ load(); }, [type]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
      <h1 className="text-3xl font-display font-semibold">Categorías</h1>

      {/* Crear */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <label className="text-sm text-slate-300">Nombre</label>
            <input
              value={name}
              onChange={(e)=>setName(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white/10 px-4 py-2 ring-1 ring-white/10"
            />
          </div>

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

          <div className="md:col-span-1">
            <label className="text-sm text-slate-300">Descripción</label>
            <input
              value={desc}
              onChange={(e)=>setDesc(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white/10 px-4 py-2 ring-1 ring-white/10"
            />
          </div>
        </div>

        <button
          onClick={create}
          disabled={name.trim().length < 2}
          className="mt-4 rounded-xl bg-fuchsia-600 px-4 py-2 font-medium hover:bg-fuchsia-500 disabled:opacity-50"
        >
          Crear
        </button>
        {!!err && <p className="mt-2 text-sm text-rose-300">{err}</p>}
      </section>

      {/* Lista */}
      <section className="grid gap-3">
        {list.map(c => (
          <div key={c.id}
               className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-slate-400">
                {c.type==="EXPENSE"?"Gasto":"Ingreso"} {c.isSystem ? "• Sistema" : "• Tuya"}
                {c.description ? ` • ${c.description}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              {!c.isSystem && (
                <button
                  onClick={()=>remove(c.id)}
                  className="rounded-xl bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>
        ))}

        {list.length===0 && (
          <div className="rounded-xl bg-white/5 px-4 py-6 text-slate-300 ring-1 ring-white/10">
            No hay categorías para este tipo.
          </div>
        )}
      </section>
    </div>
  );
}
