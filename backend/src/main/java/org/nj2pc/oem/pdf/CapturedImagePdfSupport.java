package org.nj2pc.oem.pdf;

import org.openpdf.text.Element;
import org.openpdf.text.Image;

import java.util.Base64;

/**
 * Decodes a client-captured (base64, optionally data-URL-prefixed) PNG/JPEG into a PDF
 * {@link Image} scaled to fit an available content box — the same pattern
 * {@link MeshMapPdfSupport} uses for the mesh-map snapshot, reused here for the team-roster
 * page's client-captured credential-card grid (frontend/src/components/identity/TeamCardsCapture.tsx).
 */
public final class CapturedImagePdfSupport {

    private CapturedImagePdfSupport() {
    }

    public static Image decode(String base64) {
        byte[] imageBytes;
        try {
            String raw = base64.contains(",") ? base64.substring(base64.indexOf(',') + 1) : base64;
            imageBytes = Base64.getDecoder().decode(raw);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid captured image data", e);
        }
        try {
            return Image.getInstance(imageBytes);
        } catch (Exception e) {
            throw new RuntimeException("Failed to read captured image", e);
        }
    }

    public static Image decodeFitted(String base64, float availableWidth, float availableHeight) {
        Image image = decode(base64);
        image.scaleToFit(availableWidth, availableHeight);
        image.setAlignment(Element.ALIGN_CENTER);
        return image;
    }
}
