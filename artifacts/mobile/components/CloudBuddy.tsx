import React, { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

export type BuddyMood = 'sleepy' | 'okay' | 'happy' | 'hello';

const PALETTE: Record<BuddyMood, { body: string; cheek: string; shade: string }> = {
  hello: { body: '#EDE9FF', cheek: '#FFB8C9', shade: '#D9D1FF' },
  sleepy: { body: '#E4E9F5', cheek: '#F6C6D3', shade: '#CBD3E6' },
  okay: { body: '#FFF4CC', cheek: '#FFC2A8', shade: '#F5E2A0' },
  happy: { body: '#D9F5E6', cheek: '#FFB3C1', shade: '#B9E9CF' },
};

function Face({ mood }: { mood: BuddyMood }) {
  const ink = '#2B2650';
  if (mood === 'sleepy') {
    return (
      <G>
        {/* closed, droopy eyes */}
        <Path d="M70 92 Q78 98 86 92" stroke={ink} strokeWidth={4} strokeLinecap="round" fill="none" />
        <Path d="M114 92 Q122 98 130 92" stroke={ink} strokeWidth={4} strokeLinecap="round" fill="none" />
        <Ellipse cx={100} cy={112} rx={6} ry={4} fill={ink} />
        {/* little z's */}
        <Path d="M150 46 h12 l-12 12 h12" stroke="#8B84B8" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d="M166 28 h8 l-8 8 h8" stroke="#B3ADD6" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </G>
    );
  }
  if (mood === 'okay') {
    return (
      <G>
        <Circle cx={78} cy={92} r={6} fill={ink} />
        <Circle cx={122} cy={92} r={6} fill={ink} />
        <Circle cx={80} cy={90} r={2} fill="#FFFFFF" />
        <Circle cx={124} cy={90} r={2} fill="#FFFFFF" />
        <Path d="M90 112 Q100 117 110 112" stroke={ink} strokeWidth={4} strokeLinecap="round" fill="none" />
      </G>
    );
  }
  if (mood === 'happy') {
    return (
      <G>
        {/* smiling eyes */}
        <Path d="M70 95 Q78 85 86 95" stroke={ink} strokeWidth={4} strokeLinecap="round" fill="none" />
        <Path d="M114 95 Q122 85 130 95" stroke={ink} strokeWidth={4} strokeLinecap="round" fill="none" />
        <Path d="M86 108 Q100 124 114 108 Z" fill={ink} />
        <Path d="M93 114 Q100 120 107 114" fill="#FF8FA3" />
        {/* sparkles */}
        <Path d="M30 50 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 Z" fill="#FFC94D" />
        <Path d="M168 40 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z" fill="#FFC94D" />
      </G>
    );
  }
  // hello: wide-eyed + small wave smile
  return (
    <G>
      <Circle cx={78} cy={92} r={7} fill={ink} />
      <Circle cx={122} cy={92} r={7} fill={ink} />
      <Circle cx={80.5} cy={89.5} r={2.5} fill="#FFFFFF" />
      <Circle cx={124.5} cy={89.5} r={2.5} fill="#FFFFFF" />
      <Path d="M88 110 Q100 122 112 110" stroke={ink} strokeWidth={4} strokeLinecap="round" fill="none" />
    </G>
  );
}

/**
 * Dayflow's mascot: a small cloud whose face and colour follow your energy.
 * Floats gently; bounces when the mood changes. Respects Reduce Motion.
 */
export function CloudBuddy({ mood = 'hello', size = 160 }: { mood?: BuddyMood; size?: number }) {
  const reduce = useReducedMotion();
  const float = useSharedValue(0);
  const pop = useSharedValue(1);
  const c = PALETTE[mood];

  useEffect(() => {
    if (reduce) return;
    float.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [reduce, float]);

  useEffect(() => {
    if (reduce) return;
    pop.value = withSequence(withTiming(0.9, { duration: 90 }), withSpring(1, { damping: 6, stiffness: 180 }));
  }, [mood, reduce, pop]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }, { scale: pop.value }],
  }));

  return (
    <Animated.View style={[{ width: size, height: size * 0.8 }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size * 0.8} viewBox="0 0 200 160">
        {/* soft shadow */}
        <Ellipse cx={100} cy={150} rx={56} ry={6} fill="#000000" opacity={0.06} />
        {/* cloud body */}
        <Path
          d="M52 136 C28 136 18 118 24 102 C14 88 24 64 46 66 C48 42 72 30 92 40 C104 22 136 22 146 46 C170 44 184 66 174 86 C190 98 182 136 152 136 Z"
          fill={c.body}
        />
        <Path d="M40 128 C62 140 140 140 164 126 C160 134 154 136 152 136 L52 136 C46 136 42 133 40 128 Z" fill={c.shade} />
        {/* cheeks */}
        <Ellipse cx={64} cy={108} rx={9} ry={6} fill={c.cheek} opacity={0.8} />
        <Ellipse cx={136} cy={108} rx={9} ry={6} fill={c.cheek} opacity={0.8} />
        <Face mood={mood} />
      </Svg>
    </Animated.View>
  );
}
