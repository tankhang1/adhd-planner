import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ICON_GROUPS } from '@/context/DayflowContext';
import type { TaskIcon } from '@/context/DayflowContext';
import { useColors } from '@/hooks/useColors';
import { ActivityIcon } from './ActivityIcon';

/** Icon grid grouped by everyday category, so choosing is quick. */
export function IconPicker({
  value,
  onChange,
  fill,
  ink,
}: {
  value: TaskIcon;
  onChange: (icon: TaskIcon) => void;
  fill: string;
  ink: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.wrap}>
      {ICON_GROUPS.map((group) => (
        <View key={group.label} style={styles.group}>
          <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>{group.label}</Text>
          <View style={styles.grid}>
            {group.icons.map((icon) => {
              const sel = icon === value;
              return (
                <Pressable
                  key={icon}
                  accessibilityRole="button"
                  accessibilityLabel={`Icon ${icon.replace(/-/g, ' ')}`}
                  accessibilityState={{ selected: sel }}
                  onPress={() => onChange(icon)}
                  testID={`icon-${icon}`}
                  style={[styles.cell, { backgroundColor: sel ? fill : colors.card, borderColor: sel ? ink : colors.border }]}
                >
                  <ActivityIcon name={icon} size={24} color={sel ? ink : colors.mutedForeground} />
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  group: { gap: 8 },
  groupLabel: { fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { width: 50, height: 50, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
