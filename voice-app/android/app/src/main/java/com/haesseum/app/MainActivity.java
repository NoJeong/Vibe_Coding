package com.haesseum.app;

import android.os.Bundle;
import android.widget.Toast;
import android.view.View;
import android.view.ViewGroup;

import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.graphics.Insets;

import com.getcapacitor.BridgeActivity;
import com.haesseum.app.stt.OfflineSttPlugin;

public class MainActivity extends BridgeActivity {
    private long lastBackPressed = 0L;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Ensure web content does not draw under system bars (navigation/footer)
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        // Also apply bottom inset as padding to the WebView container to avoid overlap with system navigation bar
        final View content = findViewById(android.R.id.content);
        View target = content;
        if (content instanceof ViewGroup) {
            ViewGroup vg = (ViewGroup) content;
            if (vg.getChildCount() > 0) target = vg.getChildAt(0);
        }
        final View finalTarget = target;
        ViewCompat.setOnApplyWindowInsetsListener(finalTarget, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(v.getPaddingLeft(), v.getPaddingTop(), v.getPaddingRight(), bars.bottom);
            return insets;
        });

        // Register plugins
        registerPlugin(OfflineSttPlugin.class);

        // Handle hardware back: navigate WebView history, or double-press to exit at root
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() != null && getBridge().getWebView().canGoBack()) {
                    getBridge().getWebView().goBack();
                    return;
                }
                long now = System.currentTimeMillis();
                if (now - lastBackPressed < 2000) {
                    finish();
                } else {
                    lastBackPressed = now;
                    Toast.makeText(MainActivity.this, "한 번 더 누르면 종료됩니다", Toast.LENGTH_SHORT).show();
                }
            }
        });
    }
}
