import { Capacitor } from "@capacitor/core";
import type { DragonState } from "./data";

const stableNotificationId = (id: string) => Math.abs([...id].reduce((sum, character) => ((sum * 31) + character.charCodeAt(0)) | 0, 17));

export async function playFeedback(options: { sound: boolean; haptics: boolean; kind?: "light" | "success" | "warning" }) {
  if (options.sound && typeof window !== "undefined") {
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        const context = new AudioContextClass();
        const oscillator = context.createOscillator();
        const overtone = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        overtone.type = "triangle";
        const start = options.kind === "warning" ? 300 : options.kind === "success" ? 620 : 520;
        oscillator.frequency.setValueAtTime(start, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(options.kind === "success" ? 980 : 560, context.currentTime + 0.16);
        overtone.frequency.setValueAtTime(start * 1.5, context.currentTime);
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.055, context.currentTime + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.23);
        oscillator.connect(gain).connect(context.destination);
        overtone.connect(gain);
        oscillator.start();
        overtone.start();
        oscillator.stop(context.currentTime + 0.24);
        overtone.stop(context.currentTime + 0.19);
        oscillator.addEventListener("ended", () => context.close().catch(() => undefined));
      }
    } catch {
      // Feedback must never block a finance action.
    }
  }

  if (!options.haptics) return;
  try {
    if (Capacitor.isNativePlatform()) {
      const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");
      if (options.kind === "success") await Haptics.notification({ type: NotificationType.Success });
      else if (options.kind === "warning") await Haptics.notification({ type: NotificationType.Warning });
      else await Haptics.impact({ style: ImpactStyle.Light });
    } else if (navigator.vibrate) {
      navigator.vibrate(options.kind === "success" ? [18, 35, 22] : 18);
    }
  } catch {
    // Haptics are optional enhancement.
  }
}

export type NotificationAction =
  | { type: "subscription-use"; subscriptionId: string }
  | { type: "subscription-open"; subscriptionId: string }
  | { type: "wish-open"; wishId: string }
  | { type: "open-screen"; screen: "lair" | "pets" | "import" | "journey" | "analytics" | "tribute" | "hoard" };

export function notificationActionFromEvent(event: { actionId: string; notification: { extra?: Record<string, unknown> } }): NotificationAction | null {
  const extra = event.notification.extra ?? {};
  if (event.actionId === "used-today" && extra.subscriptionId) return { type: "subscription-use", subscriptionId: String(extra.subscriptionId) };
  if (extra.subscriptionId) return { type: "subscription-open", subscriptionId: String(extra.subscriptionId) };
  if (extra.wishId) return { type: "wish-open", wishId: String(extra.wishId) };
  const targetScreen = extra.targetScreen ?? (extra.petId ? "pets" : undefined);
  if (["lair", "pets", "import", "journey", "analytics", "tribute", "hoard"].includes(String(targetScreen))) {
    return { type: "open-screen", screen: String(targetScreen) as Extract<NotificationAction, { type: "open-screen" }>["screen"] };
  }
  return null;
}

export async function setupNotificationActions(onAction: (action: NotificationAction) => void) {
  if (!Capacitor.isNativePlatform()) return () => undefined;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  await LocalNotifications.registerActionTypes({
    types: [
      {
        id: "claimant-review",
        actions: [
          { id: "used-today", title: "Used today", foreground: false },
          { id: "open-claimant", title: "Review", foreground: true },
        ],
      },
      {
        id: "wish-ready",
        actions: [{ id: "open-wish", title: "Decide calmly", foreground: true }],
      },
      {
        id: "open-useful-action",
        actions: [{ id: "open-action", title: "Review", foreground: true }],
      },
    ],
  });
  const listener = await LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
    const action = notificationActionFromEvent(event);
    if (action) onAction(action);
  });
  return () => listener.remove();
}

export async function notificationPermission() {
  if (!Capacitor.isNativePlatform()) return "web" as const;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const permission = await LocalNotifications.checkPermissions();
  return permission.display;
}

export async function scheduleClaimantReminder(input: { id: string; name: string; amount: number; at: Date; currency?: string }) {
  if (!Capacitor.isNativePlatform()) return { scheduled: false, reason: "Reminders are available in the installed app." };
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== "granted") return { scheduled: false, reason: "Notification permission was not granted." };
  const id = stableNotificationId(`claimant-${input.id}`);
  await LocalNotifications.cancel({ notifications: [{ id }] });
  await LocalNotifications.schedule({
    notifications: [{
      id,
      title: "A claimant returns soon",
      body: "A recurring cost you asked DragonMode to watch is approaching. Open its details when useful.",
      schedule: { at: input.at },
      actionTypeId: "claimant-review",
      extra: { subscriptionId: input.id },
      threadIdentifier: "dragon-mode-claimants",
    }],
  });
  return { scheduled: true, reason: "Friendly reminder scheduled." };
}

