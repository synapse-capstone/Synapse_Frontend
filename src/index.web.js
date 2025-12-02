import { AppRegistry } from 'react-native';
import App from '../App';

AppRegistry.registerComponent('kiosk-learning-app', () => App);
AppRegistry.runApplication('kiosk-learning-app', {
  rootTag: document.getElementById('root').querySelector('.mobile-container')
});



