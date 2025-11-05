import React, { useEffect, useState } from 'react';
import { StyleSheet, View, I18nManager, Platform, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import BottomTabNavigator from './src/navigation/BottomTabNavigator';
import DatabaseService from './src/services/database';
import NotificationService from './src/services/notifications';
import { ThemeProvider, usePaperTheme } from './src/theme';
import SettingsModal from './src/components/SettingsModal';

// فعال کردن RTL برای زبان فارسی
if (!I18nManager.isRTL && Platform.OS !== 'web') {
  I18nManager.forceRTL(true);
}

function AppInner() {
  const [isReady, setIsReady] = useState(false);
  const paperTheme = usePaperTheme();

  useEffect(() => {
    async function initialize() {
      try {
        // راهاندازی دیتابیس
        await DatabaseService.init();
        
        // راهاندازی نوتیفیکیشن
        await NotificationService.init();
        
        setIsReady(true);
      } catch (error) {
        console.error('Initialization error:', error);
        setIsReady(true); // حتی با خطا ادامه بده
      }
    }

    initialize();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <Text>در حال بارگذاری...</Text>
      </View>
    );
  }

  return (
    <PaperProvider theme={paperTheme}>
      <NavigationContainer>
        <BottomTabNavigator />
      </NavigationContainer>
      <SettingsModal />
    </PaperProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
