import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';

import { getDeviceId } from '@/lib/device';
import { colors } from '@/lib/colors';
import { supabase } from '@/lib/supabase';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signUp() {
    if (!fullName.trim() || !email.trim() || password.length < 8) {
      setError('Fill in all fields — password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    setError(null);

    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (err || !data.user) {
      setError(err?.message ?? 'Registration failed.');
      setBusy(false);
      return;
    }

    // Create member profile + bind this device as THE registered phone
    const { data: memberRow, error: memberErr } = await supabase
      .from('members')
      .insert({
        user_id: data.user.id,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        email: email.trim(),
      })
      .select('id')
      .single();

    if (memberErr) {
      setError('Account created but profile setup failed — please contact reception.');
      setBusy(false);
      return;
    }

    const deviceId = await getDeviceId();
    await supabase.from('member_devices').insert({
      member_id: memberRow.id,
      device_id: deviceId,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });

    setBusy(false);
    router.replace('/');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Join the gym</Text>
        <Text style={styles.note}>
          This phone becomes your registered device — it will be your key to the gym.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor={colors.textDim}
          value={fullName}
          onChangeText={setFullName}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone number"
          placeholderTextColor={colors.textDim}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textDim}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 8 characters)"
          placeholderTextColor={colors.textDim}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.button} onPress={signUp} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.buttonText}>Create account</Text>
          )}
        </TouchableOpacity>

        <Link href="/login" style={styles.link}>
          Already a member? <Text style={{ color: colors.accent }}>Log in</Text>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', textAlign: 'center' },
  note: { color: colors.textDim, textAlign: 'center', marginBottom: 16 },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    color: colors.text,
    fontSize: 16,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: colors.onAccent, fontWeight: '700', fontSize: 16 },
  link: { color: colors.textDim, textAlign: 'center', marginTop: 16 },
  error: { color: colors.danger, textAlign: 'center' },
});
