package com.taskplanner.app;

import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;

import java.io.File;
import java.io.FileOutputStream;

@CapacitorPlugin(name = "AlarmSound")
public class AlarmSoundPlugin extends Plugin {
    private MediaPlayer preview;

    /** Saves a picked audio file into the app's private storage. */
    @PluginMethod
    public void saveSound(PluginCall call) {
        String id = call.getString("id");
        String ext = call.getString("ext", "mp3");
        String data = call.getString("data");
        if (id == null || data == null) {
            call.reject("Missing data");
            return;
        }
        try {
            File dir = new File(getContext().getFilesDir(), "sounds");
            dir.mkdirs();
            File f = new File(dir, id.replaceAll("[^A-Za-z0-9]", "") + "." + ext.replaceAll("[^A-Za-z0-9]", ""));
            byte[] bytes = Base64.decode(data, Base64.DEFAULT);
            FileOutputStream out = new FileOutputStream(f);
            try {
                out.write(bytes);
            } finally {
                out.close();
            }
            JSObject r = new JSObject();
            r.put("path", f.getAbsolutePath());
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Could not save the sound: " + e.getMessage());
        }
    }

    /** Replaces every scheduled custom-sound alarm. alarms: [{id, at, title, body, path}] */
    @PluginMethod
    public void schedule(PluginCall call) {
        JSArray arr = call.getArray("alarms");
        JSONArray list = arr == null ? new JSONArray() : arr;
        AlarmScheduler.replaceAll(getContext(), list);
        call.resolve();
    }

    @PluginMethod
    public void getRinging(PluginCall call) {
        JSObject r = new JSObject();
        r.put("ringing", AlarmService.ringing);
        r.put("title", AlarmService.ringTitle);
        r.put("body", AlarmService.ringBody);
        call.resolve(r);
    }

    @PluginMethod
    public void stopAlarm(PluginCall call) {
        Context c = getContext();
        if (AlarmService.ringing) {
            Intent i = new Intent(c, AlarmService.class);
            i.setAction(AlarmService.ACTION_STOP);
            c.startService(i);
        }
        call.resolve();
    }

    /** Rings immediately, as a real alarm would (used by "Test alarm"). */
    @PluginMethod
    public void ringNow(PluginCall call) {
        Context c = getContext();
        Intent i = new Intent(c, AlarmService.class);
        i.putExtra("title", call.getString("title", "Test alarm"));
        i.putExtra("body", call.getString("body", ""));
        i.putExtra("path", call.getString("path", ""));
        androidx.core.content.ContextCompat.startForegroundService(c, i);
        call.resolve();
    }

    @PluginMethod
    public void playPreview(PluginCall call) {
        stopPreviewInternal();
        String path = call.getString("path", "");
        try {
            MediaPlayer mp = new MediaPlayer();
            mp.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build());
            if (path.isEmpty() || !new File(path).exists()) {
                mp.setDataSource(getContext(), android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_ALARM));
            } else {
                mp.setDataSource(path);
            }
            mp.setOnCompletionListener(new MediaPlayer.OnCompletionListener() {
                @Override
                public void onCompletion(MediaPlayer m) {
                    stopPreviewInternal();
                }
            });
            mp.prepare();
            mp.start();
            preview = mp;
            call.resolve();
        } catch (Exception e) {
            call.reject("Cannot play this file: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopPreview(PluginCall call) {
        stopPreviewInternal();
        call.resolve();
    }

    private void stopPreviewInternal() {
        if (preview != null) {
            try {
                preview.stop();
            } catch (Exception ignored) {
            }
            preview.release();
            preview = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        stopPreviewInternal();
    }
}
