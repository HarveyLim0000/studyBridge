import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import LoadingScreen from './LoadingScreen';

const STATUS_BAR_HEIGHT = Constants.statusBarHeight ?? 44;
const HOME_HEADER_TOP = STATUS_BAR_HEIGHT + 12;
const HISTORY_KEY = '@studybridge_search_history';
const MAX_HISTORY = 20;
const INITIAL_LOADING_MS = 3000;

// 휴대폰(Expo Go)에서 접속 시: localhost는 폰 자신을 가리키므로 Mac IP 사용
// Expo 터미널에 나오는 주소(예: exp://192.168.35.90:8081)의 IP와 동일하게 맞추기
const API_BASE_URL = 'http://192.168.35.90:8000';

export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [showHome, setShowHome] = useState(true);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const drawerAnim = useRef(new Animated.Value(0)).current; // 0=닫힘, 1=열림

  const [history, setHistory] = useState([]);
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null); // { extracted_concept, papers } 또는 null

  const cameraRef = useRef(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const DRAWER_WIDTH = Math.min(320, screenWidth * 0.85);

  useEffect(() => {
    const t = setTimeout(() => setIsAppReady(true), INITIAL_LOADING_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isAppReady) return;
    AsyncStorage.getItem(HISTORY_KEY)
      .then((raw) => {
        try {
          const list = raw ? JSON.parse(raw) : [];
          setHistory(Array.isArray(list) ? list : []);
        } catch {
          setHistory([]);
        }
      })
      .catch(() => setHistory([]));
  }, [isAppReady]);

  const addToHistory = (concept) => {
    if (!concept || typeof concept !== 'string') return;
    const trimmed = concept.trim();
    if (!trimmed) return;
    setHistory((prev) => {
      const next = [trimmed, ...prev.filter((v) => v !== trimmed)].slice(0, MAX_HISTORY);
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const openDrawer = () => {
    setShowMenu(true);
    setDrawerVisible(true);
    drawerAnim.setValue(0);
    Animated.spring(drawerAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closeDrawer = () => {
    setShowMenu(false);
    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => finished && setDrawerVisible(false));
  };

  const resetToHome = () => {
    setResult(null);
    setShowHome(true);
  };

  const analyzeImageWithUri = async (uri) => {
    const formData = new FormData();
    formData.append('file', {
      uri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    });

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/analyze-image`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 200) {
        const papers = data?.data?.papers ?? [];
        const concept = data?.data?.extracted_concept ?? '';
        if (papers.length > 0) {
          setResult({ extracted_concept: concept, papers });
          addToHistory(concept);
        } else {
          if (concept) addToHistory(concept);
          Alert.alert(
            '검색 결과',
            `'${concept || '추출된 개념'}'과 정확히 일치하는 학술 자료를 찾고 있습니다. 추후 업데이트될 예정입니다.`
          );
          setShowHome(true);
        }
        return;
      }

      if (res.status === 400) {
        Alert.alert(
          '촬영 오류',
          '사진의 글자를 인식할 수 없습니다. 밝은 곳에서 초점을 맞춰 다시 촬영해주세요.'
        );
        return;
      }

      if (res.status === 422) {
        Alert.alert(
          '개념 추출 실패',
          '학술적인 핵심 개념을 찾지 못했습니다. 전공 서적이나 논문의 텍스트가 잘 보이도록 찍어주세요.'
        );
        return;
      }

      Alert.alert('오류', '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } catch {
      Alert.alert(
        '연결 오류',
        '서버에 연결할 수 없습니다. 백엔드가 실행 중인지, 주소가 맞는지 확인해주세요.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || !permission?.granted) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      if (photo?.uri) {
        setIsLoading(true);
        setResult(null);
        analyzeImageWithUri(photo.uri);
      }
    } catch {
      Alert.alert('오류', '사진 촬영에 실패했습니다.');
    }
  };

  const toggleFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  if (!isAppReady) {
    return <LoadingScreen variant="splash" />;
  }

  // Liquid glass 배경: 원+타원 혼합, 크기·투명도·위치 다양하게 (반복 느낌 줄임)
  const glassOrbs = [
    { w: screenWidth * 0.92, h: screenHeight * 0.35, left: -screenWidth * 0.35, top: -screenHeight * 0.08, color: 'rgba(255,255,255,0.04)' },
    { w: screenWidth * 0.6, h: screenWidth * 0.6, left: screenWidth * 0.42, top: screenHeight * 0.08, color: 'rgba(255,255,255,0.028)' },
    { w: screenWidth * 0.5, h: screenHeight * 0.22, left: -screenWidth * 0.12, top: screenHeight * 0.38, color: 'rgba(255,255,255,0.022)' },
    { w: screenWidth * 0.7, h: screenWidth * 0.45, left: screenWidth * 0.28, top: screenHeight * 0.5, color: 'rgba(60,60,62,0.35)' },
    { w: screenWidth * 0.38, h: screenWidth * 0.38, left: screenWidth * 0.02, top: screenHeight * 0.72, color: 'rgba(255,255,255,0.032)' },
    { w: screenWidth * 0.45, h: screenHeight * 0.18, left: screenWidth * 0.5, top: screenHeight * 0.78, color: 'rgba(38,38,40,0.4)' },
    { w: screenWidth * 0.28, h: screenWidth * 0.28, left: screenWidth * 0.68, top: screenHeight * 0.22, color: 'rgba(255,255,255,0.018)' },
    { w: screenWidth * 0.32, h: screenWidth * 0.2, left: screenWidth * 0.08, top: screenHeight * 0.18, color: 'rgba(255,255,255,0.025)' },
    { w: screenWidth * 0.55, h: screenHeight * 0.2, left: screenWidth * 0.15, top: screenHeight * 0.55, color: 'rgba(255,255,255,0.015)' },
    { w: screenWidth * 0.22, h: screenWidth * 0.3, left: screenWidth * 0.72, top: screenHeight * 0.62, color: 'rgba(255,255,255,0.02)' },
  ];

  // 검색 중 로딩 화면 (기존 디자인 유지)
  if (isLoading) {
    return (
      <View style={styles.loadingOverlayRoot}>
        <StatusBar style="light" />
        <LoadingScreen variant="progress" />
        <View style={styles.loadingSearchTextWrap}>
          <Text style={styles.loadingSearchText}>찾고있습니다.. 조금만 기다려주세요 ㅎㅎ</Text>
        </View>
      </View>
    );
  }

  // 결과 화면
  if (result) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.resultContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.conceptTitle}>추출된 개념</Text>
          <Text style={styles.conceptName}>{result.extracted_concept}</Text>
          <Text style={styles.papersSectionTitle}>연결된 학술 자료</Text>
          {result.papers.map((paper, index) => (
            <View key={index} style={styles.paperCard}>
              <Text style={styles.paperTitle} numberOfLines={2}>
                {paper.title}
              </Text>
              {paper.summary ? (
                <Text style={styles.paperSummary} numberOfLines={3}>
                  {paper.summary}
                </Text>
              ) : null}
              {paper.connection_text ? (
                <Text style={styles.paperConnection} numberOfLines={2}>
                  {paper.connection_text}
                </Text>
              ) : null}
            </View>
          ))}
          <TouchableOpacity style={styles.backButton} onPress={resetToHome}>
            <Text style={styles.backButtonText}>다시 촬영하기</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // 홈 화면
  if (showHome) {
    return (
      <View style={styles.containerHome}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {glassOrbs.map((orb, i) => (
            <View
              key={i}
              style={[
                styles.glassOrb,
                {
                  width: orb.w,
                  height: orb.h,
                  borderRadius: Math.max(orb.w, orb.h) / 2,
                  left: orb.left,
                  top: orb.top,
                  backgroundColor: orb.color,
                },
              ]}
            />
          ))}
        </View>

        <StatusBar style="light" />

        <View style={[styles.homeHeader, { paddingTop: HOME_HEADER_TOP }]}>
          <TouchableOpacity style={styles.hamburgerButton} onPress={openDrawer} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="menu" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={styles.homeHeaderPlaceholder} />
          <Text style={styles.homeLogo}>StudyBridge</Text>
        </View>

        <ScrollView style={styles.homeScroll} contentContainerStyle={styles.homeContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.greeting}>안녕하세요</Text>
          <Text style={styles.mainPrompt}>무엇을 도와드릴까요?</Text>
          {history.length > 0 ? (
            <View style={styles.historyBlock}>
              {history.map((item, index) => (
                <TouchableOpacity key={`${item}-${index}`} style={styles.historyPill} activeOpacity={0.7}>
                  <Text style={styles.historyPillText} numberOfLines={1}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.bottomBar}>
          <Text style={styles.bottomBarHint}>사진을 찍어 검색하세요</Text>
          <TouchableOpacity style={styles.cameraBarButton} onPress={() => setShowHome(false)} activeOpacity={0.8}>
            <Ionicons name="camera" size={28} color="#1C1C1E" />
          </TouchableOpacity>
        </View>

        {drawerVisible ? (
          <>
            <Pressable style={styles.drawerBackdrop} onPress={closeDrawer} pointerEvents={showMenu ? 'auto' : 'none'} />
            <Animated.View
              style={[
                styles.drawerPanel,
                { width: DRAWER_WIDTH, paddingTop: HOME_HEADER_TOP + 8 },
                {
                  transform: [
                    {
                      translateX: drawerAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-DRAWER_WIDTH, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.drawerHeader}>
                <Text style={styles.drawerTitle}>대화목록</Text>
                <TouchableOpacity onPress={closeDrawer} style={styles.drawerCloseBtn} hitSlop={12}>
                  <Ionicons name="close" size={26} color="#fff" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.drawerScroll} contentContainerStyle={styles.drawerListContent} showsVerticalScrollIndicator={false}>
                {history.length === 0 ? (
                  <Text style={styles.historyListEmpty}>아직 대화 내역이 없어요.</Text>
                ) : (
                  history.map((item, index) => (
                    <TouchableOpacity key={`${item}-${index}`} style={styles.drawerListItem} activeOpacity={0.7} onPress={closeDrawer}>
                      <Text style={styles.drawerListItemText} numberOfLines={2}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
              <TouchableOpacity style={styles.drawerNewChatBtn} onPress={closeDrawer}>
                <Ionicons name="add-circle-outline" size={22} color="#fff" />
                <Text style={styles.drawerNewChatText}>새 채팅</Text>
              </TouchableOpacity>
            </Animated.View>
          </>
        ) : null}
      </View>
    );
  }

  // 카메라 화면: showHome=false일 때만 권한 체크
  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.messageText}>카메라 권한을 확인하는 중...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.messageText}>사진을 찍기 위해 카메라 권한이 필요합니다.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>권한 허용</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.permissionBackButton} onPress={() => setShowHome(true)}>
          <Text style={styles.permissionBackButtonText}>뒤로가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.cameraScreen}>
      <StatusBar style="light" />

      <View style={styles.cameraPreviewSection}>
        <CameraView ref={cameraRef} style={styles.camera} facing={facing} />
        <View style={styles.cameraTopOverlay} pointerEvents="box-none">
          <View style={styles.cameraTopBar}>
            <TouchableOpacity
              onPress={() => setShowHome(true)}
              style={styles.cameraTopIconButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={() => Alert.alert('준비 중', '플래시는 추후 업데이트될 예정입니다.')}
              style={styles.cameraTopIconButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="flash-off-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.cameraControlsSection}>
        <Text style={styles.cameraHint}>수식이 잘 보이도록 화면 중앙에 맞춰주세요.</Text>
        <View style={styles.cameraControlsRow}>
          <TouchableOpacity
            style={styles.cameraIconButton}
            onPress={() => Alert.alert('준비 중', '갤러리에서 가져오기는 추후 업데이트될 예정입니다.')}
          >
            <Ionicons name="images-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.captureOuter} onPress={takePicture} />
          <TouchableOpacity style={styles.cameraIconButton} onPress={toggleFacing}>
            <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  containerHome: {
    flex: 1,
    backgroundColor: '#2C2C2E', // 스페이스 그레이
  },
  glassOrb: {
    position: 'absolute',
  },

  homeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  homeHeaderPlaceholder: {
    flex: 1,
  },
  hamburgerButton: {
    padding: 8,
  },
  homeLogo: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  homeScroll: {
    flex: 1,
  },
  homeContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  greeting: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 20,
    marginBottom: 10,
    marginTop: 24,
  },
  mainPrompt: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 32,
  },
  historyBlock: {
    gap: 10,
  },
  historyPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
  },
  historyPillText: {
    color: '#fff',
    fontSize: 15,
    maxWidth: 280,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 36,
    backgroundColor: '#1C1C1E', // 딥 스페이스 그레이
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 12,
  },
  bottomBarHint: {
    flex: 1,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
  },
  cameraBarButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#C7C7CC', // 실버
    alignItems: 'center',
    justifyContent: 'center',
  },

  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  drawerPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#1C1C1E',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  drawerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  drawerCloseBtn: {
    padding: 4,
  },
  drawerScroll: {
    flex: 1,
  },
  drawerListContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  drawerListItem: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  drawerListItemText: {
    color: '#fff',
    fontSize: 15,
  },
  historyListEmpty: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    paddingVertical: 20,
  },
  drawerNewChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
  },
  drawerNewChatText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  loadingOverlayRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingSearchTextWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: STATUS_BAR_HEIGHT + 48,
    alignItems: 'center',
  },
  loadingSearchText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
  },

  scroll: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  resultContent: {
    padding: 20,
    paddingBottom: 40,
  },
  conceptTitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 6,
  },
  conceptName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
  },
  papersSectionTitle: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  paperCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  paperTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  paperSummary: {
    color: '#bbb',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  paperConnection: {
    color: '#8ab88a',
    fontSize: 13,
    fontStyle: 'italic',
  },
  backButton: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#1a1a2e',
  },
  messageText: {
    color: '#eee',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  permissionButton: {
    backgroundColor: '#4a7c59',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionBackButton: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  permissionBackButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  cameraScreen: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraPreviewSection: {
    flex: 10,
    overflow: 'hidden',
  },
  cameraTopOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    paddingTop: STATUS_BAR_HEIGHT + 12,
    paddingHorizontal: 16,
  },
  cameraTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cameraTopIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraControlsSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  cameraHint: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  cameraControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cameraIconButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureOuter: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
});
