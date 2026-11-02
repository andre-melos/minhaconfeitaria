package com.minhaconfeitaria.app;

import android.os.Build;
import android.os.Bundle;
import android.view.ViewGroup.MarginLayoutParams;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Android 15+ desenha o app por baixo das barras do sistema (edge-to-edge).
        // Afasta o conteúdo da barra de status, da barra de navegação e do teclado,
        // para que nada fique escondido (cabeçalho, botões de salvar, campos).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            WebView webView = getBridge().getWebView();
            ViewCompat.setOnApplyWindowInsetsListener(webView, (view, windowInsets) -> {
                Insets barras = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
                Insets teclado = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
                MarginLayoutParams margens = (MarginLayoutParams) view.getLayoutParams();
                margens.leftMargin = barras.left;
                margens.rightMargin = barras.right;
                margens.topMargin = barras.top;
                margens.bottomMargin = Math.max(barras.bottom, teclado.bottom);
                view.setLayoutParams(margens);
                return WindowInsetsCompat.CONSUMED;
            });
        }
    }
}
