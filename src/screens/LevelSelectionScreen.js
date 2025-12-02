import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const LevelSelectionScreen = ({ navigation }) => {
  const levels = [
    {
      id: 'beginner',
      title: '초급',
      description: '기본 메뉴 선택 및 결제 방법',
      icon: '🟢',
      iconBg: '#E8F5E8',
      color: '#4CAF50',
      route: 'BeginnerCourse',
    },
    {
      id: 'intermediate',
      title: '중급',
      description: '옵션 선택 및 할인 혜택 활용',
      icon: '⚡',
      iconBg: '#FFF3E0',
      color: '#FF9800',
      route: 'IntermediateCourse',
    },
    {
      id: 'advanced',
      title: '고급',
      description: '복합 주문 및 문제 해결 방법',
      icon: '🎯',
      iconBg: '#FFEBEE',
      color: '#F44336',
      route: 'AdvancedCourse',
    },
  ];

  const handleLevelSelect = (level) => {
    navigation.navigate(level.route);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>학습 레벨 선택</Text>
        <Text style={styles.subtitle}>
          본인의 수준에 맞는 레벨을 선택해주세요
        </Text>
      </View>

      <View style={styles.levelsContainer}>
        {levels.map((level) => (
          <TouchableOpacity
            key={level.id}
            style={styles.levelCard}
            onPress={() => handleLevelSelect(level)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: level.iconBg }]}>
              <Text style={styles.levelIcon}>{level.icon}</Text>
            </View>
            
            <View style={styles.levelInfo}>
              <Text style={[styles.levelTitle, { color: level.color }]}>
                {level.title}
              </Text>
              <Text style={styles.levelDescription}>
                {level.description}
              </Text>
            </View>
            
            <View style={styles.arrowContainer}>
              <Text style={styles.arrow}>›</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => navigation.navigate('BeginnerCourse')}
        >
          <Text style={styles.startButtonText}>학습 시작하기</Text>
        </TouchableOpacity>
        
        <View style={styles.recommendationBox}>
          <Text style={styles.recommendationIcon}>💡</Text>
          <Text style={styles.recommendationText}>
            처음 사용하시는 분은 <Text style={styles.highlightText}>초급</Text>부터 시작하는 것을 추천합니다.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 30,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  levelsContainer: {
    paddingHorizontal: 30,
    flex: 1,
  },
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  levelIcon: {
    fontSize: 30,
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  levelDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  arrowContainer: {
    width: 30,
    alignItems: 'center',
  },
  arrow: {
    fontSize: 24,
    color: '#CCCCCC',
    fontWeight: 'bold',
  },
  bottomSection: {
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  startButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 18,
    borderRadius: 25,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  recommendationBox: {
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#FFE082',
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendationIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  recommendationText: {
    fontSize: 14,
    color: '#5D4037',
    flex: 1,
    lineHeight: 20,
  },
  highlightText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});

export default LevelSelectionScreen;

