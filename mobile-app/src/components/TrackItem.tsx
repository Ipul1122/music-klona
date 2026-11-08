import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Track } from '../types';
import { COLORS } from '../constants/theme';

interface TrackItemProps {
  track: Track;
  isPlaying: boolean;
  isCurrent: boolean;
  downloadProgress?: number;
  onPlay: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  onSaveFile?: () => void;
  showDeleteButton?: boolean;
}

export const TrackItem: React.FC<TrackItemProps> = ({
  track,
  isPlaying,
  isCurrent,
  downloadProgress,
  onPlay,
  onDownload,
  onDelete,
  onSaveFile,
  showDeleteButton = false
}) => {
  const isDownloading = downloadProgress !== undefined;

  return (
    <View style={[styles.container, isCurrent && styles.activeContainer]}>
      {/* 1. Thumbnail Kotak (56x56) */}
      <TouchableOpacity onPress={onPlay} activeOpacity={0.8} style={styles.thumbnailWrapper}>
        <Image
          source={{ uri: track.thumbnail || 'https://via.placeholder.com/56' }}
          style={styles.thumbnail}
        />
        {isCurrent && (
          <View style={styles.playingOverlay}>
            <Ionicons
              name={isPlaying ? 'volume-high' : 'pause'}
              size={18}
              color={COLORS.accentPrimary}
            />
          </View>
        )}
      </TouchableOpacity>

      {/* 2. Informasi Lagu */}
      <TouchableOpacity style={styles.infoContainer} onPress={onPlay} activeOpacity={0.7}>
        <Text
          style={[styles.title, isCurrent && styles.activeTitle]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {track.title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.artist} numberOfLines={1}>
            {track.artist}
          </Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.duration}>{track.duration}</Text>
          {track.isDownloaded && (
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineBadgeText}>OFFLINE</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* 3. Tombol Aksi */}
      <View style={styles.actionsContainer}>
        {/* Tombol Play */}
        <TouchableOpacity
          style={[styles.actionBtn, isCurrent && isPlaying && styles.actionBtnActive]}
          onPress={onPlay}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isCurrent && isPlaying ? 'pause' : 'play'}
            size={18}
            color={isCurrent && isPlaying ? COLORS.backgroundPrimary : COLORS.textPrimary}
          />
        </TouchableOpacity>

        {/* Tombol Download Offline / Status Centang */}
        {onDownload && !showDeleteButton && (
          <TouchableOpacity
            style={[
              styles.downloadBtn,
              track.isDownloaded && styles.downloadBtnCompleted,
              isDownloading && styles.downloadBtnLoading
            ]}
            onPress={onDownload}
            disabled={track.isDownloaded || isDownloading}
          >
            {isDownloading ? (
              <View style={styles.progressCircle}>
                <ActivityIndicator size="small" color={COLORS.accentPrimary} />
                <Text style={styles.progressText}>{downloadProgress}%</Text>
              </View>
            ) : track.isDownloaded ? (
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            ) : (
              <Ionicons name="arrow-down" size={18} color={COLORS.textSecondary} />
            )}
          </TouchableOpacity>
        )}

        {/* Tombol Simpan/Download File Fisik .m4a ke Komputer / HP */}
        {onSaveFile && (
          <TouchableOpacity
            style={styles.saveFileBtn}
            onPress={onSaveFile}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="download-outline" size={18} color={COLORS.accentPrimary} />
          </TouchableOpacity>
        )}

        {/* Tombol Hapus (Koleksi Offline) */}
        {showDeleteButton && onDelete && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={onDelete}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#27272A'
  },
  activeContainer: {
    borderColor: COLORS.accentPrimary,
    backgroundColor: '#1C2E26'
  },
  thumbnailWrapper: {
    position: 'relative',
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#27272A'
  },
  thumbnail: {
    width: '100%',
    height: '100%'
  },
  playingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center'
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4
  },
  activeTitle: {
    color: COLORS.accentPrimary
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  artist: {
    color: COLORS.textSecondary,
    fontSize: 12,
    maxWidth: 130
  },
  dot: {
    color: COLORS.textSecondary,
    fontSize: 10
  },
  duration: {
    color: COLORS.textSecondary,
    fontSize: 12
  },
  offlineBadge: {
    backgroundColor: '#065F46',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 4
  },
  offlineBadgeText: {
    color: '#34D399',
    fontSize: 9,
    fontWeight: '700'
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#27272A',
    justifyContent: 'center',
    alignItems: 'center'
  },
  actionBtnActive: {
    backgroundColor: COLORS.accentPrimary
  },
  downloadBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#27272A',
    justifyContent: 'center',
    alignItems: 'center'
  },
  downloadBtnCompleted: {
    backgroundColor: COLORS.accentPrimary
  },
  downloadBtnLoading: {
    backgroundColor: '#1E293B',
    padding: 2
  },
  progressCircle: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  progressText: {
    color: COLORS.accentPrimary,
    fontSize: 8,
    fontWeight: '700',
    position: 'absolute'
  },
  saveFileBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155'
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2D1B1E',
    justifyContent: 'center',
    alignItems: 'center'
  }
});

