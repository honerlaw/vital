import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/components/AppText';
import HistorySetList from '@/components/HistorySetList';
import { type SessionExerciseLog } from '@/data/types';
import { formatDuration } from '@/utils/formatDuration';
import { groupThousands } from '@/utils/groupThousands';
import { border, colors, radius, space } from '@/theme';

interface Props {
  dayName: string;
  programName: string;
  date: string;
  /** Per-set detail (022) — absent on legacy sessions, which render exactly as before. */
  exercises?: SessionExerciseLog[];
  unit?: string;
  /** Total elapsed seconds (041) — absent on sessions logged before duration tracking. */
  durationSec?: number;
  /** Total weight lifted, Σ weight×reps over completed sets (041); 0 when no weighted sets. */
  volume: number;
}

export default function HistoryRow({
  dayName,
  programName,
  date,
  exercises,
  unit,
  durationSec,
  volume,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const expandable = exercises !== undefined && exercises.length > 0;
  // Summary stats (041): elapsed time (when tracked) and total volume (when any set was weighted),
  // joined with a middot. Omitted on legacy sessions that carry neither — the row reads as before.
  const stats: string[] = [];
  if (durationSec !== undefined) stats.push(formatDuration(durationSec));
  if (volume > 0) stats.push(`${groupThousands(volume)} ${unit ?? 'lb'}`);
  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        onPress={() => {
          setExpanded((v) => !v);
        }}
        disabled={!expandable}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={styles.row}
      >
        <View style={styles.check}>
          <AppText variant="historyDate" color={colors.onAccent}>
            ✓
          </AppText>
        </View>
        <View style={styles.body}>
          <AppText variant="exerciseName" style={styles.title}>
            {dayName}
          </AppText>
          <AppText variant="label" style={styles.sub}>
            {programName}
          </AppText>
          {stats.length > 0 ? (
            <AppText variant="historyDate" style={styles.stats}>
              {stats.join('  ·  ')}
            </AppText>
          ) : null}
        </View>
        <AppText variant="historyDate" style={styles.date}>
          {date}
        </AppText>
        {expandable ? (
          <AppText variant="historyDate" color={colors.muted}>
            {expanded ? '▾' : '▸'}
          </AppText>
        ) : null}
      </TouchableOpacity>
      {expanded && exercises !== undefined ? (
        <HistorySetList exercises={exercises} unit={unit ?? 'lb'} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: border.hairline,
    borderBottomColor: colors.line,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingVertical: space.lg,
  },
  check: {
    width: 18,
    height: 18,
    borderRadius: radius.xs,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  title: { fontSize: 15 },
  sub: { marginTop: 3 },
  stats: { marginTop: 4, color: colors.ink },
  date: { marginLeft: 'auto' },
});
