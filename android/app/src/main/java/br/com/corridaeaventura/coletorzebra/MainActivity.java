package br.com.corridaeaventura.coletorzebra;

import android.Manifest;
import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
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
        }, "ZebraNative");
        if (Build.VERSION.SDK_INT >= 31 &&
            (checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED ||
             checkSelfPermission(Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED)) {
            requestPermissions(new String[]{Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_SCAN}, 850);
        }
        // The Vite build must be copied to app/src/main/assets/www/ before assembling.
        web.loadUrl("https://appassets.androidplatform.net/assets/www/index.html");
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
