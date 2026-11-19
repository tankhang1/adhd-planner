import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { usePro } from '@/context/ProContext';
import { useColors } from '@/hooks/useColors';

/** Deep link target (dayflow://pro), e.g. from a locked widget: show the paywall, then go home. */
export default function ProRoute() {
  const { showPaywall } = usePro();
  const colors = useColors();
  useEffect(() => {
    void showPaywall('widget').finally(() => router.replace('/(tabs)'));
  }, [showPaywall]);
  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}
