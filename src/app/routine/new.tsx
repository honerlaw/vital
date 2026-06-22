import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import CatalogStatus from '@/components/CatalogStatus';
import GeneratedProgramPreview from '@/components/GeneratedProgramPreview';
import QuestionControl from '@/components/QuestionControl';
import RoutineKnobBar from '@/components/RoutineKnobBar';
import Screen from '@/components/Screen';
import { fetchRoutinePlan } from '@/data/routine-plan-api';
import { generateRoutine } from '@/data/routine-generate-api';
import { refineRoutine } from '@/data/routine-refine-api';
import { saveUserProgram } from '@/data/save-user-program';
import { FIXED_SPINE } from '@/data/fixed-spine';
import {
  type IntakeAnswer,
  type IntakeSpec,
  type Question,
  type QuestionGraph,
  type RoutineKnob,
} from '@/data/routine-types';
import { type Program } from '@/data/types';
import { bootStatus } from '@/state/boot-status';
import { useAppStore } from '@/state/useAppStore';
import { space } from '@/theme';

type Phase = 'loading-plan' | 'questions' | 'generating' | 'preview' | 'gen-error' | 'saving';

/**
 * The AI routine generator wizard (030). A top-level full-screen flow (005), reached from the
 * Programs tab / first-run chooser. One LLM `plan` call designs the question graph (falling back to
 * the deterministic fixed spine on failure); the client walks it as native controls; one
 * `generate` call produces an unpersisted draft refined by structured knobs; Save commits an
 * immutable program. Wizard state is ephemeral and stays OUT of the reducer (005).
 */
export default function NewRoutineScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const { state, dispatch } = useAppStore();
  const [phase, setPhase] = useState<Phase>('loading-plan');
  const [graph, setGraph] = useState<QuestionGraph | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [draft, setDraft] = useState<Program | null>(null);
  const [spec, setSpec] = useState<IntakeSpec | null>(null);

  // One-shot plan fetch on entry; any failure degrades to the fixed deterministic spine so the
  // wizard always has questions to render (030). Deferred setState in the effect (not in render).
  useEffect(() => {
    if (phase !== 'loading-plan') return;
    let cancelled = false;
    fetchRoutinePlan(getToken)
      .then((g) => {
        if (!cancelled) {
          setGraph(g);
          setPhase('questions');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGraph(FIXED_SPINE);
          setPhase('questions');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [phase, getToken]);

  // Standalone route (outside the tabs layout) → carry the combined render-gate (030: incl. user
  // programs). After all hooks.
  const status = bootStatus(state);
  if (status !== 'ready') {
    return (
      <CatalogStatus status={status} onRetry={() => dispatch({ type: 'RETRY_HYDRATE' })} back />
    );
  }

  const visible = (q: Question): boolean => {
    if (!q.showWhen) return true;
    const prior = answers[q.showWhen.questionId];
    return Array.isArray(prior) ? prior.includes(q.showWhen.equals) : prior === q.showWhen.equals;
  };

  const buildSpec = (): IntakeSpec => {
    const out: IntakeAnswer[] = [];
    for (const q of graph?.questions ?? []) {
      if (!visible(q)) continue;
      const v = answers[q.id];
      if (v === undefined) continue;
      if (typeof v === 'string' && v.length === 0) continue;
      if (Array.isArray(v) && v.length === 0) continue;
      out.push({ questionId: q.id, label: q.prompt, value: v });
    }
    return { answers: out };
  };

  const runGenerate = (built: IntakeSpec): void => {
    setSpec(built);
    setPhase('generating');
    generateRoutine(getToken, built)
      .then((p) => {
        setDraft(p);
        setPhase('preview');
      })
      .catch(() => setPhase('gen-error'));
  };

  const onKnob = (knob: RoutineKnob): void => {
    if (!spec) return;
    setPhase('generating');
    refineRoutine(getToken, spec, [knob])
      .then((p) => {
        setDraft(p);
        setPhase('preview');
      })
      .catch(() => setPhase('gen-error'));
  };

  const onSave = (): void => {
    if (!draft || !spec) return;
    setPhase('saving');
    saveUserProgram(getToken, draft, spec)
      .then((saved) => {
        dispatch({ type: 'ADD_USER_PROGRAM', program: saved });
        router.replace({ pathname: '/program/[id]', params: { id: saved.id } });
      })
      .catch(() => setPhase('preview'));
  };

  if (phase === 'loading-plan' || phase === 'generating' || phase === 'saving') {
    let label = 'Generating your routine…';
    if (phase === 'loading-plan') label = 'Designing your questions…';
    if (phase === 'saving') label = 'Saving…';
    return (
      <Screen center>
        <AppText variant="body" style={styles.centerText}>
          {label}
        </AppText>
      </Screen>
    );
  }

  if (phase === 'gen-error') {
    return (
      <Screen>
        <BackButton />
        <AppText variant="screenTitle" style={styles.title}>
          Couldn&apos;t generate
        </AppText>
        <AppText variant="body" style={styles.blurb}>
          We couldn&apos;t build your routine right now. Try again, or pick one of the curated
          programs to start training today.
        </AppText>
        <View style={styles.cta}>
          <Button
            label="Try again"
            onPress={() => (spec ? runGenerate(spec) : setPhase('questions'))}
          />
        </View>
        <View style={styles.ctaSpacer}>
          <Button label="Browse programs" onPress={() => router.replace('/programs')} />
        </View>
      </Screen>
    );
  }

  if (phase === 'preview' && draft) {
    return (
      <Screen>
        <BackButton />
        <AppText variant="label" style={styles.eyebrow}>
          Your generated routine
        </AppText>
        <GeneratedProgramPreview program={draft} />
        <View style={styles.knobs}>
          <RoutineKnobBar onKnob={onKnob} />
        </View>
        <View style={styles.cta}>
          <Button label="Save routine" onPress={onSave} />
        </View>
        <View style={styles.ctaSpacer}>
          <Button label="Start over" onPress={() => setPhase('questions')} />
        </View>
      </Screen>
    );
  }

  // 'questions' (and the brief window before the draft resolves).
  const questions = (graph?.questions ?? []).filter(visible);
  return (
    <Screen>
      <BackButton />
      <AppText variant="screenTitle" style={styles.title}>
        Build your routine
      </AppText>
      <AppText variant="body" style={styles.blurb}>
        Answer a few questions and we&apos;ll generate a personalized program with built-in
        progression. You can refine it before saving.
      </AppText>
      {questions.map((q) => (
        <QuestionControl
          key={q.id}
          question={q}
          value={answers[q.id]}
          onChange={(value) => setAnswers((prev) => ({ ...prev, [q.id]: value }))}
        />
      ))}
      <View style={styles.cta}>
        <Button label="Generate routine →" onPress={() => runGenerate(buildSpec())} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: space.lg },
  blurb: { marginTop: space.md },
  eyebrow: { marginTop: space.lg, marginBottom: space.md },
  knobs: { marginTop: space['2xl'] },
  cta: { marginTop: space['2xl'] },
  ctaSpacer: { marginTop: space.md },
  centerText: { textAlign: 'center' },
});
