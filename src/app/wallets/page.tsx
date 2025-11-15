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

  async function handleDelete(walletId: string) {
    if (deleteConfirm !== walletId) {
      setDeleteConfirm(walletId);
      return;
    }

    try {
      await api(`/wallets/${walletId}`, { method: "DELETE" });
      setDeleteConfirm(null);
      await load();
    } catch (e: any) {
      setErr(e.message || "Error al eliminar billetera");
      setDeleteConfirm(null);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-warm-dark mb-1">{t("wallets.title")}</h1>
          <p className="text-warm text-sm">{t("wallets.subtitle")}</p>
        </div>
        <button
          onClick={() => setShowJoinModal(true)}
          className="rounded-lg border border-[#E8E2DE] px-4 py-2 text-sm font-medium text-warm-dark hover:bg-[#E8E2DE]/50 transition"
        >
          + {t("wallets.joinByCode")}
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-xl px-5 py-2.5 text-sm font-financial-bold transition-all duration-200 ${
            filter === "all"
              ? "btn-orange text-white shadow-lg shadow-[#C7366F]/30"
              : "border border-[#DA70D6]/40 bg-white/60 text-warm-dark hover:bg-white/80 hover:border-[#DA70D6]/60 hover:shadow-md"
          }`}
        >
          {t("wallets.all")}
        </button>
        <button
          onClick={() => setFilter("PERSONAL")}
          className={`rounded-xl px-5 py-2.5 text-sm font-financial-bold transition-all duration-200 ${
            filter === "PERSONAL"
              ? "btn-orange text-white shadow-lg shadow-[#C7366F]/30"
              : "border border-[#DA70D6]/40 bg-white/60 text-warm-dark hover:bg-white/80 hover:border-[#DA70D6]/60 hover:shadow-md"
          }`}
        >
          {t("wallets.personalPlural")}
        </button>
        <button
          onClick={() => setFilter("GROUP")}
          className={`rounded-xl px-5 py-2.5 text-sm font-financial-bold transition-all duration-200 ${
            filter === "GROUP"
              ? "btn-orange text-white shadow-lg shadow-[#C7366F]/30"
              : "border border-[#DA70D6]/40 bg-white/60 text-warm-dark hover:bg-white/80 hover:border-[#DA70D6]/60 hover:shadow-md"
          }`}
        >
          {t("wallets.sharedPlural")}
        </button>
      </div>

      {/* Crear */}
      <section className="card-glass p-5">
        <h2 className="text-lg font-semibold text-warm-dark mb-4">{t("wallets.createWallet")}</h2>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="text-xs text-warm font-medium mb-1.5 block">{t("wallets.walletName")}</label>
            <input
              value={name}
              onChange={(e)=>setName(e.target.value)}
              placeholder="Ej: Viaje a la costa"
              className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm outline-none focus:ring-2 focus:ring-[#DA70D6]/30 focus:border-[#DA70D6]/50"
            />
          </div>

          <div>
            <label className="text-xs text-warm font-medium mb-1.5 block">{t("wallets.walletType")}</label>
            <select
              value={type}
              onChange={(e)=>setType(e.target.value as WalletType)}
              className="rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark outline-none focus:ring-2 focus:ring-[#DA70D6]/30 focus:border-[#DA70D6]/50"
            >
              <option value="PERSONAL">{t("wallets.personal")}</option>
              <option value="GROUP">{t("wallets.group")}</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-warm font-medium mb-1.5 block">{t("wallets.currency")}</label>
            <select
              value={currency}
              onChange={(e)=>setCur(e.target.value)}
              className="rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark outline-none focus:ring-2 focus:ring-[#DA70D6]/30 focus:border-[#DA70D6]/50"
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
        {!!err && <p className="mt-3 text-xs text-rose-600 font-medium">{err}</p>}
      </section>

      {/* Listado */}
      <section className="grid gap-3 sm:grid-cols-2">
        {loading && <CardSkeleton />}
        {!loading && filteredItems.length === 0 && (
          <div className="card-glass px-6 py-8 text-center">
            <p className="text-warm text-sm">{t("wallets.noWalletsFiltered")}</p>
          </div>
        )}
        {filteredItems.map(w => (
          <article key={w.id} className="card-glass p-4 hover:shadow-lg transition-all">
            <header className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-warm-dark mb-1">{w.name}</h3>
                <p className="text-xs text-warm">
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
                      onClick={() => handleDelete(w.id)}
                      className={`btn-delete ${
                        deleteConfirm === w.id
                          ? "bg-rose-500 text-white border-rose-500 hover:bg-rose-600"
                          : ""
                      }`}
                    >
                      {deleteConfirm === w.id ? "✓ " + t("wallets.confirm") : "🗑️ " + t("common.delete")}
                    </button>
                  </>
                )}
                <button
                  onClick={() => router.push(`/wallets/${w.id}`)}
                  className="rounded-lg border border-[#E8E2DE] px-3 py-1.5 text-xs font-medium text-warm-dark hover:bg-[#E8E2DE]/50 transition"
                >
                  {t("wallets.view")} →
                </button>
              </div>
            </header>

            {/* Código de ingreso (solo para grupales) */}
            {w.type === "GROUP" && w.inviteCode && (
              <div className="mb-3 p-2 rounded-lg bg-[#FEFFFF]/50 border border-[#E8E2DE]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-warm font-medium">{t("wallets.joinCode")}: </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-warm-dark text-sm">{w.inviteCode}</span>
                    <button
                      onClick={() => copyInviteCode(w.inviteCode!)}
                      className="text-xs text-warm hover:text-warm-dark font-medium"
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
                className="w-full rounded-lg border border-[#E8E2DE] px-3 py-2 text-xs font-medium text-warm-dark hover:bg-[#E8E2DE]/50 transition flex items-center justify-between"
              >
                <span>Ver metas</span>
                <span>{expandedWallet === w.id ? "▲" : "▼"}</span>
              </button>
            )}

            {/* Metas desplegables */}
            {w.type === "GROUP" && expandedWallet === w.id && (
              <div className="mt-3 space-y-2">
                {walletGoals[w.id]?.length === 0 ? (
                  <p className="text-xs text-warm text-center py-2">No hay metas activas</p>
                ) : (
                  walletGoals[w.id]?.map((goal) => {
                    const current = Number(goal.currentAmount);
                    const target = Number(goal.targetAmount);
                    const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
                    return (
                      <div key={goal.id} className="p-2 rounded-lg bg-[#FEFFFF]/30 border border-[#E8E2DE]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-warm-dark">{goal.name}</span>
                          <span className="text-xs text-warm">{percentage.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#E8E2DE] overflow-hidden">
                          <div
                            className="h-full rounded-full gradient-orange"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-warm mt-1">
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
        <p className="text-xs text-warm mb-4">
          {t("wallets.joinCodePlaceholder")}
        </p>
        <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">{t("wallets.joinCode")}</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABCD1234"
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#DA70D6]/30 focus:border-[#DA70D6]/50 font-mono"
                  maxLength={8}
                />
              </div>
              {joinError && (
                <p className="text-xs text-rose-600 font-medium">{joinError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinCode("");
                    setJoinError("");
                  }}
                  className="flex-1 rounded-lg border border-[#E8E2DE] px-3 py-2 text-xs font-medium text-warm-dark hover:bg-[#E8E2DE]/50 transition"
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
        title={t("wallets.editName")}
        maxWidth="sm"
      >
        <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">{t("wallets.newName")}</label>
                <input
                  type="text"
                  value={editWalletName}
                  onChange={(e) => setEditWalletName(e.target.value)}
                  placeholder={t("wallets.walletName")}
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#DA70D6]/30 focus:border-[#DA70D6]/50"
                />
              </div>
              {editWalletError && (
                <p className="text-xs text-rose-600 font-medium">{editWalletError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setEditWalletId(null);
                    setEditWalletName("");
                    setEditWalletError("");
                  }}
                  className="flex-1 rounded-lg border border-[#E8E2DE] px-3 py-2 text-xs font-medium text-warm-dark hover:bg-[#E8E2DE]/50 transition"
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
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="h-20 animate-pulse rounded-xl card-glass" />
  );
}
