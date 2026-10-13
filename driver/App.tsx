import React from 'react';
import DriverNavigator from './src/navigation/DriverNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <DriverNavigator />
    </SafeAreaProvider>
  );
}

export default App;
