import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Track } from '../types';
import { COLORS } from '../constants/theme';
import { formatSecondsToTime } from '../api/youtubeScraper';

interface FullPlayerModalProps {
  visible: boolean;
  track: Track | null;
  isPlaying: boolean;
  positionSec: number;
  durationSec: number;
  isBuffering: boolean;
  onClose: () => void;
  onTogglePlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (seconds: number) => void;
}

const { width } = Dimensions.get('window');
const ART_SIZE = Math.min(width - 48, 300);

export const FullPlayerModal: React.FC<FullPlayerModalProps> = ({
  visible,
  track,
  isPlaying,
  positionSec,
  durationSec,
  isBuffering,
  onClose,
  onTogglePlayPause,
  onNext,
  onPrevious,
  onSeek
}) => {
  if (!track) return null;

  const totalDuration = durationSec > 0 ? durationSec : track.durationSec || 200;
  const progressRatio = Math.min(Math.max(positionSec / totalDuration, 0), 1);

  const handleProgressBarPress = (e: any) => {
    const { locationX } = e.nativeEvent;
    const barWidth = width - 48;
    const clickRatio = Math.max(0, Math.min(locationX / barWidth, 1));
    const targetSeconds = Math.round(clickRatio * totalDuration);
    onSeek(targetSeconds);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* 1. Header Toolbar */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
              <Ionicons name="chevron-down" size={28} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerSubtitle}>MEMUTAR DARI {track.isDownloaded ? 'MEMORI HP' : 'YOUTUBE'}</Text>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {track.title}
              </Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* 2. Cover Art Besar */}
          <View style={styles.artContainer}>
            <Image
              source={{ uri: track.thumbnail || 'https://via.placeholder.com/300' }}
              style={styles.artImage}
            />
            {track.isDownloaded && (
              <View style={styles.offlinePill}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={styles.offlinePillText}>OFFLINE READY</Text>
              </View>
            )}
          </View>

          {/* 3. Info Lagu */}
          <View style={styles.trackDetails}>
            <Text style={styles.title} numberOfLines={2}>
              {track.title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {track.artist}
            </Text>
          </View>

          {/* 4. Seekbar / Slider Durasi */}
          <View style={styles.progressContainer}>
            <TouchableOpacity
              style={styles.progressBarTrack}
              activeOpacity={1}
              onPress={handleProgressBarPress}
            >
              <View style={[styles.progressBarFill, { width: `${progressRatio * 100}%` }]} />
              <View
                style={[
                  styles.scrubberThumb,
                  { left: `${progressRatio * 100}%` }
                ]}
              />
            </TouchableOpacity>

            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatSecondsToTime(positionSec)}</Text>
              <Text style={styles.timeText}>{formatSecondsToTime(totalDuration)}</Text>
            </View>
          </View>

          {/* 5. Kontrol Pemutar Utama */}
          <View style={styles.controlsRow}>
            {/* Previous */}
            <TouchableOpacity onPress={onPrevious} style={styles.sideControlBtn}>
              <Ionicons name="play-skip-back" size={30} color={COLORS.textPrimary} />
            </TouchableOpacity>

            {/* Play / Pause Besar */}
            <TouchableOpacity
              onPress={onTogglePlayPause}
              style={styles.mainPlayBtn}
              activeOpacity={0.8}
            >
              {isBuffering ? (
                <Ionicons name="ellipsis-horizontal" size={32} color={COLORS.backgroundPrimary} />
              ) : (
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={36}
                  color={COLORS.backgroundPrimary}
                  style={!isPlaying ? { marginLeft: 4 } : undefined}
                />
              )}
            </TouchableOpacity>

            {/* Next */}
            <TouchableOpacity onPress={onNext} style={styles.sideControlBtn}>
              <Ionicons name="play-skip-forward" size={30} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Footer Status Mode */}
          <View style={styles.footerStatus}>
            <Ionicons
              name={track.isDownloaded ? 'flash' : 'wifi'}
              size={14}
              color={COLORS.accentPrimary}
            />
            <Text style={styles.footerStatusText}>
              {track.isDownloaded
                ? 'Mode Offline Aktif — 0MB Penggunaan Data Seluler'
                : 'Direct Streaming On-Device (InnerTube)'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.backgroundPrimary
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 24
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 16
  },
  headerBtn: {
    padding: 6
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1
  },
  headerSubtitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2
  },
  artContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 12
  },
  artImage: {
    width: ART_SIZE,
    height: ART_SIZE,
    borderRadius: 16,
    backgroundColor: COLORS.backgroundSecondary
  },
  offlinePill: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(9, 9, 11, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
    borderWidth: 1,
    borderColor: '#059669'
  },
  offlinePillText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700'
  },
  trackDetails: {
    marginTop: 8,
    marginBottom: 16
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6
  },
  artist: {
    color: COLORS.textSecondary,
    fontSize: 15
  },
  progressContainer: {
    marginBottom: 20
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#27272A',
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center'
  },
  progressBarFill: {
    height: 6,
    backgroundColor: COLORS.accentPrimary,
    borderRadius: 3
  },
  scrubberThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    marginLeft: -7
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8
  },
  timeText: {
    color: COLORS.textMuted,
    fontSize: 12
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
    marginVertical: 12
  },
  sideControlBtn: {
    padding: 12
  },
  mainPlayBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.accentPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.accentPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  footerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#18181B'
  },
  footerStatusText: {
    color: COLORS.textSecondary,
    fontSize: 12
  }
});

