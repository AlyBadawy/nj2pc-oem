package org.nj2pc.oem.commsplan;

import org.nj2pc.oem.pdf.PdfSupport;
import org.nj2pc.oem.pdf.PdfTheme;
import org.openpdf.text.Document;
import org.openpdf.text.DocumentException;
import org.openpdf.text.Element;
import org.openpdf.text.FontFactory;
import org.openpdf.text.PageSize;
import org.openpdf.text.Paragraph;
import org.openpdf.text.Phrase;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;
import org.openpdf.text.pdf.PdfWriter;
import org.nj2pc.oem.incident.Incident;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class Ics205PdfService {

    // ICS-205-specific colors/fonts not shared with other PDFs (channel mode badges).
    private static final Color BLUE = new Color(0x2E, 0x6C, 0xA4);
    private static final Color AMBER = new Color(0xE8, 0xA3, 0x24);
    private static final Map<ChannelMode, Color> MODE_COLOR = Map.of(
            ChannelMode.DIGITAL, BLUE,
            ChannelMode.ANALOG, PdfTheme.GREEN,
            ChannelMode.MIXED, PdfTheme.AMBER_TEXT
    );
    private static final org.openpdf.text.Font NOTE_FONT =
            FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 7, new Color(0x5A, 0x5A, 0x5A));

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

        Document document = new Document(PageSize.LETTER.rotate(),
                PdfSupport.MARGIN_LEFT, PdfSupport.MARGIN_RIGHT, PdfSupport.MARGIN_TOP, PdfSupport.MARGIN_BOTTOM);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new PdfSupport.PaperBackground());
            document.open();

            document.add(buildHeaderBlock(plan));
            document.add(PdfSupport.spacer(4f));
            document.add(buildNote());
            document.add(PdfSupport.spacer(8f));
            document.add(PdfSupport.sectionLabel("3. Basic Radio Channel Utilization"));
            document.add(PdfSupport.spacer(3f));
            document.add(buildChannelTable(channels));
            document.add(PdfSupport.spacer(2f));
            document.add(new Paragraph(
                    "Mode legend:  A = Analog (conventional FM voice)   |   D = Digital (e.g. DMR, P25, Fusion digital)   |   M = Mixed/Multi-mode",
                    NOTE_FONT));
            document.add(PdfSupport.spacer(8f));
            document.add(PdfSupport.sectionLabel("4. Special Instructions"));
            document.add(PdfSupport.spacer(3f));
            document.add(buildInstructionsBox(plan));
            document.add(PdfSupport.spacer(8f));
            document.add(buildSignatureTable(plan));
            document.add(PdfSupport.spacer(6f));
            document.add(buildFooter(plan));

            document.close();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate ICS-205 PDF", e);
        }

        return out.toByteArray();
    }

    private PdfPTable buildHeaderBlock(CommunicationPlan plan) throws DocumentException {
        PdfPTable table = new PdfPTable(3);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1.1f, 1.6f, 1.6f});

        PdfPCell orgCell = new PdfPCell();
        orgCell.setBackgroundColor(PdfTheme.BLUE_DEEP);
        orgCell.setPadding(5f);
        orgCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        orgCell.setBorderColor(PdfTheme.BLUE_DEEP);
        Paragraph orgText = new Paragraph();
        orgText.add(new Phrase("0Y-AuxComs\n", PdfTheme.ORG_FONT));
        orgText.add(new Phrase("Emergency Communications", PdfTheme.ORG_TAGLINE_FONT));
        orgCell.addElement(orgText);
        table.addCell(orgCell);

        PdfPCell titleCell = new PdfPCell();
        titleCell.setBackgroundColor(PdfTheme.PAPER);
        titleCell.setBorderColor(PdfTheme.AMBER_BORDER);
        titleCell.setPadding(5f);
        titleCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        titleCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        Paragraph titleText = new Paragraph("COMMUNICATIONS\nPLAN (ICS 205)", PdfTheme.TITLE_FONT);
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
        rightNested.addCell(PdfSupport.nestedLabeledCell("1. Incident Name", incidentNames));
        rightNested.addCell(PdfSupport.nestedLabeledCell("2. Operational Period", operationalPeriod));

        PdfPCell rightCell = new PdfPCell(rightNested);
        rightCell.setPadding(0f);
        rightCell.setBorderColor(PdfTheme.AMBER_BORDER);
        table.addCell(rightCell);

        return table;
    }

    private Paragraph buildNote() {
        return new Paragraph(
                "This plan covers Amateur Radio band communications only. Separate communications plans for "
                        + "other functions (e.g. public safety, vendor/logistics, commercial radio) may exist.",
                PdfTheme.SMALL_ITALIC_FONT);
    }

    /** Reused as-is by the incident-summary PDF's communications-plan page. */
    public static PdfPTable buildChannelTable(List<CommunicationChannel> channels) {
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
            PdfPCell cell = new PdfPCell(new Phrase(header, PdfTheme.TABLE_HEADER_FONT));
            cell.setBackgroundColor(PdfTheme.INK);
            cell.setBorderColor(PdfTheme.INK);
            cell.setPadding(4f);
            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            table.addCell(cell);
        }

        if (channels.isEmpty()) {
            PdfPCell empty = new PdfPCell(new Phrase("No channels defined", PdfTheme.TABLE_CELL_FONT));
            empty.setColspan(headers.length);
            empty.setPadding(6f);
            empty.setBorderColor(PdfTheme.AMBER_BORDER);
            table.addCell(empty);
            return table;
        }

        boolean stripe = false;
        for (CommunicationChannel c : channels) {
            Color rowColor = stripe ? PdfTheme.NEUTRAL_BAND : PdfTheme.WHITE;
            PdfSupport.addBodyCell(table, c.getZoneGroup(), rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, String.valueOf(c.getChannelNumber()), rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, c.getFunction(), rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, c.getChannelName(), rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, PdfSupport.nullToDash(c.getAssignment()), rowColor, PdfTheme.TABLE_CELL_MUTED_FONT);
            PdfSupport.addBodyCell(table, PdfSupport.nullToDash(c.getRxFrequency()), rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, PdfSupport.nullToDash(c.getRxTone()), rowColor, PdfTheme.TABLE_CELL_MUTED_FONT);
            PdfSupport.addBodyCell(table, PdfSupport.nullToDash(c.getTxFrequency()), rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, PdfSupport.nullToDash(c.getTxTone()), rowColor, PdfTheme.TABLE_CELL_MUTED_FONT);

            PdfPCell modeCell = new PdfPCell(new Phrase(
                    c.getMode().name().substring(0, 1),
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, MODE_COLOR.get(c.getMode()))));
            modeCell.setBackgroundColor(rowColor);
            modeCell.setBorderColor(PdfTheme.AMBER_BORDER);
            modeCell.setPadding(3f);
            modeCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            table.addCell(modeCell);

            PdfSupport.addBodyCell(table, PdfSupport.nullToDash(c.getRemarks()), rowColor, PdfTheme.TABLE_CELL_MUTED_FONT);
            stripe = !stripe;
        }
        return table;
    }

    private PdfPTable buildInstructionsBox(CommunicationPlan plan) {
        PdfPTable table = new PdfPTable(1);
        table.setWidthPercentage(100);
        PdfPCell cell = new PdfPCell(new Phrase(PdfSupport.nullToDash(plan.getSpecialInstructions()), PdfTheme.VALUE_FONT));
        cell.setBackgroundColor(PdfTheme.PAPER);
        cell.setBorderColor(PdfTheme.AMBER_BORDER);
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

        table.addCell(PdfSupport.nestedLabeledCell("5. Prepared by (Communications Unit)", preparedBy));
        table.addCell(PdfSupport.nestedLabeledCell("6. Date/Time", formatInstant(plan.getPreparedAt())));
        table.addCell(PdfSupport.nestedLabeledCell("7. Approved by (Incident Communications Center Manager)", approvedBy));
        table.addCell(PdfSupport.nestedLabeledCell("8. Date/Time", formatInstant(plan.getApprovedAt())));
        return table;
    }

    private Paragraph buildFooter(CommunicationPlan plan) {
        Paragraph footer = new Paragraph(
                "ICS 205  |  " + plan.getName() + "  |  v" + plan.getVersion() + "  |  Generated by 0Y-AuxComs",
                PdfTheme.SMALL_ITALIC_FONT);
        footer.setAlignment(Element.ALIGN_CENTER);
        return footer;
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
        return instant == null ? "—" : PdfTheme.DATE_TIME_FMT.format(instant);
    }

    private String formatRange(Instant start, Instant end) {
        if (start == null && end == null) return "—";
        if (start != null && end != null) {
            return "From: " + PdfTheme.DATE_TIME_FMT.format(start) + "   To: " + PdfTheme.DATE_TIME_FMT.format(end);
        }
        if (start != null) {
            return "From: " + PdfTheme.DATE_TIME_FMT.format(start);
        }
        return "To: " + PdfTheme.DATE_TIME_FMT.format(end);
    }
}
