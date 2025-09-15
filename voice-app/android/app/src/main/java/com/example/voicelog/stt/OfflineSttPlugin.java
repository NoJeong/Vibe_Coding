package com.example.voicelog.stt;

import android.Manifest;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONObject;
import org.vosk.Model;
import org.vosk.Recognizer;
import org.vosk.android.RecognitionListener;
import org.vosk.android.SpeechService;
import org.vosk.android.StorageService;

@CapacitorPlugin(
        name = "OfflineStt",
        permissions = {
                @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "microphone")
        }
)
public class OfflineSttPlugin extends Plugin implements RecognitionListener {

    private static final String TAG = "OfflineStt";
    private Model model;
    private SpeechService speechService;
    private Recognizer recognizer;
    private boolean isListening = false;

    @PluginMethod
    public void start(PluginCall call) {
        if (!hasPermission("microphone")) {
            requestPermissionForAlias("microphone", call, "permissionCallback");
            return;
        }

        if (isListening) {
            JSObject ret = new JSObject();
            ret.put("status", "already_started");
            call.resolve(ret);
            return;
        }

        try {
            StorageService.unpack(getContext(), "vosk-model", "model",
                    (unpackedModel) -> {
                        try {
                            model = unpackedModel;
                            recognizer = new Recognizer(model, 16000.0f);
                            speechService = new SpeechService(recognizer, 16000.0f);
                            speechService.startListening(this);
                            isListening = true;

                            JSObject ret = new JSObject();
                            ret.put("status", "started");
                            call.resolve(ret);
                        } catch (Exception e) {
                            call.reject("Failed to init recognizer: " + e.getMessage());
                        }
                    },
                    (exception) -> call.reject("Failed to unpack model. Ensure a Vosk model exists at android/app/src/main/assets/vosk-model: " + exception.getMessage())
            );
        } catch (Exception e) {
            call.reject("Failed to start STT: " + e.getMessage());
        }
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        if (hasPermission("microphone")) {
            start(call);
        } else {
            call.reject("Microphone permission denied");
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            if (speechService != null) {
                speechService.stop();
                speechService.shutdown();
                speechService = null;
            }
            if (recognizer != null) {
                recognizer.close();
                recognizer = null;
            }
            if (model != null) {
                model.close();
                model = null;
            }
        } catch (Exception ignored) { }
        isListening = false;
        JSObject ret = new JSObject();
        ret.put("status", "stopped");
        call.resolve(ret);
    }

    // RecognitionListener callbacks
    @Override
    public void onPartialResult(String hypothesis) {
        try {
            JSONObject obj = new JSONObject(hypothesis);
            String text = obj.optString("partial", "");
            JSObject data = new JSObject();
            data.put("text", text);
            data.put("isFinal", false);
            notifyListeners("sttResult", data);
        } catch (Exception e) {
            Log.w(TAG, "PartialResult parse error: " + e.getMessage());
        }
    }

    @Override
    public void onResult(String hypothesis) {
        try {
            JSONObject obj = new JSONObject(hypothesis);
            String text = obj.optString("text", "");
            JSObject data = new JSObject();
            data.put("text", text);
            data.put("isFinal", true);
            notifyListeners("sttResult", data);
        } catch (Exception e) {
            Log.w(TAG, "Result parse error: " + e.getMessage());
        }
    }

    @Override
    public void onFinalResult(String hypothesis) {
        onResult(hypothesis);
    }

    @Override
    public void onError(Exception e) {
        JSObject data = new JSObject();
        data.put("error", e.getMessage());
        notifyListeners("sttError", data);
        isListening = false;
    }

    @Override
    public void onTimeout() {
        JSObject data = new JSObject();
        data.put("timeout", true);
        notifyListeners("sttError", data);
        isListening = false;
    }
}
