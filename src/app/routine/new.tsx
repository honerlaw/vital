import { useAuth } from '@clerk/expo';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/components/AppText';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import CatalogStatus from '@/components/CatalogStatus';
import ConfirmDialog from '@/components/ConfirmDialog';
import EquipmentPicker from '@/components/EquipmentPicker';
import GeneratedProgramPreview from '@/components/GeneratedProgramPreview';
import QuestionControl from '@/components/QuestionControl';
import RoutineKnobBar from '@/components/RoutineKnobBar';
import Screen from '@/components/Screen';
import { EQUIPMENT_LABELS } from '@/data/equipment-catalog';
import { fetchRoutinePlan } from '@/data/routine-plan-api';
import { generateRoutine } from '@/data/routine-generate-api';
import { refineRoutine } from '@/data/routine-refine-api';
import { saveUserProgram } from '@/data/save-user-program';
import { FIXED_SPINE } from '@/data/fixed-spine';
import { type RoutineProgress } from '@/data/stream-routine';
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
import { colors, space } from '@/theme';

type Phase = 'loading-plan' | 'questions' | 'generating' | 'preview' | 'gen-error' | 'saving';

/**
 * The AI routine generator wizard (030; streamed + cancellable since 034). A top-level full-screen
 * flow (005), reached from the Programs tab / first-run chooser. One streaming `plan` call designs
 * the question graph (falling back to the deterministic fixed spine on failure); the client walks
 * it as native controls; a streaming `generate` call produces an unpersisted draft refined by
 * structured knobs; Save commits an immutable program. Every in-flight phase streams structural
 * progress and can be cancelled (confirmed) at any point, aborting the upstream OpenRouter call and
 * rewinding to the right phase with the user's data intact. Wizard state is ephemeral (005).
 */
