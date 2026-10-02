import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Image,
} from 'react-native';
import { GraduationCap, Sparkles } from 'lucide-react-native';

interface AppSplashScreenProps {
  theme?: 'dark' | 'oled' | 'light';
}

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({ theme = 'dark' }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle pulsing animation for loading glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim, scaleAnim, pulseAnim]);

  const isLight = theme === 'light';
  const isOled = theme === 'oled';
  const bgColor = isLight ? '#F8FAFC' : isOled ? '#000000' : '#0F172A';
  const textColor = isLight ? '#0F172A' : '#F8FAFC';
  const subColor = isLight ? '#64748B' : '#94A3B8';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar
        barStyle={isLight ? 'dark-content' : 'light-content'}
        backgroundColor={bgColor}
      />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Logo Card with Ambient Glow */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/splash-icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Title and Tagline */}
        <View style={styles.badgeRow}>
          <Sparkles size={14} color="#38BDF8" />
          <Text style={styles.badgeText}>YAPAY ZEKA DESTEKLİ</Text>
        </View>

        <Text style={[styles.title, { color: textColor }]}>
          AKADEMİK ASİSTAN
        </Text>
        <Text style={styles.versionTag}>PRO SÜRÜM</Text>

        <Text style={[styles.subtitle, { color: subColor }]}>
          Akıllı Ders Programı, Not Kasası & Sınav Asistanı
        </Text>

        {/* Pulsing Loading Bar Indicator */}
        <View style={styles.loadingTrack}>
          <Animated.View style={[styles.loadingFill, { opacity: pulseAnim }]} />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  logoImage: {
    width: 130,
    height: 130,
    borderRadius: 32,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 4,
  },
  versionTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 36,
    maxWidth: 280,
    lineHeight: 18,
  },
  loadingTrack: {
    width: 120,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingFill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 2,
  },
});
