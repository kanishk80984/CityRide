import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './src/store/store';
import { SocketProvider } from './src/context/SocketContext';

function App(): React.JSX.Element {
  return (
    <Provider store={store}>
      <SocketProvider>
        <SafeAreaProvider>
          <AppNavigator />
        </SafeAreaProvider>
      </SocketProvider>
    </Provider>
  );
}

export default App;
