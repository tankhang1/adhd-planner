import { createMMKV } from 'react-native-mmkv';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import type { MMKV } from 'react-native-mmkv';

/**
 * Dayflow's on-device storage (MMKV: synchronous, fast, crash-safe, AES-256 encrypted).
 *
 * State is split into slices so ticking one task doesn't rewrite the whole
 * history. Each slice is only written when its value actually changed.
 */

const SLICE_KEYS = {
  dayTasks: 'df.tasks',
  inboxTasks: 'df.inbox',
  routines: 'df.routines',
  recurring: 'df.recurring',
  treats: 'df.treats',
  timeLog: 'df.timeLog',
  energyLog: 'df.energyLog',
  showUpDays: 'df.showUpDays',
} as const;
const SETTINGS_KEY = 'df.settings';
const VERSION_KEY = 'df.version';
const VERSION = 1;

type Sliced = keyof typeof SLICE_KEYS;

let store: MMKV | null = null;
const memory = new Map<string, string>(); // fallback when the native module is missing (Expo Go / tests)

const KEY_NAME = 'dayflow.storageKey';
const ENCRYPTED_FLAG = 'dayflow.storageEncrypted';
const KEY_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * A random 32-char key, created once per install and kept in the Keychain /
 * Android Keystore — never in the app's own files.
 */
function encryptionKey(): string | null {
  try {
    const existing = SecureStore.getItem(KEY_NAME);
    if (existing) return existing;
    const bytes = Crypto.getRandomBytes(32);
    const key = Array.from(bytes, (b) => KEY_ALPHABET[b % KEY_ALPHABET.length]).join('');
    SecureStore.setItem(KEY_NAME, key, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
    return key;
  } catch {
    return null; // secure storage unavailable (web) → stay unencrypted
  }
}

function mmkv(): MMKV | null {
  if (store) return store;
  try {
    const key = encryptionKey();
    let alreadyEncrypted = false;
    try {
      alreadyEncrypted = SecureStore.getItem(ENCRYPTED_FLAG) === '1';
    } catch {}

    if (key && alreadyEncrypted) {
      store = createMMKV({ id: 'dayflow', encryptionKey: key, encryptionType: 'AES-256' });
    } else {
      // First run with encryption: open the existing plain store and encrypt it in place.
      store = createMMKV({ id: 'dayflow' });
      if (key) {
        store.encrypt(key, 'AES-256');
        SecureStore.setItem(ENCRYPTED_FLAG, '1', { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
      }
    }
  } catch {
    if (__DEV__) console.warn('[storage] MMKV unavailable (Expo Go?) — data will not persist. Use a development build.');
    store = null;
  }
  return store;
}

const getRaw = (key: string) => mmkv()?.getString(key) ?? memory.get(key);
const setRaw = (key: string, value: string) => {
  const s = mmkv();
  if (s) s.set(key, value);
  else memory.set(key, value);
};

function parse<T>(raw: string | undefined): T | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

/** Read every slice back into one object (synchronous). Undefined if nothing saved yet. */
export function readState<T extends object>(): Partial<T> | undefined {
  if (!getRaw(VERSION_KEY)) return undefined;
  const out: Record<string, unknown> = { ...(parse<Record<string, unknown>>(getRaw(SETTINGS_KEY)) ?? {}) };
  for (const [field, key] of Object.entries(SLICE_KEYS)) {
    const v = parse(getRaw(key));
    if (v !== undefined) out[field] = v;
  }
  return out as Partial<T>;
}

// Last values written, by reference — React state updates are immutable,
// so an unchanged slice keeps the same reference and is skipped.
const lastWritten = new Map<string, unknown>();

/** Persist state, writing only the slices that changed. */
export function writeState(state: Record<string, unknown>, force = false) {
  const settings: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(state)) {
    if (field in SLICE_KEYS) {
      const key = SLICE_KEYS[field as Sliced];
      if (!force && lastWritten.get(key) === value) continue;
      lastWritten.set(key, value);
      setRaw(key, JSON.stringify(value ?? null));
    } else {
      settings[field] = value;
    }
  }
  // Settings are small; compare by content to avoid pointless writes.
  const settingsJson = JSON.stringify(settings);
  if (force || lastWritten.get(SETTINGS_KEY) !== settingsJson) {
    lastWritten.set(SETTINGS_KEY, settingsJson);
    setRaw(SETTINGS_KEY, settingsJson);
  }
  if (!getRaw(VERSION_KEY)) setRaw(VERSION_KEY, String(VERSION));
}

/** Synchronous read of just the tasks + language (used by the Android widget task). */
export function readWidgetState(): { dayTasks?: unknown[]; language?: string } {
  const settings = parse<{ language?: string }>(getRaw(SETTINGS_KEY)) ?? {};
  return { dayTasks: parse<unknown[]>(getRaw(SLICE_KEYS.dayTasks)), language: settings.language };
}
