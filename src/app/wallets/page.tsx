"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, AuthError } from "@/lib/api";
import { fetchMe } from "@/utils/session";
import type { Wallet, WalletType, Goal, User } from "@/types";
import AuthRequired from "@/components/AuthRequired";
import Modal from "@/components/Modal";
import { useLanguage } from "@/contexts/LanguageContext";

const currencies = ["COP","USD","EUR","MXN","ARS"];

export default function WalletsPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Wallet[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<WalletType>("GROUP");
  const [currency, setCur] = useState("COP");
  const [err, setErr] = useState<string>("");
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [filter, setFilter] = useState<"all" | "PERSONAL" | "GROUP">("all");
  const [expandedWallet, setExpandedWallet] = useState<string | null>(null);
  const [walletGoals, setWalletGoals] = useState<Record<string, Goal[]>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [walletToDelete, setWalletToDelete] = useState<Wallet | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [editWalletId, setEditWalletId] = useState<string | null>(null);
  const [editWalletName, setEditWalletName] = useState("");
  const [editWalletError, setEditWalletError] = useState("");

  const canCreate = useMemo(() => name.trim().length >= 3, [name]);

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter(w => w.type === filter);
  }, [items, filter]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await api<Wallet[]>("/wallets");
      setItems(data ?? []);
    } catch (e:any) { 
      if (e instanceof AuthError) {
        setErr("AUTH_REQUIRED");
      } else {
        setErr(e.message); 
      }
    }
    setLoading(false);
  }

  async function loadGoals(walletId: string) {
    try {
      const goals = await api<Goal[]>(`/goals/wallet/${walletId}`).catch(() => []);
      setWalletGoals(prev => ({ ...prev, [walletId]: goals }));
    } catch (e) {
      console.error("Error loading goals:", e);
    }
  }

  async function createWallet() {
    if (!canCreate) return;
    setErr("");
    try {
      const body = { name: name.trim(), type, currency };
      await api("/wallets", { method: "POST", body: JSON.stringify(body) });
      setName("");
      await load();
    } catch (e:any) { setErr(e.message); }
  }

  function openDeleteModal(wallet: Wallet) {
    setWalletToDelete(wallet);
    setDeleteConfirm(wallet.id);
  }

  async function handleDelete() {
    if (!walletToDelete) return;

    try {
      await api(`/wallets/${walletToDelete.id}`, { method: "DELETE" });
      setDeleteConfirm(null);
      setWalletToDelete(null);
      await load();
    } catch (e: any) {
      setErr(e.message || "Error al eliminar billetera");
      setDeleteConfirm(null);
      setWalletToDelete(null);
    }
  }

  function toggleExpanded(walletId: string) {
    if (expandedWallet === walletId) {
      setExpandedWallet(null);
    } else {
      setExpandedWallet(walletId);
      if (!walletGoals[walletId]) {
        loadGoals(walletId);
      }
    }
  }

  function copyInviteCode(code: string) {
    navigator.clipboard.writeText(code);
    alert(t("wallets.codeCopied"));
  }

  useEffect(() => { 
    load();
    (async () => {
      try {
        const me = await fetchMe();
        setCurrentUser(me);
      } catch {}
    })();
  }, []);

  const isOwner = (wallet: Wallet) => {
    if (!currentUser) return false;
    return wallet.createdBy?.id === currentUser.id || 
           wallet.members?.some(m => m.userId === currentUser.id && m.role === "OWNER");
  };

  async function handleJoin() {
    if (!joinCode.trim()) {
      setJoinError(t("wallets.pleaseEnterCode"));
      return;
    }

    setJoinError("");
    try {
      await api(`/wallets/join`, {
        method: "POST",
        body: JSON.stringify({ inviteCode: joinCode.trim().toUpperCase() }),
      });
      setJoinCode("");
      setShowJoinModal(false);
      await load();
    } catch (e: any) {
      setJoinError(e.message || t("wallets.errorJoining"));
    }
  }

  const fmt = (n: number, currency: string = "COP") => {
    return new Intl.NumberFormat(language === "es" ? "es-CO" : "en-US", { 
      style: "currency", 
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  };

  if (err === "AUTH_REQUIRED") {
    return <AuthRequired />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-white mb-1">{t("wallets.title")}</h1>
          <p className="text-white/80 text-sm">{t("wallets.subtitle")}</p>
        </div>
        <button
          onClick={() => setShowJoinModal(true)}
          className="group relative rounded-xl bg-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/60 hover:bg-cyan-600 transition-all duration-300 hover:scale-105 active:scale-95 w-full sm:w-auto animate-pulse hover:animate-none"
        >
          <span className="relative z-10 flex items-center gap-2">
            <span className="text-lg">✨</span>
            <span>+ {t("wallets.joinByCode")}</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">→</span>
          </span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 sm:gap-3 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-xl px-5 py-2.5 text-sm font-financial-bold transition-all duration-200 ${
            filter === "all"
              ? "btn-orange text-white shadow-lg shadow-[#C7366F]/30"
              : "border border-cyan-300/40 bg-white/60 text-white hover:bg-white/80 hover:border-cyan-300/60 hover:shadow-md"
          }`}
        >
          {t("wallets.all")}
        </button>
        <button
          onClick={() => setFilter("PERSONAL")}
          className={`rounded-xl px-5 py-2.5 text-sm font-financial-bold transition-all duration-200 ${
            filter === "PERSONAL"
              ? "btn-orange text-white shadow-lg shadow-[#C7366F]/30"
              : "border border-cyan-300/40 bg-white/60 text-white hover:bg-white/80 hover:border-cyan-300/60 hover:shadow-md"
          }`}
        >
          {t("wallets.personalPlural")}
        </button>
        <button
          onClick={() => setFilter("GROUP")}
          className={`rounded-xl px-5 py-2.5 text-sm font-financial-bold transition-all duration-200 ${
            filter === "GROUP"
              ? "btn-orange text-white shadow-lg shadow-[#C7366F]/30"
              : "border border-cyan-300/40 bg-white/60 text-white hover:bg-white/80 hover:border-cyan-300/60 hover:shadow-md"
          }`}
        >
          {t("wallets.sharedPlural")}
        </button>
      </div>

      {/* Crear */}
      <section className="card-glass p-5">
        <h2 className="text-lg font-semibold text-white mb-4">{t("wallets.createWallet")}</h2>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="text-xs text-white/80 font-medium mb-1.5 block">{t("wallets.walletName")}</label>
            <input
              value={name}
              onChange={(e)=>setName(e.target.value)}
              placeholder="Ej: Viaje a la costa"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/80 outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-300/50"
            />
          </div>

          <div>
            <label className="text-xs text-white/80 font-medium mb-1.5 block">{t("wallets.walletType")}</label>
            <select
              value={type}
              onChange={(e)=>setType(e.target.value as WalletType)}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-300/50"
            >
              <option value="PERSONAL">{t("wallets.personal")}</option>
              <option value="GROUP">{t("wallets.group")}</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-white/80 font-medium mb-1.5 block">{t("wallets.currency")}</label>
            <select
              value={currency}
              onChange={(e)=>setCur(e.target.value)}
              className="w-full px-3 py-2 text-sm text-white"
            >
              {currencies.map(c=> <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <button
            onClick={createWallet}
            disabled={!canCreate}
            className="btn-orange rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
          >
            {t("wallets.createWallet")}
          </button>
        </div>
        {!!err && <p className="mt-3 text-xs text-blue-300 font-medium">{err}</p>}
      </section>

      {/* Listado */}
      <section className="grid gap-3 sm:grid-cols-2">
        {loading && <CardSkeleton />}
        {!loading && filteredItems.length === 0 && (
          <div className="card-glass px-6 py-8 text-center">
            <p className="text-white/80 text-sm">{t("wallets.noWalletsFiltered")}</p>
          </div>
        )}
        {filteredItems.map(w => (
          <article key={w.id} className="card-glass p-4 hover:shadow-lg transition-all">
            <header className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-white mb-1">{w.name}</h3>
                <p className="text-xs text-white/80">
                  {w.type === "GROUP" ? t("wallets.shared") : t("wallets.personal")} • {w.currency}
                </p>
              </div>
              <div className="flex gap-2">
                {(isOwner(w) && (w.type === "GROUP" || (w.type === "PERSONAL" && !w.isDefault))) && (
                  <>
                    <button
                      onClick={() => {
                        setEditWalletId(w.id);
                        setEditWalletName(w.name);
                        setEditWalletError("");
                      }}
                      className="btn-edit"
                    >
                      ✏️ {t("common.edit")}
                    </button>
                    <button
                      onClick={() => openDeleteModal(w)}
                      className="btn-delete"
                    >
                      🗑️ {t("common.delete")}
                    </button>
                  </>
                )}
                <button
                  onClick={() => router.push(`/wallets/${w.id}`)}
                  className="group relative rounded-lg bg-blue-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40 hover:bg-blue-600 transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  <span className="relative z-10 flex items-center gap-1.5">
                    <span>Abrir billetera</span>
                    <span className="transform transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </span>
                </button>
              </div>
            </header>

            {/* Código de ingreso (solo para grupales) */}
            {w.type === "GROUP" && w.inviteCode && (
              <div className="mb-3 p-2 rounded-lg bg-white/10 border border-white/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/80 font-medium">{t("wallets.joinCode")}: </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-sm">{w.inviteCode}</span>
                    <button
                      onClick={() => copyInviteCode(w.inviteCode!)}
                      className="text-xs text-white/80 hover:text-white font-medium"
                    >
                      📋
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Botón para ver metas (solo para grupales) */}
            {w.type === "GROUP" && (
              <button
                onClick={() => toggleExpanded(w.id)}
                className="w-full rounded-lg border border-white/20 px-3 py-2 text-xs font-medium text-white hover:bg-[#E8E2DE]/50 transition flex items-center justify-between"
              >
                <span>Ver metas</span>
                <span>{expandedWallet === w.id ? "▲" : "▼"}</span>
              </button>
            )}

            {/* Metas desplegables */}
            {w.type === "GROUP" && expandedWallet === w.id && (
              <div className="mt-3 space-y-2">
                {walletGoals[w.id]?.length === 0 ? (
                  <p className="text-xs text-white/80 text-center py-2">No hay metas activas</p>
                ) : (
                  walletGoals[w.id]?.map((goal) => {
                    const current = Number(goal.currentAmount);
                    const target = Number(goal.targetAmount);
                    const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
                    return (
                      <div key={goal.id} className="p-2 rounded-lg bg-white/10 border border-white/20">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-white">{goal.name}</span>
                          <span className="text-xs text-white/80">{percentage.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#E8E2DE] overflow-hidden">
                          <div
                            className="h-full rounded-full gradient-orange"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-white/80 mt-1">
                          {fmt(current, w.currency)} / {fmt(target, w.currency)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </article>
        ))}
      </section>

      {/* Modal para unirse por código */}
      <Modal
        isOpen={showJoinModal}
        onClose={() => {
          setShowJoinModal(false);
          setJoinCode("");
          setJoinError("");
        }}
        title={t("wallets.joinWallet")}
        maxWidth="sm"
      >
        <p className="text-xs text-white/80 mb-4">
          {t("wallets.joinCodePlaceholder")}
        </p>
        <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-white mb-1.5">{t("wallets.joinCode")}</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABCD1234"
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/80 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-300/50 font-mono"
                  maxLength={8}
                />
              </div>
              {joinError && (
                <p className="text-xs text-blue-300 font-medium">{joinError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinCode("");
                    setJoinError("");
                  }}
                  className="flex-1 rounded-lg border border-white/20 px-3 py-2 text-xs font-medium text-white hover:bg-[#E8E2DE]/50 transition"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleJoin}
                  className="flex-1 btn-orange rounded-lg px-3 py-2 text-xs font-medium text-white"
                >
                  {t("wallets.joinWallet")}
                </button>
              </div>
        </div>
      </Modal>

      {/* Modal para editar nombre de billetera */}
      <Modal
        isOpen={!!editWalletId}
        onClose={() => {
          setEditWalletId(null);
          setEditWalletName("");
          setEditWalletError("");
        }}
        title="Editar nombre de billetera"
        maxWidth="sm"
      >
        <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-white mb-1.5">{t("wallets.newName")}</label>
                <input
                  type="text"
                  value={editWalletName}
                  onChange={(e) => setEditWalletName(e.target.value)}
                  placeholder={t("wallets.walletName")}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/80 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-300/50"
                />
              </div>
              {editWalletError && (
                <p className="text-xs text-blue-300 font-medium">{editWalletError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setEditWalletId(null);
                    setEditWalletName("");
                    setEditWalletError("");
                  }}
                  className="flex-1 rounded-lg border border-white/20 px-3 py-2 text-xs font-medium text-white hover:bg-[#E8E2DE]/50 transition"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={async () => {
                    if (!editWalletName.trim()) {
                      setEditWalletError(t("dashboard.nameRequired"));
                      return;
                    }
                    setEditWalletError("");
                    try {
                      await api(`/wallets/${editWalletId}/name`, {
                        method: "PATCH",
                        body: JSON.stringify({ name: editWalletName.trim() }),
                      });
                      setEditWalletId(null);
                      setEditWalletName("");
                      await load();
                    } catch (e: any) {
                      setEditWalletError(e.message || t("wallets.errorUpdatingName"));
                    }
                  }}
                  className="flex-1 btn-orange rounded-lg px-3 py-2 text-xs font-medium text-white"
                >
                  {t("common.save")}
                </button>
              </div>
        </div>
      </Modal>

      {/* Modal de confirmación para eliminar billetera */}
      <Modal
        isOpen={!!deleteConfirm && !!walletToDelete}
        onClose={() => {
          setDeleteConfirm(null);
          setWalletToDelete(null);
        }}
        title="¿Eliminar billetera?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50/30 px-4 py-3">
            <p className="text-sm text-white font-medium mb-2">
              ⚠️ Esta acción no se puede deshacer
            </p>
            <p className="text-xs text-white/80">
              Se eliminarán todas las transacciones, metas y datos asociados a esta billetera.
            </p>
          </div>
          
          {walletToDelete && (
            <div className="rounded-lg border border-white/20 bg-white/10 px-4 py-3">
              <p className="text-xs text-white mb-1">
                <strong>Billetera a eliminar:</strong>
              </p>
              <p className="text-sm font-semibold text-white">
                {walletToDelete.name}
              </p>
              <p className="text-xs text-white/80 mt-1">
                {walletToDelete.type === "GROUP" ? "Billetera grupal" : "Billetera personal"} • {walletToDelete.currency}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setDeleteConfirm(null);
                setWalletToDelete(null);
              }}
              className="flex-1 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-[#E8E2DE]/50 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              🗑️ Eliminar billetera
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="h-20 animate-pulse rounded-xl card-glass" />
  );
}
