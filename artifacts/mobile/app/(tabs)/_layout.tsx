import React from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useT } from '@/i18n';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// IMPORTANT: iOS 26 uses NativeTabs for native tabs with liquid glass support.
// NativeTabs intentionally does NOT use custom design tokens — liquid glass
// is a system-level appearance provided by iOS and cannot be overridden.
// Custom brand colors are applied only on the ClassicTabLayout path (older iOS / Android / web).
function NativeTabLayout() {
  const colors = useColors();
  const { t } = useT();
  return (
    <NativeTabs
      tintColor={colors.primary}
      iconColor={{ default: colors.mutedForeground, selected: colors.primary }}
      labelStyle={{ default: { color: colors.mutedForeground }, selected: { color: colors.primary } }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'calendar', selected: 'calendar' }}
        />
        <NativeTabs.Trigger.Label>{t('tabs.today')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="routines">
        <NativeTabs.Trigger.Icon sf={{ default: 'sun.max', selected: 'sun.max.fill' }} />
        <NativeTabs.Trigger.Label>{t('tabs.routines')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inbox">
        <NativeTabs.Trigger.Icon sf={{ default: 'tray', selected: 'tray.fill' }} />
        <NativeTabs.Trigger.Label>{t('tabs.inbox')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon sf={{ default: 'slider.horizontal.3', selected: 'slider.horizontal.3' }} />
        <NativeTabs.Trigger.Label>{t('tabs.settings')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const { t } = useT();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          paddingTop: 8,
          paddingBottom: isWeb ? 0 : insets.bottom,
          height: isWeb ? 84 : 62 + insets.bottom,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.today'),
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="calendar" tintColor={color} size={22} />
            ) : (
              <Feather
                name="calendar"
                size={22}
                color={color as string}
              />
            ),
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: t('tabs.routines'),
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name={focused ? 'sun.max.fill' : 'sun.max'} tintColor={color} size={22} />
            ) : (
              <Feather
                name="sun"
                size={22}
                color={color as string}
              />
            ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: t('tabs.inbox'),
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="tray" tintColor={color} size={22} />
            ) : (
              <Feather
                name="inbox"
                size={22}
                color={color as string}
              />
            ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="slider.horizontal.3" tintColor={color} size={22} />
            ) : (
              <Feather
                name="sliders"
                size={22}
                color={color as string}
              />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (Platform.OS === 'ios' && isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
