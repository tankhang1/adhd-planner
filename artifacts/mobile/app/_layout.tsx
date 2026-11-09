import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { DayflowProvider, useDayflow } from '@/context/DayflowContext';
import { addReminderTapListener, syncReminders } from '@/services/reminders';
import { syncWidgets } from '@/services/widgets';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

/** Onboarding gate + reminder scheduling. */
function AppEffects() {
  const {
    hydrated, onboarded, dayTasks, remindersEnabled, liveActivityEnabled,
    reminderLead, quietStart, quietEnd,
  } = useDayflow();
  const segments = useSegments();

  useEffect(() => {
    if (!hydrated) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (!onboarded && !inOnboarding) router.replace('/onboarding');
  }, [hydrated, onboarded, segments]);

  useEffect(() => {
    if (!hydrated) return;
    const prefs = { enabled: remindersEnabled, lead: reminderLead, quietStart, quietEnd };
    const t = setTimeout(() => void syncReminders(dayTasks.filter((x) => !x.parked), prefs).catch(() => {}), 800);
    return () => clearTimeout(t);
  }, [hydrated, dayTasks, remindersEnabled, reminderLead, quietStart, quietEnd]);

  // Widgets + Live Activity: on every plan change, and each minute so the
  // Live Activity switches to the next block while the app is open.
  useEffect(() => {
    if (!hydrated) return;
    const run = () => void syncWidgets(dayTasks.filter((x) => !x.parked), liveActivityEnabled).catch(() => {});
    const t = setTimeout(run, 500);
    const i = setInterval(run, 60_000);
    return () => {
      clearTimeout(t);
      clearInterval(i);
    };
  }, [hydrated, dayTasks, liveActivityEnabled]);

  useEffect(
    () => addReminderTapListener((taskId) => router.push({ pathname: '/focus', params: { taskId } })),
    [],
  );

  return null;
}

function RootLayoutNav() {
  return (
    <>
    <AppEffects />
    <Stack screenOptions={{ headerBackTitle: 'Back' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="focus"
        options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="add-task"
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen name="routine-run" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <Stack.Screen name="one-thing" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <Stack.Screen name="routine-edit" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Keep the native splash/font gate on iOS and Android. On web, render with
  // the system fallback immediately so Expo's server-rendered preview is not blank.
  if (!fontsLoaded && !fontError && Platform.OS !== 'web') return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <DayflowProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </DayflowProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
