// Entry Pass — the screen shown at the gate.
// Biometric-gated, then displays a QR that refreshes every 25 seconds
// (token TTL is 60s server-side; refresh well before expiry).

import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useAuth } from '@/context/auth';
import { EntryPass as EntryPassData, getBranches, issueEntryToken } from '@/lib/api';
import { colors } from '@/lib/colors';

const REFRESH_MS = 25_000;

export default function EntryPass() {
  const { member } = useAuth();
  const [unlocked, setUnlocked] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const [pass, setPass] = useState<EntryPassData | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(25);
  const branchIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Biometric gate before anything is shown
  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !enrolled) {
        // No biometrics on device — allow through (device binding still applies)
        setUnlocked(true);
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirm it’s you to show your gym pass',
      });
      if (result.success) setUnlocked(true);
      else setAuthFailed(true);
    })();
  }, []);

  // 2. Token fetch + rotation
  const refresh = useCallback(async () => {
    if (!branchIdRef.current) {
      const branches = await getBranches();
      branchIdRef.current =
        branches.find((b) => b.id === member?.home_branch_id)?.id ?? branches[0]?.id ?? null;
      if (!branchIdRef.current) {
        setPass({ allowed: false, reason: 'no_branch', message: 'No gym branch configured yet.' });
        return;
      }
    }
    const data = await issueEntryToken(branchIdRef.current);
    setPass(data);
    setSecondsLeft(Math.round(REFRESH_MS / 1000));
  }, [member?.home_branch_id]);

  useEffect(() => {
    if (!unlocked) return;
    refresh();
    timerRef.current = setInterval(refresh, REFRESH_MS);
    const tick = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);

    // Pause rotation when app is backgrounded; refresh immediately on return
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearInterval(tick);
      sub.remove();
    };
  }, [unlocked, refresh]);

  if (authFailed) {
    return (
      <View style={styles.container}>
        <Text style={styles.deniedTitle}>Identity not confirmed</Text>
        <Text style={styles.deniedBody}>Face ID / fingerprint is required to show your pass.</Text>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!unlocked || !pass) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!pass.allowed) {
    return (
      <View style={styles.container}>
        <Text style={styles.deniedTitle}>Entry not available</Text>
        <Text style={styles.deniedBody}>{pass.message ?? 'Please see reception.'}</Text>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isExit = pass.purpose === 'exit';

  return (
    <View style={styles.container}>
      <View style={styles.identityRow}>
        {member?.photo_url ? (
          <Image source={{ uri: member.photo_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{member?.full_name?.[0] ?? '?'}</Text>
          </View>
        )}
        <View>
          <Text style={styles.memberName}>{member?.full_name}</Text>
          <Text style={[styles.purpose, { color: isExit ? colors.warning : colors.accent }]}>
            {isExit ? 'Scan to EXIT' : 'Scan to ENTER'}
          </Text>
        </View>
      </View>

      <View style={styles.qrBox}>
        {pass.qr && (
          <QRCode value={pass.qr} size={240} backgroundColor="#FFFFFF" color="#000000" />
        )}
      </View>

      <View style={styles.refreshRow}>
        <View style={styles.refreshBarTrack}>
          <View
            style={[styles.refreshBarFill, { width: `${(secondsLeft / (REFRESH_MS / 1000)) * 100}%` }]}
          />
        </View>
        <Text style={styles.refreshText}>refreshes in {secondsLeft}s</Text>
      </View>

      <Text style={styles.hint}>
        {Platform.OS === 'ios'
          ? 'Hold your phone to the scanner at the gate.'
          : 'Hold your phone to the scanner at the gate.'}
      </Text>

      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <Text style={styles.closeText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 24,
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarFallback: {
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: colors.accent, fontSize: 24, fontWeight: '800' },
  memberName: { color: colors.text, fontSize: 18, fontWeight: '700' },
  purpose: { fontSize: 14, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  qrBox: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 24 },
  refreshRow: { width: 280, gap: 6, alignItems: 'center' },
  refreshBarTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  refreshBarFill: { height: 4, borderRadius: 2, backgroundColor: colors.accent },
  refreshText: { color: colors.textDim, fontSize: 12 },
  hint: { color: colors.textDim, textAlign: 'center' },
  deniedTitle: { color: colors.danger, fontSize: 22, fontWeight: '800' },
  deniedBody: { color: colors.text, textAlign: 'center', fontSize: 16 },
  closeButton: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  closeText: { color: colors.text, fontWeight: '600' },
});
