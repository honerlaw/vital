import { BootMilestone, bootMilestones } from '@/observability/boot-milestones';

/**
 * Marks a boot milestone as reached. Idempotent (Set add). Call sites: fonts-loaded
 * in app/_layout, clerk-loaded + splash-hidden in auth/RootNavigator, boot-ready in
 * state/StateProvider — each from an effect, never during render (the React Compiler
 * treats render-time external mutation as an error, see
 * [[004-pattern-expo56-react-compiler-hook-rules]]).
 */
export function recordBootMilestone(milestone: BootMilestone): void {
  bootMilestones.add(milestone);
}
