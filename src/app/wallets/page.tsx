"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { fetchMe } from "@/utils/session";
import type { Wallet, WalletType, Goal, User } from "@/types";

const currencies = ["COP","USD","EUR","MXN","ARS"];

export default function WalletsPage() {
  const router = useRouter();
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
    } catch (e:any) { setErr(e.message); }
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
    alert("Código copiado al portapapeles");
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
      setJoinError("Por favor ingresa un código");
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
      setJoinError(e.message || "Error al unirse a la billetera");
    }
  }

  const fmt = (n: number, currency: string = "COP") => {
    return new Intl.NumberFormat('es-CO', { 
      style: "currency", 
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-warm-dark mb-1">Billeteras</h1>
          <p className="text-warm text-sm">Gestiona tus billeteras personales y grupales</p>
        </div>
        <button
          onClick={() => setShowJoinModal(true)}
          className="rounded-lg border border-[#E8E2DE] px-4 py-2 text-sm font-medium text-warm-dark hover:bg-[#E8E2DE]/50 transition"
        >
          + Unirse por código
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            filter === "all"
              ? "btn-orange text-white"
              : "border border-[#E8E2DE] text-warm-dark hover:bg-[#E8E2DE]/50"
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter("PERSONAL")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            filter === "PERSONAL"
              ? "btn-orange text-white"
              : "border border-[#E8E2DE] text-warm-dark hover:bg-[#E8E2DE]/50"
          }`}
        >
          Personales
        </button>
        <button
          onClick={() => setFilter("GROUP")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            filter === "GROUP"
              ? "btn-orange text-white"
              : "border border-[#E8E2DE] text-warm-dark hover:bg-[#E8E2DE]/50"
          }`}
        >
          Compartidas
        </button>
      </div>

      {/* Crear */}
      <section className="card-glass p-5">
        <h2 className="text-lg font-semibold text-warm-dark mb-4">Crear nueva billetera</h2>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="text-xs text-warm font-medium mb-1.5 block">Nombre</label>
            <input
              value={name}
              onChange={(e)=>setName(e.target.value)}
              placeholder="Ej: Viaje a la costa"
              className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
            />
          </div>

          <div>
            <label className="text-xs text-warm font-medium mb-1.5 block">Tipo</label>
            <select
              value={type}
              onChange={(e)=>setType(e.target.value as WalletType)}
              className="rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
            >
              <option value="PERSONAL">Personal</option>
              <option value="GROUP">Compartida (grupo)</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-warm font-medium mb-1.5 block">Moneda</label>
            <select
              value={currency}
              onChange={(e)=>setCur(e.target.value)}
              className="rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
            >
              {currencies.map(c=> <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <button
            onClick={createWallet}
            disabled={!canCreate}
            className="btn-orange rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
          >
            Crear
          </button>
        </div>
        {!!err && <p className="mt-3 text-xs text-rose-600 font-medium">{err}</p>}
      </section>

      {/* Listado */}
      <section className="grid gap-3 sm:grid-cols-2">
        {loading && <CardSkeleton />}
        {!loading && filteredItems.length === 0 && (
          <div className="card-glass px-6 py-8 text-center">
            <p className="text-warm text-sm">Aún no tienes billeteras de este tipo.</p>
          </div>
        )}
        {filteredItems.map(w => (
          <article key={w.id} className="card-glass p-4 hover:shadow-lg transition-all">
            <header className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-warm-dark mb-1">{w.name}</h3>
                <p className="text-xs text-warm">
                  {w.type === "GROUP" ? "Compartida" : "Personal"} • {w.currency}
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
                      className="rounded-lg border border-[#E8E2DE] px-3 py-1.5 text-xs font-medium text-warm-dark hover:bg-[#E8E2DE]/50 transition"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleDelete(w.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        deleteConfirm === w.id
                          ? "bg-rose-500 text-white"
                          : "border border-rose-300 text-rose-600 hover:bg-rose-50"
                      }`}
                    >
                      {deleteConfirm === w.id ? "✓ Confirmar" : "🗑️ Eliminar"}
                    </button>
                  </>
                )}
                <button
                  onClick={() => router.push(`/wallets/${w.id}`)}
                  className="rounded-lg border border-[#E8E2DE] px-3 py-1.5 text-xs font-medium text-warm-dark hover:bg-[#E8E2DE]/50 transition"
                >
                  Ver →
                </button>
              </div>
            </header>

            {/* Código de ingreso (solo para grupales) */}
            {w.type === "GROUP" && w.inviteCode && (
              <div className="mb-3 p-2 rounded-lg bg-[#FEFFFF]/50 border border-[#E8E2DE]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-warm font-medium">Código: </span>
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
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="card-glass p-6 w-full max-w-sm mx-4 shadow-2xl">
            <h2 className="text-lg font-semibold text-warm-dark mb-2">Unirse a billetera</h2>
            <p className="text-xs text-warm mb-4">
              Ingresa el código de la billetera grupal a la que deseas unirte.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">Código de billetera</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABCD1234"
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50 font-mono"
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
                  Cancelar
                </button>
                <button
                  onClick={handleJoin}
                  className="flex-1 btn-orange rounded-lg px-3 py-2 text-xs font-medium text-white"
                >
                  Unirse
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar nombre de billetera */}
      {editWalletId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="card-glass p-6 w-full max-w-sm mx-4 shadow-2xl">
            <h2 className="text-lg font-semibold text-warm-dark mb-2">Editar nombre</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">Nuevo nombre</label>
                <input
                  type="text"
                  value={editWalletName}
                  onChange={(e) => setEditWalletName(e.target.value)}
                  placeholder="Nombre de la billetera"
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
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
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!editWalletName.trim()) {
                      setEditWalletError("El nombre es requerido");
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
                      setEditWalletError(e.message || "Error al actualizar nombre");
                    }
                  }}
                  className="flex-1 btn-orange rounded-lg px-3 py-2 text-xs font-medium text-white"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="h-20 animate-pulse rounded-xl card-glass" />
  );
}
