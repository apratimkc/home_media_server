import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DiscoverScreen from './src/screens/DiscoverScreen';
import ShareScreen from './src/screens/ShareScreen';
import DownloadsScreen from './src/screens/DownloadsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { startMdnsDiscovery, stopMdnsDiscovery } from './src/services/mdnsService';

const Tab = createBottomTabNavigator();

function App(): React.JSX.Element {
  useEffect(() => {
    // Start mDNS discovery when app starts
    startMdnsDiscovery();

    return () => {
      // Stop mDNS when app closes
      stopMdnsDiscovery();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: '#6366f1',
            background: '#0f172a',
            card: '#1e293b',
            text: '#f8fafc',
            border: '#334155',
            notification: '#ef4444',
          },
        }}
      >
        <Tab.Navigator
          screenOptions={{
            headerShown: true,
            headerStyle: {
              backgroundColor: '#1e293b',
            },
            headerTintColor: '#f8fafc',
            tabBarStyle: {
              backgroundColor: '#1e293b',
              borderTopColor: '#334155',
            },
            tabBarActiveTintColor: '#6366f1',
            tabBarInactiveTintColor: '#94a3b8',
          }}
        >
          <Tab.Screen
            name="Discover"
            component={DiscoverScreen}
            options={{
              tabBarIcon: ({ color }) => <TabIcon emoji="🔍" color={color} />,
            }}
          />
          <Tab.Screen
            name="Share"
            component={ShareScreen}
            options={{
              tabBarIcon: ({ color }) => <TabIcon emoji="📤" color={color} />,
            }}
          />
          <Tab.Screen
            name="Downloads"
            component={DownloadsScreen}
            options={{
              tabBarIcon: ({ color }) => <TabIcon emoji="📥" color={color} />,
            }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              tabBarIcon: ({ color }) => <TabIcon emoji="⚙️" color={color} />,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// Simple emoji-based tab icon
function TabIcon({ emoji }: { emoji: string; color: string }) {
  return (
    <React.Fragment>
      {/* Using Text would be: <Text style={{ fontSize: 20 }}>{emoji}</Text> */}
      {/* For now, just return null and rely on label */}
    </React.Fragment>
  );
}

export default App;
