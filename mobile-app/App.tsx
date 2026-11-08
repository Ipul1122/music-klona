import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Network from 'expo-network';
import { useMusicStore } from './src/store/useMusicStore';
import { LicenseScreen } from './src/screens/LicenseScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { PlayerBar } from './src/components/PlayerBar';
import { BottomTabBar } from './src/components/BottomTabBar';
import { COLORS } from './src/constants/theme';

export default function App() {
  const license = useMusicStore(s => s.license);
  const activeTab = useMusicStore(s => s.activeTab);
  const isLoadingOffline = useMusicStore(s => s.isLoadingOffline);
  const initApp = useMusicStore(s => s.initApp);
  const setIsOnline = useMusicStore(s => s.setIsOnline);

  useEffect(() => {
    // 1. Inisialisasi app store & audio service
    initApp();

    // 2. Monitor status jaringan (Mode Pesawat / Offline)
    async function checkNetwork() {
      try {
        const state = await Network.getNetworkStateAsync();
        const online = Boolean(state.isConnected && state.isInternetReachable !== false);
        setIsOnline(online);
      } catch {
        setIsOnline(true);
      }
    }

    checkNetwork();
    const interval = setInterval(checkNetwork, 5000);
    return () => clearInterval(interval);
  }, []);

  // Tampilan loading awal
  if (isLoadingOffline) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="large" color={COLORS.accentPrimary} />
      </View>
    );
  }

  // 1. Layar Aktivasi Lisensi (Tampil jika belum memiliki token aktif)
  if (!license.isActivated) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <LicenseScreen />
      </View>
    );
  }

  // 2. Layar Utama (Tab 1: Cari & Unduh / Tab 2: Koleksi Offline)
  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Konten Tab Aktif */}
      <View style={styles.content}>
        {activeTab === 'search' ? <SearchScreen /> : <LibraryScreen />}
      </View>

      {/* Global Mini Player & Full Player Modal (Melayang di atas Bottom Tab Bar) */}
      <PlayerBar />

      {/* Bottom Tab Bar */}
      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.backgroundPrimary
  },
  splashContainer: {
    flex: 1,
    backgroundColor: COLORS.backgroundPrimary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  content: {
    flex: 1
  }
});

