import { Sheet } from './ui';
import SoundPicker from './SoundPicker';
import { useStore, saveSettings } from '../store';
import { isNative, scheduleTest } from '../notify';
import { startAlarm } from '../alarm';
import { AlarmSound } from '../sounds';

export default function Settings({ onClose }) {
  const state = useStore();
  const uni = state.settings?.universal || { name: '', path: '' };

  async function test() {
    if (isNative) {
      try {
        await scheduleTest(state);
        alert('Test alarm in 10 seconds. Leave the app or lock the phone to hear it as a real alarm.');
      } catch (e) {
        alert('Could not schedule: ' + e);
      }
    } else {
      alert('Alarm will ring in 5 seconds');
      setTimeout(() => startAlarm(uni.path), 5000);
    }
  }

  async function ringNow() {
    if (AlarmSound) {
      try {
        await AlarmSound.ringNow({ title: 'Test alarm', body: 'Tap Stop to silence', path: uni.path || '' });
      } catch (e) {
        alert('Could not ring: ' + e);
      }
    } else startAlarm(uni.path);
  }

  return (
    <Sheet title="Settings" onClose={onClose}>
      <section className="sec">
        <h3><span className="sicon">🔔</span>Default alarm sound</h3>
        <p className="muted sm">Used by every task that does not have its own custom sound. Leave empty to use the phone's normal notification sound.</p>
        <SoundPicker
          value={uni}
          emptyLabel="Phone's default sound"
          onChange={(v) => saveSettings({ universal: v.path ? v : null })}
        />
      </section>
      <section className="sec">
        <h3><span className="sicon">🧪</span>Try it</h3>
        <div className="row">
          <button className="btn" onClick={test}>Test in 10 s</button>
          <button className="btn ghost-b" onClick={ringNow}>Ring now</button>
        </div>
        <p className="muted sm">
          Custom sounds loop until you tap Stop (also on the lock screen notification). Sounds without a custom file use the standard system notification sound.
        </p>
      </section>
      <section className="sec">
        <h3><span className="sicon">ℹ️</span>Good to know</h3>
        <p className="muted sm">
          If alarms are late or missing, set this app's battery usage to “No restrictions” in your phone settings, and allow “Alarms &amp; reminders”.
        </p>
      </section>
    </Sheet>
  );
}
