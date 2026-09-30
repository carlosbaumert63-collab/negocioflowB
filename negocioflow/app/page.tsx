"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Landing from "../components/Landing";
import AuthScreen from "../components/AuthScreen";
import Onboarding from "../components/Onboarding";
import AppShell from "../components/AppShell";
import ResetPassword from "../components/ResetPassword";
import type { Business } from "../lib/types";

export default function Page() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [checkingBusiness, setCheckingBusiness] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setBusiness(null);
      return;
    }
    let active = true;
    setCheckingBusiness(true);
    supabase
      .from("businesses")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setBusiness((data as Business) || null);
        setCheckingBusiness(false);
      });
    return () => {
      active = false;
    };
  }, [session]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted">Cargando…</div>;
  }

  if (recoveryMode && session) {
    return <ResetPassword onDone={() => setRecoveryMode(false)} />;
  }

  if (!session) {
    if (!showAuth) return <Landing onGetStarted={() => setShowAuth(true)} onLogin={() => setShowAuth(true)} />;
    return <AuthScreen onBack={() => setShowAuth(false)} />;
  }

  if (checkingBusiness) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted">Cargando…</div>;
  }

  if (!business || !business.onboarding_completed) {
    return <Onboarding userId={session.user.id} onDone={(businessId) => window.location.reload()} />;
  }

  return <AppShell business={business} userEmail={session.user.email} />;
}
