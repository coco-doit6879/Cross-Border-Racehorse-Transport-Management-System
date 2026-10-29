import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled"><Text style={styles.kicker}>CBRT · DRIVER PORTAL</Text><View style={styles.mark}><Text style={styles.horse}>♞</Text></View>
        <Text style={styles.title}>Sẵn sàng cho hành trình.</Text>
        <Text style={styles.subtitle}>Ứng dụng điều hành chuyến dành cho tài xế</Text>
        <View style={styles.card}><Text style={styles.cardTitle}>Đăng nhập</Text><Text style={styles.cardHint}>Truy cập chuyến được phân công của bạn.</Text>
          <Text style={styles.label}>Tài khoản hoặc email</Text>
          <TextInput style={styles.input} value={identifier} onChangeText={setIdentifier} autoCapitalize="none" autoCorrect={false} accessibilityLabel="Tài khoản hoặc email" placeholderTextColor={colors.muted} placeholder="Nhập tài khoản" />
          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} accessibilityLabel="Mật khẩu" autoCapitalize="none" autoCorrect={false} secureTextEntry placeholderTextColor={colors.muted} placeholder="Nhập mật khẩu" onSubmitEditing={submit} />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Pressable accessibilityRole="button" style={[styles.button, submitting && styles.disabled]} onPress={submit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Đăng nhập</Text>}
          </Pressable>
        </View>
        <Text style={styles.footnote}>Vận chuyển an toàn. Kết nối mọi hành trình.</Text></ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, container: { flex: 1 }, scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingVertical: 40, width: '100%', maxWidth: 480, alignSelf: 'center' }, kicker: { color: colors.primary, fontSize: 10, letterSpacing: 2.5, fontWeight: '700', textAlign: 'center', marginBottom: 32 }, cardTitle: { color: colors.text, fontWeight: '700', fontSize: 23 }, cardHint: { color: colors.muted, lineHeight: 21, fontSize: 13, marginTop: 6, marginBottom: 20 }, footnote: { color: colors.muted, textAlign: 'center', fontSize: 11, lineHeight: 18, marginTop: 28 },
  mark: { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  horse: { color: '#fff', fontSize: 34 }, title: { marginTop: 18, textAlign: 'center', color: colors.navy, fontSize: 31, lineHeight: 39, fontWeight: '700' },
  subtitle: { marginTop: 8, marginBottom: 28, textAlign: 'center', color: colors.muted, fontSize: 15 },
  card: { backgroundColor: colors.surface, padding: 24, borderRadius: 24, borderWidth: 1, borderColor: colors.border },
  label: { color: colors.text, fontWeight: '700', marginBottom: 8, marginTop: 8 },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: '#FAFBFC', borderRadius: 12, paddingHorizontal: 14, height: 56, fontSize: 16, color: colors.text },
  error: { color: colors.danger, marginTop: 12 }, button: { height: 56, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' }, disabled: { opacity: 0.6 },
});
