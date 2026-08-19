package org.nj2pc.oem.pdf;

import org.nj2pc.oem.checkin.OperatorCheckInResponse;
import org.openpdf.text.Element;
import org.openpdf.text.Phrase;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;

import java.awt.Color;
import java.util.Comparator;
import java.util.List;

/**
 * Shared "operator time-sheet table" builder — the dedicated Team/Timesheet PDF and the
 * incident-summary PDF's timesheet page both call this so the two documents render identically
 * rather than drifting. The team-roster credential-card grid used to be built here too, but is
 * now a client-side capture of the actual web page (see
 * frontend/src/components/identity/TeamCardsCapture.tsx and {@link CapturedImagePdfSupport}) so
 * the PDF matches the web Team page exactly instead of a hand-rebuilt Java approximation.
 */
public final class OperatorCredentialPdfSupport {

    private OperatorCredentialPdfSupport() {
    }

    /** Same operator time-sheet table used by both the dedicated timesheet PDF and the
     * incident-summary PDF's team/timesheet page. */
    public static PdfPTable buildTimeSheetTable(List<OperatorCheckInResponse> checkIns) {
        String[] headers = {"Operator", "Role", "Post", "Checked In", "Checked Out", "Notes"};
        float[] widths = {1f, 1f, 1f, 1.1f, 1.1f, 1.6f};

        PdfPTable table = new PdfPTable(headers.length);
        table.setWidthPercentage(100);
        try {
            table.setWidths(widths);
        } catch (Exception ignored) {
            // widths array size always matches column count here
        }
        table.setHeaderRows(1);

        for (String header : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(header, PdfTheme.TABLE_HEADER_FONT));
            cell.setBackgroundColor(PdfTheme.INK);
            cell.setBorderColor(PdfTheme.INK);
            cell.setPadding(4f);
            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            table.addCell(cell);
        }

        if (checkIns.isEmpty()) {
            PdfPCell empty = new PdfPCell(new Phrase("No operator check-ins recorded", PdfTheme.TABLE_CELL_FONT));
            empty.setColspan(headers.length);
            empty.setPadding(6f);
            empty.setBorderColor(PdfTheme.AMBER_BORDER);
            table.addCell(empty);
            return table;
        }

        List<OperatorCheckInResponse> sorted = checkIns.stream()
                .sorted(Comparator.comparing(OperatorCheckInResponse::checkedInAt))
                .toList();

        boolean stripe = false;
        for (OperatorCheckInResponse c : sorted) {
            Color rowColor = stripe ? PdfTheme.NEUTRAL_BAND : PdfTheme.WHITE;
            PdfSupport.addBodyCell(table, PdfSupport.nullToDash(c.operatorCallsign()), rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, PdfSupport.nullToDash(c.roleName()), rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, PdfSupport.nullToDash(c.post()), rowColor, PdfTheme.TABLE_CELL_MUTED_FONT);
            PdfSupport.addBodyCell(table, PdfTheme.DATE_TIME_FMT.format(c.checkedInAt()), rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, c.checkedOutAt() != null ? PdfTheme.DATE_TIME_FMT.format(c.checkedOutAt()) : "Still checked in",
                    rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, PdfSupport.nullToDash(c.notes()), rowColor, PdfTheme.TABLE_CELL_MUTED_FONT);
            stripe = !stripe;
        }
        return table;
    }
}
