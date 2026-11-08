import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMusicStore } from '../store/useMusicStore';
import { COLORS } from '../constants/theme';
import { FullPlayerModal } from './FullPlayerModal';

export const PlayerBar: React.FC = () => {
  const currentTrack = useMusicStore(s => s.currentTrack);
  const isPlaying = useMusicStore(s => s.isPlaying);
  const positionSec = useMusicStore(s => s.positionSec);
  const durationSec = useMusicStore(s => s.durationSec);
  const isBuffering = useMusicStore(s => s.isBuffering);
  const isPlayerModalOpen = useMusicStore(s => s.isPlayerModalOpen);

  const togglePlayPause = useMusicStore(s => s.togglePlayPause);
  const skipNext = useMusicStore(s => s.skipNext);
  const skipPrevious = useMusicStore(s => s.skipPrevious);
  const seekTo = useMusicStore(s => s.seekTo);
  const setPlayerModalOpen = useMusicStore(s => s.setPlayerModalOpen);

  if (!currentTrack) {
    return null;
  }

  const total = durationSec > 0 ? durationSec : currentTrack.durationSec || 200;
  const progressRatio = Math.min(Math.max(positionSec / total, 0), 1);

  return (
    <>
      <TouchableOpacity
        style={styles.floatingBar}
        activeOpacity={0.9}
        onPress={() => setPlayerModalOpen(true)}
      >
        {/* Progress Bar Tipis di bagian atas Mini Player */}
        <View style={styles.miniProgressTrack}>
          <View style={[styles.miniProgressFill, { width: `${progressRatio * 100}%` }]} />
        </View>

        <View style={styles.contentRow}>
          {/* Cover Art Mini */}
          <Image
            source={{ uri: currentTrack.thumbnail || 'https://via.placeholder.com/44' }}
            style={styles.coverImage}
          />

          {/* Info Judul & Artis */}
          <View style={styles.infoContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <View style={styles.metaRow}>
              {currentTrack.isDownloaded && (
                <View style={styles.miniOfflineBadge}>
                  <Text style={styles.miniOfflineText}>OFFLINE</Text>
                </View>
              )}
              <Text style={styles.artist} numberOfLines={1}>
                {currentTrack.artist}
              </Text>
            </View>
          </View>

          {/* Tombol Play/Pause & Next */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation?.();
                togglePlayPause();
              }}
              style={styles.playBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={22}
                color={COLORS.textPrimary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation?.();
                skipNext();
              }}
              style={styles.nextBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="play-skip-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      {/* Full Player Modal */}
      <FullPlayerModal
        visible={isPlayerModalOpen}
        track={currentTrack}
        isPlaying={isPlaying}
        positionSec={positionSec}
        durationSec={durationSec}
        isBuffering={isBuffering}
        onClose={() => setPlayerModalOpen(false)}
        onTogglePlayPause={togglePlayPause}
        onNext={skipNext}
        onPrevious={skipPrevious}
        onSeek={seekTo}
      />
    </>
  );
};

const styles = StyleSheet.create({
  floatingBar: {
    position: 'absolute',
    bottom: 64, // Berada persis melayang di atas Bottom Tab Bar
    left: 12,
    right: 12,
    backgroundColor: '#1E1E24',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#3F3F46',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden'
  },
  miniProgressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#27272A'
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: COLORS.accentPrimary
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  coverImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#27272A'
  },
  infoContainer: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600'
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2
  },
  miniOfflineBadge: {
    backgroundColor: '#065F46',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3
  },
  miniOfflineText: {
    color: '#34D399',
    fontSize: 8,
    fontWeight: '700'
  },
  artist: {
    color: COLORS.textSecondary,
    fontSize: 11
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  playBtn: {
    padding: 6
  },
  nextBtn: {
    padding: 6
  }
});

