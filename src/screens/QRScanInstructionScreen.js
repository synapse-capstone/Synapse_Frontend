import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';

const normalizeRecognizedItem = (item, index) => {
  if (!item) {
    return null;
  }
  if (typeof item === 'string') {
    const trimmed = item.trim();
    if (!trimmed) return null;
    return {
      id: `recognized-${index}`,
      name: trimmed,
    };
  }
  if (typeof item === 'object') {
    return {
      id: item.id ?? `recognized-${index}`,
      name: item.name ?? item.label ?? `메뉴 ${index + 1}`,
      price: item.price,
      confidence: item.confidence,
    };
  }
  return null;
};

const parseRecognizedItems = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map(normalizeRecognizedItem).filter(Boolean);
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeRecognizedItem).filter(Boolean);
      }
    } catch (error) {
      // ignore JSON parse errors
    }
    return raw
      .split(',')
      .map((name, idx) => normalizeRecognizedItem(name, idx))
      .filter(Boolean);
  }
  return [];
};

const QRScanInstructionScreen = ({ route }) => {
  const localParams = useLocalSearchParams();
  const mergedParams = useMemo(() => ({ ...(route?.params ?? {}), ...localParams }), [route?.params, localParams]);
  const initialRaw = mergedParams.recognizedItems ?? mergedParams.recognized ?? mergedParams.results;
  const router = useRouter();

  const { width, height } = useWindowDimensions();

  const layout = useMemo(() => {
    const baseWidth = Math.min(width, 960);
    const scale = baseWidth / 800;

    return {
      horizontalPadding: Math.max(24, 40 * scale),
      verticalPadding: Math.max(28, 44 * scale),
      headingSize: Math.max(32, 54 * scale),
      scanSize: Math.min(width * 0.72, height * 0.48),
      cardRadius: Math.max(24, 32 * scale),
      frameBorder: Math.max(4, 6 * scale),
      cornerLength: Math.max(32, 48 * scale),
      cornerThickness: Math.max(4, 6 * scale),
      resultGap: Math.max(16, 22 * scale),
      resultPadding: Math.max(16, 20 * scale),
      resultFontSize: Math.max(18, 22 * scale),
      resultSubFontSize: Math.max(14, 16 * scale),
      buttonHeight: Math.max(56, 66 * scale),
      buttonFontSize: Math.max(18, 22 * scale),
    };
  }, [width, height]);

  const parsedInitialItems = useMemo(() => parseRecognizedItems(initialRaw), [initialRaw]);
  const [recognizedItems, setRecognizedItems] = useState(parsedInitialItems);
  const autoNavigateTimer = useRef(null);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    setRecognizedItems((prev) => {
      const prevSignature = JSON.stringify(prev);
      const nextSignature = JSON.stringify(parsedInitialItems);
      if (prevSignature === nextSignature) {
        return prev;
      }
      return parsedInitialItems;
    });
  }, [parsedInitialItems]);

  const hasResults = recognizedItems.length > 0;

  const navigateToMenuList = useCallback(() => {
    if (!hasResults || hasNavigatedRef.current) {
      return;
    }
    hasNavigatedRef.current = true;
    router.push({
      pathname: '/MenuListScreen',
      params: {
        recognizedFromQr: JSON.stringify(recognizedItems),
      },
    });
  }, [hasResults, recognizedItems, router]);

  useEffect(() => {
    if (hasResults) {
      if (autoNavigateTimer.current) {
        clearTimeout(autoNavigateTimer.current);
      }
      autoNavigateTimer.current = setTimeout(() => {
        navigateToMenuList();
      }, 3000);
    }
    return () => {
      if (autoNavigateTimer.current) {
        clearTimeout(autoNavigateTimer.current);
        autoNavigateTimer.current = null;
      }
    };
  }, [hasResults, navigateToMenuList]);

  const handleOrder = () => {
    navigateToMenuList();
  };

  const handleCancel = () => {
    if (autoNavigateTimer.current) {
      clearTimeout(autoNavigateTimer.current);
      autoNavigateTimer.current = null;
    }
    hasNavigatedRef.current = false;
    setRecognizedItems([]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        style={[
          styles.container,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingVertical: layout.verticalPadding,
          },
        ]}
      >
        <View style={styles.headingWrap}>
          <Text
            accessibilityRole="header"
            style={[
              styles.heading,
              {
                fontSize: layout.headingSize,
                lineHeight: layout.headingSize * 1.05,
              },
            ]}
          >
            QR 코드를 인식시켜주세요.
          </Text>
        </View>

        <View style={styles.scanWrapper}>
          <View
            style={[
              styles.scanFrame,
              {
                width: layout.scanSize,
                height: layout.scanSize,
                borderRadius: layout.cardRadius,
                borderWidth: layout.frameBorder,
              },
            ]}
          >
            <View
              style={[
                styles.scanCorner,
                styles.cornerTopLeft,
                {
                  width: layout.cornerLength,
                  height: layout.cornerLength,
                  borderTopWidth: layout.cornerThickness,
                  borderLeftWidth: layout.cornerThickness,
                },
              ]}
            />
            <View
              style={[
                styles.scanCorner,
                styles.cornerTopRight,
                {
                  width: layout.cornerLength,
                  height: layout.cornerLength,
                  borderTopWidth: layout.cornerThickness,
                  borderRightWidth: layout.cornerThickness,
                },
              ]}
            />
            <View
              style={[
                styles.scanCorner,
                styles.cornerBottomLeft,
                {
                  width: layout.cornerLength,
                  height: layout.cornerLength,
                  borderBottomWidth: layout.cornerThickness,
                  borderLeftWidth: layout.cornerThickness,
                },
              ]}
            />
            <View
              style={[
                styles.scanCorner,
                styles.cornerBottomRight,
                {
                  width: layout.cornerLength,
                  height: layout.cornerLength,
                  borderBottomWidth: layout.cornerThickness,
                  borderRightWidth: layout.cornerThickness,
                },
              ]}
            />
          </View>
        </View>

        {!hasResults && (
          <View style={styles.resultPlaceholder}>
            <Text style={[styles.placeholderText, { fontSize: layout.resultSubFontSize }]}>
              QR 코드를 중앙 프레임에 맞추면 인식된 메뉴가 자동으로 나타납니다.
            </Text>
          </View>
        )}

        {hasResults && (
          <>
            <View style={[styles.resultsContainer, { gap: layout.resultGap }]}>
              <Text style={[styles.resultHeading, { fontSize: layout.resultFontSize }]}>인식된 메뉴 목록</Text>
              <View
                style={[
                  styles.resultList,
                  {
                    borderRadius: layout.cardRadius,
                    padding: layout.resultPadding,
                    borderWidth: 1,
                  },
                ]}
              >
                {recognizedItems.map((item) => (
                  <View key={item.id} style={[styles.resultRow, { paddingVertical: layout.resultPadding * 0.4 }]}>
                    <View>
                      <Text style={[styles.resultName, { fontSize: layout.resultFontSize }]}>{item.name}</Text>
                      {(item.price || item.confidence) && (
                        <Text style={[styles.resultMeta, { fontSize: layout.resultSubFontSize }]}>
                          {item.price ? `${item.price.toLocaleString()}원` : null}
                          {item.price && item.confidence ? ' · ' : ''}
                          {item.confidence ? `정확도 ${(item.confidence * 100).toFixed(0)}%` : null}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.resultQuantity, { fontSize: layout.resultSubFontSize }]}>1개</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.actionRow, { gap: layout.resultGap }]}>
              <Pressable
                style={[
                  styles.actionButton,
                  styles.cancelButton,
                  {
                    height: layout.buttonHeight,
                    borderRadius: layout.buttonHeight / 2,
                  },
                ]}
                android_ripple={{ color: '#ef444422' }}
                onPress={handleCancel}
              >
                <Text style={[styles.actionLabel, styles.cancelLabel, { fontSize: layout.buttonFontSize }]}>취소하기</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.actionButton,
                  styles.orderButton,
                  {
                    height: layout.buttonHeight,
                    borderRadius: layout.buttonHeight / 2,
                  },
                ]}
                android_ripple={{ color: '#22c55e44' }}
                onPress={handleOrder}
              >
                <Text style={[styles.actionLabel, styles.orderLabel, { fontSize: layout.buttonFontSize }]}>주문하기</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingBottom: 48,
  },
  headingWrap: {
    width: '100%',
    alignItems: 'center',
  },
  heading: {
    color: '#111827',
    fontWeight: '700',
    textAlign: 'center',
  },
  scanWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#2563eb',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  scanCorner: {
    position: 'absolute',
    borderColor: '#22c55e',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
  },
  resultsContainer: {
    width: '100%',
  },
  resultHeading: {
    fontWeight: '700',
    color: '#111827',
  },
  resultList: {
    width: '100%',
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  resultRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  resultName: {
    color: '#111827',
    fontWeight: '600',
  },
  resultMeta: {
    color: '#6b7280',
    marginTop: 4,
  },
  resultQuantity: {
    color: '#4b5563',
    fontWeight: '600',
    alignSelf: 'center',
  },
  resultPlaceholder: {
    width: '100%',
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#6b7280',
    textAlign: 'center',
  },
  actionRow: {
    width: '100%',
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: '#ffffff',
  },
  orderButton: {
    backgroundColor: '#22c55e',
  },
  actionLabel: {
    fontWeight: '700',
  },
  cancelLabel: {
    color: '#ef4444',
  },
  orderLabel: {
    color: '#ffffff',
  },
});

export default QRScanInstructionScreen;





