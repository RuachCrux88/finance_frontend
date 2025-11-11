"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import './globals.css';
import NavBar from '@/components/NavBar';
import { api } from "@/lib/api";
import { fetchMe } from "@/utils/session";
import type { Transaction, ChartDataPoint, Goal } from "@/types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Home() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [userGoals, setUserGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingsGoal, setSavingsGoal] = useState<string>("");
  const [savingsError, setSavingsError] = useState("");
  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [alert, setAlert] = useState<{ message: string; type: 'warning' | 'info' } | null>(null);
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('month');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const days = groupBy === 'day' ? 30 : 730;
        const [chart, hist, goals] = await Promise.all([
          api<ChartDataPoint[]>(`/transactions/chart-data?days=${days}&groupBy=${groupBy}`).catch(() => []),
          api<Transaction[]>("/transactions/history?limit=500").catch(() => []),
          api<Goal[]>("/goals/user").catch(() => []),
        ]);
        setChartData(chart || []);
        setHistory(hist || []);
        setUserGoals(goals || []);
      } catch (e: any) {
        console.error("Error loading dashboard data:", e);
        setChartData([]);
        setHistory([]);
        setUserGoals([]);
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

  const checkSavingsGoal = (expenseAmount: number) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthExpenses = history
      .filter(tx => {
        const txDate = new Date(tx.date);
        return tx.type === "EXPENSE" && 
               txDate.getMonth() === currentMonth && 
               txDate.getFullYear() === currentYear;
      })
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    
    const monthIncome = history
      .filter(tx => {
        const txDate = new Date(tx.date);
        return tx.type === "INCOME" && 
               txDate.getMonth() === currentMonth && 
               txDate.getFullYear() === currentYear;
      })
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    // Buscar meta mensual de ahorro
    const monthlyGoal = userGoals.find(g => g.name.toLowerCase().includes('mensual') || g.name.toLowerCase().includes('ahorro'));
    if (monthlyGoal) {
      const target = Number(monthlyGoal.targetAmount);
      const remaining = target - (monthIncome - monthExpenses);
      
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
      
      // Ocultar alerta después de 5 segundos
      setTimeout(() => setAlert(null), 5000);
    }
  };

  const fmt = (n: number, currency: string = "COP") => {
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

  // Calcular estadísticas del mes actual
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthExpenses = history
    .filter(tx => {
      const txDate = new Date(tx.date);
      return tx.type === "EXPENSE" && 
             txDate.getMonth() === currentMonth && 
             txDate.getFullYear() === currentYear;
    })
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  
  const monthIncome = history
    .filter(tx => {
      const txDate = new Date(tx.date);
      return tx.type === "INCOME" && 
             txDate.getMonth() === currentMonth && 
             txDate.getFullYear() === currentYear;
    })
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  
  const netBalance = monthIncome - monthExpenses;

  // Buscar meta mensual de ahorro
  const monthlyGoal = userGoals.find(g => g.name.toLowerCase().includes('mensual') || g.name.toLowerCase().includes('ahorro'));
  const savingsProgress = monthlyGoal ? {
    target: Number(monthlyGoal.targetAmount),
    current: Number(monthlyGoal.currentAmount),
    remaining: Number(monthlyGoal.targetAmount) - (monthIncome - monthExpenses),
  } : null;

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

  // Custom tooltip para el gráfico
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
        <div className="flex gap-2">
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
                className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                  groupBy === 'day'
                    ? "btn-orange text-white"
                    : "border border-[#E8E2DE] text-warm-dark hover:bg-[#E8E2DE]/50"
                }`}
              >
                Por día
              </button>
              <button
                onClick={() => setGroupBy('month')}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                  groupBy === 'month'
                    ? "btn-orange text-white"
                    : "border border-[#E8E2DE] text-warm-dark hover:bg-[#E8E2DE]/50"
                }`}
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
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium"
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
          </div>

          {/* Botón para crear meta si no existe */}
          {!monthlyGoal && (
            <button
              onClick={() => {
                setSavingsGoal("");
                setSavingsError("");
                setShowSavingsModal(true);
              }}
              className="w-full card-glass p-4 text-left hover:shadow-lg transition"
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
                  className="flex-1 btn-orange rounded-lg px-3 py-2 text-xs font-medium text-white"
                >
                  Crear meta
                </button>
              </div>
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
