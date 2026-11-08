import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMusicStore } from '../store/useMusicStore';
import { COLORS } from '../constants/theme';
import { TrackItem } from '../components/TrackItem';
import { Track } from '../types';

const SUGGESTIONS = ['Sheila On 7', 'Coldplay', 'Lagu Pop Indonesia', 'Lofi Sleep Beats', 'Tulus'];

export const SearchScreen: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const searchResults = useMusicStore(s => s.searchResults);
  const isSearching = useMusicStore(s => s.isSearching);
  const searchError = useMusicStore(s => s.searchError);
  const activeDownloads = useMusicStore(s => s.activeDownloads);
  const currentTrack = useMusicStore(s => s.currentTrack);
  const isPlaying = useMusicStore(s => s.isPlaying);
  const isOnline = useMusicStore(s => s.isOnline);

  const searchTracks = useMusicStore(s => s.searchTracks);
  const playTrack = useMusicStore(s => s.playTrack);
  const downloadTrack = useMusicStore(s => s.downloadTrack);

  // Debounce 500ms sesuai DESIGN.md
  const handleTextChange = (text: string) => {
    setInputText(text);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      searchTracks(text);
    }, 500);
  };

  const handleClear = () => {
    setInputText('');
    searchTracks('');
  };

  const handleSuggestionPress = (tag: string) => {
    setInputText(tag);
    searchTracks(tag);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* 1. Search Bar di Bagian Atas */}
        <View style={styles.searchBarWrapper}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari lagu, artis, atau album..."
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={handleTextChange}
            autoCorrect={false}
            returnKeyType="search"
          />
          {inputText.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* 2. Chips Saran Pencarian Cepat */}
        <View style={styles.suggestionsRow}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={SUGGESTIONS}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionChip}
                onPress={() => handleSuggestionPress(item)}
              >
                <Text style={styles.suggestionText}>{item}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.suggestionsContainer}
          />
        </View>

        {/* 3. Indikator Loading */}
        {isSearching && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.accentPrimary} />
            <Text style={styles.loadingText}>Mencari langsung di katalog YouTube...</Text>
          </View>
        )}

        {/* 4. Error Pencarian */}
        {searchError && !isSearching && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={24} color={COLORS.danger} />
            <Text style={styles.errorText}>{searchError}</Text>
            {!isOnline && (
              <Text style={styles.errorSubText}>
                Anda sedang dalam mode offline. Buka tab "Koleksi Offline" untuk memutar lagu yang sudah diunduh.
              </Text>
            )}
          </View>
        )}

        {/* 5. Daftar Hasil Lagu */}
        {!isSearching && (
          <FlatList
            data={searchResults}
            keyExtractor={(item: Track) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }: { item: Track }) => {
              const isCurrent = currentTrack?.id === item.id;
              const downloadProgress = activeDownloads[item.id];

              return (
                <TrackItem
                  track={item}
                  isCurrent={isCurrent}
                  isPlaying={isCurrent && isPlaying}
                  downloadProgress={downloadProgress}
                  onPlay={() => playTrack(item, searchResults)}
                  onDownload={() => downloadTrack(item)}
                />
              );
            }}
            ListEmptyComponent={
              !isSearching && !searchError && inputText.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="musical-notes-outline" size={48} color={COLORS.textMuted} />
                  </View>
                  <Text style={styles.emptyTitle}>Eksplorasi Lagu Tanpa Batas</Text>
                  <Text style={styles.emptySubtitle}>
                    Ketik judul lagu favorit Anda untuk streaming atau unduh langsung ke memori internal HP.
                  </Text>
                </View>
              ) : null
            }
          />
        )}
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
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#27272A'
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    height: '100%'
  },
  clearBtn: {
    padding: 4
  },
  suggestionsRow: {
    marginTop: 10,
    marginBottom: 12
  },
  suggestionsContainer: {
    gap: 8
  },
  suggestionChip: {
    backgroundColor: '#1E1E24',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272A'
  },
  suggestionText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 13
  },
  errorBox: {
    backgroundColor: '#2A1215',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#7F1D1D'
  },
  errorText: {
    color: '#F87171',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6
  },
  errorSubText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4
  },
  listContent: {
    paddingBottom: 130 // Space untuk Floating PlayerBar dan BottomBar
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 30
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#18181B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center'
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18
  }
});