export async function scheduleWishReminder(input: { id: string; name: string; at: Date }) {
  if (!Capacitor.isNativePlatform()) return { scheduled: false, reason: "Wish reminders are available in the installed app." };
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== "granted") return { scheduled: false, reason: "Notification permission was not granted." };
  const id = stableNotificationId(`wish-${input.id}`);
  await LocalNotifications.cancel({ notifications: [{ id }] });
  await LocalNotifications.schedule({
    notifications: [{
      id,
      title: "Your resting wish is ready",
      body: "A resting wish is ready. Keep it, wait longer, or let it go—nothing here is a test.",
      schedule: { at: input.at },
      actionTypeId: "wish-ready",
      extra: { wishId: input.id },
      threadIdentifier: "dragon-mode-wishes",
    }],
  });
  return { scheduled: true, reason: "Wish reminder scheduled." };
}

async function cancelNotification(key: string) {
  if (!Capacitor.isNativePlatform()) return;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  await LocalNotifications.cancel({ notifications: [{ id: stableNotificationId(key) }] });
}

function outsideQuietHours(input: Date, state: DragonState) {
  const date = new Date(input);
  const minutes = date.getHours() * 60 + date.getMinutes();
  const parse = (value: string) => {
    const [hour, minute] = value.split(":").map(Number);
    return Math.max(0, Math.min(1439, (hour || 0) * 60 + (minute || 0)));
  };
  const start = parse(state.profile.notificationQuietStart);
  const end = parse(state.profile.notificationQuietEnd);
  const quiet = start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
  if (!quiet) return date;
  const endHour = Math.floor(end / 60);
  const endMinute = end % 60;
  if (start >= end && minutes >= start) date.setDate(date.getDate() + 1);
  date.setHours(endHour, endMinute, 0, 0);
  return date;
}

async function scheduleActionReminder(input: { key: string; title: string; body: string; at: Date; targetScreen: Extract<NotificationAction, { type: "open-screen" }>["screen"]; state: DragonState }) {
  if (!Capacitor.isNativePlatform()) return;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const id = stableNotificationId(input.key);
  await LocalNotifications.cancel({ notifications: [{ id }] });
  await LocalNotifications.schedule({ notifications: [{ id, title: input.title, body: input.body, schedule: { at: outsideQuietHours(input.at, input.state) }, actionTypeId: "open-useful-action", extra: { targetScreen: input.targetScreen }, threadIdentifier: "dragon-mode-useful-actions" }] });
}

const cadenceDays = (cadence: DragonState["journey"]["incomeSources"][number]["cadence"]) => cadence === "weekly" ? 7 : cadence === "fortnightly" ? 14 : cadence === "monthly" ? 30 : cadence === "quarterly" ? 91 : cadence === "annual" ? 365 : 0;

export const cancelClaimantReminder = (id: string) => cancelNotification(`claimant-${id}`);
export const cancelWishReminder = (id: string) => cancelNotification(`wish-${id}`);

async function schedulePetReminder(state: DragonState, pet: DragonState["pets"][number]) {
  if (!Capacitor.isNativePlatform()) return;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const intervalDays = pet.cadence === "daily" ? 1 : pet.cadence === "weekly" ? 7 : 30;
  const at = new Date(new Date(pet.lastInteraction).getTime() + intervalDays * 86_400_000);
  if (at.getTime() <= Date.now()) at.setTime(Date.now() + 5 * 60_000);
  const id = stableNotificationId(`pet-${pet.id}`);
  await LocalNotifications.cancel({ notifications: [{ id }] });
  await LocalNotifications.schedule({ notifications: [{ id, title: `${pet.name} is ready for a visit`, body: "A gentle check-in is waiting. Nothing was lost, and there is never a penalty for returning later.", schedule: { at }, threadIdentifier: "dragon-mode-pets", extra: { petId: pet.id, targetScreen: "pets" } }] });
}

