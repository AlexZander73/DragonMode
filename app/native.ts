import { Capacitor } from "@capacitor/core";

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
  | { type: "wish-open"; wishId: string };

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
    ],
  });
  const listener = await LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
    const extra = event.notification.extra ?? {};
    if (event.actionId === "used-today" && extra.subscriptionId) onAction({ type: "subscription-use", subscriptionId: String(extra.subscriptionId) });
    else if (extra.subscriptionId) onAction({ type: "subscription-open", subscriptionId: String(extra.subscriptionId) });
    else if (extra.wishId) onAction({ type: "wish-open", wishId: String(extra.wishId) });
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
      body: `${input.name} is expected to claim ${input.currency ?? "$"}${input.amount.toFixed(2)}. Review the tribute?`,
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
      body: `${input.name} has finished resting. Keep it, wait longer, or let it go—nothing here is a test.`,
      schedule: { at: input.at },
      actionTypeId: "wish-ready",
      extra: { wishId: input.id },
      threadIdentifier: "dragon-mode-wishes",
    }],
  });
  return { scheduled: true, reason: "Wish reminder scheduled." };
}
