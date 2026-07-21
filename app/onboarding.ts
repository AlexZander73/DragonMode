import { createEmptyState, type DragonState } from "./data";
import { processJourneySession } from "./journey";

export const GUIDED_TUTORIAL_LAST_STEP = 6;

export function prepareReleaseState(saved: DragonState | null, now = new Date()): DragonState {
  const state = !saved || saved.profile.dataMode === "demo" ? createEmptyState() : saved;
  return state.profile.tutorialComplete ? processJourneySession(state, now) : state;
}

export function setGuidedTutorialStep(state: DragonState, step: number): DragonState {
  return {
    ...state,
    profile: {
      ...state.profile,
      tutorialComplete: false,
      tutorialChapter: Math.max(0, Math.min(GUIDED_TUTORIAL_LAST_STEP, step)),
    },
  };
}

export function completeGuidedTutorial(state: DragonState): DragonState {
  return {
    ...state,
    profile: {
      ...state.profile,
      tutorialComplete: true,
      tutorialChapter: 0,
      onboardingComplete: true,
      dataMode: "personal",
    },
  };
}

export function restartGuidedTutorial(state: DragonState): DragonState {
  return setGuidedTutorialStep(state, 0);
}
