package org.nj2pc.oem.pdf;

import org.nj2pc.oem.checkin.OperatorCheckInResponse;
import org.openpdf.text.Element;
import org.openpdf.text.Image;
import org.openpdf.text.Paragraph;
import org.openpdf.text.Phrase;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Shared "team credential card grid + timesheet table" building blocks for any PDF that needs
 * them — the dedicated operator-timesheet PDF and the incident-summary PDF's team/timesheet page
 * both call these so the two documents render identically rather than drifting.
 */
public final class OperatorCredentialPdfSupport {

    private OperatorCredentialPdfSupport() {
    }

    private static final Color OFFLINE = new Color(0x6B, 0x6E, 0x73);
    private static final Color PLACEHOLDER_BG = new Color(0xDF, 0xDC, 0xD3);
    private static final Color PLACEHOLDER_STRIPE = new Color(0xEA, 0xE7, 0xDF);
    // Approximates the web card's border-black/[.12] (12% black over the paper background).
    private static final Color CARD_BORDER = new Color(0xD9, 0xD6, 0xCE);
    // Matches the web `credential-micro` utility's rgba(0,0,0,.42) label color on the paper bg.
    private static final Color MICRO_LABEL_COLOR = new Color(0x94, 0x94, 0x94);
    // Matches frontend/src/index.css's `.text-credential-ink` override — the color used for a
    // revealed/masked contact value.
    private static final Color CREDENTIAL_VALUE_COLOR = new Color(20, 50, 35);
    // "— restricted —" / not-on-file text color, matching the web's text-black/35.
    private static final Color MUTED_VALUE_COLOR = new Color(0xA6, 0xA6, 0xA6);

    // --- masking, mirroring frontend/src/lib/identity.ts's maskPhone/maskEmail/maskPlate ---

    private static String maskPhone(String raw) {
        String digits = raw.replaceAll("\\D", "");
        String national = digits;
        if (digits.length() == 11 && digits.startsWith("1")) {
            national = digits.substring(1);
        }
        if (national.length() != 10) {
            return raw.length() > 2
                    ? "•".repeat(Math.max(raw.length() - 2, 3)) + raw.substring(raw.length() - 2)
                    : raw;
        }
        String area = national.substring(0, 3);
        String last2 = national.substring(8);
        return "+1 " + area + " ••• ••" + last2;
    }

    private static String maskEmail(String raw) {
        int at = raw.indexOf('@');
        if (at < 1) return raw;
        String local = raw.substring(0, at);
        String domain = raw.substring(at + 1);
        String first = local.substring(0, 1);
        return first + "•".repeat(Math.max(local.length() - 1, 4)) + "@" + domain;
    }

