import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

const LOGO_LINE1 = '스터디';
const LOGO_LINE2 = '브릿지';
const LOADING_MESSAGE = '인터넷 바다에서 쓰레기 걸러내는 중';
const DOT_INTERVAL_MS = 500;

/**
 * variant="splash" | "progress"
 * - splash: 앱 실행 시 전체 화면 로딩(로고 + 문구)
 * - progress: 검색 중 반투명 오버레이 + 로딩 바
 */
export default function LoadingScreen({ variant = 'splash' }) {
  const [dotCount, setDotCount] = useState(0);
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = setInterval(() => {
      setDotCount((prev) => (prev >= 3 ? 0 : prev + 1));
    }, DOT_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (variant !== 'progress') return;
    const loop = () => {
      barAnim.setValue(0);
      Animated.timing(barAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }).start(({ finished }) => finished && loop());
    };
    loop();
    return () => barAnim.stopAnimation();
  }, [variant, barAnim]);

  const dots = '.'.repeat(dotCount);

  if (variant === 'progress') {
    const barWidth = barAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '80%'],
    });
    return (
      <View style={styles.overlayProgress}>
        <View style={styles.progressBarTrack}>
          <Animated.View style={[styles.progressBarFill, { width: barWidth }]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.centerContent}>
        <View style={styles.logoBlock}>
          <Text style={styles.logoLine1}>{LOGO_LINE1}</Text>
          <Text style={styles.logoLine2}>{LOGO_LINE2}</Text>
        </View>
        <Text style={styles.loadingText}>
          {LOADING_MESSAGE}
          <Text style={styles.dots}>{dots}</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    alignItems: 'center',
  },
  logoBlock: {
    marginBottom: 32,
  },
  logoLine1: {
    fontSize: 88,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
  },
  logoLine2: {
    fontSize: 88,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
    marginTop: 4,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 22,
  },
  dots: {
    minWidth: 18,
  },
  overlayProgress: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  progressBarTrack: {
    height: 5,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#C7C7CC',
    borderRadius: 3,
  },
});

