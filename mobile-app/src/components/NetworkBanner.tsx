import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

interface NetworkBannerProps {
  isOnline: boolean;
}

export const NetworkBanner: React.FC<NetworkBannerProps> = ({ isOnline }) => {
  if (isOnline) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline" size={16} color={COLORS.accentPrimary} />
      <Text style={styles.bannerText}>
        Mode Offline Aktif — Memutar dari Memori Internal
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#064E3B', // Dark emerald
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#047857'
  },
  bannerText: {
    color: '#D1FAE5',
    fontSize: 12,
    fontWeight: '600'
  }
});

