package org.nj2pc.oem.pdf;

import org.openpdf.text.Document;
import org.openpdf.text.Font;
import org.openpdf.text.FontFactory;
import org.openpdf.text.Paragraph;
import org.openpdf.text.Phrase;
import org.openpdf.text.pdf.PdfContentByte;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;
import org.openpdf.text.pdf.PdfPageEventHelper;
import org.openpdf.text.pdf.PdfWriter;

import java.awt.Color;

/**
 * Generic page-layout helpers shared by every PDF this app generates — the repeated
 * "org-branded header / labeled cell / striped table" building blocks, independent of any
 * particular document's content. Map/legend-specific helpers live in {@link MeshMapPdfSupport}.
 */
public final class PdfSupport {

    private PdfSupport() {
    }

    public static final float MARGIN_LEFT = 24f;
    public static final float MARGIN_RIGHT = 24f;
    public static final float MARGIN_TOP = 20f;
    public static final float MARGIN_BOTTOM = 20f;

    /** Faint warm paper tint behind every page, matching --credential-paper. */
    public static class PaperBackground extends PdfPageEventHelper {
        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte canvas = writer.getDirectContentUnder();
            canvas.saveState();
            canvas.setColorFill(PdfTheme.PAPER_EDGE);
            canvas.rectangle(0, 0, document.getPageSize().getWidth(), document.getPageSize().getHeight());
            canvas.fill();
            canvas.restoreState();
        }
    }

    public static PdfPCell nestedLabeledCell(String label, String value) {
        PdfPCell cell = new PdfPCell();
        cell.setPadding(4f);
        cell.setBackgroundColor(PdfTheme.PAPER);
        cell.setBorderColor(PdfTheme.AMBER_BORDER);
        Paragraph p = new Paragraph();
        p.add(new Phrase(label.toUpperCase() + "\n", PdfTheme.LABEL_FONT));
        p.add(new Phrase(nullToDash(value), PdfTheme.VALUE_FONT));
        cell.addElement(p);
        return cell;
    }

    public static void addBodyCell(PdfPTable table, String text, Color background, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(background);
        cell.setBorderColor(PdfTheme.AMBER_BORDER);
        cell.setPadding(3f);
        table.addCell(cell);
    }

    public static Paragraph sectionLabel(String text) {
        return new Paragraph(text, PdfTheme.SECTION_FONT);
    }

    public static Paragraph spacer(float sizeInPoints) {
        Paragraph p = new Paragraph(" ", FontFactory.getFont(FontFactory.HELVETICA, sizeInPoints));
        p.setLeading(sizeInPoints);
        return p;
    }

    public static String nullToDash(String value) {
        return value == null || value.isBlank() ? "—" : value;
    }
}