export async function reconcileNotificationSchedule(state: DragonState) {
  if (!Capacitor.isNativePlatform()) return { scheduled: false, reason: "Notifications are available in the installed app." };
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  if (!state.profile.notificationsEnabled) {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map(({ id }) => ({ id })) });
    return { scheduled: false, reason: "Dragon Mode reminders are off." };
  }
  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== "granted") return { scheduled: false, reason: "Notification permission was not granted." };
  const preferences = state.profile.notificationPreferences;
  for (const subscription of state.subscriptions) {
    if (preferences.claimants && subscription.reminderEnabled) {
      const at = new Date(new Date(subscription.nextCharge).getTime() - subscription.reminderDays * 86_400_000);
      if (at.getTime() <= Date.now()) at.setTime(Date.now() + 5 * 60_000);
      await scheduleClaimantReminder({ id: subscription.id, name: subscription.name, amount: subscription.amount, at });
    } else await cancelClaimantReminder(subscription.id);
  }
  for (const wish of state.wishes) {
    if (preferences.wishes && wish.status === "resting") {
      const at = new Date(wish.endsAt);
      if (at.getTime() <= Date.now()) at.setTime(Date.now() + 5 * 60_000);
      await scheduleWishReminder({ id: wish.id, name: wish.name, at });
    } else await cancelWishReminder(wish.id);
  }
  for (const pet of state.pets) {
    if (preferences.pets) await schedulePetReminder(state, pet);
    else await cancelNotification(`pet-${pet.id}`);
  }
  const weeklyId = stableNotificationId("weekly-review");
  await LocalNotifications.cancel({ notifications: [{ id: weeklyId }] });
  if (preferences.weeklyReview) await LocalNotifications.schedule({ notifications: [{ id: weeklyId, title: "A calm weekly Lair review", body: "One look is enough: check what changed, choose one useful step, then leave the vault in peace.", schedule: { on: { weekday: state.profile.reviewDay, hour: state.profile.reviewHour, minute: 0 }, repeats: true }, actionTypeId: "open-useful-action", extra: { targetScreen: "lair" }, threadIdentifier: "dragon-mode-review" }] });
  const priceId = stableNotificationId("price-changes");
  await LocalNotifications.cancel({ notifications: [{ id: priceId }] });
  const changed = state.subscriptions.filter((subscription) => subscription.priceChange);
  if (preferences.priceChanges && changed.length) await LocalNotifications.schedule({ notifications: [{ id: priceId, title: "A recurring cost changed", body: "A price change is ready for a calm review. No action is assumed.", schedule: { at: outsideQuietHours(new Date(Date.now() + 5 * 60_000), state) }, actionTypeId: "open-useful-action", extra: { targetScreen: "tribute" }, threadIdentifier: "dragon-mode-price-changes" }] });
  const reviewNeeded = state.accounts.some((account) => account.reconciliationStatus === "needs-review") || state.imports.batches.some((batch) => batch.status === "committed" && batch.candidates.some((candidate) => candidate.proposedAction === "hold" && !candidate.committedTransactionId && candidate.resolution !== "ignore" && candidate.resolution !== "one-is-echo"));
  if (preferences.importReview && reviewNeeded) await scheduleActionReminder({ key: "import-review", title: "A statement row needs your help", body: "One row is waiting for you to check it.", at: new Date(Date.now() + 5 * 60_000), targetScreen: "import", state });
  else await cancelNotification("import-review");
  const importantUncertainty = reviewNeeded || state.transactions.some((transaction) => (transaction.unusual || transaction.duplicate) && !transaction.reviewedAt);
  if (preferences.importantUncertainty && importantUncertainty) await scheduleActionReminder({ key: "important-uncertainty", title: "One useful check is waiting", body: "DragonMode found an uncertainty that only you can confirm. Nothing was changed automatically.", at: new Date(Date.now() + 7 * 60_000), targetScreen: reviewNeeded ? "import" : "hoard", state });
  else await cancelNotification("important-uncertainty");
  const openChapter = [...state.journey.chapters].reverse().find((chapter) => !chapter.completedAt);
  if (preferences.storyChapter && openChapter) await scheduleActionReminder({ key: "story-chapter", title: "A Living Atlas chapter is ready", body: "An optional, permanent chapter is waiting. It will not expire.", at: new Date(Date.now() + 10 * 60_000), targetScreen: "journey", state });
  else await cancelNotification("story-chapter");
  const now = new Date();
  const monthlyAt = new Date(now.getFullYear(), now.getMonth() + (now.getDate() >= 1 ? 1 : 0), 1, state.profile.reviewHour, 0, 0, 0);
  if (preferences.monthlyReview) await scheduleActionReminder({ key: "monthly-review", title: "Your monthly Chronicle can close", body: "Review the mapped month, its assumptions, and anything still unresolved when useful.", at: monthlyAt, targetScreen: "analytics", state });
  else await cancelNotification("monthly-review");
  const expectedDates = state.journey.incomeSources.flatMap((source) => {
    const days = cadenceDays(source.cadence);
    if (!days || !source.lastSeenAt) return [];
    const next = new Date(source.lastSeenAt);
    while (next.getTime() <= Date.now()) next.setTime(next.getTime() + days * 86_400_000);
    return [next];
  }).sort((a, b) => a.getTime() - b.getTime());
  if (preferences.expectedIncome && expectedDates[0]) await scheduleActionReminder({ key: "expected-income", title: "An expected-income checkpoint is near", body: "Review whether the mapped timing still looks right. Irregular income is always allowed.", at: expectedDates[0], targetScreen: "journey", state });
  else await cancelNotification("expected-income");
  const rateDates = state.accounts.flatMap((account) => [account.promotionEnd, account.maturityDate, account.nextInterestDate].filter(Boolean).map((value) => new Date(value!))).filter((date) => date.getTime() > Date.now()).sort((a, b) => a.getTime() - b.getTime());
  if (preferences.rateOrMaturity && rateDates[0]) await scheduleActionReminder({ key: "rate-or-maturity", title: "A savings date is approaching", body: "A special rate, interest date, or end date is ready for a quick check.", at: new Date(rateDates[0].getTime() - 24 * 60 * 60_000), targetScreen: "hoard", state });
  else await cancelNotification("rate-or-maturity");
  return { scheduled: true, reason: "Reminder choices saved." };
}
