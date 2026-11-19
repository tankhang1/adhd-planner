import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type CustomerInfo, type PurchasesOfferings } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { readFlag, writeFlag } from '@/lib/storage';

/** Entitlement that unlocks Dayflow Pro (configured in the RevenueCat dashboard). */
export const PRO_ENTITLEMENT = 'dayflow_adhd_visual_planner_pro';

/**
 * Public SDK keys (safe to ship). The `test_` key talks to RevenueCat's Test Store,
 * so it works in development without App Store / Play setup. Before release, set
 * EXPO_PUBLIC_RC_IOS_KEY (appl_…) and EXPO_PUBLIC_RC_ANDROID_KEY (goog_…).
 */
const TEST_KEY = 'test_DeZvsGRJjXmrtszKrOLQKaxbtnu';
const API_KEY =
  Platform.select({
    ios: process.env.EXPO_PUBLIC_RC_IOS_KEY,
    android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY,
  }) || TEST_KEY;

let configured = false;

/** Call once at startup. Safe to call again; no-op on web. */
export function configurePurchases() {
  if (configured || Platform.OS === 'web') return;
  if (__DEV__) void Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  // Anonymous user: Dayflow has no accounts, RevenueCat generates an app user ID.
  Purchases.configure({ apiKey: API_KEY });
  configured = true;
}

export const isPurchasesReady = () => configured;

export function hasPro(info: CustomerInfo | null | undefined) {
  return !!info?.entitlements.active[PRO_ENTITLEMENT];
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    if (__DEV__) console.warn('[purchases] getCustomerInfo failed', e);
    return null;
  }
}

/** Current offering with yearly / monthly / weekly packages. */
export async function getOfferings(): Promise<PurchasesOfferings | null> {
  if (!configured) return null;
  try {
    return await Purchases.getOfferings();
  } catch (e) {
    if (__DEV__) console.warn('[purchases] getOfferings failed', e);
    return null;
  }
}

/**
 * Where a paywall was opened from. Create matching Placements in the RevenueCat
 * dashboard to show a tailored paywall per moment; unknown placements fall back
 * to the current offering.
 */
export type PaywallPlacement =
  | 'onboarding'
  | 'settings'
  | 'widget'
  | 'routines'
  | 'recurring'
  | 'trips'
  | 'live_activity'
  | 'insights'
  | 'themes'
  | 'focus_sounds'
  | 'ai'
  | 'win'
  | 'winback';

async function offeringFor(placement?: PaywallPlacement) {
  if (!placement) return undefined;
  try {
    return (await Purchases.getCurrentOfferingForPlacement(placement)) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Offering targeted at returning free users (e.g. a discounted yearly), if one is set up. */
export async function winbackOffering() {
  const o = await offeringFor('winback');
  return o && o.identifier.toLowerCase().includes('winback') ? o : undefined;
}

/**
 * Shows the RevenueCat Paywall only if the user isn't Pro yet.
 * Returns true when the user has Pro afterwards (purchased, restored, or already had it).
 */
export async function presentPaywall(placement?: PaywallPlacement): Promise<boolean> {
  if (!configured) return false;
  try {
    const result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: PRO_ENTITLEMENT,
      displayCloseButton: true,
      offering: await offeringFor(placement),
    });
    if (result === PAYWALL_RESULT.CANCELLED) notePaywallDismissed();
    return (
      result === PAYWALL_RESULT.PURCHASED ||
      result === PAYWALL_RESULT.RESTORED ||
      result === PAYWALL_RESULT.NOT_PRESENTED // already entitled
    );
  } catch (e) {
    if (__DEV__) console.warn('[purchases] paywall failed', e);
    return false;
  }
}

function notePaywallDismissed() {
  const n = Number(readFlag('paywallDismissed') ?? 0) + 1;
  writeFlag('paywallDismissed', String(n));
  if (!readFlag('paywallFirstDismissedAt')) writeFlag('paywallFirstDismissedAt', String(Date.now()));
}

/** Free users who closed the paywall twice, 3+ days ago, get one gentle win-back offer. */
export function shouldOfferWinback() {
  if (readFlag('winbackShown')) return false;
  const n = Number(readFlag('paywallDismissed') ?? 0);
  const first = Number(readFlag('paywallFirstDismissedAt') ?? 0);
  return n >= 2 && first > 0 && Date.now() - first >= 3 * 864e5;
}
export const markWinbackShown = () => writeFlag('winbackShown', String(Date.now()));

/** Customer Center: manage / cancel / restore / request refund. */
export async function presentCustomerCenter() {
  if (!configured) return;
  try {
    await RevenueCatUI.presentCustomerCenter();
  } catch (e) {
    if (__DEV__) console.warn('[purchases] customer center failed', e);
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!configured) return false;
  try {
    return hasPro(await Purchases.restorePurchases());
  } catch (e) {
    if (__DEV__) console.warn('[purchases] restore failed', e);
    return false;
  }
}

export function addCustomerInfoListener(cb: (info: CustomerInfo) => void) {
  if (!configured) return () => {};
  Purchases.addCustomerInfoUpdateListener(cb);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(cb);
  };
}

