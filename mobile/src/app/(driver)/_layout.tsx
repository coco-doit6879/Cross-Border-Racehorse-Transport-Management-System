import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useSession } from '@/context/session';
import { OfflineSync } from '@/components/OfflineSync';
import { NotificationBell } from '@/components/NotificationBell';

export default function DriverLayout() {
  const { user, loading } = useSession();
  if (loading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
  if (!user) return <Redirect href="/login" />;
  return <View style={{ flex: 1 }}><NotificationBell /><OfflineSync /><Stack screenOptions={{ headerShown: false }} /></View>;
}
