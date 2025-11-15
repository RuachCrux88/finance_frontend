"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, AuthError } from "@/lib/api";
import { fetchMe } from "@/utils/session";
import type { Transaction, ChartDataPoint, Goal, PaymentReminder, Wallet, Category, User } from "@/types";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import { convertCurrency, CURRENCIES } from "@/utils/currency";
import Modal from "@/components/Modal";
import { Target, Sparkle } from "phosphor-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { translateCategory } from "@/utils/categoryTranslations";

export default function Dashboard() {
  const { language, t } = useLanguage();
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
  const [goalName, setGoalName] = useState<string>("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalDeadline, setGoalDeadline] = useState<string>("");
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [achievedGoalName, setAchievedGoalName] = useState("");
  const [activeGoalTab, setActiveGoalTab] = useState<"pending" | "achieved">("pending");
  const [achievedGoals, setAchievedGoals] = useState<Goal[]>([]);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [goalProgress, setGoalProgress] = useState<Record<string, any[]>>({});
  const [showEditGoalModal, setShowEditGoalModal] = useState<string | null>(null);
  const [editGoalName, setEditGoalName] = useState("");
  const [editGoalDescription, setEditGoalDescription] = useState("");
  const [editGoalDeadline, setEditGoalDeadline] = useState("");
  const [editGoalAmount, setEditGoalAmount] = useState("");
  const [editGoalError, setEditGoalError] = useState("");
  const [showGoalDetailModal, setShowGoalDetailModal] = useState<string | null>(null);
  const [showDeleteGoalConfirm, setShowDeleteGoalConfirm] = useState<string | null>(null);
  const [showDeleteReminderConfirm, setShowDeleteReminderConfirm] = useState<string | null>(null);
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
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('COP');
  const [converting, setConverting] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Verificar autenticación y obtener usuario
  useEffect(() => {
    fetchMe()
      .then((u) => {
        setIsAuthenticated(true);
        setUser(u);
      })
      .catch(() => setIsAuthenticated(false));
  }, []);

  useEffect(() => {
    if (!user) return; // Esperar a que el usuario esté cargado
    
    (async () => {
      try {
        setLoading(true);
        
        // Calcular días desde la fecha de registro del usuario
        let days = 30; // Valor por defecto
        if (user.createdAt) {
          const registrationDate = new Date(user.createdAt);
          const today = new Date();
          const diffTime = Math.abs(today.getTime() - registrationDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          days = Math.max(diffDays, 1); // Mínimo 1 día
        } else {
          // Si no hay fecha de registro, usar valores por defecto según groupBy
          days = groupBy === 'day' ? 30 : 730;
        }
        
        const [chart, hist, goals, achieved, rems, wals] = await Promise.all([
          api<ChartDataPoint[]>(`/transactions/chart-data?days=${days}&groupBy=${groupBy}`).catch(() => []),
          api<Transaction[]>("/transactions/history?limit=500").catch(() => []),
          api<Goal[]>("/goals/user").catch(() => []),
          api<Goal[]>("/goals/achieved").catch(() => []),
          api<PaymentReminder[]>("/reminders").catch(() => []),
          api<Wallet[]>("/wallets").catch(() => []),
        ]);
        setChartData(chart || []);
        setHistory(hist || []);
        setUserGoals(goals || []);
        setAchievedGoals(achieved || []);
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
  }, [groupBy, user]);

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
          message: `Te quedan ${fmt(remaining)} para cumplir tu meta de ahorro mensual.`,
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
    if (!goalName.trim()) {
      setSavingsError(t("dashboard.nameRequired"));
      return;
    }

    if (!savingsGoal.trim()) {
      setSavingsError(t("dashboard.amountRequired"));
      return;
    }

    const amount = parseFloat(savingsGoal);
    if (isNaN(amount) || amount <= 0) {
      setSavingsError(t("dashboard.amountMustBePositive"));
      return;
    }

    setSavingsError("");
    try {
      await api("/goals", {
        method: "POST",
        body: JSON.stringify({
          name: goalName.trim(),
          description: goalDescription.trim() || undefined,
          targetAmount: amount,
          deadline: goalDeadline || undefined,
        }),
      });
      setSavingsGoal("");
      setGoalName("");
      setGoalDescription("");
      setGoalDeadline("");
      setShowSavingsModal(false);
      const goals = await api<Goal[]>("/goals/user");
      setUserGoals(goals || []);
      const achieved = await api<Goal[]>("/goals/achieved").catch(() => []);
      setAchievedGoals(achieved || []);
    } catch (e: any) {
      setSavingsError(e.message || t("dashboard.errorCreatingGoal"));
    }
  }

  async function handleDeleteGoal(goalId: string) {
    try {
      await api(`/goals/${goalId}`, { method: "DELETE" });
      const goals = await api<Goal[]>("/goals/user");
      setUserGoals(goals || []);
      const achieved = await api<Goal[]>("/goals/achieved").catch(() => []);
      setAchievedGoals(achieved || []);
      setShowDeleteGoalConfirm(null);
    } catch (e: any) {
      console.error("Error deleting goal:", e);
      setEditGoalError(e.message || t("dashboard.errorDeletingGoal"));
    }
  }

  function handleEditGoal(goal: Goal) {
    setShowEditGoalModal(goal.id);
    setEditGoalName(goal.name);
    setEditGoalDescription(goal.description || "");
    setEditGoalDeadline(goal.deadline ? goal.deadline.split('T')[0] : "");
    setEditGoalAmount(goal.targetAmount);
    setEditGoalError("");
  }

  async function handleUpdateGoal() {
    if (!showEditGoalModal) return;

    if (!editGoalName.trim()) {
      setEditGoalError(t("dashboard.nameRequired"));
      return;
    }

    const amount = parseFloat(editGoalAmount);
    if (isNaN(amount) || amount <= 0) {
      setEditGoalError(t("dashboard.amountMustBePositive"));
      return;
    }

    setEditGoalError("");
    try {
      await api(`/goals/${showEditGoalModal}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editGoalName.trim(),
          description: editGoalDescription.trim() || undefined,
          targetAmount: amount,
          deadline: editGoalDeadline || undefined,
        }),
      });
      setShowEditGoalModal(null);
      setEditGoalName("");
      setEditGoalDescription("");
      setEditGoalDeadline("");
      setEditGoalAmount("");
      const goals = await api<Goal[]>("/goals/user");
      setUserGoals(goals || []);
      const achieved = await api<Goal[]>("/goals/achieved").catch(() => []);
      setAchievedGoals(achieved || []);
    } catch (e: any) {
      setEditGoalError(e.message || t("dashboard.errorUpdatingGoal"));
    }
  }

  // Función para cargar metas cumplidas
  const loadAchievedGoals = async () => {
    try {
      const achieved = await api<Goal[]>("/goals/achieved");
      setAchievedGoals(achieved || []);
    } catch (err) {
      console.error("Error al cargar metas cumplidas:", err);
      setAchievedGoals([]);
    }
  };

  // Función para marcar meta como cumplida
  const handleMarkAsAchieved = async (goalId: string, goalName: string) => {
    try {
      await api(`/goals/${goalId}/achieve`, {
        method: "PATCH",
      });
      // Recargar metas pendientes
      const updated = await api<Goal[]>("/goals/user");
      setUserGoals(updated || []);
      // Recargar metas cumplidas
      await loadAchievedGoals();
      
      // Mostrar popup de felicitación
      setAchievedGoalName(goalName);
      setShowAchievementModal(true);
    } catch (e: any) {
      alert(e.message || t("dashboard.errorLoadingAchievedGoals"));
    }
  };

  async function handleCreateReminder() {
    if (!reminderName.trim()) {
      setReminderError(t("dashboard.nameRequired"));
      return;
    }
    if (!reminderAmount.trim()) {
      setReminderError(t("dashboard.amountRequired"));
      return;
    }
    if (!reminderDueDate) {
      setReminderError(t("dashboard.dateRequired"));
      return;
    }
    if (!reminderWalletId) {
      setReminderError(t("dashboard.walletRequired"));
      return;
    }
    if (!reminderCategoryId) {
      setReminderError(t("dashboard.categoryRequired"));
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
      setReminderError(e.message || t("dashboard.errorCreatingReminder"));
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
    try {
      await api(`/reminders/${reminderId}`, { method: "DELETE" });
      const rems = await api<PaymentReminder[]>("/reminders");
      setReminders(rems || []);
      setShowDeleteReminderConfirm(null);
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
      setReminderError(t("dashboard.nameRequired"));
      return;
    }
    if (!reminderDueDate) {
      setReminderError(t("dashboard.dateRequired"));
      return;
    }

    const dueDate = new Date(reminderDueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dueDate < today) {
      setReminderError(t("dashboard.dateMustBeFuture"));
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
      setReminderError(e.message || t("dashboard.errorUpdatingReminder"));
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
            <div className="mt-3 pt-3 border-t border-[#FFB6C1]/30">
              <p className="text-xs font-medium text-warm-dark mb-2">{t("dashboard.details")}:</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {data.details.map((detail, idx) => (
                  <div key={idx} className="text-xs">
                    <span className={detail.type === "EXPENSE" ? "text-rose-600" : "text-emerald-600"}>
                      {detail.type === "EXPENSE" ? t("dashboard.expense") : t("dashboard.income")}: {fmt(detail.amount)}
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
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-warm-dark mb-1 font-financial-bold">{t("dashboard.title")}</h1>
          <p className="text-warm text-sm font-financial">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {/* Selector de divisa */}
          <div className="flex items-center gap-2 bg-[#FEFFFF]/50 rounded-lg border border-[#E8E2DE] px-3 py-2">
            <label className="text-xs text-warm font-medium whitespace-nowrap">{t("wallets.currency")}:</label>
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
            {t("dashboard.myWallets")}
          </Link>
          <Link
            href="/categories"
            className="inline-flex w-fit items-center justify-center btn-orange rounded-lg px-4 py-2 text-sm font-medium text-white"
          >
            {t("dashboard.myCategories")}
          </Link>
          <Link
            href="/transactions"
            className="inline-flex w-fit items-center justify-center btn-orange rounded-lg px-4 py-2 text-sm font-medium text-white"
          >
            + {t("dashboard.newTransaction")}
          </Link>
        </div>
      </div>

      {/* Layout en dos columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna izquierda: Gráfico de gastos e ingresos */}
        <div className="card-glass p-5 relative overflow-hidden">
          {/* Fondo decorativo con gradientes suaves */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
            <div className="absolute top-0 left-0 w-full h-full opacity-30">
              <div 
                className="absolute top-0 left-0 w-full h-1/2"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 140, 148, 0.15) 0%, rgba(218, 112, 214, 0.15) 50%, rgba(147, 112, 219, 0.1) 100%)',
                  clipPath: 'polygon(0 0, 100% 0, 100% 60%, 0 80%)',
                }}
              />
              <div 
                className="absolute bottom-0 left-0 w-full h-1/2"
                style={{
                  background: 'linear-gradient(135deg, rgba(147, 112, 219, 0.1) 0%, rgba(218, 112, 214, 0.15) 50%, rgba(255, 140, 148, 0.15) 100%)',
                  clipPath: 'polygon(0 20%, 100% 40%, 100% 100%, 0 100%)',
                }}
              />
            </div>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-warm-dark font-financial-bold">
                {t("dashboard.financeDynamic")}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setGroupBy('day')}
                  disabled={!isAuthenticated}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                    groupBy === 'day'
                      ? "btn-orange text-white"
                      : "border border-[#FFB6C1]/30 text-warm-dark hover:bg-[#FFB6C1]/20"
                  } ${!isAuthenticated ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {t("dashboard.byDay")}
                </button>
                <button
                  onClick={() => setGroupBy('month')}
                  disabled={!isAuthenticated}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                    groupBy === 'month'
                      ? "btn-orange text-white"
                      : "border border-[#FFB6C1]/30 text-warm-dark hover:bg-[#FFB6C1]/20"
                  } ${!isAuthenticated ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {t("dashboard.byMonth")}
                </button>
              </div>
            </div>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-warm text-sm font-financial">{t("dashboard.loadingChart")}</div>
            ) : chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-warm text-sm font-financial">{t("dashboard.noChartData")}</div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    {/* Gradiente para gastos */}
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF8C94" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#C7366F" stopOpacity={0.3}/>
                    </linearGradient>
                    {/* Gradiente para ingresos */}
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#DA70D6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#9370DB" stopOpacity={0.3}/>
                    </linearGradient>
                    {/* Gradiente translúcido para efecto de profundidad - gastos */}
                    <linearGradient id="colorExpensesShadow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF8C94" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#C7366F" stopOpacity={0.1}/>
                    </linearGradient>
                    {/* Gradiente translúcido para efecto de profundidad - ingresos */}
                    <linearGradient id="colorIncomeShadow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#DA70D6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#9370DB" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 182, 193, 0.2)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    stroke="#8B6F7A"
                    style={{ fontSize: '11px', fontFamily: 'var(--font-sans)', fontWeight: 500 }}
                    angle={0}
                    textAnchor="middle"
                    height={40}
                    tick={{ fill: '#8B6F7A' }}
                  />
                  <YAxis 
                    stroke="#8B6F7A"
                    style={{ fontSize: '12px', fontFamily: 'var(--font-sans)', fontWeight: 500 }}
                    tickFormatter={(value) => fmt(value)}
                    tick={{ fill: '#8B6F7A' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {/* Áreas con gradiente para efecto de profundidad (capa trasera) */}
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    fill="url(#colorExpensesShadow)"
                    stroke="none"
                    strokeWidth={0}
                    isAnimationActive={true}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    fill="url(#colorIncomeShadow)"
                    stroke="none"
                    strokeWidth={0}
                    isAnimationActive={true}
                  />
                  {/* Áreas principales con gradiente */}
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    name={t("dashboard.expenses")}
                    fill="url(#colorExpenses)"
                    stroke="#FF8C94"
                    strokeWidth={2.5}
                    dot={{ fill: '#FF8C94', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#FF8C94', strokeWidth: 2 }}
                    isAnimationActive={true}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    name={t("dashboard.income")}
                    fill="url(#colorIncome)"
                    stroke="#DA70D6"
                    strokeWidth={2.5}
                    dot={{ fill: '#DA70D6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#DA70D6', strokeWidth: 2 }}
                    isAnimationActive={true}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Columna derecha: Stats */}
        <div className="space-y-4">
          {/* KPIs / Stats */}
          <div className="grid grid-cols-1 gap-4">
            {converting ? (
              <div className="card-glass p-4 text-center text-warm text-sm">
                {t("dashboard.convertingCurrencies")}
              </div>
            ) : (
              <>
                <Stat
                  title={t("dashboard.monthExpenses")}
                  value={fmt(monthExpenses)}
                  hint={t("dashboard.expensesHint")}
                />
                <Stat 
                  title={t("dashboard.monthIncome")} 
                  value={fmt(monthIncome)} 
                  hint={t("dashboard.incomeHint")} 
                />
                <Stat 
                  title={t("dashboard.netBalance")} 
                  value={fmt(netBalance)} 
                  hint={t("dashboard.balanceHint")}
                  isNegative={netBalance < 0}
                />
              </>
            )}
          </div>

          {/* Sección completa de metas personales */}
          <div className="card-glass p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-warm-dark font-financial-bold">{t("dashboard.savingsGoals")}</h3>
              <button
                onClick={() => {
                  setSavingsGoal("");
                  setGoalName("");
                  setGoalDescription("");
                  setGoalDeadline("");
                  setSavingsError("");
                  setShowSavingsModal(true);
                }}
                disabled={!isAuthenticated}
                className={`btn-orange rounded-lg px-3 py-1.5 text-xs font-medium text-white ${!isAuthenticated ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                + {t("dashboard.createGoal")}
              </button>
            </div>

            {/* Tabs para pendientes y cumplidas */}
            <div className="flex gap-2 border-b border-[#FFB6C1]/30 mb-4">
              <button
                onClick={() => setActiveGoalTab("pending")}
                className={`px-4 py-2 text-sm font-medium transition ${
                  activeGoalTab === "pending"
                    ? "text-[#DA70D6] border-b-2 border-[#DA70D6]"
                    : "text-warm hover:text-warm-dark"
                }`}
              >
                {t("dashboard.pending")} ({userGoals.filter(g => g.status !== "ACHIEVED").length})
              </button>
              <button
                onClick={() => {
                  setActiveGoalTab("achieved");
                  if (achievedGoals.length === 0) {
                    loadAchievedGoals();
                  }
                }}
                className={`px-4 py-2 text-sm font-medium transition ${
                  activeGoalTab === "achieved"
                    ? "text-[#DA70D6] border-b-2 border-[#DA70D6]"
                    : "text-warm hover:text-warm-dark"
                }`}
              >
                {t("dashboard.achieved")} ({achievedGoals.length})
              </button>
            </div>

            {/* Metas pendientes */}
            {activeGoalTab === "pending" && (
              <>
                {userGoals.filter(g => g.status !== "ACHIEVED").length === 0 ? (
                  <div className="rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/30 px-4 py-6 text-warm text-sm text-center font-financial">
                    {t("dashboard.noPendingGoals")}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userGoals.filter(g => g.status !== "ACHIEVED").map((goal) => {
                      const current = Number(goal.currentAmount);
                      const target = Number(goal.targetAmount);
                      const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
                      const isAchieved = current >= target;
                      const isExpanded = expandedGoal === goal.id;
                      const progress = goalProgress[goal.id] || [];
                      
                      return (
                        <div
                          key={goal.id}
                          className="rounded-lg border border-[#FFB6C1]/30 bg-[#FEFFFF]/30 px-4 py-4"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-warm-dark text-base">{goal.name}</h3>
                              </div>
                              {goal.description && (
                                <p className="text-sm text-warm mb-2">{goal.description}</p>
                              )}
                              <p className="text-sm text-warm">
                                {fmt(current, selectedCurrency)} / {fmt(target, selectedCurrency)}
                              </p>
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
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={async () => {
                                    setShowGoalDetailModal(goal.id);
                                    try {
                                      const prog = await api<any[]>(`/goals/progress/${goal.id}`);
                                      setGoalProgress(prev => ({ ...prev, [goal.id]: prog || [] }));
                                    } catch {}
                                  }}
                                  className="text-xs text-warm hover:text-warm-dark font-medium rounded-lg border border-[#E8E2DE] px-3 py-1.5 hover:bg-[#E8E2DE]/50 transition"
                                >
                                  {t("dashboard.viewDetails")}
                                </button>
                                <button
                                  onClick={() => handleEditGoal(goal)}
                                  className="btn-edit"
                                >
                                  {t("dashboard.editGoal")}
                                </button>
                                <button
                                  onClick={() => setShowDeleteGoalConfirm(goal.id)}
                                  className="btn-delete"
                                >
                                  {t("dashboard.deleteGoal")}
                                </button>
                              </div>
                            </div>
                          </div>
                          {/* Botón para marcar como cumplida */}
                          {isAchieved && goal.status !== "ACHIEVED" && goal.status !== "CANCELLED" && (
                            <div className="mt-4 pt-4 border-t border-[#FFB6C1]/30">
                              <button
                                onClick={() => handleMarkAsAchieved(goal.id, goal.name)}
                                className="w-full btn-orange rounded-lg px-4 py-2 text-sm font-medium text-white"
                              >
                                🎉 {t("dashboard.markAsAchieved")}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Metas cumplidas */}
            {activeGoalTab === "achieved" && (
              <>
                {achievedGoals.length === 0 ? (
                  <div className="rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/30 px-4 py-6 text-warm text-sm text-center font-financial">
                    {t("dashboard.noAchievedGoals")}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {achievedGoals.map((goal) => {
                      const current = Number(goal.currentAmount);
                      const target = Number(goal.targetAmount);
                      
                      return (
                        <div
                          key={goal.id}
                          className="rounded-lg border-2 border-emerald-500 bg-emerald-50/30 px-4 py-4"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-warm-dark text-base">
                                  ✅ {goal.name}
                                </h3>
                                <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs text-white font-medium">
                                  Cumplida
                                </span>
                              </div>
                              {goal.description && (
                                <p className="text-sm text-warm mb-2">{goal.description}</p>
                              )}
                              <p className="text-sm text-warm">
                                {t("dashboard.goalReached")}: {fmt(target, selectedCurrency)}
                              </p>
                              {goal.createdAt && (
                                <p className="text-xs text-warm mt-1">
                                  Cumplida: {new Date(goal.createdAt).toLocaleDateString('es-CO')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Recordatorios de pago */}
      <div className="card-glass p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-warm-dark font-financial-bold">{t("dashboard.paymentReminders")}</h3>
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
            + {t("dashboard.createReminder")}
          </button>
        </div>
        {loading ? (
          <p className="text-warm text-sm">{t("common.loading")}</p>
        ) : reminders.filter(r => !r.isPaid).length === 0 ? (
          <p className="text-warm text-sm font-financial">{t("dashboard.noReminders")}</p>
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
                        className="mt-1 w-4 h-4 rounded border-[#FFB6C1]/40 text-[#FF8C94] focus:ring-[#FF8C94] focus:ring-2 disabled:opacity-50"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-warm-dark">{reminder.name}</p>
                        {reminder.description && (
                          <p className="text-xs text-warm mt-0.5">{reminder.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-warm">
                            {reminder.wallet?.name || t("dashboard.wallet")} • 
                            {t("dashboard.due")}: {dueDate.toLocaleDateString(language === "es" ? "es-CO" : "en-US")}
                          </p>
                          {isOverdue && (
                            <span className="text-xs font-medium text-rose-600">⚠️ {t("dashboard.overdue")}</span>
                          )}
                          {!isOverdue && daysUntilDue <= 3 && (
                            <span className="text-xs font-medium text-amber-600">⚠️ {t("dashboard.dueSoon")}</span>
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
                        className={`btn-edit-icon ${!isAuthenticated ? "opacity-50 cursor-not-allowed" : ""}`}
                        title={t("dashboard.createReminder")}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setShowDeleteReminderConfirm(reminder.id)}
                        disabled={!isAuthenticated}
                        className={`btn-delete-icon ${!isAuthenticated ? "opacity-50 cursor-not-allowed" : ""}`}
                        title={t("dashboard.deleteReminderConfirm")}
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
          <h3 className="font-display text-lg font-semibold text-warm-dark font-financial-bold">{t("dashboard.recentHistory")}</h3>
          <Link
            href="/transactions"
            className="text-sm text-warm hover:text-warm-dark font-medium"
          >
            {t("dashboard.viewAll")} →
          </Link>
        </div>
        {loading ? (
          <p className="text-warm text-sm">{t("common.loading")}</p>
        ) : history.length === 0 ? (
          <p className="text-warm text-sm font-financial">{t("dashboard.noMovements")}</p>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 10).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-lg border border-[#FFB6C1]/30 bg-[#FEFFFF]/30 px-3 py-2"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-warm-dark">
                    {tx.description || (tx.category ? translateCategory(tx.category, language).name : null) || t("dashboard.noDescription")}
                  </p>
                  <p className="text-xs text-warm">
                    {tx.wallet?.name || t("dashboard.wallet")} • {new Date(tx.date).toLocaleDateString(language === "es" ? "es-CO" : "en-US")}
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
      <Modal
        isOpen={showSavingsModal}
        onClose={() => {
          setShowSavingsModal(false);
          setSavingsGoal("");
          setGoalName("");
          setGoalDescription("");
          setGoalDeadline("");
          setSavingsError("");
        }}
        title={t("dashboard.createGoal")}
      >
        <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">{t("dashboard.goalName")} *</label>
                <input
                  type="text"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  placeholder={t("dashboard.goalNamePlaceholder")}
                  className="w-full rounded-lg border border-[#FFB6C1]/30 bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FF8C94]/30 focus:border-[#FF8C94]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">{t("dashboard.goalAmount")} *</label>
                <input
                  type="number"
                  value={savingsGoal}
                  onChange={(e) => setSavingsGoal(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  className="w-full rounded-lg border border-[#FFB6C1]/30 bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FF8C94]/30 focus:border-[#FF8C94]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">{t("dashboard.goalDescription")}</label>
                <textarea
                  value={goalDescription}
                  onChange={(e) => setGoalDescription(e.target.value)}
                  placeholder={t("dashboard.goalDescriptionPlaceholder")}
                  rows={3}
                  className="w-full rounded-lg border border-[#FFB6C1]/30 bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FF8C94]/30 focus:border-[#FF8C94]/50 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">{t("dashboard.goalDeadline")}</label>
                <input
                  type="date"
                  value={goalDeadline}
                  onChange={(e) => setGoalDeadline(e.target.value)}
                  className="w-full rounded-lg border border-[#FFB6C1]/30 bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark focus:outline-none focus:ring-2 focus:ring-[#FF8C94]/30 focus:border-[#FF8C94]/50"
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
                    setGoalName("");
                    setGoalDescription("");
                    setGoalDeadline("");
                    setSavingsError("");
                  }}
                  className="flex-1 rounded-lg border border-[#FFB6C1]/30 px-3 py-2 text-xs font-medium text-warm-dark hover:bg-[#FFB6C1]/20 transition"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleCreateSavingsGoal}
                  disabled={!isAuthenticated}
                  className={`flex-1 btn-orange rounded-lg px-3 py-2 text-xs font-medium text-white ${!isAuthenticated ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {t("dashboard.createGoal")}
                </button>
              </div>
        </div>
      </Modal>

      {/* Modal para crear recordatorio */}
      <Modal
        isOpen={showReminderModal}
        onClose={() => {
          setShowReminderModal(false);
          setReminderName("");
          setReminderAmount("");
          setReminderDescription("");
          setReminderDueDate("");
          setReminderCategoryId("");
          setReminderError("");
        }}
        title={t("dashboard.createReminder")}
      >
        <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">{t("dashboard.reminderName")} *</label>
                <input
                  type="text"
                  value={reminderName}
                  onChange={(e) => setReminderName(e.target.value)}
                  placeholder={t("dashboard.reminderNamePlaceholder")}
                  className="w-full rounded-lg border border-[#FFB6C1]/30 bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FF8C94]/30 focus:border-[#FF8C94]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">{t("dashboard.reminderAmount")} *</label>
                <input
                  type="number"
                  value={reminderAmount}
                  onChange={(e) => setReminderAmount(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  className="w-full rounded-lg border border-[#FFB6C1]/30 bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FF8C94]/30 focus:border-[#FF8C94]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">{t("dashboard.reminderWallet")} *</label>
                <select
                  value={reminderWalletId}
                  onChange={(e) => setReminderWalletId(e.target.value)}
                  className="w-full rounded-lg border border-[#FFB6C1]/30 bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark focus:outline-none focus:ring-2 focus:ring-[#FF8C94]/30 focus:border-[#FF8C94]/50"
                >
                  <option value="">{t("wallets.currency")}</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">{t("dashboard.reminderCategory")} *</label>
                <select
                  value={reminderCategoryId}
                  onChange={(e) => setReminderCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-[#FFB6C1]/30 bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark focus:outline-none focus:ring-2 focus:ring-[#FF8C94]/30 focus:border-[#FF8C94]/50"
                >
                  <option value="">{t("categories.title")}</option>
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">{t("dashboard.reminderDueDate")} *</label>
                <input
                  type="date"
                  value={reminderDueDate}
                  onChange={(e) => setReminderDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg border border-[#FFB6C1]/30 bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark focus:outline-none focus:ring-2 focus:ring-[#FF8C94]/30 focus:border-[#FF8C94]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">{t("dashboard.reminderDescription")}</label>
                <textarea
                  value={reminderDescription}
                  onChange={(e) => setReminderDescription(e.target.value)}
                  placeholder={t("dashboard.reminderDescriptionPlaceholder")}
                  rows={3}
                  className="w-full rounded-lg border border-[#FFB6C1]/30 bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FF8C94]/30 focus:border-[#FF8C94]/50 resize-none"
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
                  className="flex-1 rounded-lg border border-[#FFB6C1]/30 px-3 py-2 text-xs font-medium text-warm-dark hover:bg-[#FFB6C1]/20 transition"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleCreateReminder}
                  disabled={!isAuthenticated}
                  className={`flex-1 btn-orange rounded-lg px-3 py-2 text-xs font-medium text-white ${!isAuthenticated ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {t("dashboard.createReminder")}
                </button>
              </div>
        </div>
      </Modal>

      {/* Modal para editar recordatorio */}
      <Modal
        isOpen={showEditReminderModal && !!editingReminderId}
        onClose={() => {
          setShowEditReminderModal(false);
          setReminderName("");
          setReminderDescription("");
          setReminderDueDate("");
          setEditingReminderId(null);
          setReminderError("");
        }}
        title={t("dashboard.createReminder")}
      >
        <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">{t("dashboard.reminderName")} *</label>
                <input
                  type="text"
                  value={reminderName}
                  onChange={(e) => setReminderName(e.target.value)}
                  placeholder={t("dashboard.reminderNamePlaceholder")}
                  className="w-full rounded-lg border border-[#FFB6C1]/30 bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FF8C94]/30 focus:border-[#FF8C94]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">{t("dashboard.reminderDueDate")} *</label>
                <input
                  type="date"
                  value={reminderDueDate}
                  onChange={(e) => setReminderDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg border border-[#FFB6C1]/30 bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark focus:outline-none focus:ring-2 focus:ring-[#FF8C94]/30 focus:border-[#FF8C94]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-dark mb-1.5">{t("dashboard.reminderDescription")}</label>
                <textarea
                  value={reminderDescription}
                  onChange={(e) => setReminderDescription(e.target.value)}
                  placeholder={t("dashboard.reminderDescriptionPlaceholder")}
                  rows={3}
                  className="w-full rounded-lg border border-[#FFB6C1]/30 bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FF8C94]/30 focus:border-[#FF8C94]/50 resize-none"
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
                  className="flex-1 rounded-lg border border-[#FFB6C1]/30 px-3 py-2 text-xs font-medium text-warm-dark hover:bg-[#FFB6C1]/20 transition"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleUpdateReminder}
                  disabled={!isAuthenticated}
                  className={`flex-1 btn-orange rounded-lg px-3 py-2 text-xs font-medium text-white ${!isAuthenticated ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {t("common.save")}
                </button>
              </div>
        </div>
      </Modal>

      {/* Diálogo de renovación */}
      <Modal
        isOpen={showRenewDialog && !!reminderToMark}
        onClose={() => {
          setShowRenewDialog(false);
          setReminderToMark(null);
        }}
        title="¿Renovar recordatorio?"
      >
        <p className="text-sm text-warm-dark mb-4">
          ¿Deseas renovar este recordatorio para el próximo mes con el mismo monto, nombre y descripción?
        </p>
        <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRenewDialog(false);
                  setReminderToMark(null);
                }}
                className="flex-1 rounded-lg border border-[#FFB6C1]/30 px-3 py-2 text-xs font-medium text-warm-dark hover:bg-[#FFB6C1]/20 transition"
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
                className={`flex-1 rounded-lg border border-[#FFB6C1]/30 px-3 py-2 text-xs font-medium text-warm-dark transition ${!isAuthenticated ? "opacity-50 cursor-not-allowed" : "hover:bg-[#FFB6C1]/20"}`}
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
                {t("dashboard.renew")}
              </button>
        </div>
      </Modal>

      {/* Alerta en parte inferior derecha */}
      {alert && (
        <div className={`fixed bottom-4 right-4 z-50 card-glass p-4 shadow-2xl max-w-sm animate-slide-up ${
          alert.type === 'warning' ? 'border-l-4 border-rose-500' : 'border-l-4 border-emerald-500'
        }`}>
          <p className="text-sm text-warm-dark">{alert.message}</p>
        </div>
      )}

      {/* Modal de felicitación por meta cumplida */}
      <Modal
        isOpen={showAchievementModal}
        onClose={() => {
          setShowAchievementModal(false);
          setAchievedGoalName("");
        }}
        title=""
        maxWidth="md"
      >
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Sparkle size={64} weight="duotone" className="text-[#DA70D6]" />
          </div>
          <h2 className="text-2xl font-bold text-warm-dark mb-2 font-financial-bold">
            ¡Felicitaciones!
          </h2>
          <p className="text-lg text-warm mb-6">
            Has alcanzado tu meta: <strong>{achievedGoalName}</strong>
          </p>
          <p className="text-sm text-warm mb-6">
            ¡Sigue así! Cada meta cumplida es un paso más hacia tus objetivos financieros.
          </p>
          <button
            onClick={() => {
              setShowAchievementModal(false);
              setAchievedGoalName("");
            }}
            className="btn-orange rounded-lg px-6 py-3 text-base font-medium text-white"
          >
            ¡Genial!
          </button>
        </div>
      </Modal>

      {/* Modal de confirmación para eliminar recordatorio */}
      <Modal
        isOpen={!!showDeleteReminderConfirm}
        onClose={() => setShowDeleteReminderConfirm(null)}
        title={t("dashboard.deleteReminderConfirm")}
      >
        <div className="space-y-4">
          <p className="text-sm text-warm-dark font-financial">
            {t("dashboard.deleteReminderMessage")}
          </p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowDeleteReminderConfirm(null)}
              className="flex-1 rounded-lg border border-[#FFB6C1]/30 px-3 py-2 text-xs font-medium text-warm-dark hover:bg-[#FFB6C1]/20 transition"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={() => {
                if (showDeleteReminderConfirm) {
                  handleDeleteReminder(showDeleteReminderConfirm);
                }
              }}
              className="flex-1 btn-orange rounded-lg px-3 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700"
            >
              {t("common.delete")}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de confirmación para eliminar meta */}
      <Modal
        isOpen={!!showDeleteGoalConfirm}
        onClose={() => setShowDeleteGoalConfirm(null)}
        title={t("dashboard.deleteGoalConfirm")}
      >
        <div className="space-y-4">
          <p className="text-sm text-warm-dark font-financial">
            {t("dashboard.deleteGoalMessage")}
          </p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowDeleteGoalConfirm(null)}
              className="flex-1 rounded-lg border border-[#FFB6C1]/30 px-3 py-2 text-xs font-medium text-warm-dark hover:bg-[#FFB6C1]/20 transition"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={() => {
                if (showDeleteGoalConfirm) {
                  handleDeleteGoal(showDeleteGoalConfirm);
                }
              }}
              className="flex-1 btn-orange rounded-lg px-3 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700"
            >
              {t("common.delete")}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal para editar meta */}
      <Modal
        isOpen={!!showEditGoalModal}
        onClose={() => {
          setShowEditGoalModal(null);
          setEditGoalName("");
          setEditGoalDescription("");
          setEditGoalDeadline("");
          setEditGoalAmount("");
          setEditGoalError("");
        }}
        title={t("dashboard.editGoal")}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-warm-dark mb-1.5">{t("dashboard.goalName")} *</label>
            <input
              type="text"
              value={editGoalName}
              onChange={(e) => setEditGoalName(e.target.value)}
              placeholder="Ej: Meta de ahorro mensual"
              className="w-full rounded-lg border border-[#FFB6C1]/30 bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FF8C94]/30 focus:border-[#FF8C94]/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-warm-dark mb-1.5">Monto objetivo (COP) *</label>
            <input
              type="number"
              value={editGoalAmount}
              onChange={(e) => setEditGoalAmount(e.target.value)}
              placeholder="0.00"
              min="0.01"
              step="0.01"
              className="w-full rounded-lg border border-[#FFB6C1]/30 bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FF8C94]/30 focus:border-[#FF8C94]/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-warm-dark mb-1.5">Descripción (opcional)</label>
            <textarea
              value={editGoalDescription}
              onChange={(e) => setEditGoalDescription(e.target.value)}
              placeholder="Describe tu meta de ahorro..."
              rows={3}
              className="w-full rounded-lg border border-[#FFB6C1]/30 bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-[#FF8C94]/30 focus:border-[#FF8C94]/50 resize-none"
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
                setEditGoalDescription("");
                setEditGoalDeadline("");
                setEditGoalAmount("");
                setEditGoalError("");
              }}
              className="flex-1 rounded-lg border border-[#FFB6C1]/30 px-3 py-2 text-xs font-medium text-warm-dark hover:bg-[#FFB6C1]/20 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleUpdateGoal}
              disabled={!isAuthenticated}
              className={`flex-1 btn-orange rounded-lg px-3 py-2 text-xs font-medium text-white ${!isAuthenticated ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Guardar cambios
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de detalle de meta */}
      {showGoalDetailModal && (() => {
        const goal = userGoals.find(g => g.id === showGoalDetailModal);
        if (!goal) return null;
        
        const current = Number(goal.currentAmount);
        const target = Number(goal.targetAmount);
        const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
        const progress = goalProgress[goal.id] || [];
        
        return (
          <Modal
            isOpen={!!showGoalDetailModal}
            onClose={() => {
              setShowGoalDetailModal(null);
            }}
            title={goal.name}
            maxWidth="2xl"
          >
            <div className="space-y-4">
              {/* Información de la meta */}
              <div className="rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/30 px-4 py-3">
                <div className="mb-2">
                  {goal.description && (
                    <p className="text-sm text-warm mb-2">{goal.description}</p>
                  )}
                  <p className="text-sm text-warm-dark mb-2">
                    Progreso: {fmt(current, selectedCurrency)} / {fmt(target, selectedCurrency)}
                  </p>
                  {goal.deadline && (
                    <p className="text-xs text-warm">
                      Fecha límite: {new Date(goal.deadline).toLocaleDateString('es-CO')}
                    </p>
                  )}
                </div>
                <div className="h-3 rounded-full bg-[#E8E2DE] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      current >= target ? "bg-emerald-500" : "gradient-orange"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-xs text-warm mt-1">
                  {percentage.toFixed(1)}% completado
                </p>
              </div>

              {/* Contribuciones */}
              {progress.length > 0 && (
                <div className="rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/30 px-4 py-3">
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
                            +{fmt(Number(p.amount), selectedCurrency)}
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
          </Modal>
        );
      })()}
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

