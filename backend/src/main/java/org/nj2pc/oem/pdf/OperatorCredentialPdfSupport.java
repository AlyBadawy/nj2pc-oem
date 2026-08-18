package org.nj2pc.oem.pdf;

import org.nj2pc.oem.checkin.OperatorCheckInResponse;
import org.openpdf.text.Element;
import org.openpdf.text.Image;
import org.openpdf.text.Paragraph;
import org.openpdf.text.Phrase;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;

import java.awt.Color;
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
    private static final Color PLACEHOLDER_BG = new Color(0xE4, 0xE1, 0xD8);

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

    private static String contactValue(String raw, boolean canView, java.util.function.Function<String, String> mask,
                                        String emptyText) {
        if (raw == null || raw.isBlank()) return emptyText;
        return canView ? raw : mask.apply(raw);
    }

    // --- one card ---

    private static PdfPCell contactLine(String label, String value) {
        PdfPCell cell = new PdfPCell();
        cell.setColspan(2);
        cell.setBorder(0);
        cell.setPadding(1f);
        Paragraph p = new Paragraph();
        p.add(new Phrase(label + ": ", PdfTheme.LABEL_FONT));
        p.add(new Phrase(value, PdfTheme.TABLE_CELL_FONT));
        cell.addElement(p);
        return cell;
    }

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

        // Header: org name + credential number.
        PdfPTable header = new PdfPTable(2);
        header.setWidthPercentage(100);
        PdfPCell orgCell = new PdfPCell(new Phrase(orgName, org.openpdf.text.FontFactory.getFont(
                org.openpdf.text.FontFactory.HELVETICA_BOLD, 6, PdfTheme.BLUE_DEEP)));
        orgCell.setBorder(0);
        orgCell.setPadding(0f);
        header.addCell(orgCell);
        PdfPCell credCell = new PdfPCell(new Phrase("NO. " + String.format("%06d", d.id()),
                org.openpdf.text.FontFactory.getFont(org.openpdf.text.FontFactory.COURIER, 5, new Color(0x8A, 0x8A, 0x8A))));
        credCell.setBorder(0);
        credCell.setPadding(0f);
        credCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        header.addCell(credCell);
        PdfPCell headerCell = new PdfPCell(header);
        headerCell.setColspan(2);
        headerCell.setBorder(0);
        headerCell.setBorderWidthBottom(0.5f);
        headerCell.setBorderColor(PdfTheme.AMBER_BORDER);
        headerCell.setPadding(4f);
        card.addCell(headerCell);

        // Photo + barcode (fixed-width column) beside callsign/name.
        PdfPCell photoCell = new PdfPCell();
        photoCell.setBorder(0);
        photoCell.setPadding(4f);
        if (d.photoBytes() != null) {
            try {
                Image photo = Image.getInstance(d.photoBytes());
                photo.scaleToFit(50f, 62f);
                photoCell.addElement(photo);
            } catch (Exception e) {
                photoCell.setBackgroundColor(PLACEHOLDER_BG);
            }
        } else {
            photoCell.setBackgroundColor(PLACEHOLDER_BG);
            photoCell.setMinimumHeight(50f);
        }
        Image barcode = Code128Support.barcodeImage(d.callsign(), d.id(), 200, 30);
        barcode.scaleToFit(50f, 12f);
        Paragraph barcodeP = new Paragraph();
        barcodeP.add(new org.openpdf.text.Chunk(barcode, 0, 0));
        photoCell.addElement(new Paragraph(" "));
        photoCell.addElement(barcodeP);
        card.addCell(photoCell);

        PdfPCell nameCell = new PdfPCell();
        nameCell.setBorder(0);
        nameCell.setPadding(4f);
        nameCell.setVerticalAlignment(Element.ALIGN_TOP);
        Paragraph namePara = new Paragraph();
        namePara.add(new Phrase(d.callsign() + "\n", org.openpdf.text.FontFactory.getFont(
                org.openpdf.text.FontFactory.COURIER_BOLD, 16, PdfTheme.INK)));
        namePara.add(new Phrase(d.name(), org.openpdf.text.FontFactory.getFont(
                org.openpdf.text.FontFactory.HELVETICA_BOLD, 9, PdfTheme.INK)));
        nameCell.addElement(namePara);
        card.addCell(nameCell);

        // License + role.
        PdfPTable licenseRole = new PdfPTable(2);
        licenseRole.setWidthPercentage(100);
        PdfPCell licenseCell = new PdfPCell(new Phrase(
                PdfSupport.nullToDash(d.licenseClass()), PdfTheme.TABLE_CELL_FONT));
        licenseCell.setBorder(0);
        licenseCell.setPadding(0f);
        licenseRole.addCell(licenseCell);
        String roleText = d.roleName() != null ? d.roleName() + " · " + PdfSupport.nullToDash(d.roleAccessLevel()) : "Unassigned";
        Color roleColor = d.roleName() != null && d.roleColor() != null ? parseHexColor(d.roleColor()) : new Color(0xF4, 0xF2, 0xEC);
        PdfPCell roleCell = new PdfPCell(new Phrase(roleText, org.openpdf.text.FontFactory.getFont(
                org.openpdf.text.FontFactory.COURIER_BOLD, 6, PdfTheme.INK)));
        roleCell.setBackgroundColor(roleColor);
        roleCell.setBorder(0);
        roleCell.setPadding(2f);
        roleCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        licenseRole.addCell(roleCell);
        PdfPCell licenseRoleCell = new PdfPCell(licenseRole);
        licenseRoleCell.setColspan(2);
        licenseRoleCell.setBorder(0);
        licenseRoleCell.setBorderWidthTop(0.5f);
        licenseRoleCell.setBorderColor(PdfTheme.AMBER_BORDER);
        licenseRoleCell.setPadding(4f);
        card.addCell(licenseRoleCell);

        // Contact lines.
        card.addCell(contactLine("Phone", contactValue(d.phone(), d.canViewContact(), OperatorCredentialPdfSupport::maskPhone, "—")));
        card.addCell(contactLine("Email", contactValue(d.email(), d.canViewContact(), OperatorCredentialPdfSupport::maskEmail, "—")));
        card.addCell(contactLine("Plate", contactValue(d.licensePlate(), d.canViewContact(), OperatorCredentialPdfSupport::maskPlate, "NONE")));

        // Status footer.
        PdfPCell footer = new PdfPCell();
        footer.setColspan(2);
        footer.setBackgroundColor(d.checkedIn() ? PdfTheme.INK : OFFLINE);
        footer.setBorder(0);
        footer.setPadding(4f);
        Paragraph footerText = new Paragraph(
                d.checkedIn() ? "Checked in " + PdfTheme.DATE_TIME_FMT.format(d.checkedInAt()) : "Not checked in",
                org.openpdf.text.FontFactory.getFont(org.openpdf.text.FontFactory.HELVETICA_BOLD, 6, PdfTheme.WHITE));
        footer.addElement(footerText);
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

    /** Lays out one card per team member, 4 per row — a plain PdfPTable, so it flows across
     * page breaks automatically like any other table in this app's PDFs. */
    public static PdfPTable buildCredentialGrid(List<OperatorCredentialCardData> team, String orgName) {
        int columns = 4;
        PdfPTable grid = new PdfPTable(columns);
        grid.setWidthPercentage(100);
        for (OperatorCredentialCardData d : team) {
            PdfPCell cell = new PdfPCell(buildCard(d, orgName));
            cell.setBorder(0);
            cell.setPadding(6f);
            grid.addCell(cell);
        }
        return grid;
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

        boolean stripe = false;
        for (OperatorCheckInResponse c : checkIns) {
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
