import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '@/context/auth';
import { Subscription, getCurrentSubscription } from '@/lib/api';
import { colors } from '@/lib/colors';

export default function Account() {
  const { member, signOut } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useFocusEffect(
    useCallback(() => {
      getCurrentSubscription().then(setSubscription);
    }, []),
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Member</Text>
        <Text style={styles.name}>{member?.full_name}</Text>
        {member?.status === 'blocked' && (
          <Text style={{ color: colors.danger }}>Account blocked — contact reception.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Subscription</Text>
        {subscription ? (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Plan</Text>
              <Text style={styles.value}>{subscription.plans?.name ?? '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Status</Text>
              <Text
                style={[
                  styles.value,
                  { color: subscription.status === 'frozen' ? colors.warning : colors.success },
                ]}>
                {subscription.status}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Valid until</Text>
              <Text style={styles.value}>{subscription.ends_on}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Freeze days used</Text>
              <Text style={styles.value}>
                {subscription.freeze_days_used} / {subscription.plans?.freeze_days_allowed ?? 0}
              </Text>
            </View>
            <Text style={styles.note}>
              Renewals, freezes and payments are handled at reception for now.
            </Text>
          </>
        ) : (
          <Text style={styles.note}>
            No active subscription. Visit reception to choose a plan and activate your access.
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Registered device</Text>
        <Text style={styles.note}>
          This phone is your gym key. To switch to a new phone, reception must approve the
          transfer — your old device is deactivated automatically.
        </Text>
      </View>

      <TouchableOpacity style={styles.signOut} onPress={signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 16 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  cardTitle: { color: colors.textDim, fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  name: { color: colors.text, fontSize: 22, fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: colors.textDim },
  value: { color: colors.text, fontWeight: '600' },
  note: { color: colors.textDim, fontSize: 13, lineHeight: 18 },
  signOut: {
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  signOutText: { color: colors.danger, fontWeight: '700' },
});
