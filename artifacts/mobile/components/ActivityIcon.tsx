import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { TaskIcon } from '@/context/DayflowContext';

/** Renders an activity icon (MaterialCommunityIcons set). */
export function ActivityIcon({ name, size = 20, color }: { name: TaskIcon; size?: number; color: string }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}
