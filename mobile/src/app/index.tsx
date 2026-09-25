import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useSession } from '@/context/session';
import { colors } from '@/theme';

export default function Index() {
  const { user, loading } = useSession();
  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  return <Redirect href={user ? '/(driver)/trips' : '/login'} />;
}

const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
