import { Capacitor } from "@capacitor/core";

export async function playFeedback(options: { sound: boolean; haptics: boolean; kind?: "light" | "success" | "warning" }) {
  if (options.sound && typeof window !== "undefined") {
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        const context = new AudioContextClass();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(options.kind === "warning" ? 310 : 660, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(options.kind === "success" ? 990 : 520, context.currentTime + 0.13);
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.09, context.currentTime + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.2);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.21);
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

export async function scheduleClaimantReminder(input: { id: string; name: string; amount: number; at: Date }) {
  if (!Capacitor.isNativePlatform()) return { scheduled: false, reason: "Reminders are available in the installed app." };
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== "granted") return { scheduled: false, reason: "Notification permission was not granted." };
  const numericId = Math.abs([...input.id].reduce((sum, character) => ((sum * 31) + character.charCodeAt(0)) | 0, 17));
  await LocalNotifications.schedule({
    notifications: [{
      id: numericId,
      title: "A claimant returns soon",
      body: `${input.name} is expected to claim $${input.amount.toFixed(2)}. Review the tribute?`,
      schedule: { at: input.at },
      extra: { subscriptionId: input.id },
    }],
  });
  return { scheduled: true, reason: "Friendly reminder scheduled." };
}
