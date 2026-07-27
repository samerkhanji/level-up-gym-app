import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Visit, VisitStats, getVisitStats, getVisits } from '@/lib/api';
import { colors } from '@/lib/colors';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
function formatDuration(min: number | null): string {
  if (min == null) return '—';
  const h = Math.floor(min / 60);
  return h > 0 ? `${h} hr ${min % 60} min` : `${min} min`;
}

export default function Visits() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [stats, setStats] = useState<VisitStats>({});

  useFocusEffect(
    useCallback(() => {
      getVisits().then(setVisits);
      getVisitStats().then(setStats);
    }, []),
  );

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={visits}
      keyExtractor={(v) => v.id}
      ListHeaderComponent={
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.visits_this_month ?? 0}</Text>
            <Text style={styles.statLabel}>visits this month</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatDuration(stats.avg_duration_min ?? null)}</Text>
            <Text style={styles.statLabel}>avg duration</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total_visits ?? 0}</Text>
            <Text style={styles.statLabel}>total visits</Text>
          </View>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>No visits yet — your first check-in will appear here.</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.visitRow}>
          <View style={styles.visitDateCol}>
            <Text style={styles.visitDate}>{formatDate(item.entered_at)}</Text>
            {item.branches && <Text style={styles.visitBranch}>{item.branches.name}</Text>}
          </View>
          <View style={styles.visitTimesCol}>
            <Text style={styles.visitTimes}>
              {formatTime(item.entered_at)}
              {' → '}
              {item.exited_at ? formatTime(item.exited_at) : 'inside'}
            </Text>
            {item.auto_closed && <Text style={styles.autoClosed}>no checkout recorded</Text>}
          </View>
          <Text style={styles.visitDuration}>{formatDuration(item.duration_min)}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 10 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { color: colors.accent, fontSize: 18, fontWeight: '800' },
  statLabel: { color: colors.textDim, fontSize: 11, textAlign: 'center' },
  visitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  visitDateCol: { width: 72 },
  visitDate: { color: colors.text, fontWeight: '700' },
  visitBranch: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  visitTimesCol: { flex: 1 },
  visitTimes: { color: colors.text },
  autoClosed: { color: colors.warning, fontSize: 11, marginTop: 2 },
  visitDuration: { color: colors.textDim, fontWeight: '600' },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: 40 },
});
