import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMusicStore } from '../store/useMusicStore';
import { COLORS } from '../constants/theme';
import { TrackItem } from '../components/TrackItem';
import { NetworkBanner } from '../components/NetworkBanner';
import { Track } from '../types';

export const LibraryScreen: React.FC = () => {
  const offlineTracks = useMusicStore(s => s.offlineTracks);
  const currentTrack = useMusicStore(s => s.currentTrack);
  const isPlaying = useMusicStore(s => s.isPlaying);
  const isOnline = useMusicStore(s => s.isOnline);

  const playTrack = useMusicStore(s => s.playTrack);
  const playAllOffline = useMusicStore(s => s.playAllOffline);
  const deleteOfflineTrack = useMusicStore(s => s.deleteOfflineTrack);
  const setActiveTab = useMusicStore(s => s.setActiveTab);

  const handleDelete = (track: Track) => {
    // Pada Browser Web: Gunakan window.confirm karena Alert.alert di react-native-web tidak mengeksekusi tombol custom
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm(`Apakah Anda yakin ingin menghapus "${track.title}" dari penyimpanan offline?`) : true;
      if (confirmed) {
        deleteOfflineTrack(track.id);
      }
      return;
    }

    Alert.alert(
      'Hapus Lagu',
      `Apakah Anda yakin ingin menghapus "${track.title}" dari penyimpanan HP Anda?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => deleteOfflineTrack(track.id)
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. Banner Status Jaringan di Atas (Sesuai DESIGN.md) */}
      <NetworkBanner isOnline={isOnline} />

      <View style={styles.container}>
        {/* 2. Header & Tombol Putar Semua (Play All) */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Koleksi Offline</Text>
            <Text style={styles.headerSubtitle}>
              {offlineTracks.length} lagu tersimpan di memori HP
            </Text>
          </View>

          {offlineTracks.length > 0 && (
            <TouchableOpacity
              style={styles.playAllBtn}
              onPress={playAllOffline}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={16} color={COLORS.backgroundPrimary} />
              <Text style={styles.playAllText}>Putar Semua</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 3. Daftar Lagu Offline */}
        <FlatList
          data={offlineTracks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isCurrent = currentTrack?.id === item.id;
            return (
              <TrackItem
                track={item}
                isCurrent={isCurrent}
                isPlaying={isCurrent && isPlaying}
                onPlay={() => playTrack(item, offlineTracks)}
                showDeleteButton={true}
                onDelete={() => handleDelete(item)}
              />
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="cloud-download-outline" size={52} color={COLORS.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>Belum Ada Lagu Tersimpan</Text>
              <Text style={styles.emptySubtitle}>
                Unduh lagu favoritmu dari tab "Cari & Unduh" agar bisa didengarkan tanpa kuota internet kapan saja.
              </Text>
              <TouchableOpacity
                style={styles.gotoSearchBtn}
                onPress={() => setActiveTab('search')}
              >
                <Ionicons name="search" size={16} color={COLORS.backgroundPrimary} />
                <Text style={styles.gotoSearchText}>Cari Lagu Sekarang</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.backgroundPrimary
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '800'
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2
  },
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentPrimary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6
  },
  playAllText: {
    color: COLORS.backgroundPrimary,
    fontSize: 13,
    fontWeight: '700'
  },
  listContent: {
    paddingBottom: 130
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 32
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#18181B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#27272A'
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center'
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20
  },
  gotoSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentPrimary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8
  },
  gotoSearchText: {
    color: COLORS.backgroundPrimary,
    fontSize: 14,
    fontWeight: '700'
  }
});

