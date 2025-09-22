package com.haesseum.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.haesseum.app.stt.OfflineSttPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(OfflineSttPlugin.class);
    }
}
