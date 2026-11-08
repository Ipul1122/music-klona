import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMusicStore } from '../store/useMusicStore';
import { COLORS } from '../constants/theme';
import { AppTab } from '../types';

export const BottomTabBar: React.FC = () => {
  const activeTab = useMusicStore(s => s.activeTab);
  const setActiveTab = useMusicStore(s => s.setActiveTab);
  const offlineCount = useMusicStore(s => s.offlineTracks.length);

  const tabs: { key: AppTab; label: string; icon: keyof typeof Ionicons.glyphMap; badge?: number }[] = [
    {
      key: 'search',
      label: 'Cari & Unduh',
      icon: 'search'
    },
    {
      key: 'library',
      label: 'Koleksi Offline',
      icon: 'library',
      badge: offlineCount > 0 ? offlineCount : undefined
    }
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map((t) => {
        const isActive = activeTab === t.key;
        return (
          <TouchableOpacity
            key={t.key}
            style={styles.tabItem}
            activeOpacity={0.7}
            onPress={() => setActiveTab(t.key)}
          >
            <View style={styles.iconWrapper}>
              <Ionicons
                name={t.icon}
                size={22}
                color={isActive ? COLORS.accentPrimary : COLORS.textSecondary}
              />
              {t.badge !== undefined && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{t.badge}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    height: 60,
    backgroundColor: '#0F0F12',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#27272A',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 4
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1
  },
  iconWrapper: {
    position: 'relative'
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: COLORS.accentPrimary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4
  },
  badgeText: {
    color: '#09090B',
    fontSize: 9,
    fontWeight: '800'
  },
  tabLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 3
  },
  activeTabLabel: {
    color: COLORS.accentPrimary,
    fontWeight: '700'
  }
});

