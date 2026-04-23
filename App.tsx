import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { ARCamera } from './src/components/ARCamera';

export default function App() {
  return (
    <View style={styles.container}>
      <ARCamera />
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
