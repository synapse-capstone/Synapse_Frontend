import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

const AdvancedCourseScreen = ({ navigation }) => {
  const features = [
    {
      icon: '🎯',
      title: '복합 주문',
      description: '여러 메뉴와 옵션을 조합한 복잡한 주문',
    },
    {
      icon: '🔧',
      title: '문제 해결',
      description: '결제 오류, 메뉴 변경 등 문제 상황 대처',
    },
    {
      icon: '📊',
      title: '고급 기능',
      description: '예약 주문, 배달 주문 등 특수 기능 활용',
    },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F44336', '#D32F2F']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>🎯</Text>
            </View>
          </View>
          
          <Text style={styles.title}>고급 과정</Text>
          <Text style={styles.subtitle}>키오스크의 모든 기능을 마스터하세요</Text>
        </View>
      </LinearGradient>
      
      <View style={styles.bottomSection}>
        <View style={styles.featuresContainer}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>
        
        <View style={styles.timeBox}>
          <Text style={styles.timeIcon}>⏰</Text>
          <Text style={styles.timeTitle}>예상 학습 시간</Text>
          <Text style={styles.timeValue}>15-20분</Text>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.closeButtonText}>닫기</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => navigation.navigate('MenuSelection')}
          >
            <Text style={styles.startButtonText}>시작하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    marginBottom: 30,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 24,
  },
  bottomSection: {
    paddingHorizontal: 30,
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
  },
  featuresContainer: {
    marginBottom: 30,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFEBEE',
    borderRadius: 15,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 15,
    marginTop: 2,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 5,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  timeBox: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    alignItems: 'center',
    marginBottom: 30,
  },
  timeIcon: {
    fontSize: 24,
    marginBottom: 10,
  },
  timeTitle: {
    fontSize: 16,
    color: '#C62828',
    fontWeight: '500',
    marginBottom: 5,
  },
  timeValue: {
    fontSize: 18,
    color: '#C62828',
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  closeButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  closeButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  startButton: {
    flex: 1,
    backgroundColor: '#F44336',
    paddingVertical: 18,
    borderRadius: 25,
    marginLeft: 10,
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
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default AdvancedCourseScreen;