    private static String maskPlate(String raw) {
        Pattern p = Pattern.compile("[^(),\\s]+(?=\\()");
        Matcher m = p.matcher(raw);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            m.appendReplacement(sb, "•".repeat(Math.max(m.group().length(), 4)));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    // --- one card ---

    /** A diagonally-hatched placeholder with an "OPERATOR PHOTO" caption, same aspect ratio as
     * the real photo box, for a team member with no photo on file — mirrors the web card's
     * `PhotoPlaceholder` (repeating-linear-gradient hatch + caption). An actual Image so it
     * occupies exactly the same layout space as a real photo would, instead of a cell-background
     * hint that only holds up when every sibling card in the same grid row happens to be the same
     * height. */
    private static Image placeholderPhotoImage() {
        int w = 100;
        int h = 124;
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        java.awt.Graphics2D g = img.createGraphics();
        g.setRenderingHint(java.awt.RenderingHints.KEY_ANTIALIASING, java.awt.RenderingHints.VALUE_ANTIALIAS_ON);
        g.setColor(PLACEHOLDER_BG);
        g.fillRect(0, 0, w, h);
        g.setColor(PLACEHOLDER_STRIPE);
        g.setStroke(new java.awt.BasicStroke(6f));
        for (int x = -h; x < w; x += 12) {
            g.drawLine(x, 0, x + h, h);
        }
        g.setColor(new Color(0, 0, 0, 97));
        g.setFont(new java.awt.Font("SansSerif", java.awt.Font.PLAIN, 11));
        java.awt.FontMetrics fm = g.getFontMetrics();
        String line1 = "OPERATOR";
        String line2 = "PHOTO";
        g.drawString(line1, (w - fm.stringWidth(line1)) / 2f, h - 18);
        g.drawString(line2, (w - fm.stringWidth(line2)) / 2f, h - 6);
        g.dispose();
        try {
            return Image.getInstance(img, null);
        } catch (Exception e) {
            throw new RuntimeException("Failed to render photo placeholder", e);
        }
    }

    /** Label above value, mirroring the web `ContactLine`/`MaskedValue`: masked (never the raw
     * value — a static PDF has no hover-to-reveal) and colored `.text-credential-ink` when the
     * viewer can see contact info and a value is on file; "— restricted —" when they can't;
     * a plain dash/emptyText when the field is simply blank. */
    private static PdfPCell contactLine(String label, String raw, boolean canView,
                                         java.util.function.Function<String, String> mask, String emptyText) {
        PdfPCell cell = new PdfPCell();
        cell.setColspan(2);
        cell.setBorder(0);
        cell.setPadding(2f);
        Paragraph labelP = new Paragraph(label.toUpperCase(), PdfFonts.mono(6, MICRO_LABEL_COLOR));
        labelP.setSpacingAfter(1f);
        cell.addElement(labelP);

        String display;
        Color color;
        if (!canView) {
            display = "— restricted —";
            color = MUTED_VALUE_COLOR;
        } else if (raw == null || raw.isBlank()) {
            display = emptyText;
            color = MUTED_VALUE_COLOR;
        } else {
            display = mask.apply(raw);
            color = CREDENTIAL_VALUE_COLOR;
        }
        cell.addElement(new Paragraph(display, PdfFonts.mono(8, color)));
        return cell;
    }

    /** "HH:mm on duty" since checkedInAt, mirroring the web card's formatElapsed
     * (frontend/src/lib/identity.ts). */
    private static String formatElapsed(java.time.Instant since) {
        long minutes = Math.max(0, java.time.Duration.between(since, java.time.Instant.now()).toMinutes());
        return String.format("%02d:%02d", minutes / 60, minutes % 60);
    }

    /** Mirrors `CredentialCardCompact` (frontend/src/components/identity/OperatorIdentity.tsx):
     * blue accent bar → org header w/ credential no. → fixed-size photo+barcode beside
     * callsign/name → license class + role chip → contact lines → status footer. */
    private static PdfPTable buildCard(OperatorCredentialCardData d, String orgName) {
        PdfPTable card = new PdfPTable(2);
        card.setWidthPercentage(100);
        try {
            card.setWidths(new float[]{1f, 2.1f});
        } catch (Exception ignored) {
            // widths array size always matches column count here
        }

        // Top accent bar.
        PdfPCell bar = new PdfPCell();
        bar.setColspan(2);
        bar.setBackgroundColor(PdfTheme.BLUE_DEEP);
        bar.setBorder(0);
        bar.setFixedHeight(4f);
        card.addCell(bar);

        // Header: org name + credential number, hairline bottom border.
        PdfPTable header = new PdfPTable(2);
        header.setWidthPercentage(100);
        PdfPCell orgCell = new PdfPCell(new Phrase(orgName, PdfFonts.narrow(7, PdfTheme.BLUE_DEEP)));
        orgCell.setBorder(0);
        orgCell.setPadding(0f);
        header.addCell(orgCell);
        PdfPCell credCell = new PdfPCell(new Phrase("NO. " + String.format("%06d", d.id()),
                PdfFonts.mono(5, new Color(0x8A, 0x8A, 0x8A))));
        credCell.setBorder(0);
        credCell.setPadding(0f);
        credCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        header.addCell(credCell);
        PdfPCell headerCell = new PdfPCell(header);
        headerCell.setColspan(2);
        headerCell.setBorder(0);
        headerCell.setBorderWidthBottom(0.5f);
        headerCell.setBorderColor(PdfTheme.AMBER_BORDER);
        headerCell.setPadding(5f);
        card.addCell(headerCell);

        // Photo + barcode, a fixed-size box (mirrors the web card's 56x70 photo / 56-wide
        // barcode column) beside the callsign/name. The no-photo case adds a same-sized
        // placeholder *image* rather than relying on cell-level min-height, so both branches
        // occupy identical, fixed vertical space regardless of what else is in this grid row —
        // a cell-height hint alone left this column's real height at the mercy of row-height
        // equalization against taller sibling cards, ballooning into a large blank block for
        // any card without a photo on file.
        PdfPCell photoCell = new PdfPCell();
        photoCell.setBorder(0);
        photoCell.setPadding(5f);
        Image photo = null;
        if (d.photoBytes() != null) {
            try {
                photo = Image.getInstance(d.photoBytes());
            } catch (Exception ignored) {
                photo = null;
            }
        }
        if (photo == null) {
            photo = placeholderPhotoImage();
        }
        photo.scaleToFit(52f, 65f);
        photoCell.addElement(photo);
        Image barcode = Code128Support.barcodeImage(d.callsign(), d.id(), 200, 30);
        barcode.scaleToFit(52f, 13f);
        Paragraph barcodeP = new Paragraph();
        barcodeP.setSpacingBefore(2f);
        barcodeP.add(new org.openpdf.text.Chunk(barcode, 0, 0));
        photoCell.addElement(barcodeP);
        card.addCell(photoCell);

        PdfPCell nameCell = new PdfPCell();
        nameCell.setBorder(0);
        nameCell.setPadding(5f);
        nameCell.setVerticalAlignment(Element.ALIGN_TOP);
        Paragraph callsignLabel = new Paragraph("CALLSIGN", PdfFonts.mono(6, MICRO_LABEL_COLOR));
        callsignLabel.setSpacingAfter(1f);
        nameCell.addElement(callsignLabel);
        Paragraph namePara = new Paragraph();
        namePara.add(new Phrase(d.callsign() + "\n", PdfFonts.mono(20, PdfTheme.INK)));
        namePara.add(new Phrase(d.name(), PdfFonts.sans(10, PdfTheme.INK)));
        nameCell.addElement(namePara);
        card.addCell(nameCell);

        // License + role chip, hairline top border.
        PdfPTable licenseRole = new PdfPTable(2);
        licenseRole.setWidthPercentage(100);
        PdfPCell licenseCell = new PdfPCell();
        licenseCell.setBorder(0);
        licenseCell.setPadding(0f);
        Paragraph licenseLabel = new Paragraph("LICENSE", PdfFonts.mono(6, MICRO_LABEL_COLOR));
        licenseLabel.setSpacingAfter(1f);
        licenseCell.addElement(licenseLabel);
        licenseCell.addElement(new Paragraph(PdfSupport.nullToDash(d.licenseClass()), PdfFonts.sans(8, PdfTheme.INK)));
        licenseRole.addCell(licenseCell);
        String roleText = d.roleName() != null ? d.roleName().toUpperCase() + " · " + PdfSupport.nullToDash(d.roleAccessLevel()) : "UNASSIGNED";
        Color roleColor = d.roleName() != null && d.roleColor() != null ? parseHexColor(d.roleColor()) : new Color(0xF4, 0xF2, 0xEC);
        PdfPCell roleCell = new PdfPCell(new Phrase(roleText, PdfFonts.mono(6, PdfTheme.INK)));
        roleCell.setBackgroundColor(roleColor);
        roleCell.setBorder(0);
        roleCell.setPadding(3f);
        roleCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        roleCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        licenseRole.addCell(roleCell);
        PdfPCell licenseRoleCell = new PdfPCell(licenseRole);
        licenseRoleCell.setColspan(2);
        licenseRoleCell.setBorder(0);
        licenseRoleCell.setBorderWidthTop(0.5f);
        licenseRoleCell.setBorderColor(PdfTheme.AMBER_BORDER);
        licenseRoleCell.setPadding(5f);
        card.addCell(licenseRoleCell);

        // Contact lines.
        card.addCell(contactLine("Phone", d.phone(), d.canViewContact(), OperatorCredentialPdfSupport::maskPhone, "—"));
        card.addCell(contactLine("Email", d.email(), d.canViewContact(), OperatorCredentialPdfSupport::maskEmail, "—"));
        card.addCell(contactLine("License Plate", d.licensePlate(), d.canViewContact(), OperatorCredentialPdfSupport::maskPlate, "NONE"));

        // Status footer — incident name + elapsed time on duty when checked in, matching the
        // web card's footer bar exactly (not a raw "Checked in {datetime}" line).
        PdfPCell footer = new PdfPCell();
        footer.setColspan(2);
        footer.setBackgroundColor(d.checkedIn() ? PdfTheme.INK : OFFLINE);
        footer.setBorder(0);
        footer.setPadding(5f);
        PdfPTable footerRow = new PdfPTable(2);
        footerRow.setWidthPercentage(100);
        PdfPCell footerLeft = new PdfPCell(new Phrase(
                d.checkedIn() && d.incidentName() != null ? d.incidentName() : "Not checked in",
                PdfFonts.sans(7, PdfTheme.WHITE)));
        footerLeft.setBorder(0);
        footerLeft.setPadding(0f);
        footerLeft.setVerticalAlignment(Element.ALIGN_MIDDLE);
        footerRow.addCell(footerLeft);
        PdfPCell footerRight = new PdfPCell(new Phrase(
                d.checkedIn() && d.checkedInAt() != null ? formatElapsed(d.checkedInAt()) : "",
                PdfFonts.mono(6, new Color(0xE0, 0xE0, 0xE0))));
        footerRight.setBorder(0);
        footerRight.setPadding(0f);
        footerRight.setHorizontalAlignment(Element.ALIGN_RIGHT);
        footerRight.setVerticalAlignment(Element.ALIGN_MIDDLE);
        footerRow.addCell(footerRight);
        footer.addElement(footerRow);
        card.addCell(footer);

        return card;
    }

    private static Color parseHexColor(String hex) {
        try {
            return Color.decode(hex);
        } catch (NumberFormatException e) {
            return new Color(0xF4, 0xF2, 0xEC);
        }
    }

    private static final int GRID_COLUMNS = 4;
    private static final int GRID_ROWS_PER_PAGE = 2;
    private static final int CARDS_PER_PAGE = GRID_COLUMNS * GRID_ROWS_PER_PAGE;

    /** One page's worth of cards (up to 4 per row, 2 rows — 8 cards), explicitly chunked rather
     * than left to auto-flow, so a page never ends with a half-empty row spilling one card onto
     * the next page. Any leftover slots in the final chunk are filled with empty bordered cells
     * so every page keeps the same fixed 4x2 grid shape. */
    private static PdfPTable buildCredentialGridPage(List<OperatorCredentialCardData> pageTeam, String orgName) {
        PdfPTable grid = new PdfPTable(GRID_COLUMNS);
        grid.setWidthPercentage(100);
        for (OperatorCredentialCardData d : pageTeam) {
            PdfPCell cell = new PdfPCell(buildCard(d, orgName));
            // Approximates the web card's `rounded-xl border border-black/[.12]` — OpenPDF cell
            // borders can't be rounded, but a thin light-gray box reads the same at this scale.
            cell.setBorder(org.openpdf.text.Rectangle.BOX);
            cell.setBorderColor(CARD_BORDER);
            cell.setBorderWidth(0.75f);
            cell.setPadding(8f);
            grid.addCell(cell);
        }
        for (int i = pageTeam.size(); i < CARDS_PER_PAGE; i++) {
            PdfPCell empty = new PdfPCell();
            empty.setBorder(0);
            grid.addCell(empty);
        }
        return grid;
    }

    /** Lays out the full team roster as one grid per page, explicitly 4 cards per row and 2 rows
     * per page (8 per page) — the caller adds a page break between each returned table. */
    public static List<PdfPTable> buildCredentialGridPages(List<OperatorCredentialCardData> team, String orgName) {
        List<PdfPTable> pages = new java.util.ArrayList<>();
        if (team.isEmpty()) {
            pages.add(buildCredentialGridPage(List.of(), orgName));
            return pages;
        }
        for (int start = 0; start < team.size(); start += CARDS_PER_PAGE) {
            List<OperatorCredentialCardData> pageTeam = team.subList(start, Math.min(start + CARDS_PER_PAGE, team.size()));
            pages.add(buildCredentialGridPage(pageTeam, orgName));
        }
        return pages;
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
