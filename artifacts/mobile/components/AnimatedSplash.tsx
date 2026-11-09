import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { CloudBuddy } from './CloudBuddy';
import type { BuddyMood } from './CloudBuddy';

const BG = '#6C5CE7';

const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? 'Rest is part of the plan' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

/**
 * Picks up exactly where the native splash leaves off (same purple, same cloud,
 * same size), then: the cloud hops and smiles, the wordmark rises in, and the
 * whole thing fades into the app once `ready` is true. Respects Reduce Motion.
 */
export function AnimatedSplash({ ready, onFinish }: { ready: boolean; onFinish: () => void }) {
  const reduce = useReducedMotion();
  const [mood, setMood] = useState<BuddyMood>('hello');
  const [introDone, setIntroDone] = useState(false);

  const cloudY = useSharedValue(0);
  const cloudScale = useSharedValue(1);
  const textOpacity = useSharedValue(0);
  const textY = useSharedValue(12);
  const screenOpacity = useSharedValue(1);

  // Intro: hop + smile + wordmark.
  useEffect(() => {
    if (reduce) {
      textOpacity.value = withTiming(1, { duration: 200 });
      const t = setTimeout(() => setIntroDone(true), 400);
      return () => clearTimeout(t);
    }
    cloudY.value = withSequence(
      withTiming(-34, { duration: 260, easing: Easing.out(Easing.quad) }),
      withSpring(-22, { damping: 7, stiffness: 140 }),
    );
    cloudScale.value = withSequence(withTiming(1.06, { duration: 260 }), withSpring(0.92, { damping: 8 }));
    textOpacity.value = withDelay(280, withTiming(1, { duration: 360 }));
    textY.value = withDelay(280, withSpring(0, { damping: 12 }));
    const smile = setTimeout(() => setMood('happy'), 300);
    const done = setTimeout(() => setIntroDone(true), 1100);
    return () => {
      clearTimeout(smile);
      clearTimeout(done);
    };
  }, [reduce, cloudY, cloudScale, textOpacity, textY]);

  // Outro once the app is ready and the intro has played.
  useEffect(() => {
    if (!ready || !introDone) return;
    screenOpacity.value = withTiming(0, { duration: reduce ? 150 : 380 }, (finished) => {
      if (finished) runOnJS(onFinish)();
    });
    if (!reduce) cloudScale.value = withTiming(1.25, { duration: 380 });
  }, [ready, introDone, reduce, onFinish, screenOpacity, cloudScale]);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const cloudStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cloudY.value }, { scale: cloudScale.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textY.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, screenStyle]} pointerEvents="none">
      <View style={styles.center}>
        {/* 200×200 box matches the native splash image (imageWidth: 200). */}
        <Animated.View style={[styles.cloudBox, cloudStyle]}>
          <CloudBuddy mood={mood} size={200} />
        </Animated.View>
        <Animated.View style={[styles.words, textStyle]}>
          <Text style={styles.wordmark} accessibilityRole="header">dayflow</Text>
          <Text style={styles.tagline}>{greeting()}</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: BG, zIndex: 1000 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cloudBox: { width: 200, height: 200, paddingTop: 20 },
  words: { position: 'absolute', top: '50%', marginTop: 88, alignItems: 'center' },
  wordmark: { color: '#FFFFFF', fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  tagline: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '600', marginTop: 4 },
});
