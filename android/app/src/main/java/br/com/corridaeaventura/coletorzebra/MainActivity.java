package br.com.corridaeaventura.coletorzebra;

import android.Manifest;
import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.os.Vibrator;
import android.os.VibrationEffect;
import android.content.Context;
import android.content.Intent;
import android.media.ToneGenerator;
import android.media.AudioManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import androidx.webkit.WebViewAssetLoader;
import android.webkit.WebSettings;
import android.content.pm.PackageManager;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private WebView web;
    private ZebraReaderController reader;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        setContentView(web);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }
        });
        reader = new ZebraReaderController(this, this::sendStatus, this::sendTag);
        web.addJavascriptInterface(new Object() {
            @JavascriptInterface public void connect() { runOnUiThread(() -> reader.connect()); }
            @JavascriptInterface public void disconnect() { runOnUiThread(() -> reader.disconnect()); }
            @JavascriptInterface public void start() { runOnUiThread(() -> reader.start()); }
            @JavascriptInterface public void stop() { runOnUiThread(() -> reader.stop()); }
            @JavascriptInterface public void feedback() { runOnUiThread(() -> playFeedback()); }
            @JavascriptInterface public void share(String data) { runOnUiThread(() -> shareText(data)); }
        }, "ZebraNative");
        if (Build.VERSION.SDK_INT >= 31 &&
            (checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED ||
             checkSelfPermission(Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED)) {
            requestPermissions(new String[]{Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_SCAN}, 850);
        }
        // The Vite build must be copied to app/src/main/assets/www/ before assembling.
        web.loadUrl("https://appassets.androidplatform.net/assets/www/index.html");
    }

    private void shareText(String data) {
        try {
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            send.putExtra(Intent.EXTRA_TEXT, data);
            startActivity(Intent.createChooser(send, "Compartilhar leituras"));
        } catch (Exception ignored) {}
    }

    private void playFeedback() {
        try {
            ToneGenerator tone = new ToneGenerator(AudioManager.STREAM_NOTIFICATION, 75);
            tone.startTone(ToneGenerator.TONE_PROP_BEEP, 90);
            web.postDelayed(tone::release, 160);
        } catch (Exception ignored) {}
        try {
            Vibrator vibration = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibration != null && vibration.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= 26) vibration.vibrate(VibrationEffect.createOneShot(80, VibrationEffect.DEFAULT_AMPLITUDE));
                else vibration.vibrate(80);
            }
        } catch (Exception ignored) {}
    }

    private void emit(String event, String key, String value) {
        try {
            JSONObject data = new JSONObject().put(key, value);
            String js = "window.dispatchEvent(new CustomEvent(" + JSONObject.quote(event) +
                ",{detail:" + data.toString() + "}))";
            runOnUiThread(() -> web.evaluateJavascript(js, null));
        } catch (Exception ignored) {}
    }

    private void sendStatus(String status) { emit("zebra-rfid-status", "status", status); }
    private void sendTag(String chip) { emit("zebra-rfid-tag", "chip", chip); }
    @Override protected void onDestroy() { reader.dispose(); web.destroy(); super.onDestroy(); }
}
