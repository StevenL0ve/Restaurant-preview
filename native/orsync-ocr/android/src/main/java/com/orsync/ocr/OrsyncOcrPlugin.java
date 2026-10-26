package com.orsync.ocr;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Rect;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

/**
 * Card scanning on Android: Google ML Kit text recognition (on-device, bundled
 * Latin model) on the full-resolution image the app sends (already upright).
 * Each recognized line comes back with a normalized box (top-left origin).
 */
@CapacitorPlugin(name = "OrsyncOcr")
public class OrsyncOcrPlugin extends Plugin {

    @PluginMethod
    public void recognize(PluginCall call) {
        String b64 = call.getString("image");
        if (b64 == null) {
            call.reject("No image.");
            return;
        }
        int comma = b64.indexOf(',');
        if (b64.startsWith("data:") && comma > 0) b64 = b64.substring(comma + 1);
        Bitmap bitmap;
        try {
            byte[] bytes = Base64.decode(b64, Base64.DEFAULT);
            bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        } catch (IllegalArgumentException e) {
            bitmap = null;
        }
        if (bitmap == null) {
            call.reject("Couldn't read that image.");
            return;
        }
        final double w = bitmap.getWidth();
        final double h = bitmap.getHeight();
        final TextRecognizer recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
        recognizer.process(InputImage.fromBitmap(bitmap, 0))
            .addOnSuccessListener(result -> {
                JSArray lines = new JSArray();
                for (Text.TextBlock block : result.getTextBlocks()) {
                    for (Text.Line line : block.getLines()) {
                        Rect r = line.getBoundingBox();
                        if (r == null) continue;
                        JSObject o = new JSObject();
                        o.put("text", line.getText());
                        o.put("x", r.left / w);
                        o.put("y", r.top / h);
                        o.put("w", r.width() / w);
                        o.put("h", r.height() / h);
                        lines.put(o);
                    }
                }
                JSObject ret = new JSObject();
                ret.put("lines", lines);
                call.resolve(ret);
                recognizer.close();
            })
            .addOnFailureListener(e -> {
                call.reject("Text recognition failed: " + e.getMessage());
                recognizer.close();
            });
    }

    @PluginMethod
    public void isDocumentScannerAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", false);
        call.resolve(ret);
    }
}
