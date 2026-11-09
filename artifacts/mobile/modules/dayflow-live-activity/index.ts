import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

export interface LiveActivityInput {
  taskId: string;
  title: string;
  /** unix seconds */
  start: number;
  /** unix seconds */
  end: number;
  icon: string;
  tone: string;
  ink: string;
  nextTitle?: string | null;
}

interface NativeModule {
  isSupported(): boolean;
  start(input: LiveActivityInput): Promise<string | null>;
  endAll(): Promise<void>;
  currentTaskId(): string | null;
}

// Null in Expo Go / web / Android — every call becomes a safe no-op.
const native = Platform.OS === 'ios' ? requireOptionalNativeModule<NativeModule>('DayflowLiveActivity') : null;

export const LiveActivity = {
  isSupported: () => native?.isSupported() ?? false,
  start: (input: LiveActivityInput) => native?.start(input) ?? Promise.resolve(null),
  endAll: () => native?.endAll() ?? Promise.resolve(),
  currentTaskId: () => native?.currentTaskId() ?? null,
};
