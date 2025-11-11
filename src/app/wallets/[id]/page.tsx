"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { fetchMe } from "@/utils/session";
import type { Wallet, Transaction, Category, User, Goal } from "@/types";

// ---------- helpers ----------
const fmt = (n: number, currency: string) => {
  // Usar locale fijo para evitar diferencias entre servidor y cliente
  const locale = 'es-CO'; // o 'en-US' según prefieras
  return new Intl.NumberFormat(locale, { 
    style: "currency", 
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

function toNum(x: string | number | null | undefined) {
  if (typeof x === "number") return x;
  if (!x) return 0;
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

type PieDatum = { label: string; value: number; color: string };

function Donut({ data, size = 220, thickness = 22 }: { data: PieDatum[]; size?: number; thickness?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2;
  const ir = r - thickness;
  let angle = -Math.PI / 2;

  const arcs = data.map((d, i) => {
    const arc = (d.value / total) * Math.PI * 2;
    const a0 = angle;
    const a1 = angle + arc;
    angle = a1;

    const x0 = r + r * Math.cos(a0), y0 = r + r * Math.sin(a0);
    const x1 = r + r * Math.cos(a1), y1 = r + r * Math.sin(a1);
    const xi0 = r + ir * Math.cos(a0), yi0 = r + ir * Math.sin(a0);
    const xi1 = r + ir * Math.cos(a1), yi1 = r + ir * Math.sin(a1);
    const large = arc > Math.PI ? 1 : 0;

    const dPath = [
      `M ${xi0} ${yi0}`,
      `L ${x0} ${y0}`,
      `A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`,
      `L ${xi1} ${yi1}`,
      `A ${ir} ${ir} 0 ${large} 0 ${xi0} ${yi0}`,
      "Z",
    ].join(" ");
    return <path key={i} d={dPath} fill={d.color} opacity={0.9} />;
  });

  return (
    <svg width={size} height={size} className="drop-shadow-sm">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#glow)">{arcs}</g>
    </svg>
  );
}

function Bar({ value, total }: { value: number; total: number }) {
  const pct = total ? Math.round((100 * value) / total) : 0;
  return (
    <div className="h-2 rounded-full bg-[#E8E2DE] overflow-hidden">
      <div
        className="h-full rounded-full gradient-orange"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ---------- page ----------
export default function WalletDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [incCats, setIncCats] = useState<Category[]>([]);
  const [expCats, setExpCats] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [err, setErr] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [nameError, setNameError] = useState("");
  const [showCreateGoalModal, setShowCreateGoalModal] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [goalError, setGoalError] = useState("");
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [txType, setTxType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [txCategory, setTxCategory] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txDesc, setTxDesc] = useState("");
  const [txError, setTxError] = useState("");
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [goalProgress, setGoalProgress] = useState<Record<string, any[]>>({});
  const [showEditGoalModal, setShowEditGoalModal] = useState<string | null>(null);
  const [editGoalName, setEditGoalName] = useState("");
  const [editGoalAmount, setEditGoalAmount] = useState("");
  const [editGoalDeadline, setEditGoalDeadline] = useState("");
  const [editGoalError, setEditGoalError] = useState("");
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitMembers, setSplitMembers] = useState<Array<{ userId: string; amount: number }>>([]);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [showGoalDetailModal, setShowGoalDetailModal] = useState<string | null>(null);
  const [goalTransactionAmount, setGoalTransactionAmount] = useState("");
  const [goalTransactionDesc, setGoalTransactionDesc] = useState("");
  const [goalTransactionError, setGoalTransactionError] = useState("");

  // carga
  useEffect(() => {
    (async () => {
      try {
        setErr("");
        // Cargar usuario actual
        try {
          const me = await fetchMe();
          setCurrentUser(me);
        } catch {}

        // Cargar billetera con detalles
        let w: Wallet | null = null;
        try {
          w = await api<Wallet>(`/wallets/${id}`);
          setWallet(w);
        } catch {
          // fallback: al menos guarda el id para la vista
          setWallet({ id, name: "Billetera", type: "GROUP", currency: "COP" });
        }

        // Cargar solo transacciones inicialmente, categorías se cargan bajo demanda
        const t = await api<Transaction[]>(`/transactions?walletId=${id}`).catch(() => []);
        setTxs(t ?? []);

        // Cargar metas solo si es billetera grupal
        if (w?.type === "GROUP") {
          try {
            const g = await api<Goal[]>(`/goals/wallet/${id}`).catch(() => []);
            setGoals(g ?? []);
          } catch {
            setGoals([]);
          }
        } else {
          setGoals([]);
        }
      } catch (e: any) {
        setErr(e.message || "Error cargando datos");
      }
    })();
  }, [id]);

  const isOwner = wallet && currentUser && (
    wallet.createdBy?.id === currentUser.id ||
    wallet.members?.some(m => m.userId === currentUser.id && m.role === "OWNER")
  );

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
      // Recargar billeteras y redirigir
      router.push("/wallets");
    } catch (e: any) {
      setJoinError(e.message || "Error al unirse a la billetera");
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm("¿Estás seguro de que deseas remover a este miembro?")) return;
    
    try {
      await api(`/wallets/${id}/members/${memberId}`, {
        method: "DELETE",
      });
      // Recargar billetera
      const w = await api<Wallet>(`/wallets/${id}`);
      setWallet(w);
    } catch (e: any) {
      setErr(e.message || "Error al remover miembro");
    }
  }

  async function handleLeaveWallet() {
    if (!confirm("¿Estás seguro de que deseas salirte de esta billetera?")) return;
    
    try {
      const result = await api<{ success: boolean; message?: string }>(`/wallets/${id}/leave`, {
        method: "POST",
      });
      if (result.message) {
        alert(result.message);
      }
      router.push("/wallets");
    } catch (e: any) {
      setErr(e.message || "Error al salirse de la billetera");
    }
  }

  async function handleUpdateName() {
    if (!newName.trim() || newName.trim().length < 3) {
      setNameError("El nombre debe tener al menos 3 caracteres");
      return;
    }

    setNameError("");
    try {
      await api(`/wallets/${id}/name`, {
        method: "PATCH",
        body: JSON.stringify({ name: newName.trim() }),
      });
      setNewName("");
      setShowEditNameModal(false);
      // Recargar billetera
      const w = await api<Wallet>(`/wallets/${id}`);
      setWallet(w);
    } catch (e: any) {
      setNameError(e.message || "Error al actualizar nombre");
    }
  }

  async function handleDeleteWallet() {
    if (!confirm("¿Estás seguro de que deseas eliminar esta billetera? Esta acción no se puede deshacer.")) return;
    
    try {
      await api(`/wallets/${id}`, {
        method: "DELETE",
      });
      router.push("/wallets");
    } catch (e: any) {
      setErr(e.message || "Error al eliminar billetera");
    }
  }

  function copyInviteCode() {
    if (wallet?.inviteCode) {
      navigator.clipboard.writeText(wallet.inviteCode);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 3000);
    }
  }

  async function handleCreateGoal() {
    if (!goalName.trim() || !goalAmount.trim()) {
      setGoalError("Nombre y monto son requeridos");
      return;
    }

    const amount = parseFloat(goalAmount);
    if (isNaN(amount) || amount <= 0) {
      setGoalError("El monto debe ser un número mayor a 0");
      return;
    }

    setGoalError("");
    try {
      await api("/goals", {
        method: "POST",
        body: JSON.stringify({
          walletId: id,
          name: goalName.trim(),
          targetAmount: amount,
          deadline: goalDeadline || undefined,
        }),
      });
      setGoalName("");
      setGoalAmount("");
      setGoalDeadline("");
      setShowCreateGoalModal(false);
      // Recargar metas
      const g = await api<Goal[]>(`/goals/wallet/${id}`);
      setGoals(g ?? []);
    } catch (e: any) {
      setGoalError(e.message || "Error al crear meta");
    }
  }

  // Cargar categorías solo cuando se abre el modal y solo si no están ya cargadas
  useEffect(() => {
    if (!showTransactionModal) return;

    const loadCats = async () => {
      // Verificar si ya están cargadas para evitar llamadas duplicadas
      if (txType === "INCOME" && incCats.length > 0) {
        // Si ya están cargadas, solo seleccionar la primera si no hay categoría seleccionada
        if (!txCategory && incCats.length > 0) {
          setTxCategory(incCats[0].id);
        }
        return;
      }
      
      if (txType === "EXPENSE" && expCats.length > 0) {
        // Si ya están cargadas, solo seleccionar la primera si no hay categoría seleccionada
        if (!txCategory && expCats.length > 0) {
          setTxCategory(expCats[0].id);
        }
        return;
      }

      // Solo cargar si no están en caché
      try {
        const cats = await api<Category[]>(`/categories?type=${txType}`);
        if (txType === "INCOME") {
          setIncCats(cats || []);
          if (cats && cats.length > 0 && !txCategory) {
            setTxCategory(cats[0].id);
          }
        } else {
          setExpCats(cats || []);
          if (cats && cats.length > 0 && !txCategory) {
            setTxCategory(cats[0].id);
          }
        }
      } catch (e) {
        console.error("Error loading categories:", e);
      }
    };
    
    loadCats();
  }, [showTransactionModal]); // Removido txType de dependencias para evitar recargas innecesarias

  // Cargar categorías cuando cambia el tipo de transacción dentro del modal (solo si no están cargadas)
  useEffect(() => {
    if (!showTransactionModal) return;

    const loadCatsForType = async () => {
      // Verificar si ya están cargadas
      if (txType === "INCOME" && incCats.length > 0) {
        if (!txCategory && incCats.length > 0) {
          setTxCategory(incCats[0].id);
        }
        return;
      }
      
      if (txType === "EXPENSE" && expCats.length > 0) {
        if (!txCategory && expCats.length > 0) {
          setTxCategory(expCats[0].id);
        }
        return;
      }

      // Solo cargar si no están en caché
      try {
        const cats = await api<Category[]>(`/categories?type=${txType}`);
        if (txType === "INCOME") {
          setIncCats(cats || []);
          if (cats && cats.length > 0) {
            setTxCategory(cats[0].id);
          }
        } else {
          setExpCats(cats || []);
          if (cats && cats.length > 0) {
            setTxCategory(cats[0].id);
          }
        }
      } catch (e) {
        console.error("Error loading categories:", e);
      }
    };
    
    loadCatsForType();
  }, [txType, showTransactionModal]); // Solo cuando cambia el tipo dentro del modal

  async function handleCreateTransaction() {
    if (!txCategory || !txAmount.trim()) {
      setTxError("Categoría y monto son requeridos");
      return;
    }

    const amount = parseFloat(txAmount);
    if (isNaN(amount) || amount <= 0) {
      setTxError("El monto debe ser un número mayor a 0");
      return;
    }

    // Validar splits si están activos
    if (showSplitModal && splitMembers.length > 0) {
      const totalSplit = splitMembers.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(totalSplit - amount) > 0.01) {
        setTxError(`La suma de los splits (${fmt(totalSplit, currency)}) debe igualar el monto total (${fmt(amount, currency)})`);
        return;
      }
    }

    setTxError("");
    try {
      const me = await fetchMe();
      const splits = showSplitModal && splitMembers.length > 0
        ? splitMembers
            .filter(s => s.amount > 0)
            .map(s => ({ owedByUserId: s.userId, amount: s.amount }))
        : undefined;

      await api("/transactions", {
        method: "POST",
        body: JSON.stringify({
          walletId: id,
          categoryId: txCategory,
          type: wallet?.type === "GROUP" ? "INCOME" : txType,
          amount: amount,
          paidByUserId: me.id,
          description: txDesc || null,
          splits,
        }),
      });
      setTxCategory("");
      setTxAmount("");
      setTxDesc("");
      setShowSplitModal(false);
      setSplitMembers([]);
      setShowTransactionModal(false);
      // Recargar transacciones
      const t = await api<Transaction[]>(`/transactions?walletId=${id}`);
      setTxs(t ?? []);
    } catch (e: any) {
      setTxError(e.message || "Error al crear transacción");
    }
  }

  const currency = wallet?.currency || "COP";

  async function handleCreateGoalTransaction(goalId: string) {
    if (!goalTransactionAmount.trim()) {
      setGoalTransactionError("El monto es requerido");
      return;
    }

    const amount = parseFloat(goalTransactionAmount);
    if (isNaN(amount) || amount <= 0) {
      setGoalTransactionError("El monto debe ser un número mayor a 0");
      return;
    }

    setGoalTransactionError("");
    try {
      const me = await fetchMe();
      
      // Obtener la billetera personal del usuario (la predefinida)
      const allWallets = await api<Wallet[]>("/wallets").catch(() => []);
      const personalWallet = allWallets.find(w => w.type === "PERSONAL" && w.isDefault);
      
      if (!personalWallet) {
        setGoalTransactionError("No se encontró tu billetera personal");
        return;
      }

      // Crear transacción de tipo EXPENSE en la billetera PERSONAL del usuario
      // Sin categoría, ya que es un aporte a meta
      // Esto se resta de los ingresos personales y se suma a los gastos personales
      await api("/transactions", {
        method: "POST",
        body: JSON.stringify({
          walletId: personalWallet.id, // Usar billetera personal, no la grupal
          type: "EXPENSE",
          amount: amount,
          paidByUserId: me.id,
          description: goalTransactionDesc || `Aporte a meta: ${goals.find(g => g.id === goalId)?.name}`,
        }),
      });

      setGoalTransactionAmount("");
      setGoalTransactionDesc("");
      setGoalTransactionError("");
      
      // Recargar datos
      const [updatedGoals, t] = await Promise.all([
        api<Goal[]>(`/goals/wallet/${id}`),
        api<Transaction[]>(`/transactions?walletId=${id}`),
      ]);
      setGoals(updatedGoals || []);
      setTxs(t ?? []);
      
      // Cargar progreso de la meta actualizado
      try {
        const prog = await api<any[]>(`/goals/progress/${goalId}`);
        setGoalProgress(prev => ({ ...prev, [goalId]: prog || [] }));
      } catch (e) {
        // Si falla, simplemente no actualizamos el progreso
        console.error("Error al cargar progreso:", e);
      }
    } catch (e: any) {
      setGoalTransactionError(e.message || "Error al crear transacción");
    }
  }

  // índices de categorías
  const catMap = useMemo(() => {
    const map: Record<string, Category> = {};
    [...incCats, ...expCats].forEach(c => (map[c.id] = c));
    return map;
  }, [incCats, expCats]);

  // agregados - optimizado para recalcular solo cuando cambia la cantidad de transacciones o el tipo de billetera
  const { income, expense, byCatExpense, recent } = useMemo(() => {
    let inc = 0, exp = 0;
    const groupExp: Record<string, number> = {};
    
    // Optimizar: solo ordenar y slice si hay transacciones
    const sortedRecent = txs.length > 0
      ? [...txs]
          .sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 10)
      : [];

    // Optimizar: usar forEach en lugar de for...of para mejor rendimiento
    // Mostrar todos los ingresos (aportes) de los usuarios
    txs.forEach((t) => {
      const v = toNum(t.amount);
      if (t.type === "INCOME") {
        // Contar todos los ingresos (aportes) sin importar si hay metas activas
        inc += v;
      }
      // Los gastos ya no se muestran, pero se mantienen para cálculos internos si se necesitan
    });
    
    const expArr = Object.entries(groupExp)
      .map(([catId, value]) => ({ catId, value }))
      .sort((a,b)=> b.value - a.value)
      .slice(0, 6);

    return { income: inc, expense: exp, byCatExpense: expArr, recent: sortedRecent };
  }, [txs, wallet?.type, goals]); // Optimizado: usar txs directamente pero con cálculo optimizado interno

  // donut data (gastos por categoría)
  const pieData: PieDatum[] = useMemo(() => {
    const palette = [
      "#E879F9","#7C3AED","#22D3EE","#F472B6","#60A5FA","#34D399","#F59E0B","#F87171",
    ];
    const total = byCatExpense.reduce((s, c) => s + c.value, 0);
    return byCatExpense.map((row, i) => ({
      label: catMap[row.catId]?.name || "Otro",
      value: row.value,
      color: palette[i % palette.length],
    })).concat(total === 0 ? [{ label: "Sin gastos", value: 1, color: "#334155" }] : []);
  }, [byCatExpense, catMap]);

  return (
    <div className="space-y-5">
      <button
        onClick={() => router.push("/wallets")}
        className="rounded-lg border border-[#E8E2DE] px-3 py-1.5 text-xs font-medium text-warm-dark hover:bg-[#E8E2DE]/50 transition"
      >
        ← Volver
      </button>

      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-semibold text-warm-dark mb-1">
              {wallet?.name ?? "Billetera"}
            </h1>
            <p className="text-sm text-warm mb-1">
              {wallet?.type === "GROUP" ? "Compartida" : "Personal"} • {currency}
            </p>
            {wallet?.createdBy && (
              <p className="text-xs text-warm">
                Dueño: <span className="font-medium text-warm-dark">{wallet.createdBy.name || wallet.createdBy.email}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {wallet?.type === "GROUP" && wallet.inviteCode && (
              <div className="card-glass px-4 py-2.5">
                <span className="text-xs text-warm font-medium">Código de ingreso: </span>
                <span className="font-mono font-bold text-warm-dark text-base">{wallet.inviteCode}</span>
                <button
                  onClick={copyInviteCode}
                  className="ml-2 text-xs text-warm hover:text-warm-dark font-medium"
                >
                  📋 Copiar
                </button>
              </div>
            )}
            {isOwner && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setNewName(wallet?.name || "");
                    setShowEditNameModal(true);
                  }}
                  className="rounded-lg border border-[#E8E2DE] px-3 py-1.5 text-xs font-medium text-warm-dark hover:bg-[#E8E2DE]/50 transition"
                >
                  ✏️ Editar
                </button>
                {!wallet?.isDefault && (
                  <button
                    onClick={handleDeleteWallet}
                    className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
                  >
                    🗑️ Eliminar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        {!!err && <p className="text-xs text-rose-600 font-medium">{err}</p>}
      </header>

      {/* Sección de miembros (solo para billeteras grupales) */}
      {wallet?.type === "GROUP" && wallet.members && wallet.members.length > 0 && (
        <section className="card-glass p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-warm-dark">Participantes</h2>
            {currentUser && wallet.members.some(m => m.userId === currentUser.id) && (
              <button
                onClick={handleLeaveWallet}
                className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
              >
                Salirse de la billetera
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {wallet.members.map((member) => {
              const joinedDate = member.joinedAt ? new Date(member.joinedAt) : null;
              const isNewMember = joinedDate && (Date.now() - joinedDate.getTime()) < 7 * 24 * 60 * 60 * 1000;
              
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/30 px-3 py-2.5"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-warm-dark text-sm">
                        {member.user.name || member.user.email}
                      </p>
                      {isNewMember && (
                        <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs text-white font-medium">
                          Nuevo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-warm mt-0.5">
                      {member.role === "OWNER" ? "Dueño" : "Miembro"}
                      {joinedDate && (
                        <span> • Desde {joinedDate.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.role === "OWNER" && (
                      <span className="rounded-full bg-gradient-orange px-2.5 py-0.5 text-xs text-white font-medium">
                        Dueño
                      </span>
                    )}
                    {isOwner && member.role !== "OWNER" && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="rounded-full border border-rose-300 px-2.5 py-0.5 text-xs text-rose-600 hover:bg-rose-50 transition"
                      >
                        ✕ Remover
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Sección de metas (solo para billeteras grupales) */}
      {wallet?.type === "GROUP" && (
        <section className="card-glass p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-warm-dark">Metas</h2>
            {isOwner && (
              <button
                onClick={() => {
                  setGoalName("");
                  setGoalAmount("");
                  setGoalDeadline("");
                  setGoalError("");
                  setShowCreateGoalModal(true);
                }}
                className="btn-orange rounded-lg px-4 py-2 text-sm font-medium text-white"
              >
                + Crear meta
              </button>
            )}
          </div>
          {goals.length === 0 ? (
            <div className="rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/30 px-4 py-6 text-warm text-sm text-center">
              {isOwner ? "Aún no hay metas. Crea una para comenzar." : "Aún no hay metas creadas."}
            </div>
          ) : (
            <div className="space-y-4">
              {goals.map((goal) => {
                const current = Number(goal.currentAmount);
                const target = Number(goal.targetAmount);
                const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
                const isAchieved = goal.status === "ACHIEVED" || current >= target;
                const isExpanded = expandedGoal === goal.id;
                const progress = goalProgress[goal.id] || [];
                const isOwnerOfGoal = goal.createdBy?.id === currentUser?.id;
                
                return (
                  <div
                    key={goal.id}
                    onClick={(e) => {
                      // Evitar que el click se propague a los botones internos
                      if ((e.target as HTMLElement).closest('button')) return;
                      setShowGoalDetailModal(goal.id);
                      // Cargar progreso si no está cargado
                      if (!goalProgress[goal.id]) {
                        api<any[]>(`/goals/progress/${goal.id}`)
                          .then(prog => setGoalProgress(prev => ({ ...prev, [goal.id]: prog || [] })))
                          .catch((err) => {
                            console.error("Error al cargar progreso:", err);
                            // Si falla, establecer un array vacío para evitar errores
                            setGoalProgress(prev => ({ ...prev, [goal.id]: [] }));
                          });
                      }
                    }}
                    className="rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/30 px-4 py-4 cursor-pointer hover:bg-[#FEFFFF]/50 transition"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-warm-dark text-base">{goal.name}</h3>
                          {isOwnerOfGoal && (
                            <div className="flex gap-1">
                              {goal.status === "ACTIVE" && (
                                <button
                                  onClick={async () => {
                                    try {
                                      await api(`/goals/${goal.id}`, {
                                        method: "PATCH",
                                        body: JSON.stringify({ status: "PAUSED" }),
                                      });
                                      const updated = await api<Goal[]>(`/goals/wallet/${id}`);
                                      setGoals(updated || []);
                                    } catch (e: any) {
                                      alert(e.message || "Error al pausar meta");
                                    }
                                  }}
                                  className="text-xs text-amber-600 hover:text-amber-700"
                                  title="Pausar meta"
                                >
                                  ⏸️
                                </button>
                              )}
                              {goal.status === "PAUSED" && (
                                <button
                                  onClick={async () => {
                                    try {
                                      await api(`/goals/${goal.id}`, {
                                        method: "PATCH",
                                        body: JSON.stringify({ status: "ACTIVE" }),
                                      });
                                      const updated = await api<Goal[]>(`/goals/wallet/${id}`);
                                      setGoals(updated || []);
                                    } catch (e: any) {
                                      alert(e.message || "Error al reactivar meta");
                                    }
                                  }}
                                  className="text-xs text-emerald-600 hover:text-emerald-700"
                                  title="Reactivar meta"
                                >
                                  ▶️
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setEditGoalName(goal.name);
                                  setEditGoalAmount(goal.targetAmount);
                                  setEditGoalDeadline(goal.deadline || "");
                                  setEditGoalError("");
                                  setShowEditGoalModal(goal.id);
                                }}
                                className="text-xs text-warm hover:text-warm-dark"
                                title="Editar meta"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={async () => {
                                  if (!confirm("¿Estás seguro de eliminar esta meta?")) return;
                                  try {
                                    await api(`/goals/${goal.id}`, { method: "DELETE" });
                                    const updated = await api<Goal[]>(`/goals/wallet/${id}`);
                                    setGoals(updated || []);
                                  } catch (e: any) {
                                    alert(e.message || "Error al eliminar meta");
                                  }
                                }}
                                className="text-xs text-rose-600 hover:text-rose-700"
                                title="Eliminar meta"
                              >
                                🗑️
                              </button>
                              {goal.status === "ACTIVE" && (
                                <button
                                  onClick={async () => {
                                    if (!confirm("¿Estás seguro de cancelar esta meta?")) return;
                                    try {
                                      await api(`/goals/${goal.id}`, {
                                        method: "PATCH",
                                        body: JSON.stringify({ status: "CANCELLED" }),
                                      });
                                      const updated = await api<Goal[]>(`/goals/wallet/${id}`);
                                      setGoals(updated || []);
                                    } catch (e: any) {
                                      alert(e.message || "Error al cancelar meta");
                                    }
                                  }}
                                  className="text-xs text-gray-600 hover:text-gray-700"
                                  title="Cancelar meta"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-warm">
                          {fmt(current, currency)} / {fmt(target, currency)}
                        </p>
                        {goal.createdAt && (
                          <p className="text-xs text-warm mt-0.5">
                            Creada: {new Date(goal.createdAt).toLocaleDateString('es-CO')}
                          </p>
                        )}
                        {goal.deadline && (
                          <p className="text-xs text-warm mt-0.5">
                            Fecha límite: {new Date(goal.deadline).toLocaleDateString('es-CO')}
                          </p>
                        )}
                      </div>
                      {goal.status === "PAUSED" && (
                        <span className="rounded-full bg-amber-500 px-3 py-1 text-xs text-white font-medium">
                          ⏸️ Pausada
                        </span>
                      )}
                      {goal.status === "CANCELLED" && (
                        <span className="rounded-full bg-gray-500 px-3 py-1 text-xs text-white font-medium">
                          ✕ Cancelada
                        </span>
                      )}
                      {isAchieved && goal.status !== "CANCELLED" && (
                        <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs text-white font-medium">
                          ✓ Lograda
                        </span>
                      )}
                    </div>
                    <div className="mt-3">
                      <div className="h-3 rounded-full bg-[#E8E2DE] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isAchieved ? "bg-emerald-500" : "gradient-orange"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-xs text-warm">
                          {percentage.toFixed(1)}% completado
                        </p>
                        <button
                          onClick={async () => {
                            if (isExpanded) {
                              setExpandedGoal(null);
                            } else {
                              setExpandedGoal(goal.id);
                              try {
                                const prog = await api<any[]>(`/goals/progress/${goal.id}`);
                                setGoalProgress(prev => ({ ...prev, [goal.id]: prog || [] }));
                              } catch {}
                            }
                          }}
                          className="text-xs text-warm hover:text-warm-dark font-medium rounded-lg border border-[#E8E2DE] px-3 py-1.5 hover:bg-[#E8E2DE]/50 transition"
                        >
                          {isExpanded ? "▲ Ocultar" : "▼ Ver contribuciones"}
                        </button>
                      </div>
                    </div>
                    {isExpanded && progress.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-[#E8E2DE]">
                        <p className="text-xs font-medium text-warm-dark mb-2">Contribuciones:</p>
                        <div className="space-y-2">
                          {progress.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between text-xs">
                              <div>
                                <span className="text-warm-dark font-medium">
                                  {p.createdBy?.name || p.createdBy?.email || "Usuario"}
                                </span>
                                {p.note && (
                                  <span className="text-warm ml-2">• {p.note}</span>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="text-emerald-600 font-medium">
                                  +{fmt(Number(p.amount), currency)}
                                </span>
                                <p className="text-warm text-xs">
                                  {new Date(p.date).toLocaleDateString('es-CO')}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}


      {/* tarjetas resumen - Solo mostrar ingresos (aportes) */}
      <section className="grid gap-3 sm:grid-cols-1">
        <SummaryCard
          label="Ingresos"
          value={fmt(income, currency)}
          sub="+ aportes de usuarios"
          tone="emerald"
        />
      </section>

      {/* Actividad reciente */}
      <section className="card-glass p-5">
        <h3 className="mb-4 text-lg font-semibold text-warm-dark">Actividad reciente</h3>
        <ul className="space-y-2">
          {recent.length === 0 && <li className="text-warm text-sm">Sin movimientos aún.</li>}
          {recent.map((t) => (
            <li
              key={t.id}
              className="flex items-start justify-between rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/30 px-3 py-2.5"
            >
              <div className="text-xs flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-warm-dark">
                    {t.description || "(sin descripción)"}
                  </p>
                  {t.category && (
                    <span className="text-warm text-xs">• {t.category.name}</span>
                  )}
                </div>
                <div className="space-y-0.5">
                  <p className="text-warm">
                    <span className="font-medium">Pagado por:</span> {t.paidBy?.name || t.paidBy?.email || "Usuario"}
                  </p>
                  {t.createdBy && t.createdBy.id !== t.paidBy?.id && (
                    <p className="text-warm">
                      <span className="font-medium">Registrado por:</span> {t.createdBy.name || t.createdBy.email}
                    </p>
                  )}
                  <p className="text-warm">
                    <span className="font-medium">Fecha:</span> {new Date(t.date).toLocaleString('es-CO', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                  {t.splits && t.splits.length > 0 && (
                    <p className="text-warm mt-1 text-xs">
                      Dividido entre {t.splits.length} {t.splits.length === 1 ? 'persona' : 'personas'}
                      {t.splits.some(s => s.settled) && (
                        <span className="text-emerald-600"> • {t.splits.filter(s => s.settled).length} {t.splits.filter(s => s.settled).length === 1 ? 'pagado' : 'pagados'}</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right ml-3">
                <div
                  className={`font-semibold text-sm ${
                    t.type === "EXPENSE" ? "text-rose-600" : t.type === "SETTLEMENT" ? "text-indigo-600" : "text-emerald-600"
                  }`}
                >
                  {t.type === "EXPENSE" ? "-" : "+"}
                  {fmt(toNum(t.amount), currency)}
                </div>
                <p className="text-xs text-warm mt-0.5">
                  {t.type === "EXPENSE" ? "Gasto" : t.type === "SETTLEMENT" ? "Liquidación" : "Ingreso"}
                </p>
              </div>
            </li>
          ))}
        </ul>
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

      {/* Modal para crear meta */}
      {showCreateGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="card-glass p-6 w-full max-w-md mx-4 shadow-2xl">
            <h2 className="text-lg font-semibold text-warm-dark mb-2">Crear nueva meta</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">Nombre de la meta</label>
                <input
                  type="text"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  placeholder="Ej: Viaje a la playa"
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">Monto objetivo</label>
                <input
                  type="number"
                  value={goalAmount}
                  onChange={(e) => setGoalAmount(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">Fecha límite (opcional)</label>
                <input
                  type="date"
                  value={goalDeadline}
                  onChange={(e) => setGoalDeadline(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark focus:outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
                />
              </div>
              {goalError && (
                <p className="text-xs text-rose-600 font-medium">{goalError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setShowCreateGoalModal(false);
                    setGoalName("");
                    setGoalAmount("");
                    setGoalDeadline("");
                    setGoalError("");
                  }}
                  className="flex-1 rounded-lg border border-[#E8E2DE] px-3 py-2 text-xs font-medium text-warm-dark hover:bg-[#E8E2DE]/50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateGoal}
                  className="flex-1 btn-orange rounded-lg px-3 py-2 text-xs font-medium text-white"
                >
                  Crear meta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar meta */}
      {showEditGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="card-glass p-6 w-full max-w-md mx-4 shadow-2xl">
            <h2 className="text-lg font-semibold text-warm-dark mb-2">Editar meta</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">Nombre de la meta</label>
                <input
                  type="text"
                  value={editGoalName}
                  onChange={(e) => setEditGoalName(e.target.value)}
                  placeholder="Ej: Viaje a la playa"
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">Monto objetivo</label>
                <input
                  type="number"
                  value={editGoalAmount}
                  onChange={(e) => setEditGoalAmount(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">Fecha límite (opcional)</label>
                <input
                  type="date"
                  value={editGoalDeadline}
                  onChange={(e) => setEditGoalDeadline(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark focus:outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
                />
              </div>
              {editGoalError && (
                <p className="text-xs text-rose-600 font-medium">{editGoalError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setShowEditGoalModal(null);
                    setEditGoalName("");
                    setEditGoalAmount("");
                    setEditGoalDeadline("");
                    setEditGoalError("");
                  }}
                  className="flex-1 rounded-lg border border-[#E8E2DE] px-3 py-2 text-xs font-medium text-warm-dark hover:bg-[#E8E2DE]/50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!editGoalName.trim() || !editGoalAmount.trim()) {
                      setEditGoalError("Nombre y monto son requeridos");
                      return;
                    }
                    const amount = parseFloat(editGoalAmount);
                    if (isNaN(amount) || amount <= 0) {
                      setEditGoalError("El monto debe ser un número mayor a 0");
                      return;
                    }
                    setEditGoalError("");
                    try {
                      await api(`/goals/${showEditGoalModal}`, {
                        method: "PATCH",
                        body: JSON.stringify({
                          name: editGoalName.trim(),
                          targetAmount: amount,
                          deadline: editGoalDeadline || null,
                        }),
                      });
                      setShowEditGoalModal(null);
                      setEditGoalName("");
                      setEditGoalAmount("");
                      setEditGoalDeadline("");
                      const updated = await api<Goal[]>(`/goals/wallet/${id}`);
                      setGoals(updated || []);
                    } catch (e: any) {
                      setEditGoalError(e.message || "Error al actualizar meta");
                    }
                  }}
                  className="flex-1 btn-orange rounded-lg px-3 py-2 text-xs font-medium text-white"
                >
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar nombre */}
      {showEditNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="card-glass p-6 w-full max-w-sm mx-4 shadow-2xl">
            <h2 className="text-lg font-semibold text-warm-dark mb-2">Editar nombre</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">Nuevo nombre</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nombre de la billetera"
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
                />
              </div>
              {nameError && (
                <p className="text-xs text-rose-600 font-medium">{nameError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setShowEditNameModal(false);
                    setNewName("");
                    setNameError("");
                  }}
                  className="flex-1 rounded-lg border border-[#E8E2DE] px-3 py-2 text-xs font-medium text-warm-dark hover:bg-[#E8E2DE]/50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateName}
                  className="flex-1 btn-orange rounded-lg px-3 py-2 text-xs font-medium text-white"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para crear transacción */}
      {showTransactionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="card-glass p-6 w-full max-w-md mx-4 shadow-2xl">
            <h2 className="text-lg font-semibold text-warm-dark mb-2">Nueva transacción</h2>
            <div className="space-y-3">
              {wallet?.type !== "GROUP" && (
                <div>
                  <label className="block text-xs font-medium text-warm-dark mb-1.5">Tipo</label>
                  <select
                    value={txType}
                    onChange={(e) => {
                      setTxType(e.target.value as "INCOME" | "EXPENSE");
                      setTxCategory("");
                    }}
                    className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
                  >
                    <option value="EXPENSE">Gasto</option>
                    <option value="INCOME">Ingreso</option>
                  </select>
                </div>
              )}
              {wallet?.type === "GROUP" && (
                <div className="rounded-lg bg-gradient-to-r from-[#FFD3A0]/30 to-[#FE8625]/20 border border-[#FE8625]/30 px-3 py-2 text-xs font-medium text-warm-dark">
                  Aporte (solo permitido en billeteras grupales)
                </div>
              )}
              {wallet?.type === "GROUP" && txType === "EXPENSE" && (
                <div>
                  <label className="block text-xs font-medium text-warm-dark mb-1.5">
                    <input
                      type="checkbox"
                      checked={showSplitModal}
                      onChange={(e) => {
                        setShowSplitModal(e.target.checked);
                        if (e.target.checked && wallet?.members) {
                          const totalAmount = parseFloat(txAmount) || 0;
                          const perPerson = wallet.members.length > 0 ? totalAmount / wallet.members.length : 0;
                          setSplitMembers(wallet.members.map(m => ({ userId: m.userId, amount: perPerson })));
                        }
                      }}
                      className="mr-2"
                    />
                    Dividir gasto entre miembros
                  </label>
                  {showSplitModal && wallet?.members && (
                    <div className="mt-2 space-y-2 max-h-40 overflow-y-auto rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/30 p-3">
                      {wallet.members.map((member) => {
                        const split = splitMembers.find(s => s.userId === member.userId);
                        return (
                          <div key={member.id} className="flex items-center gap-2">
                            <span className="text-xs text-warm-dark flex-1">
                              {member.user.name || member.user.email}
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={split?.amount || ""}
                              onChange={(e) => {
                                const amount = parseFloat(e.target.value) || 0;
                                setSplitMembers(prev => {
                                  const filtered = prev.filter(s => s.userId !== member.userId);
                                  return [...filtered, { userId: member.userId, amount }];
                                });
                              }}
                              placeholder="0.00"
                              className="w-24 rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-2 py-1 text-xs text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
                            />
                          </div>
                        );
                      })}
                      {txAmount && (
                        <div className="mt-2 pt-2 border-t border-[#E8E2DE] text-xs">
                          <span className="text-warm">Total dividido: </span>
                          <span className={`font-medium ${
                            Math.abs((splitMembers.reduce((sum, s) => sum + s.amount, 0)) - parseFloat(txAmount)) < 0.01
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }`}>
                            {fmt(splitMembers.reduce((sum, s) => sum + s.amount, 0), currency)}
                          </span>
                          <span className="text-warm"> / Total: {fmt(parseFloat(txAmount) || 0, currency)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">Categoría</label>
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
                >
                  <option value="">Selecciona una categoría</option>
                  {(txType === "INCOME" ? incCats : expCats).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">Monto</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">Descripción (opcional)</label>
                <input
                  type="text"
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  placeholder="Ej: Mercado, Netflix..."
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
                />
              </div>
              {txError && (
                <p className="text-xs text-rose-600 font-medium">{txError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setShowTransactionModal(false);
                    setTxCategory("");
                    setTxAmount("");
                    setTxDesc("");
                    setTxError("");
                    setShowSplitModal(false);
                    setSplitMembers([]);
                  }}
                  className="flex-1 rounded-lg border border-[#E8E2DE] px-3 py-2 text-xs font-medium text-warm-dark hover:bg-[#E8E2DE]/50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateTransaction}
                  disabled={!txCategory || !txAmount.trim()}
                  className="flex-1 btn-orange rounded-lg px-3 py-2 text-xs font-medium text-white disabled:opacity-50 disabled:hover:scale-100"
                >
                  Crear transacción
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Modal de detalle de meta */}
      {showGoalDetailModal && (() => {
        const goal = goals.find(g => g.id === showGoalDetailModal);
        if (!goal) return null;
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="card-glass p-6 w-full max-w-2xl mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-warm-dark">{goal.name}</h2>
                <button
                  onClick={() => {
                    setShowGoalDetailModal(null);
                    setGoalTransactionAmount("");
                    setGoalTransactionDesc("");
                    setGoalTransactionError("");
                  }}
                  className="text-warm hover:text-warm-dark text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Información de la meta */}
                <div className="rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/30 px-4 py-3">
                  <p className="text-sm text-warm-dark mb-2">
                    Progreso: {fmt(Number(goal.currentAmount), currency)} / {fmt(Number(goal.targetAmount), currency)}
                  </p>
                  <div className="h-3 rounded-full bg-[#E8E2DE] overflow-hidden">
                    <div
                      className="h-full rounded-full gradient-orange transition-all"
                      style={{ width: `${Math.min((Number(goal.currentAmount) / Number(goal.targetAmount)) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Botón para hacer transacción */}
                <div className="rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/30 px-4 py-3">
                  <h3 className="text-sm font-semibold text-warm-dark mb-3">Hacer aporte a la meta</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-warm-dark mb-1.5">Monto</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={goalTransactionAmount}
                        onChange={(e) => setGoalTransactionAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-warm-dark mb-1.5">Descripción (opcional)</label>
                      <input
                        type="text"
                        value={goalTransactionDesc}
                        onChange={(e) => setGoalTransactionDesc(e.target.value)}
                        placeholder="Ej: Aporte mensual"
                        className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
                      />
                    </div>
                    {goalTransactionError && (
                      <p className="text-xs text-rose-600 font-medium">{goalTransactionError}</p>
                    )}
                    <button
                      onClick={() => handleCreateGoalTransaction(goal.id)}
                      disabled={!goalTransactionAmount.trim()}
                      className="w-full btn-orange rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:hover:scale-100"
                    >
                      Hacer aporte
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Popup de código copiado */}
      {showCopySuccess && (
        <div className="fixed top-4 right-4 z-50 animate-slide-up">
          <div className="card-glass px-4 py-3 shadow-lg border border-emerald-500/50">
            <p className="text-sm font-medium text-emerald-600">
              ✓ Código copiado exitosamente
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
                       label,
                       value,
                       sub,
                       tone = "indigo",
                     }: {
  label: string;
  value: string;
  sub: string;
  tone?: "indigo" | "rose" | "emerald";
}) {
  const borderColor =
    tone === "rose"
      ? "border-rose-200"
      : tone === "emerald"
        ? "border-emerald-200"
        : "border-[#D7B59B]";

  return (
    <div className={`card-glass p-4 border ${borderColor}`}>
      <p className="text-xs font-medium text-warm mb-1.5">{label}</p>
      <p className="text-2xl font-semibold text-warm-dark mb-1">{value}</p>
      <p className="text-xs text-warm">{sub}</p>
    </div>
  );
}
