"use client";

import { useEffect, useMemo, useState } from "react";
import { api, AuthError } from "@/lib/api";
import { fetchMe } from "@/utils/session";
import type { Wallet, Category, CategoryType, Transaction } from "@/types";
import Modal from "@/components/Modal";
import { useLanguage } from "@/contexts/LanguageContext";
import { translateCategory } from "@/utils/categoryTranslations";

// Helpers - esta función se actualizará para usar el idioma del contexto

function toNum(x: string | number | null | undefined) {
  if (typeof x === "number") return x;
  if (!x) return 0;
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

export default function TransactionsPage() {
  const { language, t } = useLanguage();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [cats, setCats]       = useState<Category[]>([]);
  const [type, setType]       = useState<CategoryType>("EXPENSE");
  const [walletId, setWid]    = useState<string>("");
  const [catId, setCat]       = useState<string>("");
  const [amount, setAmt]      = useState<string>("");
  const [desc, setDesc]       = useState("");
  const [feed, setFeed]       = useState<Transaction[]>([]);
  const [err, setErr]         = useState("");
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newCatError, setNewCatError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Detectar si la billetera seleccionada es grupal
  const selectedWallet = wallets.find(w => w.id === walletId);
  const isGroupWallet = selectedWallet?.type === "GROUP";

  // Helper para formatear moneda con el idioma correcto
  const fmt = (n: number, currency: string) => {
    return new Intl.NumberFormat(language === "es" ? "es-CO" : "en-US", { 
      style: "currency", 
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  };

  // Verificar autenticación
  useEffect(() => {
    fetchMe()
      .then(() => setIsAuthenticated(true))
      .catch(() => setIsAuthenticated(false));
  }, []);

  // cargar combos
  useEffect(() => {
    (async () => {
      try {
        const ws = await api<Wallet[]>("/wallets");
        setWallets(ws);
        if (ws[0]) setWid(ws[0].id);
        setIsAuthenticated(true);
      } catch (e:any) { 
        if (e instanceof AuthError) {
          setIsAuthenticated(false);
        } else {
          setErr(e.message); 
        }
      }
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

  // Si se selecciona una billetera grupal, forzar tipo a INCOME
  useEffect(() => {
    if (isGroupWallet && type !== "INCOME") {
      setType("INCOME");
    }
  }, [walletId, isGroupWallet]);

  async function submit() {
    setErr("");
    try {
      // Para billeteras grupales, siempre usar INCOME
      const transactionType = isGroupWallet ? "INCOME" : type;
      
      // Necesitamos el userId del usuario actual - lo obtenemos del backend
      const me = await api<{id: string}>("/auth/me");
      
      await api("/transactions", {
        method: "POST",
        body: JSON.stringify({
          walletId,
          categoryId: catId,
          type: transactionType,
          amount: Number(amount),
          paidByUserId: me.id,
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
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-warm-dark mb-1 font-financial-bold">{t("transactions.title")}</h1>
        <p className="text-warm text-sm font-financial">{t("transactions.subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Registrar */}
        <section className="card-glass p-5">
          <h2 className="mb-4 text-lg font-semibold text-warm-dark font-financial-bold">{t("transactions.register")}</h2>

          <div className="grid gap-3">
            <div>
              <label className="text-xs text-warm font-medium mb-1.5 block">{t("transactions.wallet")}</label>
              <select
                value={walletId}
                onChange={(e)=>setWid(e.target.value)}
                className="w-full rounded-lg border border-[#FFB6C1]/30 bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark outline-none focus:ring-2 focus:ring-[#FF8C94]/30 focus:border-[#FF8C94]/50"
              >
                {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-warm font-medium mb-1.5 block">{t("transactions.type")}</label>
                {isGroupWallet ? (
                  <div className="mt-1">
                    <div className="rounded-lg bg-gradient-to-r from-[#FFD3A0]/30 to-[#FE8625]/20 border border-[#FE8625]/30 px-3 py-2 text-xs font-medium text-warm-dark">
                      {t("transactions.contribution")}
                    </div>
                    <input type="hidden" value="INCOME" />
                  </div>
                ) : (
                  <select
                    value={type}
                    onChange={(e)=>setType(e.target.value as CategoryType)}
                    className="w-full rounded-lg border border-[#FFB6C1]/30 bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark outline-none focus:ring-2 focus:ring-[#FF8C94]/30 focus:border-[#FF8C94]/50"
                  >
                    <option value="EXPENSE">{t("transactions.expense")}</option>
                    <option value="INCOME">{t("transactions.income")}</option>
                  </select>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-warm font-medium block">{t("transactions.category")}</label>
                  <button
                    onClick={() => {
                      setNewCatName("");
                      setNewCatDesc("");
                      setNewCatError("");
                      setShowAddCategoryModal(true);
                    }}
                    disabled={!isAuthenticated}
                    className={`text-xs font-medium ${!isAuthenticated ? "opacity-50 cursor-not-allowed text-warm" : "text-[#FE8625] hover:text-[#FE8625]/80"}`}
                  >
                    + {t("transactions.addCategory")}
                  </button>
                </div>
                <select
                  value={catId}
                  onChange={(e)=>setCat(e.target.value)}
                  className="w-full rounded-lg border border-[#FFB6C1]/30 bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark outline-none focus:ring-2 focus:ring-[#FF8C94]/30 focus:border-[#FF8C94]/50"
                >
                  {cats.map(c => {
                    const translated = translateCategory(c, language);
                    return <option key={c.id} value={c.id}>{translated.name}</option>;
                  })}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-warm font-medium mb-1.5 block">{t("transactions.amount")}</label>
              <input
                type="number" step="0.01" min="0"
                value={amount}
                onChange={(e)=>setAmt(e.target.value)}
                className="w-full rounded-lg border border-[#FFB6C1]/30 bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark outline-none focus:ring-2 focus:ring-[#FF8C94]/30 focus:border-[#FF8C94]/50"
              />
            </div>

            <div>
              <label className="text-xs text-warm font-medium mb-1.5 block">{t("transactions.description")} ({t("common.optional")})</label>
              <input
                value={desc}
                onChange={(e)=>setDesc(e.target.value)}
                placeholder="Ej: Mercado, Netflix..."
                className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
              />
            </div>

            <button
              onClick={submit}
              disabled={!ready || !isAuthenticated}
              className="mt-1 btn-orange rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none disabled:cursor-not-allowed"
            >
              {t("transactions.register")}
            </button>

            {!!err && <p className="text-xs text-rose-600 font-medium mt-2">{err}</p>}
          </div>
        </section>

        {/* Actividad */}
        <section className="card-glass p-5">
          <h2 className="mb-4 text-lg font-semibold text-warm-dark">{t("transactions.activity")}</h2>
          <ul className="space-y-2">
            {feed.length === 0 && (
              <li className="text-warm text-sm">{t("transactions.noTransactions")}</li>
            )}
            {feed.map(tx => (
              <li key={tx.id}
                  className="flex items-center justify-between rounded-lg border border-[#FFB6C1]/30 bg-[#FEFFFF]/30 px-3 py-2.5">
                <div className="text-xs">
                  <p className="font-medium text-warm-dark">{tx.description || `(${t("dashboard.noDescription")})`}</p>
                  <p className="text-warm mt-0.5">
                    {tx.type === "EXPENSE" ? t("transactions.expense") : tx.type === "INCOME" ? t("transactions.income") : "Liquidación"} • {new Date(tx.date).toLocaleDateString(language === "es" ? "es-CO" : "en-US")}
                  </p>
                </div>
                <div className={`font-semibold text-sm ${tx.type==="EXPENSE"?"text-rose-600":"text-emerald-600"}`}>
                  {tx.type==="EXPENSE"?"-":"+"}{fmt(toNum(tx.amount), selectedWallet?.currency || "COP")}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Modal para añadir categoría */}
      <Modal
        isOpen={showAddCategoryModal}
        onClose={() => {
          setShowAddCategoryModal(false);
          setNewCatName("");
          setNewCatDesc("");
          setNewCatError("");
        }}
        title={t("transactions.addCategoryModal")}
      >
        <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">{t("transactions.type")}</label>
                <select
                  value={type}
                  onChange={(e) => {
                    const newType = e.target.value as "INCOME" | "EXPENSE";
                    setType(newType);
                    // Recargar categorías del nuevo tipo
                    (async () => {
                      try {
                        const list = await api<Category[]>(`/categories?type=${newType}`);
                        setCats(list ?? []);
                      } catch {}
                    })();
                  }}
                  className="w-full rounded-lg border border-[#FFB6C1]/30 bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark outline-none focus:ring-2 focus:ring-[#FF8C94]/30 focus:border-[#FF8C94]/50"
                >
                  <option value="EXPENSE">{t("transactions.expense")}</option>
                  <option value="INCOME">{t("transactions.income")}</option>
                </select>
                <p className="text-xs text-warm mt-1">
                  {type === "EXPENSE" 
                    ? t("transactions.forPersonalExpenses")
                    : isGroupWallet
                      ? t("transactions.forGroupContributions")
                      : t("transactions.forPersonalIncome")}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">{t("categories.name")}</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Ej: Alquiler"
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">{t("transactions.categoryDescription")} ({t("common.optional")})</label>
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Ej: Pagos mensuales de vivienda"
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
                />
              </div>
              {newCatError && (
                <p className="text-xs text-rose-600 font-medium">{newCatError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setShowAddCategoryModal(false);
                    setNewCatName("");
                    setNewCatDesc("");
                    setNewCatError("");
                  }}
                  className="flex-1 rounded-lg border border-[#FFB6C1]/30 px-3 py-2 text-xs font-medium text-warm-dark hover:bg-[#FFB6C1]/20 transition"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={async () => {
                    if (!newCatName.trim()) {
                      setNewCatError(t("dashboard.nameRequired"));
                      return;
                    }
                    setNewCatError("");
                    try {
                      await api("/categories", {
                        method: "POST",
                        body: JSON.stringify({
                          name: newCatName.trim(),
                          type: type,
                          description: newCatDesc || undefined,
                        }),
                      });
                      setNewCatName("");
                      setNewCatDesc("");
                      setShowAddCategoryModal(false);
                      // Recargar categorías
                      const list = await api<Category[]>(`/categories?type=${type}`);
                      setCats(list ?? []);
                      if (list && list.length > 0) {
                        setCat(list[list.length - 1].id); // Seleccionar la nueva categoría
                      }
                    } catch (e: any) {
                      setNewCatError(e.message || t("categories.errorCreating"));
                    }
                  }}
                  disabled={!isAuthenticated}
                  className={`flex-1 btn-orange rounded-lg px-3 py-2 text-xs font-medium text-white ${!isAuthenticated ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {t("categories.createCategory")}
                </button>
              </div>
        </div>
      </Modal>
    </div>
  );
}
