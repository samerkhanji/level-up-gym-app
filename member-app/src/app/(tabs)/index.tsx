import { useFocusEffect } from 'expo-router';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/context/auth';
import {
  Branch,
  Occupancy,
  OpenSession,
  Subscription,
  getBranches,
  getCurrentSubscription,
  getOccupancy,
  getOpenSession,
} from '@/lib/api';
import { colors } from '@/lib/colors';

function formatDuration(from: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 60000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h} hr ${mins % 60} min` : `${mins} min`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function Home() {
  const { member } = useAuth();
  const [openSession, setOpenSession] = useState<OpenSession | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [occupancy, setOccupancy] = useState<Occupancy | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [, forceTick] = useState(0);

  const load = useCallback(async () => {
    const [open, sub, branches] = await Promise.all([
      getOpenSession(),
      getCurrentSubscription(),
      getBranches(),
    ]);
    setOpenSession(open);
    setSubscription(sub);
    const b = branches.find((x) => x.id === member?.home_branch_id) ?? branches[0] ?? null;
    setBranch(b);
    if (b) setOccupancy(await getOccupancy(b.id));
  }, [member?.home_branch_id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // live "inside" duration ticker
  useEffect(() => {
    if (!openSession) return;
    const t = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [openSession]);

  const subStatus = !subscription
    ? { label: 'No subscription', color: colors.danger }
    : subscription.status === 'frozen'
      ? { label: 'Frozen', color: colors.warning }
      : new Date(subscription.ends_on) < new Date(Date.now() + 7 * 86400_000)
        ? { label: `Expires ${subscription.ends_on}`, color: colors.warning }
        : { label: 'Active', color: colors.success };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
          tintColor={colors.accent}
        />
      }>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>Hi {member?.full_name?.split(' ')[0] ?? 'there'}</Text>
          {branch && <Text style={styles.branch}>{branch.name}</Text>}
        </View>
        <View style={[styles.chip, { borderColor: subStatus.color }]}>
          <Text style={[styles.chipText, { color: subStatus.color }]}>{subStatus.label}</Text>
        </View>
      </View>

      {openSession ? (
        <TouchableOpacity
          style={[styles.enterCard, styles.insideCard]}
          onPress={() => router.push('/entry-pass')}>
          <View style={styles.insideDot} />
          <Text style={styles.insideTitle}>You are inside the gym</Text>
          <Text style={styles.insideMeta}>
            Entered at {formatTime(openSession.entered_at)} · {formatDuration(openSession.entered_at)}
          </Text>
          <Text style={styles.insideAction}>Tap to check out →</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.enterCard} onPress={() => router.push('/entry-pass')}>
          <Text style={styles.enterText}>Enter Gym</Text>
          <Text style={styles.enterSub}>Show your pass at the gate</Text>
        </TouchableOpacity>
      )}

      {occupancy && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Gym right now</Text>
          <View style={styles.occupancyRow}>
            <Text style={styles.occupancyCount}>{occupancy.inside}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.occupancyLevel}>
                {occupancy.level === 'quiet' && '🟢 Quiet'}
                {occupancy.level === 'moderate' && '🟡 Moderate'}
                {occupancy.level === 'busy' && '🔴 Busy'}
                {occupancy.level === 'unknown' && 'People inside'}
              </Text>
              <Text style={styles.occupancySub}>
                members inside{occupancy.capacity ? ` · capacity ${occupancy.capacity}` : ''}
              </Text>
            </View>
          </View>
        </View>
      )}

      {(member?.balance_due_usd ?? 0) > 0 && (
        <View style={[styles.card, { borderColor: colors.danger }]}>
          <Text style={[styles.cardTitle, { color: colors.danger }]}>Unpaid balance</Text>
          <Text style={styles.cardBody}>
            ${member!.balance_due_usd} due — entry is blocked until it is settled at reception.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: colors.text, fontSize: 24, fontWeight: '800' },
  branch: { color: colors.textDim, marginTop: 2 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontWeight: '700', fontSize: 12 },
  enterCard: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 6,
  },
  enterText: { color: colors.onAccent, fontSize: 26, fontWeight: '900' },
  enterSub: { color: colors.onAccent, opacity: 0.7 },
  insideCard: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.inside },
  insideDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.inside,
  },
  insideTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  insideMeta: { color: colors.textDim },
  insideAction: { color: colors.accent, fontWeight: '700', marginTop: 4 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 8,
  },
  cardTitle: { color: colors.textDim, fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  cardBody: { color: colors.text, fontSize: 15 },
  occupancyRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  occupancyCount: { color: colors.text, fontSize: 40, fontWeight: '900' },
  occupancyLevel: { color: colors.text, fontSize: 16, fontWeight: '700' },
  occupancySub: { color: colors.textDim, fontSize: 13 },
});
