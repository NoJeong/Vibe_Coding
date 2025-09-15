package com.example.voicelog;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.example.voicelog.stt.OfflineSttPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(OfflineSttPlugin.class);
    }
}