export default function NewRoutineScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const { state, dispatch } = useAppStore();
  const [phase, setPhase] = useState<Phase>('loading-plan');
  const [graph, setGraph] = useState<QuestionGraph | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  // Equipment (042) is no longer an intake question — it is pre-filled from the saved profile and
  // editable just for this routine (no write-back to the profile). Seeded once from the
  // boot-hydrated slice; the screen is reached only after the boot gate, so it is populated.
  const [equipment, setEquipment] = useState<string[]>(state.equipment);
  const [draft, setDraft] = useState<Program | null>(null);
  const [spec, setSpec] = useState<IntakeSpec | null>(null);
  const [progress, setProgress] = useState<RoutineProgress | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [genOrigin, setGenOrigin] = useState<'initial' | 'refine'>('initial');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const inFlight = phase === 'loading-plan' || phase === 'generating' || phase === 'saving';

  // One-shot streaming plan fetch on entry; any failure degrades to the fixed deterministic spine
  // so the wizard always has questions to render (030). setState happens only inside the async
  // callbacks (004: never synchronously in the effect body).
  useEffect(() => {
    if (phase !== 'loading-plan') return;
    const controller = new AbortController();
    abortRef.current = controller;
    fetchRoutinePlan(getToken, {
      signal: controller.signal,
      onProgress: setProgress,
      onRetry: () => setRetrying(true),
    })
      .then((g) => {
        if (!controller.signal.aborted) {
          setGraph(g);
          setPhase('questions');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setGraph(FIXED_SPINE);
          setPhase('questions');
        }
      });
    return () => controller.abort();
  }, [phase, getToken]);

  // While a call is in flight, route Android hardware back through the same confirm dialog (027:
  // usePreventRemove is unavailable in expo-router ~56). setState is in the listener callback, not
  // the effect body (004).
  useEffect(() => {
    if (!inFlight) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setConfirmVisible(true);
      return true;
    });
    return () => sub.remove();
  }, [inFlight]);

  // iOS swipe-back + Android back are locked ONLY while in flight (027 recipe, adapted from a
  // static lock to a per-phase one). Rendered in EVERY branch — incl. the boot-gate one below,
  // where the plan fetch is already in flight — so an early return can't desync it.
  const gestureLock = <Stack.Screen options={{ gestureEnabled: !inFlight }} />;

  // Standalone route (outside the tabs layout) → carry the combined render-gate (030: incl. user
  // programs). After all hooks.
  const status = bootStatus(state);
  if (status !== 'ready') {
    return (
      <>
        {gestureLock}
        <CatalogStatus status={status} onRetry={() => dispatch({ type: 'RETRY_HYDRATE' })} back />
      </>
    );
  }

  const visible = (q: Question): boolean => {
    if (!q.showWhen) return true;
    const prior = answers[q.showWhen.questionId];
    return Array.isArray(prior) ? prior.includes(q.showWhen.equals) : prior === q.showWhen.equals;
  };

  const toggleEquipment = (id: string): void => {
    setEquipment((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const buildSpec = (): IntakeSpec => {
    const out: IntakeAnswer[] = [];
    for (const q of graph?.questions ?? []) {
      // Equipment is injected from the profile editor below, never from a graph question (042) —
      // skip a stray planner-emitted `equipment` question so it can't double-count.
      if (q.id === 'equipment') continue;
      if (!visible(q)) continue;
      const v = answers[q.id];
      if (v === undefined) continue;
      if (typeof v === 'string' && v.length === 0) continue;
      if (Array.isArray(v) && v.length === 0) continue;
      out.push({ questionId: q.id, label: q.prompt, value: v });
    }
    // Inject the (possibly-overridden) equipment selection as readable canon labels; an empty
    // selection omits equipment entirely, matching the prior multi-select's empty behavior.
    if (equipment.length > 0) {
      out.push({
        questionId: 'equipment',
        label: 'What equipment do you have?',
        value: equipment.map((id) => EQUIPMENT_LABELS[id] ?? id),
      });
    }
    return { answers: out };
  };

  const runGenerate = (built: IntakeSpec): void => {
    const controller = new AbortController();
    abortRef.current = controller;
    setSpec(built);
    setGenOrigin('initial');
    setProgress(null);
    setRetrying(false);
    setPhase('generating');
    generateRoutine(getToken, built, {
      signal: controller.signal,
      onProgress: setProgress,
      onRetry: () => setRetrying(true),
    })
      .then((p) => {
        if (!controller.signal.aborted) {
          setDraft(p);
          setPhase('preview');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setPhase('gen-error');
      });
  };

  const onKnob = (knob: RoutineKnob): void => {
    if (!spec) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setGenOrigin('refine');
    setProgress(null);
    setRetrying(false);
    setPhase('generating');
    refineRoutine(getToken, spec, [knob], {
      signal: controller.signal,
      onProgress: setProgress,
      onRetry: () => setRetrying(true),
    })
      .then((p) => {
        if (!controller.signal.aborted) {
          setDraft(p);
          setPhase('preview');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setPhase('gen-error');
      });
  };

  const onSave = (): void => {
    if (!draft || !spec) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setRetrying(false);
    setProgress(null);
    setPhase('saving');
    saveUserProgram(getToken, draft, spec, controller.signal)
      .then((saved) => {
        if (controller.signal.aborted) return;
        dispatch({ type: 'ADD_USER_PROGRAM', program: saved });
        router.replace({ pathname: '/program/[id]', params: { id: saved.id } });
      })
      .catch(() => {
        if (!controller.signal.aborted) setPhase('preview');
      });
  };

  const confirmCancel = (): void => {
    setConfirmVisible(false);
    abortRef.current?.abort();
    setProgress(null);
    setRetrying(false);
    const target: Phase | 'exit' =
      phase === 'loading-plan'
        ? 'exit'
        : phase === 'saving'
          ? 'preview'
          : genOrigin === 'refine'
            ? 'preview'
            : 'questions';
    if (target === 'exit') {
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } else {
      setPhase(target);
    }
  };

  if (inFlight) {
    const planning = phase === 'loading-plan';
    const saving = phase === 'saving';
    const total = progress?.scalar;
    const built = progress?.count ?? 0;
    const title = planning
      ? 'Designing your questions'
      : saving
        ? 'Saving your routine'
        : 'Building your routine';
    const message = planning
      ? 'You can start again anytime.'
      : saving
        ? "Your routine won't be saved yet."
        : genOrigin === 'refine'
          ? "We'll keep your current routine."
          : 'Your answers will be kept so you can tweak and try again.';
    return (
      <>
        {gestureLock}
        <Screen center>
          <ActivityIndicator color={colors.accent} />
          <AppText variant="exerciseName" style={styles.progressTitle}>
            {title}
          </AppText>
          {retrying ? (
            <AppText variant="body" style={styles.centerText}>
              Tightening things up…
            </AppText>
          ) : planning ? (
            <AppText variant="body" style={styles.centerText}>
              {built > 0 ? `Designed ${String(built)} questions…` : 'Thinking it through…'}
            </AppText>
          ) : saving ? (
            <AppText variant="body" style={styles.centerText}>
              Committing your program…
            </AppText>
          ) : total !== undefined ? (
            <View style={styles.checklist}>
              {Array.from({ length: total }, (_, i) => {
                const n = i + 1;
                const mark = n <= built ? '✓' : n === built + 1 ? '◐' : '·';
                return (
                  <AppText
                    key={n}
                    variant="body"
                    color={n <= built ? colors.accent : colors.muted}
                    style={styles.checkRow}
                  >
                    {`${mark}  Day ${String(n)}`}
                  </AppText>
                );
              })}
            </View>
          ) : (
            <AppText variant="body" style={styles.centerText}>
              Designing your training split…
            </AppText>
          )}
          <TouchableOpacity
            onPress={() => setConfirmVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            style={styles.cancel}
          >
            <AppText variant="buttonLabel" color={colors.muted}>
              Cancel
            </AppText>
          </TouchableOpacity>
        </Screen>
        <ConfirmDialog
          visible={confirmVisible}
          title={planning ? 'Stop designing?' : saving ? 'Stop saving?' : 'Stop generating?'}
          message={message}
          keepLabel={planning ? 'Keep designing' : saving ? 'Keep saving' : 'Keep generating'}
          confirmLabel="Cancel"
          onKeep={() => setConfirmVisible(false)}
          onConfirm={confirmCancel}
        />
      </>
    );
  }

  if (phase === 'gen-error') {
    return (
      <>
        {gestureLock}
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
      </>
    );
  }

  if (phase === 'preview' && draft) {
    return (
      <>
        {gestureLock}
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
      </>
    );
  }

  // 'questions' (and the brief window before the draft resolves). keyboardAware keeps every input +
  // the Generate button reachable with the keyboard open (034). Equipment is filtered out of the
  // graph questions — it renders as the pre-filled profile editor below instead (042).
  const questions = (graph?.questions ?? []).filter((q) => q.id !== 'equipment').filter(visible);
  return (
    <>
      {gestureLock}
      <Screen keyboardAware>
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
        <View style={styles.equipment}>
          <AppText variant="exerciseName" style={styles.equipmentPrompt}>
            Equipment
          </AppText>
          <AppText variant="bodySub" style={styles.equipmentHint}>
            From your profile — tweak it just for this routine.
          </AppText>
          <EquipmentPicker selected={equipment} onToggle={toggleEquipment} />
        </View>
        <View style={styles.cta}>
          <Button label="Generate routine →" onPress={() => runGenerate(buildSpec())} />
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: space.lg },
  blurb: { marginTop: space.md },
  equipment: { marginTop: space.xl },
  equipmentPrompt: { marginBottom: space.xs },
  equipmentHint: { marginBottom: space.sm },
  eyebrow: { marginTop: space.lg, marginBottom: space.md },
  knobs: { marginTop: space['2xl'] },
  cta: { marginTop: space['2xl'] },
  ctaSpacer: { marginTop: space.md },
  centerText: { textAlign: 'center', marginTop: space.lg },
  progressTitle: { marginTop: space.xl, textAlign: 'center' },
  checklist: { marginTop: space.xl, alignSelf: 'center' },
  checkRow: { marginTop: space.sm },
  cancel: { marginTop: space['3xl'], alignItems: 'center', paddingVertical: space.md },
});
