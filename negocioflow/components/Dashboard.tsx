"use client";
import React, { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, AlertTriangle, Lock, Sparkles, Loader2, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { fmtCLP, type Business } from "../lib/types";
import { usePlan } from "./PlanContext";
import { seedDemoData, clearDemoData, hasDemoData } from "../lib/demoData";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}
function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

interface Stats {
  todaySales: number;
  todayExpenses: number;
  todayProfit: number;
  todayCount: number;
  monthSales: number;
  monthCost: number;
  monthExpenses: number;
  monthProfit: number;
  margin: number;
  prevMonthSales: number;
  prevMonthProfit: number;
  lowStockCount: number;
  outOfStockCount: number;
  topProduct: { name: string; profit: number } | null;
  pendingReceivable: number;
  pendingCustomers: number;
  breakEvenSales: number;
}

export default function Dashboard({ business }: { business: Business }) {
  const { isPro, goToPlan } = usePlan();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAnyData, setHasAnyData] = useState(true);
  const [demoActive, setDemoActive] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);

  async function checkDemoState() {
    const [{ count: realCount }, demo] = await Promise.all([
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id)
        .eq("is_demo", false),
      hasDemoData(business.id),
    ]);
    setHasAnyData((realCount || 0) > 0);
    setDemoActive(demo);
  }

  async function handleLoadDemo() {
    setDemoBusy(true);
    await seedDemoData(business.id);
    await checkDemoState();
    setDemoBusy(false);
    window.location.reload();
  }

  async function handleClearDemo() {
    if (!confirm("¿Borrar todos los datos de demostración?")) return;
    setDemoBusy(true);
    await clearDemoData(business.id);
    await checkDemoState();
    setDemoBusy(false);
    window.location.reload();
  }

  useEffect(() => {
    checkDemoState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id]);

  useEffect(() => {
    let active = true;
    async function load() {
      const now = new Date();
      const today = toISODate(now);
      const monthStart = toISODate(startOfMonth(now));
      const monthEnd = toISODate(endOfMonth(now));
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthStart = toISODate(startOfMonth(prevMonthDate));
      const prevMonthEnd = toISODate(endOfMonth(prevMonthDate));

      const [
        todaySalesRes,
        todayExpensesRes,
        monthSalesRes,
        monthExpensesRes,
        prevMonthSalesRes,
        productsRes,
        saleItemsRes,
        pendingRes,
      ] = await Promise.all([
        supabase.from("sales").select("total, profit").eq("business_id", business.id).eq("sale_date", today),
        supabase.from("expenses").select("amount").eq("business_id", business.id).eq("expense_date", today),
        supabase
          .from("sales")
          .select("total, cost_total, profit")
          .eq("business_id", business.id)
          .gte("sale_date", monthStart)
          .lte("sale_date", monthEnd),
        supabase
          .from("expenses")
          .select("amount")
          .eq("business_id", business.id)
          .gte("expense_date", monthStart)
          .lte("expense_date", monthEnd),
        supabase
          .from("sales")
          .select("total, profit")
          .eq("business_id", business.id)
          .gte("sale_date", prevMonthStart)
          .lte("sale_date", prevMonthEnd),
        supabase.from("products").select("id, name, stock, min_stock").eq("business_id", business.id),
        supabase
          .from("sale_items")
          .select("product_name, quantity, unit_price, unit_cost, sales!inner(business_id, sale_date)")
          .eq("sales.business_id", business.id)
          .gte("sales.sale_date", monthStart)
          .lte("sales.sale_date", monthEnd),
        supabase
          .from("sales")
          .select("total, customer_id")
          .eq("business_id", business.id)
          .eq("pending_payment", true),
      ]);

      if (!active) return;

      const todaySales = (todaySalesRes.data || []).reduce((s, r) => s + Number(r.total), 0);
      const todayExpenses = (todayExpensesRes.data || []).reduce((s, r) => s + Number(r.amount), 0);
      const todayProfitFromSales = (todaySalesRes.data || []).reduce((s, r) => s + Number(r.profit), 0);
      const todayCount = (todaySalesRes.data || []).length;

      const monthSales = (monthSalesRes.data || []).reduce((s, r) => s + Number(r.total), 0);
      const monthCost = (monthSalesRes.data || []).reduce((s, r) => s + Number(r.cost_total), 0);
      const monthExpenses = (monthExpensesRes.data || []).reduce((s, r) => s + Number(r.amount), 0);
      const monthProfit = monthSales - monthCost - monthExpenses;
      const margin = monthSales > 0 ? (monthProfit / monthSales) * 100 : 0;

      const prevMonthSales = (prevMonthSalesRes.data || []).reduce((s, r) => s + Number(r.total), 0);
      const prevMonthProfit = (prevMonthSalesRes.data || []).reduce((s, r) => s + Number(r.profit), 0);

      const products = productsRes.data || [];
      const lowStockCount = products.filter((p: any) => p.stock > 0 && p.stock <= p.min_stock).length;
      const outOfStockCount = products.filter((p: any) => p.stock <= 0).length;

      const profitByProduct = new Map<string, number>();
      (saleItemsRes.data || []).forEach((item: any) => {
        const profit = (Number(item.unit_price) - Number(item.unit_cost)) * Number(item.quantity);
        profitByProduct.set(item.product_name, (profitByProduct.get(item.product_name) || 0) + profit);
      });
      let topProduct: { name: string; profit: number } | null = null;
      profitByProduct.forEach((profit, name) => {
        if (!topProduct || profit > topProduct.profit) topProduct = { name, profit };
      });

      const pendingRows = pendingRes.data || [];
      const pendingReceivable = pendingRows.reduce((s: number, r: any) => s + Number(r.total), 0);
      const pendingCustomers = new Set(pendingRows.map((r: any) => r.customer_id)).size;

      // Punto de equilibrio: usando el margen de costo de productos de este
      // mes, ¿cuánto hay que vender para cubrir los gastos fijos del mes?
      const grossMarginRatio = monthSales > 0 ? (monthSales - monthCost) / monthSales : 0;
      const breakEvenSales = grossMarginRatio > 0 ? monthExpenses / grossMarginRatio : 0;

      setStats({
        todaySales,
        todayExpenses,
        todayProfit: todayProfitFromSales - todayExpenses,
        todayCount,
        monthSales,
        monthCost,
        monthExpenses,
        monthProfit,
        margin,
        prevMonthSales,
        prevMonthProfit,
        lowStockCount,
        outOfStockCount,
        topProduct,
        pendingReceivable,
        pendingCustomers,
        breakEvenSales,
      });
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [business.id]);

  if (loading || !stats) {
    return <div className="text-sm text-muted py-10 text-center">Cargando…</div>;
  }

  const salesChange =
    stats.prevMonthSales > 0 ? ((stats.monthSales - stats.prevMonthSales) / stats.prevMonthSales) * 100 : null;
  const expensesChange =
    stats.monthExpenses > 0 && stats.prevMonthProfit !== 0 ? null : null;

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Hola 👋</h1>
      <p className="text-sm text-muted mb-6">Así va {business.name} hoy.</p>

      {demoActive && (
        <div className="flex items-center justify-between gap-3 text-sm px-3 py-2.5 rounded-lg border border-violet-100 bg-violet-50 text-violet-700 mb-6">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="flex-shrink-0" />
            Estás viendo datos de <strong>DEMOSTRACIÓN</strong>, no son tus datos reales.
          </div>
          <button
            onClick={handleClearDemo}
            disabled={demoBusy}
            className="flex items-center gap-1 text-xs font-medium underline flex-shrink-0 disabled:opacity-60"
          >
            {demoBusy ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
            Borrar demo
          </button>
        </div>
      )}

      {!hasAnyData && !demoActive && (
        <div className="flex items-center justify-between gap-3 text-sm px-3 py-2.5 rounded-lg border border-line bg-white mb-6 flex-wrap">
          <div className="flex items-center gap-2 text-muted">
            <Sparkles size={15} className="flex-shrink-0 text-brand-600" />
            Aún no tienes datos. Registra tu primera venta o explora con datos de ejemplo.
          </div>
          <button
            onClick={handleLoadDemo}
            disabled={demoBusy}
            className="flex items-center gap-1.5 text-xs font-medium bg-ink text-white px-3 py-1.5 rounded-lg disabled:opacity-60"
          >
            {demoBusy && <Loader2 size={12} className="animate-spin" />}
            Cargar datos de demostración
          </button>
        </div>
      )}

      {/* alerts */}
      {isPro ? (
        (stats.outOfStockCount > 0 ||
          stats.lowStockCount > 0 ||
          salesChange !== null ||
          stats.pendingReceivable > 0) && (
          <div className="space-y-2 mb-6">
            {stats.outOfStockCount > 0 && (
              <Alert text={`${stats.outOfStockCount} producto(s) están agotados.`} />
            )}
            {stats.lowStockCount > 0 && <Alert text={`${stats.lowStockCount} producto(s) tienen stock bajo.`} />}
            {salesChange !== null && salesChange < -10 && (
              <Alert text={`Tus ventas bajaron ${Math.abs(salesChange).toFixed(0)}% respecto al mes anterior.`} />
            )}
            {stats.pendingReceivable > 0 && (
              <Alert
                text={`Te deben ${fmtCLP(stats.pendingReceivable)} entre ${stats.pendingCustomers} cliente(s). Revisa la sección Clientes.`}
              />
            )}
            {stats.topProduct && (
              <Alert
                text={`${(stats.topProduct as any).name} es tu producto más rentable este mes.`}
                positive
              />
            )}
          </div>
        )
      ) : (
        (stats.outOfStockCount > 0 || stats.lowStockCount > 0) && (
          <button
            onClick={goToPlan}
            className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg border border-amber-100 bg-amber-50 text-amber-700 mb-6 w-full text-left"
          >
            <Lock size={14} className="flex-shrink-0" />
            Tienes productos con stock bajo o agotado. Las alertas detalladas son una función Pro.
          </button>
        )
      )}

      {/* today */}
      <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Hoy</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="Ventas" value={fmtCLP(stats.todaySales)} />
        <StatCard label="Gastos" value={fmtCLP(stats.todayExpenses)} />
        <StatCard label="Ganancia estimada" value={fmtCLP(stats.todayProfit)} highlight />
        <StatCard label="N° de ventas" value={String(stats.todayCount)} />
      </div>

      {/* month */}
      <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Este mes</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <StatCard label="Ventas" value={fmtCLP(stats.monthSales)} />
        <StatCard label="Costos" value={fmtCLP(stats.monthCost)} />
        <StatCard label="Gastos" value={fmtCLP(stats.monthExpenses)} />
        <StatCard label="Ganancia neta" value={fmtCLP(stats.monthProfit)} highlight />
      </div>
      <div className="flex items-center gap-4 text-sm text-muted flex-wrap mb-6">
        <span>
          Margen: <strong className="text-ink">{stats.margin.toFixed(1)}%</strong>
        </span>
        {salesChange !== null && (
          <span className={`flex items-center gap-1 ${salesChange >= 0 ? "text-brand-600" : "text-red-600"}`}>
            {salesChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(salesChange).toFixed(0)}% vs. mes anterior
          </span>
        )}
      </div>

      {isPro ? (
        stats.breakEvenSales > 0 && (
          <div className="bg-white border border-line rounded-xl p-4">
            <div className="text-xs text-muted mb-1">Punto de equilibrio este mes</div>
            <div className="text-base">
              Necesitas vender <strong className="text-ink">{fmtCLP(stats.breakEvenSales)}</strong> para cubrir tus
              costos y gastos.
            </div>
            <div className="text-xs text-muted mt-1">
              {stats.monthSales >= stats.breakEvenSales
                ? "Ya superaste ese punto este mes 🎉"
                : `Te faltan ${fmtCLP(stats.breakEvenSales - stats.monthSales)} en ventas para llegar.`}
            </div>
          </div>
        )
      ) : (
        <button
          onClick={goToPlan}
          className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg border border-line bg-white text-muted w-full text-left"
        >
          <Lock size={14} className="flex-shrink-0" />
          El punto de equilibrio mensual es una función Pro.
        </button>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-white border border-line rounded-xl p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-lg font-bold mt-1 ${highlight ? "text-brand-600" : "text-ink"}`}>{value}</div>
    </div>
  );
}

function Alert({ text, positive }: { text: string; positive?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg border ${
        positive ? "bg-brand-50 border-brand-100 text-brand-700" : "bg-amber-50 border-amber-100 text-amber-700"
      }`}
    >
      {!positive && <AlertTriangle size={15} className="flex-shrink-0" />}
      {text}
    </div>
  );
}
