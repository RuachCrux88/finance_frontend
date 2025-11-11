"use client";

import { useEffect, useState } from "react";
import { api, AuthError } from "@/lib/api";
import type { Category, CategoryType } from "@/types";
import AuthRequired from "@/components/AuthRequired";

export default function CategoriesPage() {
  const [type, setType] = useState<CategoryType>("EXPENSE");
  const [list, setList] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await api<Category[]>(`/categories?type=${type}`);
      setList(data ?? []);
    } catch (e: any) {
      if (e instanceof AuthError) {
        setErr("AUTH_REQUIRED");
      } else {
        setErr(e.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    setErr("");
    if (!name.trim() || name.trim().length < 2) {
      setErr("El nombre debe tener al menos 2 caracteres");
      return;
    }
    try {
      await api("/categories", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), type, description: desc.trim() || null }),
      });
      setName("");
      setDesc("");
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function update(id: string) {
    setErr("");
    const cat = list.find((c) => c.id === id);
    if (!cat) return;

    try {
      const updateData: any = {};
      if (!cat.isSystem && editName.trim() && editName.trim() !== cat.name) {
        updateData.name = editName.trim();
      }
      if (editDesc !== (cat.description || "")) {
        updateData.description = editDesc.trim() || null;
      }

      if (Object.keys(updateData).length > 0) {
        await api(`/categories/${id}`, {
          method: "PATCH",
          body: JSON.stringify(updateData),
        });
      }
      setEditingId(null);
      setEditName("");
      setEditDesc("");
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function remove(id: string) {
    setErr("");
    if (!confirm("¿Estás seguro de eliminar esta categoría?")) return;
    try {
      await api(`/categories/${id}`, { method: "DELETE" });
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDesc(cat.description || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditDesc("");
  }

  useEffect(() => {
    load();
  }, [type]);

  // Eliminar duplicados por nombre y tipo (mantener solo la primera ocurrencia)
  const categoryMap = new Map<string, Category>();
  list.forEach(cat => {
    const key = `${cat.name}_${cat.type}`;
    if (!categoryMap.has(key)) {
      categoryMap.set(key, cat);
    }
  });
  const uniqueList = Array.from(categoryMap.values());

  const systemCategories = uniqueList.filter((c) => c.isSystem);
  const userCategories = uniqueList.filter((c) => !c.isSystem);

  if (err === "AUTH_REQUIRED") {
    return <AuthRequired />;
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-warm-dark mb-1">Categorías</h1>
        <p className="text-warm text-sm">Gestiona las categorías para tus transacciones</p>
      </div>

      {/* Filtro por tipo */}
      <div className="flex gap-2">
        <button
          onClick={() => setType("EXPENSE")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            type === "EXPENSE"
              ? "btn-orange text-white"
              : "border border-[#E8E2DE] text-warm-dark hover:bg-[#E8E2DE]/50"
          }`}
        >
          Gastos
        </button>
        <button
          onClick={() => setType("INCOME")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            type === "INCOME"
              ? "btn-orange text-white"
              : "border border-[#E8E2DE] text-warm-dark hover:bg-[#E8E2DE]/50"
          }`}
        >
          Ingresos
        </button>
      </div>

      {/* Crear nueva categoría */}
      <div className="card-glass p-5">
        <h2 className="text-lg font-semibold text-warm-dark mb-4">Crear nueva categoría</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs text-warm font-medium mb-1.5 block">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Compras online"
              className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
            />
          </div>
          <div>
            <label className="text-xs text-warm font-medium mb-1.5 block">Descripción (opcional)</label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Descripción breve"
              className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
            />
          </div>
        </div>
        <button
          onClick={create}
          disabled={!name.trim() || name.trim().length < 2}
          className="mt-4 btn-orange rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
        >
          Crear categoría
        </button>
        {!!err && <p className="mt-3 text-xs text-rose-600 font-medium">{err}</p>}
      </div>

      {/* Categorías del sistema */}
      {systemCategories.length > 0 && (
        <div className="card-glass p-5">
          <h2 className="text-lg font-semibold text-warm-dark mb-4">
            Categorías predefinidas {type === "EXPENSE" ? "(Gastos)" : "(Ingresos)"}
          </h2>
          {loading ? (
            <p className="text-warm text-sm">Cargando...</p>
          ) : (
            <div className="space-y-2">
              {systemCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/30 px-3 py-2.5"
                >
                  {editingId === cat.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        value={editName}
                        disabled
                        className="flex-1 rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-2 py-1 text-sm text-warm-dark outline-none disabled:opacity-50"
                      />
                      <input
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Descripción"
                        className="flex-1 rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-2 py-1 text-sm text-warm-dark placeholder:text-warm outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
                      />
                      <button
                        onClick={() => update(cat.id)}
                        className="btn-orange rounded-lg px-3 py-1 text-xs font-medium text-white"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="rounded-lg border border-[#E8E2DE] px-3 py-1 text-xs font-medium text-warm-dark hover:bg-[#E8E2DE]/50"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <p className="font-medium text-warm-dark text-sm">{cat.name}</p>
                        <p className="text-xs text-warm mt-0.5">
                          {cat.description || "Sin descripción"}
                        </p>
                      </div>
                      <button
                        onClick={() => startEdit(cat)}
                        className="rounded-lg border border-[#E8E2DE] px-3 py-1 text-xs font-medium text-warm-dark hover:bg-[#E8E2DE]/50 transition"
                      >
                        ✏️ Editar
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Categorías del usuario */}
      {userCategories.length > 0 && (
        <div className="card-glass p-5">
          <h2 className="text-lg font-semibold text-warm-dark mb-4">Mis categorías</h2>
          <div className="space-y-2">
            {userCategories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/30 px-3 py-2.5"
              >
                {editingId === cat.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-2 py-1 text-sm text-warm-dark outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
                    />
                    <input
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="Descripción"
                      className="flex-1 rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-2 py-1 text-sm text-warm-dark placeholder:text-warm outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
                    />
                    <button
                      onClick={() => update(cat.id)}
                      className="btn-orange rounded-lg px-3 py-1 text-xs font-medium text-white"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="rounded-lg border border-[#E8E2DE] px-3 py-1 text-xs font-medium text-warm-dark hover:bg-[#E8E2DE]/50"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <p className="font-medium text-warm-dark text-sm">{cat.name}</p>
                      <p className="text-xs text-warm mt-0.5">
                        {cat.description || "Sin descripción"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(cat)}
                        className="rounded-lg border border-[#E8E2DE] px-3 py-1 text-xs font-medium text-warm-dark hover:bg-[#E8E2DE]/50 transition"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => remove(cat.id)}
                        className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensaje cuando no hay categorías */}
      {!loading && list.length === 0 && (
        <div className="card-glass p-6 text-center">
          <p className="text-warm text-sm">No hay categorías para este tipo.</p>
        </div>
      )}
    </div>
  );
}
