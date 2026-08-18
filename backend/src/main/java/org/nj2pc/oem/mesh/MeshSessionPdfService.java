package org.nj2pc.oem.mesh;

import org.nj2pc.oem.checkin.ResourceCheckIn;
import org.nj2pc.oem.checkin.ResourceCheckInRepository;
import org.nj2pc.oem.common.ApiException;
import org.nj2pc.oem.incident.Incident;
import org.nj2pc.oem.incident.IncidentRepository;
import org.nj2pc.oem.pdf.MeshMapPdfSupport;
import org.nj2pc.oem.pdf.PdfSupport;
import org.nj2pc.oem.pdf.PdfTheme;
import org.openpdf.text.Document;
import org.openpdf.text.DocumentException;
import org.openpdf.text.Element;
import org.openpdf.text.Font;
import org.openpdf.text.PageSize;
import org.openpdf.text.Paragraph;
import org.openpdf.text.Phrase;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;
import org.openpdf.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class MeshSessionPdfService {

    private final MeshSessionService meshSessionService;
    private final IncidentRepository incidentRepository;
    private final ResourceCheckInRepository resourceCheckInRepository;

    public MeshSessionPdfService(MeshSessionService meshSessionService,
                                  IncidentRepository incidentRepository,
                                  ResourceCheckInRepository resourceCheckInRepository) {
        this.meshSessionService = meshSessionService;
        this.incidentRepository = incidentRepository;
        this.resourceCheckInRepository = resourceCheckInRepository;
    }

    @Transactional(readOnly = true)
    public byte[] generate(Long incidentId, Long sessionId, MeshSessionPdfRequest request) {
        MeshSessionDetailResponse session = meshSessionService.findById(incidentId, sessionId);
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> ApiException.notFound("Incident not found: " + incidentId));

        boolean rfOnly = "RF".equalsIgnoreCase(request.linkFilter());
        List<MeshLinkSnapshotResponse> links = rfOnly
                ? session.links().stream().filter(l -> "RF".equals(l.linkTypeNormalized())).toList()
                : session.links();
        boolean rotateMapContent = "PORTRAIT".equalsIgnoreCase(request.orientation());

        Map<Long, ResourceCheckIn> openCheckInByResource = resourceCheckInRepository
                .findByIncidentIdAndCheckedOutAtIsNull(incidentId).stream()
                .collect(Collectors.toMap(c -> c.getResource().getId(), c -> c, (a, b) -> a));

        // Every page is physically landscape — the "vertical" map choice rotates that page's
        // *content* 90 degrees instead of changing the physical page size, so the whole document
        // stays one consistent page shape (easier to print/bind) while still letting a tall map
        // read naturally when the printed page itself is turned sideways.
        Document document = new Document(PageSize.LETTER.rotate(),
                PdfSupport.MARGIN_LEFT, PdfSupport.MARGIN_RIGHT, PdfSupport.MARGIN_TOP, PdfSupport.MARGIN_BOTTOM);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new PdfSupport.PaperBackground());
            document.open();

            addSummaryPage(document, incident, session, rfOnly);

            List<String> mapNodeTypes = session.nodes().stream()
                    .map(MeshNodeSnapshotResponse::resourceTypeName)
                    .filter(java.util.Objects::nonNull)
                    .distinct()
                    .sorted()
                    .toList();

            document.newPage();
            if (rotateMapContent) {
                MeshMapPdfSupport.addRotatedMapPage(document, writer.getDirectContent(),
                        buildHeaderBlock(incident, session, "MESH TOPOLOGY MAP"), request.mapImageBase64(), mapNodeTypes);
            } else {
                PdfPTable header = buildHeaderBlock(incident, session, "MESH TOPOLOGY MAP");
                float availableWidth = document.getPageSize().getWidth() - document.leftMargin() - document.rightMargin();
                header.setTotalWidth(availableWidth);
                float headerHeight = header.getTotalHeight();
                document.add(header);
                float spacerHeight = 8f;
                document.add(PdfSupport.spacer(spacerHeight));
                float availableHeight = document.getPageSize().getHeight() - document.topMargin() - document.bottomMargin()
                        - headerHeight - spacerHeight;
                document.add(MeshMapPdfSupport.buildMapPageBody(request.mapImageBase64(), mapNodeTypes, availableWidth, availableHeight));
            }

            document.newPage();
            document.add(buildHeaderBlock(incident, session, "MESH NODES"));
            document.add(PdfSupport.spacer(8f));
            document.add(buildNodesTable(session.nodes(), openCheckInByResource));

            document.newPage();
            document.add(buildHeaderBlock(incident, session, rfOnly ? "MESH LINKS (RF ONLY)" : "MESH LINKS"));
            document.add(PdfSupport.spacer(8f));
            document.add(buildLinksTable(links));

            document.newPage();
            document.add(buildHeaderBlock(incident, session, "LAN DEVICES"));
            document.add(PdfSupport.spacer(8f));
            document.add(buildLanClientsTable(session.lanClients()));

            document.close();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate mesh scan PDF", e);
        }

        return out.toByteArray();
    }

    private void addSummaryPage(Document document, Incident incident, MeshSessionDetailResponse session, boolean rfOnly)
            throws DocumentException {
        document.add(buildHeaderBlock(incident, session, "SCAN SUMMARY"));
        document.add(PdfSupport.spacer(10f));

        Map<String, Long> linkTypeCounts = session.links().stream()
                .collect(Collectors.groupingBy(MeshLinkSnapshotResponse::linkTypeNormalized, LinkedHashMap::new, Collectors.counting()));

        PdfPTable grid = new PdfPTable(2);
        grid.setWidthPercentage(100);
        grid.setWidths(new float[]{1f, 1f});
        grid.addCell(PdfSupport.nestedLabeledCell("Scan Label", session.label()));
        grid.addCell(PdfSupport.nestedLabeledCell("Captured At", PdfTheme.DATE_TIME_FMT.format(session.capturedAt())));
        grid.addCell(PdfSupport.nestedLabeledCell("Scanned From (Local Node)", session.localNodeHostname()));
        grid.addCell(PdfSupport.nestedLabeledCell("Recorded By", session.createdByCallsign()));
        grid.addCell(PdfSupport.nestedLabeledCell("Nodes Found", String.valueOf(session.nodes().size())));
        grid.addCell(PdfSupport.nestedLabeledCell("Links Found", buildLinkCountsSummary(linkTypeCounts, session.links().size())));
        grid.addCell(PdfSupport.nestedLabeledCell("LAN Clients Found", String.valueOf(session.lanClients().size())));
        grid.addCell(PdfSupport.nestedLabeledCell("Links Detailed in This Report", rfOnly ? "RF only" : "All types"));
        document.add(grid);
        document.add(PdfSupport.spacer(10f));

        document.add(PdfSupport.sectionLabel("Notes"));
        document.add(PdfSupport.spacer(3f));
        PdfPTable notesBox = new PdfPTable(1);
        notesBox.setWidthPercentage(100);
        PdfPCell notesCell = new PdfPCell(new Phrase(PdfSupport.nullToDash(session.notes()), PdfTheme.VALUE_FONT));
        notesCell.setBackgroundColor(PdfTheme.PAPER);
        notesCell.setBorderColor(PdfTheme.AMBER_BORDER);
        notesCell.setPadding(8f);
        notesCell.setMinimumHeight(80f);
        notesBox.addCell(notesCell);
        document.add(notesBox);
    }

    private String buildLinkCountsSummary(Map<String, Long> counts, int total) {
        StringBuilder sb = new StringBuilder(String.valueOf(total));
        if (total > 0) {
            sb.append("  (");
            sb.append(counts.entrySet().stream()
                    .map(e -> linkTypeLabel(e.getKey()) + ": " + e.getValue())
                    .collect(Collectors.joining(", ")));
            sb.append(")");
        }
        return sb.toString();
    }

    private PdfPTable buildHeaderBlock(Incident incident, MeshSessionDetailResponse session, String title) {
        PdfPTable table = new PdfPTable(3);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1.1f, 1.5f, 2.2f});

        PdfPCell orgCell = new PdfPCell();
        orgCell.setBackgroundColor(PdfTheme.BLUE_DEEP);
        orgCell.setPadding(5f);
        orgCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        orgCell.setBorderColor(PdfTheme.BLUE_DEEP);
        Paragraph orgText = new Paragraph();
        orgText.add(new Phrase("0Y-AuxComs\n", PdfTheme.ORG_FONT));
        orgText.add(new Phrase("AREDN Mesh", PdfTheme.ORG_TAGLINE_FONT));
        orgCell.addElement(orgText);
        table.addCell(orgCell);

        PdfPCell titleCell = new PdfPCell();
        titleCell.setBackgroundColor(PdfTheme.PAPER);
        titleCell.setBorderColor(PdfTheme.AMBER_BORDER);
        titleCell.setPadding(5f);
        titleCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        titleCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        Paragraph titleText = new Paragraph(title, PdfTheme.TITLE_FONT);
        titleText.setAlignment(Element.ALIGN_CENTER);
        titleCell.addElement(titleText);
        table.addCell(titleCell);

        PdfPTable rightNested = new PdfPTable(1);
        rightNested.setWidthPercentage(100);
        rightNested.addCell(PdfSupport.nestedLabeledCell("Incident", incident.getName()));
        String scanInfo = (session.label() != null && !session.label().isBlank() ? session.label() + " — " : "")
                + "scanned from " + session.localNodeHostname() + " on " + PdfTheme.DATE_TIME_FMT.format(session.capturedAt());
        rightNested.addCell(PdfSupport.nestedLabeledCell("Scan", scanInfo));

        PdfPCell rightCell = new PdfPCell(rightNested);
        rightCell.setPadding(0f);
        rightCell.setBorderColor(PdfTheme.AMBER_BORDER);
        table.addCell(rightCell);

        return table;
    }

    private PdfPTable buildNodesTable(List<MeshNodeSnapshotResponse> nodes, Map<Long, ResourceCheckIn> openCheckInByResource) {
        String[] headers = {"Hostname", "Model", "Firmware", "Channel", "Band", "Gear", "Location"};
        float[] widths = {1.2f, 1.6f, 1.1f, 0.7f, 0.7f, 1.2f, 1.3f};

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

        if (nodes.isEmpty()) {
            PdfPCell empty = new PdfPCell(new Phrase("No nodes recorded", PdfTheme.TABLE_CELL_FONT));
            empty.setColspan(headers.length);
            empty.setPadding(6f);
            empty.setBorderColor(PdfTheme.AMBER_BORDER);
            table.addCell(empty);
            return table;
        }

        boolean stripe = false;
        for (MeshNodeSnapshotResponse n : nodes) {
            Color rowColor = stripe ? PdfTheme.NEUTRAL_BAND : PdfTheme.WHITE;
            String hostname = n.hostname() + (n.isLocalNode() ? " (local)" : "");
            PdfSupport.addBodyCell(table, hostname, rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, PdfSupport.nullToDash(n.model()), rowColor, PdfTheme.TABLE_CELL_MUTED_FONT);
            PdfSupport.addBodyCell(table, PdfSupport.nullToDash(n.firmwareVersion()), rowColor, PdfTheme.TABLE_CELL_MUTED_FONT);
            PdfSupport.addBodyCell(table, PdfSupport.nullToDash(n.channel()), rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, PdfSupport.nullToDash(n.band()), rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, PdfSupport.nullToDash(n.resourceIdentifier()), rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, locationText(n, openCheckInByResource), rowColor, PdfTheme.TABLE_CELL_MUTED_FONT);
            stripe = !stripe;
        }
        return table;
    }

    private String locationText(MeshNodeSnapshotResponse n, Map<Long, ResourceCheckIn> openCheckInByResource) {
        ResourceCheckIn openCheckIn = n.resourceId() != null ? openCheckInByResource.get(n.resourceId()) : null;
        if (openCheckIn != null && openCheckIn.isOffSite()) {
            return "Off-site";
        }
        String lat = openCheckIn != null ? openCheckIn.getLatitude() : n.latitude();
        String lng = openCheckIn != null ? openCheckIn.getLongitude() : n.longitude();
        if (lat == null || lat.isBlank() || lng == null || lng.isBlank()) {
            return "—";
        }
        return lat + ", " + lng;
    }

    private PdfPTable buildLinksTable(List<MeshLinkSnapshotResponse> links) {
        String[] headers = {"From", "To", "Type", "Status", "RX", "RTT", "SNR"};
        float[] widths = {1.4f, 1.4f, 0.9f, 1.1f, 0.7f, 0.7f, 0.7f};

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

        if (links.isEmpty()) {
            PdfPCell empty = new PdfPCell(new Phrase("No links recorded", PdfTheme.TABLE_CELL_FONT));
            empty.setColspan(headers.length);
            empty.setPadding(6f);
            empty.setBorderColor(PdfTheme.AMBER_BORDER);
            table.addCell(empty);
            return table;
        }

        boolean stripe = false;
        for (MeshLinkSnapshotResponse l : links) {
            Color rowColor = stripe ? PdfTheme.NEUTRAL_BAND : PdfTheme.WHITE;
            PdfSupport.addBodyCell(table, l.fromHostname(), rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, l.toHostname(), rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, linkTypeLabel(l.linkTypeNormalized()), rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, PdfSupport.nullToDash(l.linkQualityStatus()), rowColor, PdfTheme.TABLE_CELL_MUTED_FONT);
            PdfSupport.addBodyCell(table, PdfSupport.nullToDash(l.rxPercent()), rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, PdfSupport.nullToDash(l.rttMs()), rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, PdfSupport.nullToDash(l.snr()), rowColor, PdfTheme.TABLE_CELL_FONT);
            stripe = !stripe;
        }
        return table;
    }

    private PdfPTable buildLanClientsTable(List<MeshLanClientSnapshotResponse> lanClients) {
        String[] headers = {"Device Hostname", "Connected Via (Node)", "Gear"};
        float[] widths = {1.4f, 1.4f, 1.4f};

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

        if (lanClients.isEmpty()) {
            PdfPCell empty = new PdfPCell(new Phrase("No LAN devices recorded", PdfTheme.TABLE_CELL_FONT));
            empty.setColspan(headers.length);
            empty.setPadding(6f);
            empty.setBorderColor(PdfTheme.AMBER_BORDER);
            table.addCell(empty);
            return table;
        }

        boolean stripe = false;
        for (MeshLanClientSnapshotResponse c : lanClients) {
            Color rowColor = stripe ? PdfTheme.NEUTRAL_BAND : PdfTheme.WHITE;
            PdfSupport.addBodyCell(table, c.deviceHostname(), rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, c.nodeHostname(), rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, PdfSupport.nullToDash(c.resourceIdentifier()), rowColor, PdfTheme.TABLE_CELL_FONT);
            stripe = !stripe;
        }
        return table;
    }

    private String linkTypeLabel(String linkTypeNormalized) {
        return switch (linkTypeNormalized) {
            case "RF" -> "RF";
            case "DTD" -> "Direct (DtD)";
            case "TUNNEL" -> "Tunnel";
            default -> "Unknown";
        };
    }
}
