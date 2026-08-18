package org.nj2pc.oem.pdf;

import org.openpdf.text.Image;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.util.ArrayList;
import java.util.List;

/**
 * Server-side Code128-B barcode rendering, ported line-for-line from the same public Code128
 * specification data as frontend/src/components/identity/Barcode.tsx — a barcode encoded here
 * for a given callsign/id must produce the exact same bar pattern as the one shown on screen.
 */
public final class Code128Support {

    private Code128Support() {
    }

    // Standard Code128 module-width table: each entry is the bar/space widths (bar,space,bar,
    // space,bar,space) for symbol values 0-105, plus the 7-width STOP pattern (value 106).
    private static final String[] WIDTHS = {
            "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
            "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
            "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
            "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
            "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
            "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
            "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
            "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
            "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
            "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
            "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
    };

    private static final int START_B = 104;
    private static final int STOP = 106;

    private static String widthsToBits(String widths) {
        StringBuilder bits = new StringBuilder();
        for (int i = 0; i < widths.length(); i++) {
            char bit = (i % 2 == 0) ? '1' : '0';
            int n = widths.charAt(i) - '0';
            for (int j = 0; j < n; j++) {
                bits.append(bit);
            }
        }
        return bits.toString();
    }

    private static final String[] PATTERNS;

    static {
        PATTERNS = new String[WIDTHS.length];
        for (int i = 0; i < WIDTHS.length; i++) {
            PATTERNS[i] = widthsToBits(WIDTHS[i]);
        }
    }

    private static String encode(String text) {
        List<Integer> values = new ArrayList<>();
        for (int i = 0; i < text.length(); i++) {
            int code = text.charAt(i);
            if (code < 32 || code > 126) continue;
            values.add(code - 32);
        }

        int checksum = START_B;
        for (int i = 0; i < values.size(); i++) {
            checksum += values.get(i) * (i + 1);
        }
        checksum %= 103;

        StringBuilder bits = new StringBuilder();
        bits.append(PATTERNS[START_B]);
        for (int value : values) {
            bits.append(PATTERNS[value]);
        }
        bits.append(PATTERNS[checksum]);
        bits.append(PATTERNS[STOP]);
        return bits.toString();
    }

    /** Renders `{callsign} - {id padded to 6 digits}` as a Code128-B barcode raster, matching
     * the on-screen Barcode component's encoded text exactly. */
    public static Image barcodeImage(String callsign, Long id, int pixelWidth, int pixelHeight) {
        String text = callsign + " - " + String.format("%06d", id);
        String bits = encode(text);
        int totalModules = bits.length();

        BufferedImage img = new BufferedImage(pixelWidth, pixelHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, pixelWidth, pixelHeight);
        g.setColor(Color.BLACK);
        double moduleWidthPx = (double) pixelWidth / totalModules;
        int i = 0;
        while (i < totalModules) {
            if (bits.charAt(i) == '1') {
                int j = i;
                while (j < totalModules && bits.charAt(j) == '1') j++;
                int xStart = (int) Math.round(i * moduleWidthPx);
                int xEnd = (int) Math.round(j * moduleWidthPx);
                g.fillRect(xStart, 0, Math.max(1, xEnd - xStart), pixelHeight);
                i = j;
            } else {
                i++;
            }
        }
        g.dispose();

        try {
            return Image.getInstance(img, null);
        } catch (Exception e) {
            throw new RuntimeException("Failed to render barcode", e);
        }
    }
}
