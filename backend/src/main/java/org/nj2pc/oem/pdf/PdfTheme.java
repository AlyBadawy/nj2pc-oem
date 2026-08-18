package org.nj2pc.oem.pdf;

import org.openpdf.text.Font;
import org.openpdf.text.FontFactory;

import java.awt.Color;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/**
 * Color/font palette shared by every PDF this app generates, mirroring the app's
 * --credential-* design tokens (frontend/src/index.css) so every generated document reads as
 * the same "physical credential" family. Document-specific colors/fonts (e.g. ICS-205's channel
 * mode badges) stay local to their own service rather than living here.
 */
public final class PdfTheme {

    private PdfTheme() {
    }

    public static final Color INK = new Color(0x14, 0x18, 0x1D);
    public static final Color PAPER = new Color(0xF7, 0xF5, 0xF0);
    public static final Color PAPER_EDGE = new Color(0xF1, 0xEF, 0xEA);
    public static final Color BLUE_DEEP = new Color(0x1F, 0x4E, 0x79);
    public static final Color AMBER_TEXT = new Color(0x9C, 0x6B, 0x12);
    public static final Color AMBER_BORDER = new Color(0xE7, 0xD3, 0xA1);
    public static final Color NEUTRAL_BAND = new Color(0xF4, 0xF2, 0xEC);
    public static final Color RED = new Color(0xC4, 0x43, 0x2D);
    public static final Color GREEN = new Color(0x1D, 0x7E, 0x5C);
    public static final Color WHITE = Color.WHITE;

    public static final DateTimeFormatter DATE_TIME_FMT =
            DateTimeFormatter.ofPattern("MM/dd/yyyy HH:mm").withZone(ZoneId.systemDefault());
    public static final DateTimeFormatter DATE_TIME_FMT_ET =
            DateTimeFormatter.ofPattern("MM/dd/yyyy HH:mm z").withZone(ZoneId.of("America/New_York"));

    public static final Font ORG_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, WHITE);
    public static final Font ORG_TAGLINE_FONT = FontFactory.getFont(FontFactory.HELVETICA, 7, new Color(0xC7, 0xD6, 0xE4));
    public static final Font TITLE_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, INK);
    public static final Font SECTION_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, GREEN);
    public static final Font LABEL_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7, RED);
    public static final Font VALUE_FONT = FontFactory.getFont(FontFactory.HELVETICA, 9, INK);
    public static final Font TABLE_HEADER_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7, WHITE);
    public static final Font TABLE_CELL_FONT = FontFactory.getFont(FontFactory.HELVETICA, 7, INK);
    public static final Font TABLE_CELL_MUTED_FONT = FontFactory.getFont(FontFactory.HELVETICA, 7, new Color(0x5A, 0x5A, 0x5A));
    public static final Font SMALL_ITALIC_FONT = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 7, new Color(0x5A, 0x5A, 0x5A));
}
