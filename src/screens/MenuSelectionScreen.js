import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const MenuSelectionScreen = ({ navigation }) => {
  const [selectedMenus, setSelectedMenus] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);

  const menus = [
    {
      id: 1,
      name: '아이스아메리카노',
      price: 5000,
      image: '☕',
      category: '음료',
      description: '깔끔하고 시원한 아이스 아메리카노',
    },
    {
      id: 2,
      name: '카페라떼',
      price: 6000,
      image: '🥛',
      category: '음료',
      description: '부드러운 우유와 에스프레소의 조화',
    },
    {
      id: 3,
      name: '치즈케이크',
      price: 8000,
      image: '🍰',
      category: '디저트',
      description: '진한 치즈 맛의 부드러운 케이크',
    },
    {
      id: 4,
      name: '샌드위치',
      price: 7000,
      image: '🥪',
      category: '음식',
      description: '신선한 재료로 만든 든든한 샌드위치',
    },
    {
      id: 5,
      name: '아이스크림',
      price: 4000,
      image: '🍦',
      category: '디저트',
      description: '달콤하고 시원한 아이스크림',
    },
    {
      id: 6,
      name: '에스프레소',
      price: 4000,
      image: '☕',
      category: '음료',
      description: '진한 커피의 맛을 느껴보세요',
    },
  ];

  const handleMenuSelect = (menu) => {
    if (selectedMenus.find(item => item.id === menu.id)) {
      // 이미 선택된 메뉴라면 제거
      const updatedMenus = selectedMenus.filter(item => item.id !== menu.id);
      setSelectedMenus(updatedMenus);
      setCartTotal(updatedMenus.reduce((sum, item) => sum + item.price, 0));
    } else {
      // 새로운 메뉴 선택
      const updatedMenus = [...selectedMenus, menu];
      setSelectedMenus(updatedMenus);
      setCartTotal(updatedMenus.reduce((sum, item) => sum + item.price, 0));
    }
  };

  const isMenuSelected = (menuId) => {
    return selectedMenus.find(item => item.id === menuId);
  };

  const handleProceedToPayment = () => {
    if (selectedMenus.length > 0) {
      navigation.navigate('Payment', {
        selectedMenus,
        total: cartTotal,
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>메뉴 선택</Text>
        <Text style={styles.subtitle}>원하는 메뉴를 선택해주세요</Text>
      </View>

      <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.menuGrid}>
          {menus.map((menu) => (
            <TouchableOpacity
              key={menu.id}
              style={[
                styles.menuCard,
                isMenuSelected(menu.id) && styles.selectedMenuCard
              ]}
              onPress={() => handleMenuSelect(menu)}
              activeOpacity={0.7}
            >
              <View style={styles.menuImageContainer}>
                <Text style={styles.menuImage}>{menu.image}</Text>
              </View>
              
              <View style={styles.menuInfo}>
                <Text style={styles.menuName}>{menu.name}</Text>
                <Text style={styles.menuCategory}>{menu.category}</Text>
                <Text style={styles.menuDescription} numberOfLines={2}>
                  {menu.description}
                </Text>
                <Text style={styles.menuPrice}>{menu.price.toLocaleString()}원</Text>
              </View>
              
              {isMenuSelected(menu.id) && (
                <View style={styles.selectedIndicator}>
                  <Text style={styles.selectedIcon}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomSection}>
        <View style={styles.cartSummary}>
          <Text style={styles.cartTitle}>선택된 메뉴</Text>
          <Text style={styles.cartCount}>{selectedMenus.length}개</Text>
          <Text style={styles.cartTotal}>총 {cartTotal.toLocaleString()}원</Text>
        </View>
        
        <TouchableOpacity
          style={[
            styles.proceedButton,
            selectedMenus.length === 0 && styles.disabledButton
          ]}
          onPress={handleProceedToPayment}
          disabled={selectedMenus.length === 0}
        >
          <Text style={styles.proceedButtonText}>
            {selectedMenus.length === 0 ? '메뉴를 선택해주세요' : '결제하기'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
    position: 'relative',
  },
  selectedMenuCard: {
    borderWidth: 2,
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8E9',
  },
  menuImageContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  menuImage: {
    fontSize: 40,
  },
  menuInfo: {
    alignItems: 'center',
  },
  menuName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 5,
  },
  menuCategory: {
    fontSize: 12,
    color: '#666666',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 8,
  },
  menuDescription: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 16,
  },
  menuPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  cartSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 15,
  },
  cartTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  cartCount: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  cartTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  proceedButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 18,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default MenuSelectionScreen;

