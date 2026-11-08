import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMusicStore } from '../store/useMusicStore';
import { COLORS } from '../constants/theme';
import { getUniqueHardwareDeviceId, getDeviceDisplayName, DEFAULT_LICENSE_SERVER_URL } from '../api/licenseApi';
import { storageService } from '../services/storageService';
import { LicenseData } from '../types';

export const LicenseScreen: React.FC = () => {
  const [licenseInput, setLicenseInput] = useState('');
  const [serverUrl, setServerUrl] = useState(DEFAULT_LICENSE_SERVER_URL);
  const [showServerSetting, setShowServerSetting] = useState(false);
  const [hardwareId, setHardwareId] = useState('Memuat ID...');
  const [deviceName, setDeviceName] = useState('Smartphone');
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const isVerifying = useMusicStore(s => s.isVerifyingLicense);
  const activateLicense = useMusicStore(s => s.activateLicense);

  useEffect(() => {
    async function loadDevice() {
      const id = await getUniqueHardwareDeviceId();
      const name = getDeviceDisplayName();
      setHardwareId(id);
      setDeviceName(name);

      const savedUrl = await storageService.getServerUrl();
      if (savedUrl) {
        setServerUrl(savedUrl);
      } else if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
        setServerUrl(window.location.origin);
      }
    }
    loadDevice();
  }, []);

  const handleActivate = async () => {
    setFeedback(null);
    if (!licenseInput.trim()) {
      setFeedback({ type: 'error', message: 'Silakan masukkan kode lisensi (contoh: PULL-XXXX-XXXX).' });
      return;
    }

    const cleanUrl = serverUrl.trim();
    await storageService.saveServerUrl(cleanUrl);

    const res = await activateLicense(licenseInput.trim(), cleanUrl);
    if (!res.success) {
      setFeedback({ type: 'error', message: res.message });
      if (res.error === 'NETWORK_ERROR' && cleanUrl.includes('localhost') && Platform.OS !== 'web') {
        setShowServerSetting(true);
      }
    }
  };

  const handleBuyViaWhatsApp = () => {
    const adminPhone = '6281234567890'; // Nomor WhatsApp Admin Penjualan
    const message = encodeURIComponent(
      `Halo Admin Musik Klona, saya ingin membeli Kode Lisensi Akses Musik Offline (Rp50.000 Lifetime). ID Perangkat saya: ${hardwareId}`
    );
    Linking.openURL(`https://wa.me/${adminPhone}?text=${message}`);
  };

  const handleGuestMode = async () => {
    const demoData: LicenseData = {
      isActivated: true,
      licenseKey: 'PULL-DEMO-2026',
      token: 'demo-local-jwt-token',
      maxDevices: 2,
      registeredDevices: 1,
      activatedAt: new Date().toISOString()
    };
    await storageService.saveLicenseData(demoData);
    useMusicStore.setState({ license: demoData });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Logo & Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="musical-notes" size={40} color={COLORS.accentPrimary} />
            </View>
            <Text style={styles.appTitle}>MUSIK KLONA</Text>
            <Text style={styles.tagline}>Unduh & Putar Musik Offline Seumur Hidup</Text>
          </View>

          {/* Kartu Aktivasi */}
          <View style={styles.card}>
            <View style={styles.badgeRow}>
              <Ionicons name="shield-checkmark" size={16} color={COLORS.accentPrimary} />
              <Text style={styles.badgeText}>SISTEM ANTI-SHARING AKTIF (MAKS. 2 HP)</Text>
            </View>

            <Text style={styles.inputLabel}>Masukkan Kode Lisensi Anda</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="key-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="PULL-XXXX-XXXX"
                placeholderTextColor={COLORS.textMuted}
                value={licenseInput}
                onChangeText={(text) => setLicenseInput(text.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {licenseInput.length === 0 && (
                <TouchableOpacity
                  onPress={() => setLicenseInput('PULL-DEMO-2026')}
                  style={styles.demoKeyChip}
                >
                  <Text style={styles.demoKeyChipText}>Gunakan Demo</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Hardware ID Info */}
            <View style={styles.deviceInfoBox}>
              <Text style={styles.deviceInfoTitle}>ID Hardware Terkunci:</Text>
              <Text style={styles.deviceInfoId} numberOfLines={1} ellipsizeMode="middle">
                {hardwareId} ({deviceName})
              </Text>
            </View>

            {/* Error / Feedback Banner */}
            {feedback && (
              <View
                style={[
                  styles.feedbackBox,
                  feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess
                ]}
              >
                <Ionicons
                  name={feedback.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
                  size={18}
                  color={feedback.type === 'error' ? COLORS.danger : COLORS.accentPrimary}
                />
                <Text
                  style={[
                    styles.feedbackText,
                    feedback.type === 'error' ? styles.feedbackTextError : styles.feedbackTextSuccess
                  ]}
                >
                  {feedback.message}
                </Text>
              </View>
            )}

            {/* Tombol Aktivasi */}
            <TouchableOpacity
              style={[styles.activateBtn, isVerifying && styles.disabledBtn]}
              onPress={handleActivate}
              disabled={isVerifying}
              activeOpacity={0.8}
            >
              {isVerifying ? (
                <ActivityIndicator color={COLORS.backgroundPrimary} size="small" />
              ) : (
                <>
                  <Ionicons name="lock-open-outline" size={18} color={COLORS.backgroundPrimary} />
                  <Text style={styles.activateBtnText}>Aktivasi Perangkat</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Pembatas */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ATAU</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Tombol Beli via WhatsApp */}
            <TouchableOpacity
              style={styles.buyBtn}
              onPress={handleBuyViaWhatsApp}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              <Text style={styles.buyBtnText}>Beli Kode Akses (Rp50.000)</Text>
            </TouchableOpacity>

            {/* Tombol Coba Mode Demo Instan */}
            <TouchableOpacity
              style={styles.guestBtn}
              onPress={handleGuestMode}
              activeOpacity={0.8}
            >
              <Ionicons name="sparkles" size={16} color={COLORS.accentPrimary} />
              <Text style={styles.guestBtnText}>Coba Mode Demo Instan (Tanpa Backend)</Text>
            </TouchableOpacity>

            {/* Konfigurasi Server URL Toggle */}
            <TouchableOpacity
              style={styles.serverToggleBtn}
              onPress={() => setShowServerSetting(!showServerSetting)}
            >
              <Ionicons name="settings-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.serverToggleText}>
                {showServerSetting ? 'Sembunyikan Pengaturan Server' : 'Ubah URL Server Lisensi'}
              </Text>
            </TouchableOpacity>

            {showServerSetting && (
              <View style={styles.serverInputBox}>
                <Text style={styles.serverLabel}>Backend Server URL:</Text>
                <TextInput
                  style={styles.serverInput}
                  value={serverUrl}
                  onChangeText={setServerUrl}
                  placeholder="http://localhost:3000"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={styles.serverPresetsRow}>
                  <TouchableOpacity
                    style={styles.presetChip}
                    onPress={() => setServerUrl('https://music-klona.vercel.app')}
                  >
                    <Text style={styles.presetChipText}>🌐 Cloud Vercel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.presetChip}
                    onPress={() => setServerUrl('http://192.168.100.186:3000')}
                  >
                    <Text style={styles.presetChipText}>💻 IP Laptop</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.presetChip}
                    onPress={() => setServerUrl('http://localhost:3000')}
                  >
                    <Text style={styles.presetChipText}>🔄 Localhost</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.serverHint}>
                  (Jika buka di HP fisik, gunakan IP Laptop atau Cloud Vercel. Jangan gunakan localhost)
                </Text>
              </View>
            )}
          </View>

          {/* Fitur Highlights */}
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.accentPrimary} />
              <Text style={styles.featureText}>100% Bebas Kuota Internet (Offline)</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.accentPrimary} />
              <Text style={styles.featureText}>Putar Musik di Latar Belakang & Layar Kunci</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.accentPrimary} />
              <Text style={styles.featureText}>Akses Katalog YouTube Lengkap Tanpa Iklan</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.backgroundPrimary
  },
  keyboardView: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
    alignItems: 'center'
  },
  header: {
    alignItems: 'center',
    marginBottom: 28
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#132E24',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.accentPrimary,
    marginBottom: 16
  },
  appTitle: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 2
  },
  tagline: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 4
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272A'
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F291E',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#059669'
  },
  badgeText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '700'
  },
  inputLabel: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#09090B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3F3F46',
    paddingHorizontal: 12,
    height: 48
  },
  inputIcon: {
    marginRight: 8
  },
  textInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1.5
  },
  demoKeyChip: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#059669'
  },
  demoKeyChipText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '600'
  },
  deviceInfoBox: {
    marginTop: 10,
    backgroundColor: '#1E1E24',
    padding: 10,
    borderRadius: 8
  },
  deviceInfoTitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600'
  },
  deviceInfoId: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginTop: 12
  },
  feedbackError: {
    backgroundColor: '#3E1417',
    borderWidth: 1,
    borderColor: COLORS.danger
  },
  feedbackSuccess: {
    backgroundColor: '#0D3325',
    borderWidth: 1,
    borderColor: COLORS.accentPrimary
  },
  feedbackText: {
    fontSize: 12,
    flex: 1
  },
  feedbackTextError: {
    color: '#FCA5A5'
  },
  feedbackTextSuccess: {
    color: '#6EE7B7'
  },
  activateBtn: {
    backgroundColor: COLORS.accentPrimary,
    borderRadius: 10,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16
  },
  disabledBtn: {
    opacity: 0.6
  },
  activateBtnText: {
    color: COLORS.backgroundPrimary,
    fontSize: 15,
    fontWeight: '700'
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#27272A'
  },
  dividerText: {
    color: COLORS.textMuted,
    fontSize: 11,
    paddingHorizontal: 12,
    fontWeight: '600'
  },
  buyBtn: {
    backgroundColor: '#1B2C24',
    borderRadius: 10,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#25D366'
  },
  buyBtnText: {
    color: '#FAFAFA',
    fontSize: 14,
    fontWeight: '600'
  },
  guestBtn: {
    backgroundColor: '#1E1E24',
    borderRadius: 10,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#3F3F46'
  },
  guestBtnText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600'
  },
  serverToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 4
  },
  serverToggleText: {
    color: COLORS.textMuted,
    fontSize: 12
  },
  serverInputBox: {
    marginTop: 10,
    backgroundColor: '#09090B',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A'
  },
  serverLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginBottom: 4
  },
  serverInput: {
    color: COLORS.textPrimary,
    fontSize: 13,
    paddingVertical: 4
  },
  serverPresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginBottom: 4
  },
  presetChip: {
    backgroundColor: '#1E1E24',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3F3F46'
  },
  presetChipText: {
    color: COLORS.accentPrimary,
    fontSize: 11,
    fontWeight: '500'
  },
  serverHint: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2
  },
  featuresList: {
    marginTop: 24,
    gap: 10,
    width: '100%'
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  featureText: {
    color: COLORS.textSecondary,
    fontSize: 13
  }
});

