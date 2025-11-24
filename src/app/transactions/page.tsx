"use client";

import { useEffect, useMemo, useState } from "react";
import { api, AuthError } from "@/lib/api";
import { fetchMe } from "@/utils/session";
import type { Wallet, Category, CategoryType, Transaction, Goal } from "@/types";
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
  const [goals, setGoals]     = useState<Goal[]>([]);
  const [type, setType]       = useState<CategoryType>("EXPENSE");
  const [walletId, setWid]    = useState<string>("");
  const [catId, setCat]       = useState<string>("");
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [isGoalContribution, setIsGoalContribution] = useState(false);
  const [isPersonTransfer, setIsPersonTransfer] = useState(false);
  const [recipientUserCode, setRecipientUserCode] = useState<string>("");
  const [recipientUser, setRecipientUser] = useState<any>(null);
  const [amount, setAmt]      = useState<string>("");
  const [desc, setDesc]       = useState("");
  const [transactionCurrency, setTransactionCurrency] = useState<string>("COP");
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
      // Solo cargar categorías si NO es un aporte a meta
      if (!isGoalContribution) {
        try {
          const list = await api<Category[]>(`/categories?type=${type}`);
          setCats(list ?? []);
          setCat(list?.[0]?.id ?? "");
        } catch (e:any) { setErr(e.message); }
      }
    })();
  }, [type, isGoalContribution]);

  // Cargar metas cuando se selecciona una billetera
  useEffect(() => {
    (async () => {
      if (!walletId) {
        setGoals([]);
        return;
      }
      try {
        // Cargar metas de la billetera si es grupal
        if (isGroupWallet) {
          const walletGoals = await api<Goal[]>(`/goals/wallet/${walletId}`);
          setGoals(walletGoals || []);
        } else {
          // Para billeteras personales, cargar metas del usuario
          const userGoals = await api<Goal[]>(`/goals/user`);
          setGoals(userGoals || []);
        }
      } catch (e: any) {
        setGoals([]);
      }
    })();
  }, [walletId, isGroupWallet]);

  // Para billeteras grupales, siempre usar aporte a meta
  useEffect(() => {
    if (isGroupWallet) {
      setIsGoalContribution(true);
      setType("EXPENSE");
    } else {
      setIsGoalContribution(false);
    }
    setSelectedGoalId("");
    
    // Actualizar moneda de transacción cuando cambia la billetera
    if (selectedWallet?.currency) {
      setTransactionCurrency(selectedWallet.currency);
    }
  }, [walletId, isGroupWallet, selectedWallet]);

  // Resetear selección de meta cuando cambia el tipo (solo para billeteras personales)
  useEffect(() => {
    if (!isGroupWallet) {
      setSelectedGoalId("");
      setIsGoalContribution(false);
      setIsPersonTransfer(false);
      setRecipientUserCode("");
      setRecipientUser(null);
    }
  }, [type, isGroupWallet]);

  async function submit() {
    setErr("");
    try {
      // Si es un aporte a meta, usar EXPENSE con descripción especial
      let transactionType: CategoryType = type;
      let description = desc || null;
      let categoryId = catId || null;
      
      if (isGoalContribution && selectedGoalId) {
        const selectedGoal = goals.find(g => g.id === selectedGoalId);
        if (selectedGoal) {
          transactionType = "EXPENSE";
          description = `Aporte a meta: ${selectedGoal.name}`;
          categoryId = null; // No requiere categoría
        } else {
          setErr("Meta seleccionada no encontrada");
          return;
        }
      }
      
      // Si es transferencia a persona, usar endpoint especial
      if (isPersonTransfer) {
        if (!recipientUserCode || recipientUserCode.length !== 10) {
          setErr("Debes ingresar un ID de usuario válido de 10 caracteres");
          return;
        }
        if (!recipientUser) {
          setErr("Usuario no encontrado. Verifica el ID ingresado");
          return;
        }
        
        await api("/transactions/transfer", {
          method: "POST",
          body: JSON.stringify({
            recipientUserCode: recipientUserCode,
            amount: Number(amount),
            description: desc || undefined,
          }),
        });
        
        setAmt(""); 
        setDesc("");
        setRecipientUserCode("");
        setRecipientUser(null);
        setIsPersonTransfer(false);
        await refreshFeed();
        return;
      }
      
      // Para billeteras grupales, siempre es aporte a meta (EXPENSE)
      if (isGroupWallet) {
        if (!isGoalContribution || !selectedGoalId) {
          setErr("Debes seleccionar una meta para hacer el aporte");
          return;
        }
      }
      
      // Necesitamos el userId del usuario actual - lo obtenemos del backend
      const me = await api<{id: string}>("/auth/me");
      
      await api("/transactions", {
        method: "POST",
        body: JSON.stringify({
          walletId,
          categoryId: categoryId,
          type: transactionType,
          amount: Number(amount),
          paidByUserId: me.id,
          description: description,
        }),
      });
      setAmt(""); 
      setDesc("");
      setSelectedGoalId("");
      setIsGoalContribution(false);
      setIsPersonTransfer(false);
      setRecipientUserCode("");
      setRecipientUser(null);
      // Resetear moneda a la de la billetera después de crear la transacción
      if (selectedWallet?.currency) {
        setTransactionCurrency(selectedWallet.currency);
      }
      await refreshFeed();
    } catch (e:any) { setErr(e.message); }
  }

  async function refreshFeed() {
    if (!walletId) return;
    const list = await api<Transaction[]>(`/transactions?walletId=${walletId}`);
    setFeed(list ?? []);
  }

  useEffect(()=>{ refreshFeed(); }, [walletId]);

  const ready = useMemo(() => {
    if (!walletId || Number(amount) <= 0) return false;
    // Si es transferencia a persona, requiere código de usuario válido y usuario encontrado
    if (isPersonTransfer) {
      return recipientUserCode.length === 10 && !!recipientUser;
    }
    // Si es aporte a meta, requiere meta seleccionada
    if (isGoalContribution) {
      return !!selectedGoalId;
    }
    // Si no es aporte a meta ni transferencia, requiere categoría
    return !!catId;
  }, [walletId, catId, selectedGoalId, amount, isGoalContribution, isPersonTransfer, recipientUserCode, recipientUser]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-white mb-1 font-financial-bold">{t("transactions.title")}</h1>
        <p className="text-warm text-sm font-financial">{t("transactions.subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Registrar */}
        <section className="card-glass p-5">
          <h2 className="mb-4 text-lg font-semibold text-white font-financial-bold">{t("transactions.register")}</h2>

          <div className="grid gap-3">
            <div>
              <label className="text-xs text-warm font-medium mb-1.5 block">{t("transactions.wallet")}</label>
              <select
                value={walletId}
                onChange={(e)=>setWid(e.target.value)}
                className="w-full px-3 py-2 text-sm text-white"
              >
                {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            <div className={`grid gap-3 ${isGroupWallet ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
              {!isGroupWallet && (
                <div>
                  <label className="text-xs text-warm font-medium mb-1.5 block">{t("transactions.type")}</label>
                  <select
                    value={type}
                    onChange={(e) => {
                      const newType = e.target.value as CategoryType;
                      setType(newType);
                      setIsGoalContribution(false);
                    }}
                    className="w-full px-3 py-2 text-sm text-white"
                  >
                    <option value="EXPENSE">{t("transactions.expense")}</option>
                    <option value="INCOME">{t("transactions.income")}</option>
                  </select>
                </div>
              )}

              <div>
                {isGroupWallet ? (
                  // Para billeteras grupales, solo mostrar selección de metas
                  <div>
                    <label className="text-xs text-warm font-medium mb-1.5 block">Meta de ahorro</label>
                    <select
                      value={selectedGoalId}
                      onChange={(e) => setSelectedGoalId(e.target.value)}
                      className="w-full px-3 py-2 text-sm text-white"
                    >
                      <option value="">Selecciona una meta</option>
                      {goals.filter(g => g.status === "ACTIVE" || g.status === "PAUSED").map(goal => (
                        <option key={goal.id} value={goal.id}>
                          {goal.name} ({Math.round((Number(goal.currentAmount) / Number(goal.targetAmount)) * 100)}%)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  // Para billeteras personales, mostrar categorías o metas según corresponda
                  <>
                    {isGoalContribution || isPersonTransfer || type === "EXPENSE" ? (
                      <>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs text-warm font-medium block">
                            {isGoalContribution ? "Meta de ahorro" : isPersonTransfer ? "Transferir a persona" : t("transactions.category")}
                          </label>
                          {!isGoalContribution && !isPersonTransfer && (
                            <button
                              onClick={() => {
                                setNewCatName("");
                                setNewCatDesc("");
                                setNewCatError("");
                                setShowAddCategoryModal(true);
                              }}
                              disabled={!isAuthenticated}
                              className={`text-xs font-medium ${!isAuthenticated ? "opacity-50 cursor-not-allowed text-warm" : "text-cyan-300 hover:text-cyan-200"}`}
                            >
                              + {t("transactions.addCategory")}
                            </button>
                          )}
                        </div>
                        {isGoalContribution ? (
                          <div className="space-y-2">
                            <select
                              value={selectedGoalId}
                              onChange={(e) => setSelectedGoalId(e.target.value)}
                              className="w-full px-3 py-2 text-sm text-white"
                            >
                              <option value="">Selecciona una meta</option>
                              {goals.filter(g => g.status === "ACTIVE" || g.status === "PAUSED").map(goal => (
                                <option key={goal.id} value={goal.id}>
                                  {goal.name} ({Math.round((Number(goal.currentAmount) / Number(goal.targetAmount)) * 100)}%)
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                setIsGoalContribution(false);
                                setSelectedGoalId("");
                              }}
                              className="text-xs text-warm hover:text-white"
                            >
                              ← Usar categoría en su lugar
                            </button>
                          </div>
                        ) : isPersonTransfer ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={recipientUserCode}
                              onChange={async (e) => {
                                const code = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                                setRecipientUserCode(code);
                                if (code.length === 10) {
                                  try {
                                    const user = await api(`/auth/user/${code}`);
                                    setRecipientUser(user);
                                    setErr("");
                                  } catch (e: any) {
                                    setRecipientUser(null);
                                    setErr(e.message || "Usuario no encontrado");
                                  }
                                } else {
                                  setRecipientUser(null);
                                  setErr("");
                                }
                              }}
                              placeholder="Ingresa el ID de 10 caracteres"
                              className="w-full px-3 py-2 text-sm text-white font-mono"
                            />
                            {recipientUser && (
                              <div className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 backdrop-blur-sm">
                                <p className="text-xs text-white font-medium">
                                  {recipientUser.name || recipientUser.email}
                                </p>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setIsPersonTransfer(false);
                                setRecipientUserCode("");
                                setRecipientUser(null);
                              }}
                              className="text-xs text-warm hover:text-white"
                            >
                              ← Usar categoría en su lugar
                            </button>
                          </div>
                        ) : (
                          <select
                            value={catId}
                            onChange={(e) => setCat(e.target.value)}
                            className="w-full px-3 py-2 text-sm text-white"
                          >
                            {cats.map(c => {
                              const translated = translateCategory(c, language);
                              return <option key={c.id} value={c.id}>{translated.name}</option>;
                            })}
                          </select>
                        )}
                        {!isGoalContribution && type === "EXPENSE" && (
                          <div className="mt-2 space-y-1">
                            {goals.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsGoalContribution(true);
                                  setIsPersonTransfer(false);
                                  setCat("");
                                  setRecipientUserCode("");
                                  setRecipientUser(null);
                                }}
                                className="text-xs text-cyan-300 hover:text-cyan-200 font-medium block"
                              >
                                💰 Aportar a una meta en su lugar
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setIsPersonTransfer(true);
                                setIsGoalContribution(false);
                                setCat("");
                                setSelectedGoalId("");
                              }}
                              className="text-xs text-blue-600 hover:text-white font-medium block"
                            >
                              👤 Transferir a otra persona
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
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
                            className={`text-xs font-medium ${!isAuthenticated ? "opacity-50 cursor-not-allowed text-warm" : "text-cyan-300 hover:text-cyan-200"}`}
                          >
                            + {t("transactions.addCategory")}
                          </button>
                        </div>
                        <select
                          value={catId}
                          onChange={(e) => setCat(e.target.value)}
                          className="w-full px-3 py-2 text-sm text-white"
                        >
                          {cats.map(c => {
                            const translated = translateCategory(c, language);
                            return <option key={c.id} value={c.id}>{translated.name}</option>;
                          })}
                        </select>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs text-warm font-medium mb-1.5 block">{t("transactions.amount")}</label>
                <input
                  type="number" step="0.01" min="0"
                  value={amount}
                  onChange={(e)=>setAmt(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs text-warm font-medium mb-1.5 block">Divisa</label>
                <select
                  value={transactionCurrency}
                  onChange={(e) => setTransactionCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-white"
                >
                  <option value="COP">COP</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="MXN">MXN</option>
                  <option value="ARS">ARS</option>
                </select>
              </div>
            </div>
            
            {transactionCurrency !== selectedWallet?.currency && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/30 px-3 py-2">
                <p className="text-xs text-white">
                  <strong>Nota:</strong> La transacción se registrará en {transactionCurrency}, pero la billetera usa {selectedWallet?.currency || "COP"}. 
                  El monto se mostrará según la moneda de la billetera.
                </p>
              </div>
            )}

            <div>
              <label className="text-xs text-warm font-medium mb-1.5 block">{t("transactions.description")} ({t("common.optional")})</label>
              <input
                value={desc}
                onChange={(e)=>setDesc(e.target.value)}
                placeholder="Ej: Mercado, Netflix..."
                className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-white placeholder:text-warm outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400/50"
              />
            </div>

            <button
              onClick={submit}
              disabled={!ready || !isAuthenticated}
              className="mt-1 btn-orange rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none disabled:cursor-not-allowed"
            >
              {t("transactions.register")}
            </button>

            {!!err && <p className="text-xs text-blue-300 font-medium mt-2">{err}</p>}
          </div>
        </section>

        {/* Actividad */}
        <section className="card-glass p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">{t("transactions.activity")}</h2>
          <ul className="space-y-2">
            {feed.length === 0 && (
              <li className="text-warm text-sm">{t("transactions.noTransactions")}</li>
            )}
            {feed.map(tx => (
              <li key={tx.id}
                  className="flex items-center justify-between rounded-lg border border-white/20 bg-white/10 px-3 py-2.5">
                <div className="text-xs">
                  <p className="font-medium text-white">{tx.description || `(${t("dashboard.noDescription")})`}</p>
                  <p className="text-white/80 mt-0.5">
                    {tx.type === "EXPENSE" ? t("transactions.expense") : tx.type === "INCOME" ? t("transactions.income") : "Liquidación"} • {new Date(tx.date).toLocaleDateString(language === "es" ? "es-CO" : "en-US")}
                  </p>
                </div>
                <div className={`font-semibold text-sm ${tx.type==="EXPENSE"?"text-blue-300":"text-cyan-300"}`}>
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
                <label className="block text-xs font-medium text-white mb-1.5">{t("transactions.type")}</label>
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
                  className="w-full px-3 py-2 text-sm text-white"
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
                <label className="block text-xs font-medium text-white mb-1.5">{t("categories.name")}</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Ej: Alquiler"
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-white placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white mb-1.5">{t("transactions.categoryDescription")} ({t("common.optional")})</label>
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Ej: Pagos mensuales de vivienda"
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-white placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400/50"
                />
              </div>
              {newCatError && (
                <p className="text-xs text-blue-300 font-medium">{newCatError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setShowAddCategoryModal(false);
                    setNewCatName("");
                    setNewCatDesc("");
                    setNewCatError("");
                  }}
                  className="flex-1 rounded-lg border border-[#FFB6C1]/30 px-3 py-2 text-xs font-medium text-white hover:bg-[#FFB6C1]/20 transition"
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
