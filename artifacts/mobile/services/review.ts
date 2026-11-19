import * as StoreReview from 'expo-store-review';
import { readFlag, writeFlag } from '@/lib/storage';

const ASK_EVERY_DAYS = 120;

/**
 * Ask for an App Store / Play rating, but only at a happy moment, only once the
 * person has used Dayflow on a few days, and never more than every ~4 months.
 * (iOS also rate-limits this prompt itself.)
 */
export async function maybeAskForReview(daysUsed: number) {
  if (daysUsed < 3) return;
  const last = Number(readFlag('reviewAskedAt') ?? 0);
  if (last && Date.now() - last < ASK_EVERY_DAYS * 864e5) return;
  try {
    if (!(await StoreReview.hasAction())) return;
    writeFlag('reviewAskedAt', String(Date.now()));
    await StoreReview.requestReview();
  } catch {
    // Not available (web / Expo Go): ignore.
  }
}
