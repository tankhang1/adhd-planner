import { Alert, AppState } from 'react-native';
import { tr } from '@/i18n';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CustomerInfo } from 'react-native-purchases';
import {
  addCustomerInfoListener,
  configurePurchases,
  getCustomerInfo,
  hasPro,
  presentCustomerCenter,
  markWinbackShown,
  presentPaywall,
  shouldOfferWinback,
  winbackOffering,
  restorePurchases,
} from '@/services/purchases';
import type { PaywallPlacement } from '@/services/purchases';
import { writeProCache } from '@/lib/storage';
import { THEMES } from '@/constants/themes';
import { useDayflow } from '@/context/DayflowContext';
import { applyAppIcon } from '@/services/appIcon';

type ProState = {
  /** Has the dayflow_adhd_visual_planner_pro entitlement. */
  isPro: boolean;
  /** False until the first customer info arrives. */
  ready: boolean;
  customerInfo: CustomerInfo | null;
  /** Opens the paywall if needed; resolves true when the user is Pro afterwards. */
  showPaywall: (placement?: PaywallPlacement) => Promise<boolean>;
  /** Gate for a Pro feature: true if Pro, else paywall → true only if they upgraded. */
  requirePro: (placement?: PaywallPlacement) => Promise<boolean>;
  /** Explains the limit in an alert, then opens the paywall if they tap Upgrade. */
  offerPro: (title: string, body: string, placement?: PaywallPlacement) => Promise<boolean>;
  showCustomerCenter: () => Promise<void>;
  restore: () => Promise<boolean>;
  refresh: () => Promise<void>;
};

const ProContext = createContext<ProState | null>(null);

configurePurchases();

export function ProProvider({ children }: { children: React.ReactNode }) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const info = await getCustomerInfo();
    if (info) setCustomerInfo(info);
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
    // Fires after purchases, renewals, expirations and restores.
    return addCustomerInfoListener(setCustomerInfo);
  }, [refresh]);

  const showPaywall = useCallback(async (placement?: PaywallPlacement) => {
    const ok = await presentPaywall(placement);
    await refresh();
    return ok;
  }, [refresh]);

  const showCustomerCenter = useCallback(async () => {
    await presentCustomerCenter();
    await refresh();
  }, [refresh]);

  const restore = useCallback(async () => {
    const ok = await restorePurchases();
    await refresh();
    return ok;
  }, [refresh]);

  const isPro = hasPro(customerInfo);
  useEffect(() => {
    if (ready) writeProCache(isPro);
  }, [ready, isPro]);

  // Subscription ended: fall back to the default theme and icon.
  // Only with real customer info, so being offline never strips Pro looks.
  const { theme, setTheme } = useDayflow();
  useEffect(() => {
    if (customerInfo && !isPro && theme !== 'violet') {
      setTheme('violet');
      void applyAppIcon(THEMES[0]);
    }
  }, [customerInfo, isPro, theme, setTheme]);

  /** Friendly "why upgrade" alert first, then the paywall. Resolves true if the user is Pro afterwards. */
  const offerPro = useCallback(
    (title: string, body: string, placement?: PaywallPlacement) =>
      new Promise<boolean>((resolve) => {
        if (isPro) return resolve(true);
        Alert.alert(title, body, [
          { text: tr('settings.proNotNow'), style: 'cancel', onPress: () => resolve(false) },
          { text: tr('settings.proUpgrade'), onPress: () => void showPaywall(placement).then(resolve) },
        ], { cancelable: true, onDismiss: () => resolve(false) });
      }),
    [isPro, showPaywall],
  );

  // Win-back: a free user who closed the paywall twice (3+ days ago) sees one special
  // offer when they next open the app, only if a "winback" offering is set up.
  useEffect(() => {
    if (!ready || isPro) return;
    const check = async () => {
      if (!shouldOfferWinback() || !(await winbackOffering())) return;
      markWinbackShown();
      setTimeout(() => void showPaywall('winback'), 1200);
    };
    void check();
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') void check();
    });
    return () => sub.remove();
  }, [ready, isPro, showPaywall]);

  /** True if Pro already, otherwise shows the paywall and resolves with the result. */
  const requirePro = useCallback(async (placement?: PaywallPlacement) => isPro || (await showPaywall(placement)), [isPro, showPaywall]);

  const value = useMemo<ProState>(
    () => ({ isPro, ready, customerInfo, showPaywall, requirePro, offerPro, showCustomerCenter, restore, refresh }),
    [isPro, ready, customerInfo, showPaywall, requirePro, offerPro, showCustomerCenter, restore, refresh],
  );

  return <ProContext.Provider value={value}>{children}</ProContext.Provider>;
}

export function usePro() {
  const ctx = useContext(ProContext);
  if (!ctx) throw new Error('usePro must be used inside <ProProvider>');
  return ctx;
}
