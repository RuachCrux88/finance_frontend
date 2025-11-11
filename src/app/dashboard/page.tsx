"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, AuthError } from "@/lib/api";
import { fetchMe } from "@/utils/session";
import type { Transaction, ChartDataPoint, Goal, PaymentReminder, Wallet, Category, User } from "@/types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { convertCurrency, CURRENCIES } from "@/utils/currency";

export default function Dashboard() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [userGoals, setUserGoals] = useState<Goal[]>([]);
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [savingsGoal, setSavingsGoal] = useState<string>("");
  const [savingsError, setSavingsError] = useState("");
  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showEditReminderModal, setShowEditReminderModal] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [reminderName, setReminderName] = useState("");
  const [reminderAmount, setReminderAmount] = useState("");
  const [reminderDescription, setReminderDescription] = useState("");
  const [reminderDueDate, setReminderDueDate] = useState("");
  const [reminderWalletId, setReminderWalletId] = useState("");
  const [reminderCategoryId, setReminderCategoryId] = useState("");
  const [reminderError, setReminderError] = useState("");
  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const [reminderToMark, setReminderToMark] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ message: string; type: 'warning' | 'info' } | null>(null);
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('month');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('COP');
  const [converting, setConverting] = useState(false);

  // Verificar autenticación
  useEffect(() => {
    fetchMe()
      .then(() => setIsAuthenticated(true))
      .catch(() => setIsAuthenticated(false));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const days = groupBy === 'day' ? 30 : 730;
        const [chart, hist, goals, rems, wals] = await Promise.all([
          api<ChartDataPoint[]>(`/transactions/chart-data?days=${days}&groupBy=${groupBy}`).catch(() => []),
          api<Transaction[]>("/transactions/history?limit=500").catch(() => []),
          api<Goal[]>("/goals/user").catch(() => []),
          api<PaymentReminder[]>("/reminders").catch(() => []),
          api<Wallet[]>("/wallets").catch(() => []),
        ]);
        setChartData(chart || []);
        setHistory(hist || []);
        setUserGoals(goals || []);
        setReminders(rems || []);
        setWallets(wals || []);
        if (wals && wals.length > 0 && !reminderWalletId) {
          const defaultWallet = wals.find(w => w.isDefault) || wals[0];
          setReminderWalletId(defaultWallet.id);
        }
        setIsAuthenticated(true);
      } catch (e: any) {
        console.error("Error loading dashboard data:", e);
        if (e instanceof AuthError) {
          setIsAuthenticated(false);
        }
        setChartData([]);
        setHistory([]);
        setUserGoals([]);
        setReminders([]);
        setWallets([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [groupBy]);

  // Escuchar cambios en history para mostrar alertas
  useEffect(() => {
    if (history.length > 0 && userGoals.length > 0) {
      const lastTx = history[0];
      if (lastTx.type === "EXPENSE") {
        checkSavingsGoal(Number(lastTx.amount));
      }
    }
  }, [history, userGoals]);

  const checkSavingsGoal = async (expenseAmount: number) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Buscar meta mensual de ahorro
    const monthlyGoal = userGoals.find(g => g.name.toLowerCase().includes('mensual') || g.name.toLowerCase().includes('ahorro'));
    if (monthlyGoal) {
      const target = Number(monthlyGoal.targetAmount);
      const targetCurrency = 'COP';
      const convertedTarget = targetCurrency === selectedCurrency 
        ? target 
        : await convertCurrency(target, targetCurrency, selectedCurrency);
      
      const remaining = convertedTarget - (monthIncome - monthExpenses);
      
      if (remaining < 0) {
        setAlert({
          message: `⚠️ Has superado tu meta de ahorro mensual. Te recomendamos gastar menos.`,
          type: 'warning'
        });
      } else {
        setAlert({
          message: `💰 Te quedan ${fmt(remaining)} para cumplir tu meta de ahorro mensual.`,
          type: 'info'
        });
      }
      
      setTimeout(() => setAlert(null), 5000);
    }
  };

  const fmt = (n: number, currency: string = selectedCurrency) => {
    return new Intl.NumberFormat('es-CO', { 
      style: "currency", 
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  };

  const formatDate = (dateStr: string) => {
    if (groupBy === 'day') {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
    } else {
      const [year, month] = dateStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' });
    }
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const [monthExpenses, setMonthExpenses] = useState(0);
  const [monthIncome, setMonthIncome] = useState(0);
  const [netBalance, setNetBalance] = useState(0);
  
  useEffect(() => {
    if (history.length === 0 || wallets.length === 0) {
      setMonthExpenses(0);
      setMonthIncome(0);
      setNetBalance(0);
      return;
    }

    setConverting(true);
    (async () => {
      try {
        let totalExpenses = 0;
        let totalIncome = 0;

        const walletMap = new Map<string, Wallet>();
        wallets.forEach(w => walletMap.set(w.id, w));

        for (const tx of history) {
          const txDate = new Date(tx.date);
          const isCurrentMonth = txDate.getMonth() === currentMonth && 
                               txDate.getFullYear() === currentYear;
          
          if (!isCurrentMonth) continue;

          const wallet = walletMap.get(tx.walletId) || tx.wallet;
          const txCurrency = wallet?.currency || 'COP';
          
          const amount = Number(tx.amount);
          
          const convertedAmount = txCurrency === selectedCurrency 
            ? amount 
            : await convertCurrency(amount, txCurrency, selectedCurrency);

          if (tx.type === "EXPENSE") {
            totalExpenses += convertedAmount;
          } else if (tx.type === "INCOME") {
            totalIncome += convertedAmount;
          }
        }

        setMonthExpenses(totalExpenses);
        setMonthIncome(totalIncome);
        setNetBalance(totalIncome - totalExpenses);
      } catch (error) {
        console.error("Error converting currencies:", error);
        const expenses = history
          .filter(tx => {
            const txDate = new Date(tx.date);
            return tx.type === "EXPENSE" && 
                   txDate.getMonth() === currentMonth && 
                   txDate.getFullYear() === currentYear;
          })
          .reduce((sum, tx) => sum + Number(tx.amount), 0);
        
        const income = history
          .filter(tx => {
            const txDate = new Date(tx.date);
            return tx.type === "INCOME" && 
                   txDate.getMonth() === currentMonth && 
                   txDate.getFullYear() === currentYear;
          })
          .reduce((sum, tx) => sum + Number(tx.amount), 0);
        
        setMonthExpenses(expenses);
        setMonthIncome(income);
        setNetBalance(income - expenses);
      } finally {
        setConverting(false);
      }
    })();
  }, [history, wallets, selectedCurrency, currentMonth, currentYear]);

  const monthlyGoal = userGoals.find(g => g.name.toLowerCase().includes('mensual') || g.name.toLowerCase().includes('ahorro'));
  const [savingsProgress, setSavingsProgress] = useState<{
    target: number;
    current: number;
    remaining: number;
  } | null>(null);
  
  useEffect(() => {
    if (!monthlyGoal) {
      setSavingsProgress(null);
      return;
    }

    (async () => {
      try {
        const target = Number(monthlyGoal.targetAmount);
        const targetCurrency = 'COP';
        const convertedTarget = targetCurrency === selectedCurrency 
          ? target 
          : await convertCurrency(target, targetCurrency, selectedCurrency);
        
        const current = Number(monthlyGoal.currentAmount);
        const convertedCurrent = targetCurrency === selectedCurrency 
          ? current 
          : await convertCurrency(current, targetCurrency, selectedCurrency);
        
        setSavingsProgress({
          target: convertedTarget,
          current: convertedCurrent,
          remaining: convertedTarget - (monthIncome - monthExpenses),
        });
      } catch (error) {
        console.error("Error converting goal currency:", error);
        const target = Number(monthlyGoal.targetAmount);
        const current = Number(monthlyGoal.currentAmount);
        setSavingsProgress({
          target,
          current,
          remaining: target - (monthIncome - monthExpenses),
        });
      }
    })();
  }, [monthlyGoal, selectedCurrency, monthIncome, monthExpenses]);

  async function handleCreateSavingsGoal() {
    if (!savingsGoal.trim()) {
      setSavingsError("El monto es requerido");
      return;
    }

    const amount = parseFloat(savingsGoal);
    if (isNaN(amount) || amount <= 0) {
      setSavingsError("El monto debe ser un número mayor a 0");
      return;
    }

    setSavingsError("");
    try {
      const now = new Date();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      await api("/goals", {
        method: "POST",
        body: JSON.stringify({
          name: "Meta de ahorro mensual",
          targetAmount: amount,
          deadline: lastDay.toISOString().split('T')[0],
        }),
      });
      setSavingsGoal("");
      setShowSavingsModal(false);
      const goals = await api<Goal[]>("/goals/user");
      setUserGoals(goals || []);
    } catch (e: any) {
      setSavingsError(e.message || "Error al crear meta");
    }
  }

  async function handleDeleteSavingsGoal() {
    if (!monthlyGoal) return;
    if (!confirm("¿Estás seguro de eliminar esta meta de ahorro?")) return;
    
    try {
      await api(`/goals/${monthlyGoal.id}`, { method: "DELETE" });
      const goals = await api<Goal[]>("/goals/user");
      setUserGoals(goals || []);
    } catch (e: any) {
      console.error("Error deleting goal:", e);
    }
  }

  async function handleCreateReminder() {
    if (!reminderName.trim()) {
      setReminderError("El nombre es requerido");
      return;
    }
    if (!reminderAmount.trim()) {
      setReminderError("El monto es requerido");
      return;
    }
    if (!reminderDueDate) {
      setReminderError("La fecha de vencimiento es requerida");
      return;
    }
    if (!reminderWalletId) {
      setReminderError("Debes seleccionar una billetera");
      return;
    }
    if (!reminderCategoryId) {
      setReminderError("Debes seleccionar una categoría");
      return;
    }

    const dueDate = new Date(reminderDueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dueDate < today) {
      setReminderError("La fecha de vencimiento no puede ser anterior a la fecha actual");
      return;
    }

    const amount = parseFloat(reminderAmount);
    if (isNaN(amount) || amount <= 0) {
      setReminderError("El monto debe ser un número mayor a 0");
      return;
    }

    setReminderError("");
    try {
      await api("/reminders", {
        method: "POST",
        body: JSON.stringify({
          walletId: reminderWalletId,
          categoryId: reminderCategoryId,
          name: reminderName,
          amount: amount,
          description: reminderDescription || undefined,
          dueDate: reminderDueDate,
        }),
      });
      setReminderName("");
      setReminderAmount("");
      setReminderDescription("");
      setReminderDueDate("");
      setReminderCategoryId("");
      setShowReminderModal(false);
      const rems = await api<PaymentReminder[]>("/reminders");
      setReminders(rems || []);
    } catch (e: any) {
      setReminderError(e.message || "Error al crear recordatorio");
    }
  }

  async function handleMarkAsPaid(reminderId: string, renew: boolean = false) {
    try {
      await api(`/reminders/${reminderId}/mark-paid`, {
        method: "PATCH",
        body: JSON.stringify({ renew }),
      });
      const [rems, hist] = await Promise.all([
        api<PaymentReminder[]>("/reminders"),
        api<Transaction[]>("/transactions/history?limit=500"),
      ]);
      setReminders(rems || []);
      setHistory(hist || []);
      setShowRenewDialog(false);
      setReminderToMark(null);
      setAlert({
        message: renew
          ? "✅ Recordatorio marcado como pagado, agregado a tus gastos y renovado para el próximo mes"
          : "✅ Recordatorio marcado como pagado y agregado a tus gastos",
        type: 'info'
      });
      setTimeout(() => setAlert(null), 5000);
    } catch (e: any) {
      setAlert({
        message: e.message || "Error al marcar como pagado",
        type: 'warning'
      });
      setTimeout(() => setAlert(null), 5000);
      setShowRenewDialog(false);
      setReminderToMark(null);
    }
  }

  function handleCheckboxChange(reminderId: string) {
    setReminderToMark(reminderId);
    setShowRenewDialog(true);
  }

  async function handleDeleteReminder(reminderId: string) {
    if (!confirm("¿Estás seguro de eliminar este recordatorio?")) return;
    try {
      await api(`/reminders/${reminderId}`, { method: "DELETE" });
      const rems = await api<PaymentReminder[]>("/reminders");
      setReminders(rems || []);
    } catch (e: any) {
      console.error("Error deleting reminder:", e);
    }
  }

  function handleEditReminder(reminder: PaymentReminder) {
    setEditingReminderId(reminder.id);
    setReminderName(reminder.name);
    setReminderDescription(reminder.description || "");
    setReminderDueDate(reminder.dueDate.split('T')[0]);
    setReminderError("");
    setShowEditReminderModal(true);
  }

  async function handleUpdateReminder() {
    if (!editingReminderId) return;

    if (!reminderName.trim()) {
      setReminderError("El nombre es requerido");
      return;
    }
    if (!reminderDueDate) {
      setReminderError("La fecha de vencimiento es requerida");
      return;
    }

    const dueDate = new Date(reminderDueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dueDate < today) {
      setReminderError("La fecha de vencimiento no puede ser anterior a la fecha actual");
      return;
    }

    setReminderError("");
    try {
      await api(`/reminders/${editingReminderId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: reminderName,
          description: reminderDescription || undefined,
          dueDate: reminderDueDate,
        }),
      });
      setReminderName("");
      setReminderDescription("");
      setReminderDueDate("");
      setEditingReminderId(null);
      setShowEditReminderModal(false);
      const rems = await api<PaymentReminder[]>("/reminders");
      setReminders(rems || []);
    } catch (e: any) {
      setReminderError(e.message || "Error al actualizar recordatorio");
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = chartData.find(d => d.date === label);
      return (
        <div className="card-glass p-4 shadow-lg">
          <p className="text-sm font-semibold text-warm-dark mb-2">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs mb-1" style={{ color: entry.color }}>
              {entry.name}: {fmt(entry.value)}
            </p>
          ))}
          {data && data.details.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#E8E2DE]">
              <p className="text-xs font-medium text-warm-dark mb-2">Detalles:</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {data.details.map((detail, idx) => (
                  <div key={idx} className="text-xs">
                    <span className={detail.type === "EXPENSE" ? "text-rose-600" : "text-emerald-600"}>
                      {detail.type === "EXPENSE" ? "Gasto" : "Ingreso"}: {fmt(detail.amount)}
                    </span>
                    <span className="text-warm"> • {detail.category}</span>
                    {detail.description && (
                      <span className="text-warm"> • {detail.description}</span>
                    )}
                    <span className="text-warm"> • {detail.wallet}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Encabezado + CTA */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-warm-dark mb-1">Dashboard</h1>
          <p className="text-warm text-sm">Resumen rápido de tu economía</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {/* Selector de divisa */}
          <div className="flex items-center gap-2 bg-[#FEFFFF]/50 rounded-lg border border-[#E8E2DE] px-3 py-2">
            <label className="text-xs text-warm font-medium whitespace-nowrap">Divisa:</label>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-medium text-warm-dark cursor-pointer focus:ring-0"
            >
              {CURRENCIES.map(curr => (
                <option key={curr.code} value={curr.code}>
                  {curr.code}
                </option>
              ))}
            </select>
          </div>
          <Link
            href="/wallets"
            className="inline-flex w-fit items-center justify-center btn-orange rounded-lg px-4 py-2 text-sm font-medium text-white"
          >
            Mis billeteras
          </Link>
          <Link
            href="/categories"
            className="inline-flex w-fit items-center justify-center btn-orange rounded-lg px-4 py-2 text-sm font-medium text-white"
          >
            Mis categorías
          </Link>
          <Link
            href="/transactions"
            className="inline-flex w-fit items-center justify-center btn-orange rounded-lg px-4 py-2 text-sm font-medium text-white"
          >
            + Nueva transacción
          </Link>
        </div>
      </div>

      {/* Layout en dos columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna izquierda: Gráfico de gastos e ingresos */}
        <div className="card-glass p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold text-warm-dark">
              Gastos e Ingresos
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setGroupBy('day')}
                disabled={!isAuthenticated}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                  groupBy === 'day'
                    ? "btn-orange text-white"
                    : "border border-[#E8E2DE] text-warm-dark hover:bg-[#E8E2DE]/50"
                } ${!isAuthenticated ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Por día
              </button>
              <button
                onClick={() => setGroupBy('month')}
                disabled={!isAuthenticated}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                  groupBy === 'month'
                    ? "btn-orange text-white"
                    : "border border-[#E8E2DE] text-warm-dark hover:bg-[#E8E2DE]/50"
                } ${!isAuthenticated ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Por mes
              </button>
            </div>
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-warm text-sm">Cargando gráfico...</div>
          ) : chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-warm text-sm">No hay datos aún.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E2DE" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  stroke="#9F8B7D"
                  style={{ fontSize: '11px' }}
                  angle={0}
                  textAnchor="middle"
                  height={40}
                />
                <YAxis 
                  stroke="#9F8B7D"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => fmt(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  name="Gastos"
                  stroke="#EF4444" 
                  strokeWidth={2}
                  dot={{ fill: '#EF4444', r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  name="Ingresos"
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Columna derecha: Stats con meta de ahorro */}
        <div className="space-y-4">
          {/* Meta de ahorro mensual */}
          {monthlyGoal && (
            <div className="card-glass p-4 border-l-4 border-[#FE8625]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-sm font-semibold text-warm-dark">Meta de ahorro mensual</h3>
                <button
                  onClick={handleDeleteSavingsGoal}
                  disabled={!isAuthenticated}
                  className={`text-xs font-medium ${!isAuthenticated ? "opacity-50 cursor-not-allowed text-warm" : "text-rose-600 hover:text-rose-700"}`}
                >
                  ✕ Eliminar
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-warm">Progreso</span>
                  <span className="text-warm-dark font-medium">
                    {fmt(savingsProgress!.remaining >= 0 ? savingsProgress!.remaining : 0)} restantes
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#E8E2DE] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      savingsProgress!.remaining < 0 ? "bg-rose-500" : "gradient-orange"
                    }`}
                    style={{ 
                      width: `${Math.min(100, Math.max(0, ((monthIncome - monthExpenses) / savingsProgress!.target) * 100))}%` 
                    }}
                  />
                </div>
                <div className="text-xs text-warm">
                  Meta: {fmt(savingsProgress!.target)} • Actual: {fmt(monthIncome - monthExpenses)}
                </div>
              </div>
            </div>
          )}

          {/* KPIs / Stats */}
          <div className="grid grid-cols-1 gap-4">
            {converting ? (
              <div className="card-glass p-4 text-center text-warm text-sm">
                Convirtiendo divisas...
              </div>
            ) : (
              <>
                <Stat
                  title="Gasto del mes"
                  value={fmt(monthExpenses)}
                  hint="Total de gastos este mes"
                />
                <Stat 
                  title="Ingresos del mes" 
                  value={fmt(monthIncome)} 
                  hint="Total de ingresos este mes" 
                />
                <Stat 
                  title="Saldo neto" 
                  value={fmt(netBalance)} 
                  hint="Ingresos - Gastos"
                  isNegative={netBalance < 0}
                />
              </>
            )}
          </div>

          {/* Botón para crear meta si no existe */}
          {!monthlyGoal && (
            <button
              onClick={() => {
                setSavingsGoal("");
                setSavingsError("");
                setShowSavingsModal(true);
              }}
              disabled={!isAuthenticated}
              className={`w-full card-glass p-4 text-left transition ${!isAuthenticated ? "opacity-50 cursor-not-allowed" : "hover:shadow-lg"}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-sm font-semibold text-warm-dark mb-1">Meta de ahorro mensual</h3>
                  <p className="text-xs text-warm">Crea una meta para ahorrar este mes</p>
                </div>
                <span className="text-2xl">+</span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Recordatorios de pago */}
      <div className="card-glass p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-warm-dark">Recordatorios de pago</h3>
          <button
            onClick={async () => {
              setReminderName("");
              setReminderAmount("");
              setReminderDescription("");
              setReminderDueDate("");
              setReminderCategoryId("");
              setReminderError("");
              if (wallets.length > 0 && !reminderWalletId) {
                const defaultWallet = wallets.find(w => w.isDefault) || wallets[0];
                setReminderWalletId(defaultWallet.id);
              }
              try {
                const cats = await api<Category[]>("/categories?type=EXPENSE");
                setExpenseCategories(cats || []);
              } catch (e) {
                console.error("Error loading categories:", e);
              }
              setShowReminderModal(true);
            }}
            disabled={!isAuthenticated}
            className={`btn-orange rounded-lg px-3 py-1.5 text-xs font-medium text-white ${!isAuthenticated ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            + Nuevo recordatorio
          </button>
        </div>
        {loading ? (
          <p className="text-warm text-sm">Cargando...</p>
        ) : reminders.filter(r => !r.isPaid).length === 0 ? (
          <p className="text-warm text-sm">No tienes recordatorios pendientes.</p>
        ) : (
          <div className="space-y-2">
            {reminders.filter(r => !r.isPaid).map((reminder) => {
              const dueDate = new Date(reminder.dueDate);
              const isOverdue = dueDate < new Date() && !reminder.isPaid;
              const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              
              return (
                <div
                  key={reminder.id}
                  className={`rounded-lg border px-3 py-2 ${
                    isOverdue 
                      ? "border-rose-500 bg-rose-50/30" 
                      : daysUntilDue <= 3 
                        ? "border-amber-500 bg-amber-50/30"
                        : "border-[#E8E2DE] bg-[#FEFFFF]/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={reminder.isPaid}
                        onChange={() => handleCheckboxChange(reminder.id)}
                        disabled={reminder.isPaid || !isAuthenticated}
                        className="mt-1 w-4 h-4 rounded border-[#E8E2DE] text-[#FE8625] focus:ring-[#FE8625] focus:ring-2 disabled:opacity-50"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-warm-dark">{reminder.name}</p>
                        {reminder.description && (
                          <p className="text-xs text-warm mt-0.5">{reminder.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-warm">
                            {reminder.wallet?.name || "Billetera"} • 
                            Vence: {dueDate.toLocaleDateString('es-CO')}
                          </p>
                          {isOverdue && (
                            <span className="text-xs font-medium text-rose-600">⚠️ Vencido</span>
                          )}
                          {!isOverdue && daysUntilDue <= 3 && (
                            <span className="text-xs font-medium text-amber-600">⚠️ Próximo a vencer</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-warm-dark">
                          {fmt(Number(reminder.amount), reminder.wallet?.currency || "COP")}
                        </p>
                      </div>
                      <button
                        onClick={() => handleEditReminder(reminder)}
                        disabled={!isAuthenticated}
                        className={`text-xs font-medium ${!isAuthenticated ? "opacity-50 cursor-not-allowed text-warm" : "text-[#FE8625] hover:text-[#FF9A4D]"}`}
                        title="Editar recordatorio"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteReminder(reminder.id)}
                        disabled={!isAuthenticated}
                        className={`text-xs font-medium ${!isAuthenticated ? "opacity-50 cursor-not-allowed text-warm" : "text-rose-600 hover:text-rose-700"}`}
                        title="Eliminar recordatorio"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Histórico de transacciones */}
      <div className="card-glass p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-warm-dark">Histórico reciente</h3>
          <Link
            href="/transactions"
            className="text-sm text-warm hover:text-warm-dark font-medium"
          >
            Ver todo →
          </Link>
        </div>
        {loading ? (
          <p className="text-warm text-sm">Cargando...</p>
        ) : history.length === 0 ? (
          <p className="text-warm text-sm">Aún no hay movimientos.</p>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 10).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/30 px-3 py-2"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-warm-dark">
                    {tx.description || tx.category?.name || "Sin descripción"}
                  </p>
                  <p className="text-xs text-warm">
                    {tx.wallet?.name || "Billetera"} • {new Date(tx.date).toLocaleDateString('es-CO')}
                  </p>
                </div>
                <div className={`text-sm font-semibold ${
                  tx.type === "EXPENSE" ? "text-rose-600" : "text-emerald-600"
                }`}>
                  {tx.type === "EXPENSE" ? "-" : "+"}{fmt(Number(tx.amount))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para crear meta de ahorro */}
      {showSavingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="card-glass p-6 w-full max-w-md mx-4 shadow-2xl">
            <h2 className="text-lg font-semibold text-warm-dark mb-2">Crear meta de ahorro mensual</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">Monto objetivo (COP)</label>
                <input
                  type="number"
                  value={savingsGoal}
                  onChange={(e) => setSavingsGoal(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
                />
              </div>
              {savingsError && (
                <p className="text-xs text-rose-600 font-medium">{savingsError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setShowSavingsModal(false);
                    setSavingsGoal("");
                    setSavingsError("");
                  }}
                  className="flex-1 rounded-lg border border-[#E8E2DE] px-3 py-2 text-xs font-medium text-warm-dark hover:bg-[#E8E2DE]/50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateSavingsGoal}
                  disabled={!isAuthenticated}
                  className={`flex-1 btn-orange rounded-lg px-3 py-2 text-xs font-medium text-white ${!isAuthenticated ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Crear meta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para crear recordatorio */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="card-glass p-6 w-full max-w-md mx-4 shadow-2xl">
            <h2 className="text-lg font-semibold text-warm-dark mb-4">Nuevo recordatorio de pago</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">Nombre del recordatorio *</label>
                <input
                  type="text"
                  value={reminderName}
                  onChange={(e) => setReminderName(e.target.value)}
                  placeholder="Ej: Pago de arriendo"
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">Monto *</label>
                <input
                  type="number"
                  value={reminderAmount}
                  onChange={(e) => setReminderAmount(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">Billetera *</label>
                <select
                  value={reminderWalletId}
                  onChange={(e) => setReminderWalletId(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark focus:outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
                >
                  <option value="">Selecciona una billetera</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">Categoría de gasto *</label>
                <select
                  value={reminderCategoryId}
                  onChange={(e) => setReminderCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark focus:outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
                >
                  <option value="">Selecciona una categoría</option>
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">Fecha de vencimiento *</label>
                <input
                  type="date"
                  value={reminderDueDate}
                  onChange={(e) => setReminderDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark focus:outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">Descripción (opcional)</label>
                <textarea
                  value={reminderDescription}
                  onChange={(e) => setReminderDescription(e.target.value)}
                  placeholder="Notas adicionales sobre este pago..."
                  rows={3}
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50 resize-none"
                />
              </div>
              {reminderError && (
                <p className="text-xs text-rose-600 font-medium">{reminderError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setShowReminderModal(false);
                    setReminderName("");
                    setReminderAmount("");
                    setReminderDescription("");
                    setReminderDueDate("");
                    setReminderCategoryId("");
                    setReminderError("");
                  }}
                  className="flex-1 rounded-lg border border-[#E8E2DE] px-3 py-2 text-xs font-medium text-warm-dark hover:bg-[#E8E2DE]/50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateReminder}
                  disabled={!isAuthenticated}
                  className={`flex-1 btn-orange rounded-lg px-3 py-2 text-xs font-medium text-white ${!isAuthenticated ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Crear recordatorio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar recordatorio */}
      {showEditReminderModal && editingReminderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="card-glass p-6 w-full max-w-md mx-4 shadow-2xl">
            <h2 className="text-lg font-semibold text-warm-dark mb-4">Editar recordatorio</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">Nombre del recordatorio *</label>
                <input
                  type="text"
                  value={reminderName}
                  onChange={(e) => setReminderName(e.target.value)}
                  placeholder="Ej: Pago de arriendo"
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">Fecha de vencimiento *</label>
                <input
                  type="date"
                  value={reminderDueDate}
                  onChange={(e) => setReminderDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark focus:outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">Descripción (opcional)</label>
                <textarea
                  value={reminderDescription}
                  onChange={(e) => setReminderDescription(e.target.value)}
                  placeholder="Notas adicionales sobre este pago..."
                  rows={3}
                  className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FE8625]/30 focus:border-[#FE8625]/50 resize-none"
                />
              </div>
              {reminderError && (
                <p className="text-xs text-rose-600 font-medium">{reminderError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setShowEditReminderModal(false);
                    setReminderName("");
                    setReminderDescription("");
                    setReminderDueDate("");
                    setEditingReminderId(null);
                    setReminderError("");
                  }}
                  className="flex-1 rounded-lg border border-[#E8E2DE] px-3 py-2 text-xs font-medium text-warm-dark hover:bg-[#E8E2DE]/50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateReminder}
                  disabled={!isAuthenticated}
                  className={`flex-1 btn-orange rounded-lg px-3 py-2 text-xs font-medium text-white ${!isAuthenticated ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de renovación */}
      {showRenewDialog && reminderToMark && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="card-glass p-6 w-full max-w-md mx-4 shadow-2xl">
            <h2 className="text-lg font-semibold text-warm-dark mb-4">¿Renovar recordatorio?</h2>
            <p className="text-sm text-warm-dark mb-4">
              ¿Deseas renovar este recordatorio para el próximo mes con el mismo monto, nombre y descripción?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRenewDialog(false);
                  setReminderToMark(null);
                }}
                className="flex-1 rounded-lg border border-[#E8E2DE] px-3 py-2 text-xs font-medium text-warm-dark hover:bg-[#E8E2DE]/50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (reminderToMark) {
                    handleMarkAsPaid(reminderToMark, false);
                  }
                }}
                disabled={!isAuthenticated}
                className={`flex-1 rounded-lg border border-[#E8E2DE] px-3 py-2 text-xs font-medium text-warm-dark transition ${!isAuthenticated ? "opacity-50 cursor-not-allowed" : "hover:bg-[#E8E2DE]/50"}`}
              >
                No renovar
              </button>
              <button
                onClick={() => {
                  if (reminderToMark) {
                    handleMarkAsPaid(reminderToMark, true);
                  }
                }}
                disabled={!isAuthenticated}
                className={`flex-1 btn-orange rounded-lg px-3 py-2 text-xs font-medium text-white ${!isAuthenticated ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Sí, renovar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alerta en parte inferior derecha */}
      {alert && (
        <div className={`fixed bottom-4 right-4 z-50 card-glass p-4 shadow-2xl max-w-sm animate-slide-up ${
          alert.type === 'warning' ? 'border-l-4 border-rose-500' : 'border-l-4 border-emerald-500'
        }`}>
          <p className="text-sm text-warm-dark">{alert.message}</p>
        </div>
      )}
    </div>
  );
}

/* ---------- UI helpers ---------- */

function Stat({
                title,
                value,
                hint,
                isNegative,
              }: {
  title: string;
  value: string | number;
  hint?: string;
  isNegative?: boolean;
}) {
  if (isNegative) {
    return (
      <div className="bg-rose-500 text-white rounded-lg p-5 shadow-lg transform scale-105">
        <div className="text-xs font-medium mb-1.5 opacity-90">{title}</div>
        <div className="text-3xl font-semibold mb-1">{value}</div>
        {hint ? <div className="text-xs opacity-80">{hint}</div> : null}
      </div>
    );
  }
  return (
    <div className="card-glass p-4">
      <div className="text-xs text-warm font-medium mb-1.5">{title}</div>
      <div className="text-2xl font-semibold text-warm-dark mb-1">{value}</div>
      {hint ? <div className="text-xs text-warm">{hint}</div> : null}
    </div>
  );
}

