package com.taskplanner.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.core.content.ContextCompat;

public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        AlarmScheduler.forget(context, intent.getIntExtra("id", 0));
        Intent svc = new Intent(context, AlarmService.class);
        svc.putExtra("title", intent.getStringExtra("title"));
        svc.putExtra("body", intent.getStringExtra("body"));
        svc.putExtra("path", intent.getStringExtra("path"));
        ContextCompat.startForegroundService(context, svc);
    }
}
