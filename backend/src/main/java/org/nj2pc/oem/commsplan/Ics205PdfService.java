package org.nj2pc.oem.commsplan;

import org.openpdf.text.Document;
import org.openpdf.text.DocumentException;
import org.openpdf.text.Element;
import org.openpdf.text.Font;
import org.openpdf.text.FontFactory;
import org.openpdf.text.PageSize;
import org.openpdf.text.Paragraph;
import org.openpdf.text.Phrase;
import org.openpdf.text.pdf.PdfContentByte;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;
import org.openpdf.text.pdf.PdfPageEventHelper;
import org.openpdf.text.pdf.PdfWriter;
import org.nj2pc.oem.incident.Incident;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class Ics205PdfService {

    // Palette mirrors the app's --credential-* design tokens (frontend/src/index.css) so the
    // generated document reads as the same "physical credential" family as the rest of the app.
    private static final Color INK = new Color(0x14, 0x18, 0x1D);
    private static final Color PAPER = new Color(0xF7, 0xF5, 0xF0);
    private static final Color PAPER_EDGE = new Color(0xF1, 0xEF, 0xEA);
    private static final Color BLUE = new Color(0x2E, 0x6C, 0xA4);
    private static final Color BLUE_DEEP = new Color(0x1F, 0x4E, 0x79);
    private static final Color AMBER = new Color(0xE8, 0xA3, 0x24);
    private static final Color AMBER_TEXT = new Color(0x9C, 0x6B, 0x12);
    private static final Color AMBER_BORDER = new Color(0xE7, 0xD3, 0xA1);
    private static final Color NEUTRAL_BAND = new Color(0xF4, 0xF2, 0xEC);
    private static final Color RED = new Color(0xC4, 0x43, 0x2D);
    private static final Color GREEN = new Color(0x1D, 0x7E, 0x5C);
    private static final Color WHITE = Color.WHITE;

    private static final Map<ChannelMode, Color> MODE_COLOR = Map.of(
            ChannelMode.DIGITAL, BLUE,
            ChannelMode.ANALOG, GREEN,
            ChannelMode.MIXED, AMBER_TEXT
    );

    private static final DateTimeFormatter DATE_TIME_FMT =
            DateTimeFormatter.ofPattern("MM/dd/yyyy HH:mm").withZone(ZoneId.systemDefault());

    private static final Font ORG_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, WHITE);
    private static final Font ORG_TAGLINE_FONT = FontFactory.getFont(FontFactory.HELVETICA, 7, new Color(0xC7, 0xD6, 0xE4));
    private static final Font TITLE_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, INK);
    private static final Font SECTION_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, GREEN);
    private static final Font LABEL_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7, RED);
    private static final Font VALUE_FONT = FontFactory.getFont(FontFactory.HELVETICA, 9, INK);
    private static final Font TABLE_HEADER_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7, WHITE);
    private static final Font TABLE_CELL_FONT = FontFactory.getFont(FontFactory.HELVETICA, 7, INK);
    private static final Font TABLE_CELL_MUTED_FONT = FontFactory.getFont(FontFactory.HELVETICA, 7, new Color(0x5A, 0x5A, 0x5A));
    private static final Font SMALL_ITALIC_FONT = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 7, new Color(0x5A, 0x5A, 0x5A));
    private static final Font NOTE_FONT = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 7, new Color(0x5A, 0x5A, 0x5A));

    private final CommunicationPlanService communicationPlanService;
    private final CommunicationChannelRepository communicationChannelRepository;

    public Ics205PdfService(CommunicationPlanService communicationPlanService,
                            CommunicationChannelRepository communicationChannelRepository) {
        this.communicationPlanService = communicationPlanService;
        this.communicationChannelRepository = communicationChannelRepository;
    }

    @Transactional(readOnly = true)
    public byte[] generate(Long planId) {
        CommunicationPlan plan = communicationPlanService.getPlanOrThrow(planId);
        List<CommunicationChannel> channels = communicationChannelRepository
                .findByPlanIdOrderByChannelNumberAsc(planId);

        Document document = new Document(PageSize.LETTER.rotate(), 24, 24, 20, 20);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new PaperBackground());
            document.open();

            document.add(buildHeaderBlock(plan));
            document.add(spacer(4f));
            document.add(buildNote());
            document.add(spacer(8f));
            document.add(sectionLabel("3. Basic Radio Channel Utilization"));
            document.add(spacer(3f));
            document.add(buildChannelTable(channels));
            document.add(spacer(2f));
            document.add(new Paragraph(
                    "Mode legend:  A = Analog (conventional FM voice)   |   D = Digital (e.g. DMR, P25, Fusion digital)   |   M = Mixed/Multi-mode",
                    NOTE_FONT));
            document.add(spacer(8f));
            document.add(sectionLabel("4. Special Instructions"));
            document.add(spacer(3f));
            document.add(buildInstructionsBox(plan));
            document.add(spacer(8f));
            document.add(buildSignatureTable(plan));
            document.add(spacer(6f));
            document.add(buildFooter(plan));

            document.close();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate ICS-205 PDF", e);
        }

        return out.toByteArray();
    }

    /** Faint warm paper tint behind every page, matching --credential-paper. */
    private static class PaperBackground extends PdfPageEventHelper {
        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte canvas = writer.getDirectContentUnder();
            canvas.saveState();
            canvas.setColorFill(PAPER_EDGE);
            canvas.rectangle(0, 0, document.getPageSize().getWidth(), document.getPageSize().getHeight());
            canvas.fill();
            canvas.restoreState();
        }
    }

    private PdfPTable buildHeaderBlock(CommunicationPlan plan) throws DocumentException {
        PdfPTable table = new PdfPTable(3);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1.1f, 1.6f, 1.6f});

        PdfPCell orgCell = new PdfPCell();
        orgCell.setBackgroundColor(BLUE_DEEP);
        orgCell.setPadding(5f);
        orgCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        orgCell.setBorderColor(BLUE_DEEP);
        Paragraph orgText = new Paragraph();
        orgText.add(new Phrase("0Y-AuxComs\n", ORG_FONT));
        orgText.add(new Phrase("Emergency Communications", ORG_TAGLINE_FONT));
        orgCell.addElement(orgText);
        table.addCell(orgCell);

        PdfPCell titleCell = new PdfPCell();
        titleCell.setBackgroundColor(PAPER);
        titleCell.setBorderColor(AMBER_BORDER);
        titleCell.setPadding(5f);
        titleCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        titleCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        Paragraph titleText = new Paragraph("COMMUNICATIONS\nPLAN (ICS 205)", TITLE_FONT);
        titleText.setAlignment(Element.ALIGN_CENTER);
        titleCell.addElement(titleText);
        table.addCell(titleCell);

        String incidentNames = plan.getIncidents().stream()
                .map(Incident::getName)
                .sorted(Comparator.naturalOrder())
                .collect(Collectors.joining(", "));
        if (incidentNames.isBlank()) {
            incidentNames = plan.getName();
        }
        String operationalPeriod = formatRange(plan.getOperationalPeriodStart(), plan.getOperationalPeriodEnd());

        PdfPTable rightNested = new PdfPTable(1);
        rightNested.setWidthPercentage(100);
        rightNested.addCell(nestedLabeledCell("1. Incident Name", incidentNames));
        rightNested.addCell(nestedLabeledCell("2. Operational Period", operationalPeriod));

        PdfPCell rightCell = new PdfPCell(rightNested);
        rightCell.setPadding(0f);
        rightCell.setBorderColor(AMBER_BORDER);
        table.addCell(rightCell);

        return table;
    }

    private PdfPCell nestedLabeledCell(String label, String value) {
        PdfPCell cell = new PdfPCell();
        cell.setPadding(4f);
        cell.setBackgroundColor(PAPER);
        cell.setBorderColor(AMBER_BORDER);
        Paragraph p = new Paragraph();
        p.add(new Phrase(label.toUpperCase() + "\n", LABEL_FONT));
        p.add(new Phrase(value == null || value.isBlank() ? "—" : value, VALUE_FONT));
        cell.addElement(p);
        return cell;
    }

    private Paragraph buildNote() {
        Paragraph note = new Paragraph(
                "This plan covers Amateur Radio band communications only. Separate communications plans for "
                        + "other functions (e.g. public safety, vendor/logistics, commercial radio) may exist.",
                SMALL_ITALIC_FONT);
        return note;
    }

    private PdfPTable buildChannelTable(List<CommunicationChannel> channels) {
        String[] headers = {
                "Zone", "Ch #", "Function", "Channel Name", "Assignment",
                "RX Freq", "RX Tone/NAC", "TX Freq", "TX Tone/NAC", "Mode", "Remarks"
        };
        float[] widths = {0.55f, 0.35f, 0.85f, 1.05f, 1.35f, 0.65f, 0.85f, 0.65f, 0.85f, 0.4f, 1.35f};

        PdfPTable table = new PdfPTable(headers.length);
        table.setWidthPercentage(100);
        try {
            table.setWidths(widths);
        } catch (Exception ignored) {
            // widths array size always matches column count here
        }
        table.setHeaderRows(1);

        for (String header : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(header, TABLE_HEADER_FONT));
            cell.setBackgroundColor(INK);
            cell.setBorderColor(INK);
            cell.setPadding(4f);
            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            table.addCell(cell);
        }

        if (channels.isEmpty()) {
            PdfPCell empty = new PdfPCell(new Phrase("No channels defined", TABLE_CELL_FONT));
            empty.setColspan(headers.length);
            empty.setPadding(6f);
            empty.setBorderColor(AMBER_BORDER);
            table.addCell(empty);
            return table;
        }

        boolean stripe = false;
        for (CommunicationChannel c : channels) {
            Color rowColor = stripe ? NEUTRAL_BAND : WHITE;
            addBodyCell(table, c.getZoneGroup(), rowColor, TABLE_CELL_FONT);
            addBodyCell(table, String.valueOf(c.getChannelNumber()), rowColor, TABLE_CELL_FONT);
            addBodyCell(table, c.getFunction(), rowColor, TABLE_CELL_FONT);
            addBodyCell(table, c.getChannelName(), rowColor, TABLE_CELL_FONT);
            addBodyCell(table, nullToDash(c.getAssignment()), rowColor, TABLE_CELL_MUTED_FONT);
            addBodyCell(table, nullToDash(c.getRxFrequency()), rowColor, TABLE_CELL_FONT);
            addBodyCell(table, nullToDash(c.getRxTone()), rowColor, TABLE_CELL_MUTED_FONT);
            addBodyCell(table, nullToDash(c.getTxFrequency()), rowColor, TABLE_CELL_FONT);
            addBodyCell(table, nullToDash(c.getTxTone()), rowColor, TABLE_CELL_MUTED_FONT);

            PdfPCell modeCell = new PdfPCell(new Phrase(
                    c.getMode().name().substring(0, 1),
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, MODE_COLOR.get(c.getMode()))));
            modeCell.setBackgroundColor(rowColor);
            modeCell.setBorderColor(AMBER_BORDER);
            modeCell.setPadding(3f);
            modeCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            table.addCell(modeCell);

            addBodyCell(table, nullToDash(c.getRemarks()), rowColor, TABLE_CELL_MUTED_FONT);
            stripe = !stripe;
        }
        return table;
    }

    private PdfPTable buildInstructionsBox(CommunicationPlan plan) {
        PdfPTable table = new PdfPTable(1);
        table.setWidthPercentage(100);
        PdfPCell cell = new PdfPCell(new Phrase(nullToDash(plan.getSpecialInstructions()), VALUE_FONT));
        cell.setBackgroundColor(PAPER);
        cell.setBorderColor(AMBER_BORDER);
        cell.setPadding(8f);
        table.addCell(cell);
        return table;
    }

    private PdfPTable buildSignatureTable(CommunicationPlan plan) {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        try {
            table.setWidths(new float[]{1f, 1f});
        } catch (Exception ignored) {
            // widths array size always matches column count here
        }

        String preparedBy = joinNameCallsign(plan.getPreparedByName(), plan.getPreparedByCallsign());
        String approvedBy = joinNameCallsign(plan.getApprovedByName(), plan.getApprovedByCallsign());

        table.addCell(nestedLabeledCell("5. Prepared by (Communications Unit)", preparedBy));
        table.addCell(nestedLabeledCell("6. Date/Time", formatInstant(plan.getPreparedAt())));
        table.addCell(nestedLabeledCell("7. Approved by (Incident Communications Center Manager)", approvedBy));
        table.addCell(nestedLabeledCell("8. Date/Time", formatInstant(plan.getApprovedAt())));
        return table;
    }

    private Paragraph buildFooter(CommunicationPlan plan) {
        Paragraph footer = new Paragraph(
                "ICS 205  |  " + plan.getName() + "  |  v" + plan.getVersion() + "  |  Generated by 0Y-AuxComs",
                SMALL_ITALIC_FONT);
        footer.setAlignment(Element.ALIGN_CENTER);
        return footer;
    }

    private void addBodyCell(PdfPTable table, String text, Color background, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(background);
        cell.setBorderColor(AMBER_BORDER);
        cell.setPadding(3f);
        table.addCell(cell);
    }

    private Paragraph sectionLabel(String text) {
        Paragraph p = new Paragraph(text, SECTION_FONT);
        return p;
    }

    private Paragraph spacer(float sizeInPoints) {
        Paragraph p = new Paragraph(" ", FontFactory.getFont(FontFactory.HELVETICA, sizeInPoints));
        p.setLeading(sizeInPoints);
        return p;
    }

    private String nullToDash(String value) {
        return value == null || value.isBlank() ? "—" : value;
    }

    private String joinNameCallsign(String name, String callsign) {
        if ((name == null || name.isBlank()) && (callsign == null || callsign.isBlank())) {
            return "—";
        }
        if (callsign == null || callsign.isBlank()) {
            return name;
        }
        if (name == null || name.isBlank()) {
            return callsign;
        }
        return name + " (" + callsign + ")";
    }

    private String formatInstant(Instant instant) {
        return instant == null ? "—" : DATE_TIME_FMT.format(instant);
    }

    private String formatRange(Instant start, Instant end) {
        if (start == null && end == null) return "—";
        if (start != null && end != null) {
            return "From: " + DATE_TIME_FMT.format(start) + "   To: " + DATE_TIME_FMT.format(end);
        }
        if (start != null) {
            return "From: " + DATE_TIME_FMT.format(start);
        }
        return "To: " + DATE_TIME_FMT.format(end);
    }
}
