import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet } from 'react-native';
import { RESOURCES, DEFAULT_LOCALE } from '@hapcargo/shared';
import { createApiClient } from '@hapcargo/api-client';
import i18next from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import * as SecureStore from 'expo-secure-store';

i18next.use(initReactI18next).init({
  resources: RESOURCES as unknown as Record<string, Record<string, Record<string, string>>>,
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  interpolation: { escapeValue: false },
});

const API_URL = 'http://localhost:4000'; // override via EXPO_PUBLIC_API_URL at build time

export const apiClient = createApiClient({
  baseUrl: `${API_URL}/api/v1`,
  maxRetries: 1,
});

// Secure token storage foundation (auth is a later task).
async function persistSession() {
  try {
    await SecureStore.setItemAsync('hapcargo.session', 'inactive');
  } catch {
    // SecureStore unavailable in some dev environments; ignore.
  }
}

export default function App() {
  const { t } = useTranslation();
  void persistSession();

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.title}>{t('common.appName')}</Text>
          <Text style={styles.subtitle}>Driver App</Text>
          <Text style={styles.body}>
            Driver workflows (trips, POD, GPS) are implemented in a later task.
          </Text>
          <StatusBar style="auto" />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#555', marginBottom: 12 },
  body: { fontSize: 14, color: '#777', textAlign: 'center' },
});
