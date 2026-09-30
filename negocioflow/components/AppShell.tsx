"use client";
import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  Receipt,
  Package,
  Wallet,
  BarChart3,
  LogOut,
  MoreHorizontal,
  Users,
  Truck,
  ShoppingBag,
  TrendingUp,
  X,
  Crown,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import type { Business } from "../lib/types";
import { PlanProvider, usePlan } from "./PlanContext";
import UpgradePanel from "./UpgradePanel";
import Dashboard from "./Dashboard";
import Ventas from "./Ventas";
import Productos from "./Productos";
import Gastos from "./Gastos";
import Reportes from "./Reportes";
import Clientes from "./Clientes";
import Proveedores from "./Proveedores";
import Compras from "./Compras";
import FlujoCaja from "./FlujoCaja";

type Tab =
  | "dashboard"
  | "ventas"
  | "productos"
  | "gastos"
  | "reportes"
  | "clientes"
  | "proveedores"
  | "compras"
  | "flujo";

const MAIN_TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "ventas", label: "Ventas", icon: Receipt },
  { key: "productos", label: "Productos", icon: Package },
  { key: "gastos", label: "Gastos", icon: Wallet },
  { key: "reportes", label: "Reportes", icon: BarChart3 },
];

const MORE_TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "clientes", label: "Clientes", icon: Users },
  { key: "proveedores", label: "Proveedores", icon: Truck },
  { key: "compras", label: "Compras", icon: ShoppingBag },
  { key: "flujo", label: "Flujo de caja", icon: TrendingUp },
];

const ALL_TABS = [...MAIN_TABS, ...MORE_TABS];

export default function AppShell({ business, userEmail }: { business: Business; userEmail: string }) {
  return (
    <PlanProvider business={business}>
      <AppShellInner business={business} userEmail={userEmail} />
    </PlanProvider>
  );
}

function AppShellInner({ business, userEmail }: { business: Business; userEmail: string }) {
  const { isPro, daysLeft, showUpgrade, goToPlan, closeUpgrade, refreshSubscription } = usePlan();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [showMore, setShowMore] = useState(false);
  const [pendingNotice, setPendingNotice] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgrade") === "pending") {
      setPendingNotice(true);
      window.history.replaceState({}, "", window.location.pathname);
      const t = setTimeout(() => {
        refreshSubscription();
        window.location.reload();
      }, 4000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function renderTab() {
    switch (tab) {
      case "dashboard":
        return <Dashboard business={business} />;
      case "ventas":
        return <Ventas business={business} />;
      case "productos":
        return <Productos business={business} />;
      case "gastos":
        return <Gastos business={business} />;
      case "reportes":
        return <Reportes business={business} />;
      case "clientes":
        return <Clientes business={business} />;
      case "proveedores":
        return <Proveedores business={business} />;
      case "compras":
        return <Compras business={business} />;
      case "flujo":
        return <FlujoCaja business={business} />;
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-surface flex">
      {/* sidebar (desktop) */}
      <div className="hidden md:flex flex-col w-60 border-r border-line bg-white p-4 flex-shrink-0">
        <div className="font-bold text-lg px-2 mb-1">NegocioFlow</div>
        <div className="text-xs text-muted px-2 mb-4 truncate">{business.name}</div>

        <button
          onClick={goToPlan}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium mb-4 ${
            isPro ? "bg-brand-50 text-brand-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          <Crown size={14} />
          {isPro ? "Plan Pro" : "Plan Free — mejorar"}
        </button>

        <div className="flex flex-col gap-1">
          {ALL_TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  active ? "text-brand-700" : "text-muted hover:bg-surface transition-colors"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-pill"
                    className="absolute inset-0 bg-brand-50 rounded-lg"
                    transition={{ type: "spring", stiffness: 500, damping: 36 }}
                  />
                )}
                <Icon size={18} className="relative z-10" />
                <span className="relative z-10">{t.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-auto">
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted"
          >
            <LogOut size={16} /> Salir
          </button>
        </div>
      </div>

      {/* main content */}
      <div className="flex-1 min-w-0">
        {/* mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-line">
          <div>
            <div className="font-bold text-base">NegocioFlow</div>
            <div className="text-xs text-muted">{business.name}</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={goToPlan}
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                isPro ? "bg-brand-50 text-brand-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              {isPro ? "Pro" : "Free"}
            </button>
            <button onClick={() => supabase.auth.signOut()} className="text-muted">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {pendingNotice && (
          <div className="bg-brand-50 text-brand-700 text-sm px-4 py-2.5 text-center">
            Estamos confirmando tu pago… esto puede tardar unos segundos.
          </div>
        )}
        {isPro && daysLeft !== null && daysLeft <= 7 && (
          <div className="bg-amber-50 text-amber-700 text-sm px-4 py-2.5 text-center">
            Tu plan Pro vence en {daysLeft} día(s).{" "}
            <button onClick={goToPlan} className="underline font-medium">
              Renovar
            </button>
          </div>
        )}

        <div className="p-4 sm:p-6 pb-24 md:pb-6 max-w-5xl mx-auto overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {renderTab()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* bottom nav (mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-line flex justify-around py-2 pb-[calc(env(safe-area-inset-bottom)+8px)]">
        {MAIN_TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <motion.button
              key={t.key}
              onClick={() => setTab(t.key)}
              whileTap={{ scale: 0.9 }}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium ${
                active ? "text-brand-600" : "text-muted"
              }`}
            >
              <motion.span animate={active ? { y: -2, scale: 1.08 } : { y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}>
                <Icon size={20} />
              </motion.span>
              {t.label}
            </motion.button>
          );
        })}
        <button
          onClick={() => setShowMore(true)}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium ${
            MORE_TABS.some((t) => t.key === tab) ? "text-brand-600" : "text-muted"
          }`}
        >
          <MoreHorizontal size={20} />
          Más
        </button>
      </div>

      {/* "Más" bottom sheet (mobile) */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            className="md:hidden fixed inset-0 bg-black/40 z-50 flex items-end"
            onClick={() => setShowMore(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              className="bg-white rounded-t-2xl w-full p-4 pb-8"
              onClick={(e) => e.stopPropagation()}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 38 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-sm">Más secciones</div>
                <button onClick={() => setShowMore(false)}>
                  <X size={18} className="text-muted" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {MORE_TABS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.key}
                      onClick={() => {
                        setTab(t.key);
                        setShowMore(false);
                      }}
                      className="flex items-center gap-2 px-3 py-3 rounded-lg border border-line text-sm font-medium"
                    >
                      <Icon size={16} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* upgrade modal */}
      <AnimatePresence>
        {showUpgrade && (
          <motion.div
            className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg p-5 max-h-[90vh] overflow-y-auto"
              initial={{ y: 24, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 24, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 38 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="font-bold text-lg">NegocioFlow Pro</div>
                <button onClick={closeUpgrade}>
                  <X size={18} className="text-muted" />
                </button>
              </div>
              <UpgradePanel renewal={isPro} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
