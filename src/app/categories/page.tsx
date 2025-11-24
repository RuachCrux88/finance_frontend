"use client";

import { useEffect, useState } from "react";
import { api, AuthError } from "@/lib/api";
import type { Category, CategoryType } from "@/types";
import AuthRequired from "@/components/AuthRequired";
import { useLanguage } from "@/contexts/LanguageContext";
import { translateCategory } from "@/utils/categoryTranslations";

export default function CategoriesPage() {
  const { language, t } = useLanguage();
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
      setErr(t("categories.nameMinLength"));
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
    if (!confirm(t("transactions.confirmDeleteCategory"))) return;
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
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-white mb-1">{t("categories.title")}</h1>
        <p className="text-white/80 text-sm">{t("categories.subtitle")}</p>
      </div>

      {/* Filtro por tipo */}
      <div className="flex gap-2 sm:gap-3 flex-wrap">
        <button
          onClick={() => setType("EXPENSE")}
          className={`rounded-xl px-5 py-2.5 text-sm font-financial-bold transition-all duration-200 ${
            type === "EXPENSE"
              ? "btn-orange text-white shadow-lg shadow-cyan-500/30"
              : "border border-cyan-300/40 bg-white/60 text-white hover:bg-white/80 hover:border-cyan-300/60 hover:shadow-md"
          }`}
        >
          {t("categories.expenses")}
        </button>
        <button
          onClick={() => setType("INCOME")}
          className={`rounded-xl px-5 py-2.5 text-sm font-financial-bold transition-all duration-200 ${
            type === "INCOME"
              ? "btn-orange text-white shadow-lg shadow-cyan-500/30"
              : "border border-cyan-300/40 bg-white/60 text-white hover:bg-white/80 hover:border-cyan-300/60 hover:shadow-md"
          }`}
        >
          {t("categories.income")}
        </button>
      </div>

      {/* Crear nueva categoría */}
      <div className="card-glass p-5">
        <h2 className="text-lg font-semibold text-white mb-4">{t("categories.createCategory")}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs text-white/80 font-medium mb-1.5 block">{t("categories.name")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Compras online"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/80 outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-300/50"
            />
          </div>
          <div>
            <label className="text-xs text-white/80 font-medium mb-1.5 block">{t("categories.description")} ({t("common.optional")})</label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={t("categories.briefDescription")}
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/80 outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-300/50"
            />
          </div>
        </div>
        <button
          onClick={create}
          disabled={!name.trim() || name.trim().length < 2}
          className="mt-4 btn-orange rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
        >
          {t("categories.createCategory")}
        </button>
        {!!err && <p className="mt-3 text-xs text-blue-300 font-medium">{err}</p>}
      </div>

      {/* Categorías del sistema */}
      {systemCategories.length > 0 && (
        <div className="card-glass p-5">
          <h2 className="text-lg font-semibold text-white mb-4">
            {t("categories.predefinedCategories")} {type === "EXPENSE" ? `(${t("categories.expenses")})` : `(${t("categories.income")})`}
          </h2>
          {loading ? (
            <p className="text-white/80 text-sm">{t("common.loading")}</p>
          ) : (
            <div className="space-y-2">
              {systemCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between rounded-lg border border-white/20 bg-white/10 px-3 py-2.5"
                >
                  {editingId === cat.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        value={editName}
                        disabled
                        className="flex-1 rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-sm text-white outline-none disabled:opacity-50"
                      />
                      <input
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder={t("categories.description")}
                        className="flex-1 rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-sm text-white placeholder:text-white/80 outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-300/50"
                      />
                      <button
                        onClick={() => update(cat.id)}
                        className="btn-orange rounded-lg px-3 py-1 text-xs font-medium text-white"
                      >
                        {t("common.save")}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="rounded-lg border border-white/20 px-3 py-1 text-xs font-medium text-white hover:bg-[#E8E2DE]/50"
                      >
                        {t("common.cancel")}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        {(() => {
                          const translated = translateCategory(cat, language);
                          return (
                            <>
                              <p className="font-medium text-white text-sm">{translated.name}</p>
                              <p className="text-xs text-white/80 mt-0.5">
                                {translated.description || t("dashboard.noDescription")}
                              </p>
                            </>
                          );
                        })()}
                      </div>
                      <button
                        onClick={() => startEdit(cat)}
                        className="rounded-lg border border-white/20 px-3 py-1 text-xs font-medium text-white hover:bg-[#E8E2DE]/50 transition"
                      >
                        ✏️ {t("common.edit")}
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
          <h2 className="text-lg font-semibold text-white mb-4">{t("categories.userCategories")}</h2>
          <div className="space-y-2">
            {userCategories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between rounded-lg border border-white/20 bg-white/10 px-3 py-2.5"
              >
                {editingId === cat.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400/50"
                    />
                    <input
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder={t("categories.description")}
                      className="flex-1 rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-sm text-white placeholder:text-white/80 outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400/50"
                    />
                    <button
                      onClick={() => update(cat.id)}
                      className="btn-orange rounded-lg px-3 py-1 text-xs font-medium text-white"
                    >
                      {t("common.save")}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="rounded-lg border border-white/20 px-3 py-1 text-xs font-medium text-white hover:bg-[#E8E2DE]/50"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <p className="font-medium text-white text-sm">{cat.name}</p>
                      <p className="text-xs text-white/80 mt-0.5">
                        {cat.description || t("dashboard.noDescription")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(cat)}
                        className="btn-edit"
                      >
                        ✏️ {t("common.edit")}
                      </button>
                      <button
                        onClick={() => remove(cat.id)}
                        className="btn-delete"
                      >
                        🗑️ {t("common.delete")}
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
          <p className="text-white/80 text-sm">{t("categories.noCategories")}</p>
        </div>
      )}
    </div>
  );
}
