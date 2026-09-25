import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/context/session';
import { colors } from '@/theme';

export default function LoginScreen() {
  const { signIn } = useSession();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!identifier.trim() || !password) { setError('Vui lòng nhập tài khoản và mật khẩu.'); return; }
    setSubmitting(true); setError('');
    try { await signIn(identifier, password); router.replace('/(driver)/trips'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể đăng nhập.'); }
    finally { setSubmitting(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <View style={styles.mark}><Text style={styles.horse}>♞</Text></View>
        <Text style={styles.title}>CBRT Driver</Text>
        <Text style={styles.subtitle}>Ứng dụng điều hành chuyến dành cho tài xế</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Tài khoản hoặc email</Text>
          <TextInput style={styles.input} value={identifier} onChangeText={setIdentifier} autoCapitalize="none" autoCorrect={false} placeholder="Nhập tài khoản" />
          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Nhập mật khẩu" onSubmitEditing={submit} />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Pressable style={[styles.button, submitting && styles.disabled]} onPress={submit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Đăng nhập</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, container: { flex: 1, justifyContent: 'center', padding: 24 },
  mark: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  horse: { color: '#fff', fontSize: 34 }, title: { marginTop: 18, textAlign: 'center', color: colors.navy, fontSize: 30, fontWeight: '800' },
  subtitle: { marginTop: 8, marginBottom: 28, textAlign: 'center', color: colors.muted, fontSize: 15 },
  card: { backgroundColor: colors.surface, padding: 20, borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  label: { color: colors.text, fontWeight: '700', marginBottom: 8, marginTop: 8 },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: '#FAFBFC', borderRadius: 12, paddingHorizontal: 14, height: 50, fontSize: 16, color: colors.text },
  error: { color: colors.danger, marginTop: 12 }, button: { height: 52, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' }, disabled: { opacity: 0.6 },
});
