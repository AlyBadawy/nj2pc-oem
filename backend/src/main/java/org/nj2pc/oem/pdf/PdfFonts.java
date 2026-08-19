package org.nj2pc.oem.pdf;

import org.openpdf.text.Font;
import org.openpdf.text.pdf.BaseFont;

import java.awt.Color;
import java.io.IOException;
import java.io.InputStream;

/**
 * Embeds the same three type families the web credential card uses (frontend/src/index.css's
 * {@code --font-credential-sans/-narrow/-mono}) so the PDF credential card reads as the same
 * typeface, not OpenPDF's base-14 Helvetica/Courier fallback. Each is shipped here as a single
 * variable-font TTF (backend/src/main/resources/fonts/) — legacy TTF parsing only ever sees that
 * file's default (Regular-weight) instance, since OpenPDF has no variable-font axis support, so
 * these render at one weight regardless of the requested style; there's no bold/condensed
 * instance of these files to fall back to for a heavier look.
 */
public final class PdfFonts {

    private PdfFonts() {
    }

    private static final BaseFont ARCHIVO = load("archivo.ttf");
    private static final BaseFont ARCHIVO_NARROW = load("archivo-narrow.ttf");
    private static final BaseFont JETBRAINS_MONO = load("jetbrains-mono.ttf");

    private static BaseFont load(String resourceName) {
        try (InputStream in = PdfFonts.class.getResourceAsStream("/fonts/" + resourceName)) {
            if (in == null) throw new IOException("Font resource not found: " + resourceName);
            byte[] bytes = in.readAllBytes();
            return BaseFont.createFont(resourceName, BaseFont.IDENTITY_H, BaseFont.EMBEDDED,
                    BaseFont.CACHED, bytes, null);
        } catch (Exception e) {
            throw new RuntimeException("Failed to load embedded font: " + resourceName, e);
        }
    }

    public static Font sans(float size, Color color) {
        return new Font(ARCHIVO, size, Font.NORMAL, color);
    }

    public static Font narrow(float size, Color color) {
        return new Font(ARCHIVO_NARROW, size, Font.NORMAL, color);
    }

    public static Font mono(float size, Color color) {
        return new Font(JETBRAINS_MONO, size, Font.NORMAL, color);
    }
}
