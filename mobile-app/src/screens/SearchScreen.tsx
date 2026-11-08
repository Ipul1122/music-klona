import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Linking,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMusicStore } from '../store/useMusicStore';
import { COLORS } from '../constants/theme';
import { TrackItem } from '../components/TrackItem';
import { Track } from '../types';
import { storageService } from '../services/storageService';

export const SearchScreen: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
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

  // Load recent searches saat awal buka & deteksi Desktop PWA install
  useEffect(() => {
    storageService.getRecentSearches().then(setRecentSearches);

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const isApp =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone;
      setIsStandalone(!!isApp);

      const handlePrompt = (e: any) => {
        e.preventDefault();
        setInstallPrompt(e);
      };
      window.addEventListener('beforeinstallprompt', handlePrompt);
      return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
    }
  }, []);

  const handleInstallDesktop = async () => {
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsStandalone(true);
          setInstallPrompt(null);
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    } else {
      Alert.alert(
        'Cara Pasang Musik Klona ke Desktop',
        '1. Buka situs ini di Chrome atau Microsoft Edge di PC/Laptop.\n2. Klik ikon "Install" (ikon komputer/layar panah ke bawah) di sebelah kanan address bar browser Anda.\n3. Atau klik Menu Titik Tiga (⋮) > pilih "Install Musik Klona".\n\nAplikasi akan terpasang di Desktop & Start Menu layaknya aplikasi native!',
        [{ text: 'Mengerti' }]
      );
    }
  };

  const saveAndSearch = async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length >= 2) {
      const updated = await storageService.saveRecentSearch(trimmed);
      setRecentSearches(updated);
    }
    searchTracks(query);
  };

  // Debounce 500ms sesuai DESIGN.md
  const handleTextChange = (text: string) => {
    setInputText(text);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      saveAndSearch(text);
    }, 500);
  };

  const handleClear = () => {
    setInputText('');
    searchTracks('');
  };

  const handleSuggestionPress = (tag: string) => {
    setInputText(tag);
    saveAndSearch(tag);
  };

  const handleClearRecent = async () => {
    await storageService.clearRecentSearches();
    setRecentSearches([]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Banner Tombol Download APK & Desktop Mode */}
        {Platform.OS === 'web' && (
          <View style={styles.appBanner}>
            <View style={styles.appBannerLeft}>
              <Ionicons
                name={isStandalone ? 'checkmark-circle' : 'desktop-outline'}
                size={22}
                color={COLORS.accentPrimary}
              />
              <View style={styles.appBannerTextCol}>
                <Text style={styles.appBannerTitle}>
                  {isStandalone ? 'Musik Klona Desktop Aktif' : 'Musik Klona Versi Komputer'}
                </Text>
                <Text style={styles.appBannerSub}>
                  {isStandalone
                    ? 'Aplikasi berjalan dalam mode desktop standalone'
                    : 'Pasang di Windows / Mac tanpa browser'}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              {!isStandalone && (
                <TouchableOpacity
                  style={styles.appBannerBtn}
                  onPress={handleInstallDesktop}
                  activeOpacity={0.8}
                >
                  <Ionicons name="download-outline" size={15} color={COLORS.backgroundPrimary} style={{ marginRight: 4 }} />
                  <Text style={styles.appBannerBtnText}>Pasang Desktop</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.appBannerBtn, { backgroundColor: '#27272A' }]}
                onPress={() => Linking.openURL('https://github.com/Ipul1122/music-klona/actions')}
                activeOpacity={0.8}
              >
                <Ionicons name="phone-portrait-outline" size={13} color={COLORS.textPrimary} style={{ marginRight: 4 }} />
                <Text style={[styles.appBannerBtnText, { color: COLORS.textPrimary, fontSize: 11 }]}>APK HP</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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

        {/* 2. Chips Riwayat Pencarian Terkini (Recent Searches) */}
        {recentSearches.length > 0 && (
          <View style={styles.suggestionsRow}>
            <View style={styles.recentHeaderRow}>
              <View style={styles.recentLabelRow}>
                <Ionicons name="time-outline" size={13} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
                <Text style={styles.recentLabelText}>Pencarian Terbaru</Text>
              </View>
              <TouchableOpacity onPress={handleClearRecent} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.clearRecentText}>Hapus</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={recentSearches}
              keyExtractor={(item, index) => `${item}-${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionChip}
                  onPress={() => handleSuggestionPress(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="search-outline" size={12} color={COLORS.accentPrimary} style={{ marginRight: 6 }} />
                  <Text style={styles.suggestionText}>{item}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.suggestionsContainer}
            />
          </View>
        )}

        {/* 3. Indikator Loading */}
        {isSearching && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.accentPrimary} />
            <Text style={styles.loadingText}>Mencari Musik</Text>
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
              ) : undefined
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
  appBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181B',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272A'
  },
  appBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1
  },
  appBannerTextCol: {
    flex: 1
  },
  appBannerTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700'
  },
  appBannerSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 1
  },
  appBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentPrimary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: 8
  },
  appBannerBtnText: {
    color: COLORS.backgroundPrimary,
    fontSize: 12,
    fontWeight: '700'
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
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2
  },
  recentLabelRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  recentLabelText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  clearRecentText: {
    color: COLORS.textMuted,
    fontSize: 11
  },
  suggestionsContainer: {
    gap: 8
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
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

