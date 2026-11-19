import { requireOptionalNativeModule } from 'expo';

export type OnDeviceStatus = 'available' | 'notEnabled' | 'notReady' | 'unsupported';

interface NativeModule {
  status(): OnDeviceStatus;
  planDay(input: {
    dump: string;
    from: number;
    until: number;
    busy: Array<{ start: number; duration: number }>;
    energy?: string;
    language: string;
  }): Promise<string>;
  breakDown(input: { title: string; minutes?: number; language: string }): Promise<string>;
}

/** Apple Foundation Models bridge (iOS 26+ with Apple Intelligence). Null elsewhere. */
export const DayflowAI = requireOptionalNativeModule<NativeModule>('DayflowAI');
