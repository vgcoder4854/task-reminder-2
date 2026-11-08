import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { addDays, today, parse, fromMin, getItemsForDate, wantsRemind, isDone, effectiveSound } from './logic';
import { AlarmSound } from './sounds';

export const isNative = Capacitor.isNativePlatform();
const CHANNEL = 'alarm';

function hid(s) {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return (Math.abs(h) % 2147483000) + 1;
}

export async function setupNotifications() {
  if (!isNative) return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL,
      name: 'Task alarms',
      description: 'Reminders for your scheduled tasks',
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
    });
    await LocalNotifications.requestPermissions();
    if (!localStorage.getItem('exactAsked')) {
      localStorage.setItem('exactAsked', '1');
      const x = await LocalNotifications.checkExactNotificationSetting();
      if (x.exact_alarm !== 'granted') await LocalNotifications.changeExactNotificationSetting();
    }
  } catch (e) {
    console.warn('notification setup', e);
  }
}

// Re-schedule every upcoming reminder (next 60 days).
// Tasks with a custom sound (their own or the universal one) use the native alarm plugin
// which loops the sound; everything else uses normal system notifications.
export async function scheduleAll(state) {
  if (!isNative) return;
  const local = [];
  const custom = [];
  const now = Date.now();
  const t0 = today();
  for (let i = 0; i < 60; i++) {
    const d = addDays(t0, i);
    for (const it of getItemsForDate(state, d)) {
      if (!it.slot || !wantsRemind(it.task, it.entry) || isDone(it.task, it.entry)) continue;
      const at = parse(d);
      at.setMinutes(it.slot.start);
      if (at.getTime() <= now) continue;
      const id = hid(d + it.task.id);
      const title = it.task.title;
      const body = `${fromMin(it.slot.start)}–${fromMin(it.slot.end)}${it.task.goal ? ' · ' + it.task.goal : ''}`;
      const snd = effectiveSound(it.task, state.settings);
      if (snd) custom.push({ id, at: at.getTime(), title, body, path: snd.path });
      else local.push({ id, title: '⏰ ' + title, body, schedule: { at, allowWhileIdle: true }, channelId: CHANNEL });
    }
  }
  try {
    const pend = await LocalNotifications.getPending();
    if (pend.notifications.length) await LocalNotifications.cancel({ notifications: pend.notifications.map((n) => ({ id: n.id })) });
    if (local.length) await LocalNotifications.schedule({ notifications: local.slice(0, 250) });
  } catch (e) {
    console.warn('schedule local', e);
  }
  try {
    if (AlarmSound) await AlarmSound.schedule({ alarms: custom.slice(0, 200) });
  } catch (e) {
    console.warn('schedule custom', e);
  }
}

// Test alarm: rings the universal sound after 10 seconds (native) like a real alarm
export async function scheduleTest(state) {
  const snd = state.settings?.universal?.path ? state.settings.universal : null;
  const at = new Date(Date.now() + 10000);
  if (snd && AlarmSound) {
    await AlarmSound.schedule({
      alarms: [{ id: 999999, at: at.getTime(), title: 'Test alarm', body: 'Your custom sound', path: snd.path }],
    });
    return;
  }
  await LocalNotifications.schedule({
    notifications: [
      {
        id: 999999,
        title: '⏰ Test alarm',
        body: 'Your reminders will sound like this',
        schedule: { at, allowWhileIdle: true },
        channelId: CHANNEL,
      },
    ],
  });
}
