import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/components/AppText';
import Tag from '@/components/Tag';
import { Program } from '@/data/types';
import { border, colors, radius, space } from '@/theme';

interface Props {
  program: Program;
  active: boolean;
  onPress: () => void;
}

export default function ProgramCard({ program, active, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.card, active ? styles.activeCard : null]}
    >
      <Tag label={program.tag} active={active} />
      <AppText variant="programTitle" style={styles.title}>
        {program.name}
      </AppText>
      <AppText variant="body">{program.blurb}</AppText>
      <View style={styles.foot}>
        <AppText variant="tag" color={colors.muted}>
          {`${program.cred} / ${program.days.length}-DAY CYCLE`}
        </AppText>
        {active ? (
          <AppText variant="tag" color={colors.accent} style={styles.activeLabel}>
            ● Active
          </AppText>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: border.thin,
    borderColor: colors.line2,
    borderRadius: radius.md,
    padding: space.lg,
    marginTop: space.md,
  },
  activeCard: { borderColor: colors.accent },
  title: { marginTop: 13, marginBottom: space.sm },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
  },
  activeLabel: { marginLeft: 'auto' },
});
