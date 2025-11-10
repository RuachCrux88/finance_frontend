"use client";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";

type Category = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  description?: string | null;
  isSystem: boolean;
};

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [description, setDescription] = useState("");

  async function load() {
    try {
      setLoading(true);
      const data = await api<{ categories: Category[] }>("/categories", { auth: true });
      setItems(data.categories ?? (data as any)); // por si tu endpoint devuelve array plano
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function create() {
    try {
      setErr(null);
      await api("/categories", {
        auth: true,
        method: "POST",
        body: JSON.stringify({ name, type, description }),
      });
      setName(""); setDescription("");
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar categoría?")) return;
    try {
      await api(`/categories/${id}`, { auth: true, method: "DELETE" });
      await load();
    } catch (e: any) { alert(e.message); }
  }

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold">Categorías</h1>

      <div className="rounded border bg-white p-4 grid sm:grid-cols-3 gap-3 items-end">
        <div>
          <label className="block text-sm mb-1">Nombre</label>
          <input value={name} onChange={e=>setName(e.target.value)} className="border rounded px-2 py-1 w-full" />
        </div>
        <div>
          <label className="block text-sm mb-1">Tipo</label>
          <select value={type} onChange={e=>setType(e.target.value as any)} className="border rounded px-2 py-1 w-full">
            <option value="EXPENSE">Gasto</option>
            <option value="INCOME">Ingreso</option>
          </select>
        </div>
        <div className="sm:col-span-3">
          <label className="block text-sm mb-1">Descripción</label>
          <input value={description} onChange={e=>setDescription(e.target.value)} className="border rounded px-2 py-1 w-full" />
        </div>
        <button onClick={create} className="px-4 py-2 bg-black text-white rounded">Crear</button>
        {err && <p className="text-sm text-red-600 sm:col-span-2">{err}</p>}
      </div>

      <div className="rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
          <tr>
            <th className="text-left p-2">Nombre</th>
            <th className="text-left p-2">Tipo</th>
            <th className="text-left p-2">Sistema</th>
            <th className="p-2"></th>
          </tr>
          </thead>
          <tbody>
          {loading && <tr><td className="p-2">Cargando...</td></tr>}
          {items.map(c => (
            <tr key={c.id} className="border-t">
              <td className="p-2">{c.name}</td>
              <td className="p-2">{c.type}</td>
              <td className="p-2">{c.isSystem ? "Sí" : "No"}</td>
              <td className="p-2 text-right">
                {!c.isSystem && (
                  <button onClick={()=>remove(c.id)} className="text-red-600 hover:underline">Eliminar</button>
                )}
              </td>
            </tr>
          ))}
          {!loading && items.length === 0 && <tr><td className="p-2">Sin categorías.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
