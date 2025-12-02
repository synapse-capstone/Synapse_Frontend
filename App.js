import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import WelcomeScreen from './src/screens/WelcomeScreen';
import LevelSelectionScreen from './src/screens/LevelSelectionScreen';
import BeginnerCourseScreen from './src/screens/BeginnerCourseScreen';
import MenuSelectionScreen from './src/screens/MenuSelectionScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import IntermediateCourseScreen from './src/screens/IntermediateCourseScreen';
import AdvancedCourseScreen from './src/screens/AdvancedCourseScreen';

const Stack = createStackNavigator();

const App = () => {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Welcome"
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: '#FFFFFF' }
          }}
        >
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="LevelSelection" component={LevelSelectionScreen} />
          <Stack.Screen name="BeginnerCourse" component={BeginnerCourseScreen} />
          <Stack.Screen name="IntermediateCourse" component={IntermediateCourseScreen} />
          <Stack.Screen name="AdvancedCourse" component={AdvancedCourseScreen} />
          <Stack.Screen name="MenuSelection" component={MenuSelectionScreen} />
          <Stack.Screen name="Payment" component={PaymentScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;
