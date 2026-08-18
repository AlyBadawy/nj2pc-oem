package org.nj2pc.oem.mesh;

import org.nj2pc.oem.checkin.ResourceCheckIn;
import org.nj2pc.oem.checkin.ResourceCheckInRepository;
import org.nj2pc.oem.common.ApiException;
import org.nj2pc.oem.incident.Incident;
import org.nj2pc.oem.incident.IncidentRepository;
import org.openpdf.text.Chunk;
import org.openpdf.text.Document;
import org.openpdf.text.DocumentException;
import org.openpdf.text.Element;
import org.openpdf.text.Font;
import org.openpdf.text.FontFactory;
import org.openpdf.text.Image;
import org.openpdf.text.PageSize;
import org.openpdf.text.Paragraph;
import org.openpdf.text.Phrase;
import org.openpdf.text.pdf.PdfContentByte;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;
import org.openpdf.text.pdf.PdfPageEventHelper;
import org.openpdf.text.pdf.PdfTemplate;
import org.openpdf.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class MeshSessionPdfService {

    // Same palette as Ics205PdfService, mirroring the app's --credential-* design tokens
    // (frontend/src/index.css) so every generated document in this app reads as one family.
    private static final Color INK = new Color(0x14, 0x18, 0x1D);
    private static final Color PAPER = new Color(0xF7, 0xF5, 0xF0);
    private static final Color PAPER_EDGE = new Color(0xF1, 0xEF, 0xEA);
    private static final Color BLUE_DEEP = new Color(0x1F, 0x4E, 0x79);
    private static final Color AMBER_TEXT = new Color(0x9C, 0x6B, 0x12);
    private static final Color AMBER_BORDER = new Color(0xE7, 0xD3, 0xA1);
    private static final Color NEUTRAL_BAND = new Color(0xF4, 0xF2, 0xEC);
    private static final Color RED = new Color(0xC4, 0x43, 0x2D);
    private static final Color GREEN = new Color(0x1D, 0x7E, 0x5C);
    private static final Color WHITE = Color.WHITE;

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

    private static final float MARGIN_LEFT = 24f;
    private static final float MARGIN_RIGHT = 24f;
    private static final float MARGIN_TOP = 20f;
    private static final float MARGIN_BOTTOM = 20f;

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
        Document document = new Document(PageSize.LETTER.rotate(), MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, MARGIN_BOTTOM);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new PaperBackground());
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
                addRotatedMapPage(document, writer.getDirectContent(), incident, session, request.mapImageBase64(), mapNodeTypes);
            } else {
                PdfPTable header = buildHeaderBlock(incident, session, "MESH TOPOLOGY MAP");
                float availableWidth = document.getPageSize().getWidth() - document.leftMargin() - document.rightMargin();
                header.setTotalWidth(availableWidth);
                float headerHeight = header.getTotalHeight();
                document.add(header);
                float spacerHeight = 8f;
                document.add(spacer(spacerHeight));
                float availableHeight = document.getPageSize().getHeight() - document.topMargin() - document.bottomMargin()
                        - headerHeight - spacerHeight;
                document.add(buildMapPageBody(request.mapImageBase64(), mapNodeTypes, availableWidth, availableHeight));
            }

            document.newPage();
            document.add(buildHeaderBlock(incident, session, "MESH NODES"));
            document.add(spacer(8f));
            document.add(buildNodesTable(session.nodes(), openCheckInByResource));

            document.newPage();
            document.add(buildHeaderBlock(incident, session, rfOnly ? "MESH LINKS (RF ONLY)" : "MESH LINKS"));
            document.add(spacer(8f));
            document.add(buildLinksTable(links));

            document.newPage();
            document.add(buildHeaderBlock(incident, session, "LAN DEVICES"));
            document.add(spacer(8f));
            document.add(buildLanClientsTable(session.lanClients()));

            document.close();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate mesh scan PDF", e);
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

    private void addSummaryPage(Document document, Incident incident, MeshSessionDetailResponse session, boolean rfOnly)
            throws DocumentException {
        document.add(buildHeaderBlock(incident, session, "SCAN SUMMARY"));
        document.add(spacer(10f));

        Map<String, Long> linkTypeCounts = session.links().stream()
                .collect(Collectors.groupingBy(MeshLinkSnapshotResponse::linkTypeNormalized, LinkedHashMap::new, Collectors.counting()));

        PdfPTable grid = new PdfPTable(2);
        grid.setWidthPercentage(100);
        grid.setWidths(new float[]{1f, 1f});
        grid.addCell(nestedLabeledCell("Scan Label", session.label()));
        grid.addCell(nestedLabeledCell("Captured At", DATE_TIME_FMT.format(session.capturedAt())));
        grid.addCell(nestedLabeledCell("Scanned From (Local Node)", session.localNodeHostname()));
        grid.addCell(nestedLabeledCell("Recorded By", session.createdByCallsign()));
        grid.addCell(nestedLabeledCell("Nodes Found", String.valueOf(session.nodes().size())));
        grid.addCell(nestedLabeledCell("Links Found", buildLinkCountsSummary(linkTypeCounts, session.links().size())));
        grid.addCell(nestedLabeledCell("LAN Clients Found", String.valueOf(session.lanClients().size())));
        grid.addCell(nestedLabeledCell("Links Detailed in This Report", rfOnly ? "RF only" : "All types"));
        document.add(grid);
        document.add(spacer(10f));

        document.add(sectionLabel("Notes"));
        document.add(spacer(3f));
        PdfPTable notesBox = new PdfPTable(1);
        notesBox.setWidthPercentage(100);
        PdfPCell notesCell = new PdfPCell(new Phrase(nullToDash(session.notes()), VALUE_FONT));
        notesCell.setBackgroundColor(PAPER);
        notesCell.setBorderColor(AMBER_BORDER);
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
        orgCell.setBackgroundColor(BLUE_DEEP);
        orgCell.setPadding(5f);
        orgCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        orgCell.setBorderColor(BLUE_DEEP);
        Paragraph orgText = new Paragraph();
        orgText.add(new Phrase("0Y-AuxComs\n", ORG_FONT));
        orgText.add(new Phrase("AREDN Mesh", ORG_TAGLINE_FONT));
        orgCell.addElement(orgText);
        table.addCell(orgCell);

        PdfPCell titleCell = new PdfPCell();
        titleCell.setBackgroundColor(PAPER);
        titleCell.setBorderColor(AMBER_BORDER);
        titleCell.setPadding(5f);
        titleCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        titleCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        Paragraph titleText = new Paragraph(title, TITLE_FONT);
        titleText.setAlignment(Element.ALIGN_CENTER);
        titleCell.addElement(titleText);
        table.addCell(titleCell);

        PdfPTable rightNested = new PdfPTable(1);
        rightNested.setWidthPercentage(100);
        rightNested.addCell(nestedLabeledCell("Incident", incident.getName()));
        String scanInfo = (session.label() != null && !session.label().isBlank() ? session.label() + " — " : "")
                + "scanned from " + session.localNodeHostname() + " on " + DATE_TIME_FMT.format(session.capturedAt());
        rightNested.addCell(nestedLabeledCell("Scan", scanInfo));

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
        p.add(new Phrase(nullToDash(value), VALUE_FONT));
        cell.addElement(p);
        return cell;
    }

    private Image decodeMapImage(String base64) {
        byte[] imageBytes;
        try {
            String raw = base64.contains(",") ? base64.substring(base64.indexOf(',') + 1) : base64;
            imageBytes = Base64.getDecoder().decode(raw);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid map image data", e);
        }
        try {
            return Image.getInstance(imageBytes);
        } catch (Exception e) {
            throw new RuntimeException("Failed to read map image", e);
        }
    }

    private Image buildMapImage(String base64, float availableWidth, float availableHeight) {
        Image image = decodeMapImage(base64);
        image.scaleToFit(availableWidth, availableHeight);
        image.setAlignment(Element.ALIGN_CENTER);
        return image;
    }

    private static final float LEGEND_WIDTH = 130f;
    private static final float LEGEND_GAP = 10f;

    /** Same deterministic hue-from-string hash as the frontend's `hashHue` (meshVisual.ts) — a
     * 32-bit int hash truncated the same way JS's `| 0` does, so a given resource type name maps
     * to the exact same marker color here as it does on the incident/mesh-scan map pages. */
    private int hashHue(String value) {
        int hash = 0;
        for (int i = 0; i < value.length(); i++) {
            hash = hash * 31 + value.charAt(i);
        }
        return Math.abs(hash) % 360;
    }

    /** Mirrors `resourceTypeColor` in meshVisual.ts (`hsl(hue, 68%, 46%)`). */
    private Color resourceTypeColor(String typeName) {
        return hslToColor(hashHue(typeName), 0.68f, 0.46f);
    }

    private Color hslToColor(int hueDeg, float saturation, float lightness) {
        float c = (1 - Math.abs(2 * lightness - 1)) * saturation;
        float hPrime = hueDeg / 60f;
        float x = c * (1 - Math.abs(hPrime % 2 - 1));
        float r1, g1, b1;
        if (hPrime < 1) { r1 = c; g1 = x; b1 = 0; }
        else if (hPrime < 2) { r1 = x; g1 = c; b1 = 0; }
        else if (hPrime < 3) { r1 = 0; g1 = c; b1 = x; }
        else if (hPrime < 4) { r1 = 0; g1 = x; b1 = c; }
        else if (hPrime < 5) { r1 = x; g1 = 0; b1 = c; }
        else { r1 = c; g1 = 0; b1 = x; }
        float m = lightness - c / 2;
        return new Color(
                Math.round((r1 + m) * 255),
                Math.round((g1 + m) * 255),
                Math.round((b1 + m) * 255)
        );
    }

    /** One legend line: a small color-filled block (built from a padded blank Chunk background,
     * since OpenPDF has no inline shape primitive) followed by the label. */
    private Paragraph legendLine(String label, Color color) {
        Paragraph p = new Paragraph();
        p.setSpacingAfter(3f);
        Chunk swatch = new Chunk(" ", TABLE_CELL_FONT);
        swatch.setBackground(color, 5f, 2f, 1f, 2f);
        p.add(swatch);
        p.add(new Phrase("  " + label, TABLE_CELL_FONT));
        return p;
    }

    /** Mirrors the on-screen `MeshMapLegend` component: equipment-type colors (only the types
     * actually present on this map) plus the fixed local-node / off-site marker styles. */
    private PdfPCell buildMapLegendCell(List<String> resourceTypes) {
        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(PAPER);
        cell.setBorderColor(AMBER_BORDER);
        cell.setPadding(8f);

        if (!resourceTypes.isEmpty()) {
            Paragraph heading = new Paragraph("EQUIPMENT TYPE", LABEL_FONT);
            heading.setSpacingAfter(3f);
            cell.addElement(heading);
            for (String type : resourceTypes) {
                cell.addElement(legendLine(type, resourceTypeColor(type)));
            }
            Paragraph spacer = new Paragraph(" ", TABLE_CELL_FONT);
            spacer.setSpacingAfter(2f);
            cell.addElement(spacer);
        }

        Paragraph nodeHeading = new Paragraph("NODE STYLE", LABEL_FONT);
        nodeHeading.setSpacingAfter(3f);
        cell.addElement(nodeHeading);
        cell.addElement(legendLine("Local node (scanned from)", BLUE_DEEP));
        cell.addElement(legendLine("Off-site / not deployed here", new Color(0xB9, 0xB3, 0xA6)));

        return cell;
    }

    /** Map image alongside its legend, laid out the same way as the on-screen mesh-scan map
     * (map + sidebar legend) so the PDF page matches what the app shows. */
    private PdfPTable buildMapPageBody(String base64, List<String> resourceTypes, float availableWidth, float availableHeight) {
        float mapWidth = availableWidth - LEGEND_WIDTH - LEGEND_GAP;

        PdfPTable table = new PdfPTable(3);
        table.setWidthPercentage(100);
        try {
            table.setTotalWidth(new float[]{mapWidth, LEGEND_GAP, LEGEND_WIDTH});
        } catch (Exception ignored) {
            // widths array size always matches column count here
        }
        table.setLockedWidth(true);

        PdfPCell mapCell = new PdfPCell(buildMapImage(base64, mapWidth, availableHeight));
        mapCell.setBorderColor(AMBER_BORDER);
        mapCell.setPadding(0f);
        mapCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        mapCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        mapCell.setMinimumHeight(availableHeight);
        table.addCell(mapCell);

        PdfPCell gapCell = new PdfPCell();
        gapCell.setBorder(0);
        gapCell.setFixedHeight(availableHeight);
        table.addCell(gapCell);

        PdfPCell legendCell = buildMapLegendCell(resourceTypes);
        legendCell.setMinimumHeight(availableHeight);
        table.addCell(legendCell);

        return table;
    }

    /** Renders the header + map image onto an off-page template sized as if it were a *portrait*
     * content area, then stamps that template onto the (always-landscape) page rotated 90° — the
     * physical page stays landscape like every other page in the document, but the reader turns
     * the printed page sideways to view this one right-side-up, the same convention used for
     * fold-out/rotated pages in printed reports. */
    private void addRotatedMapPage(Document document, PdfContentByte canvas, Incident incident,
                                    MeshSessionDetailResponse session, String mapImageBase64,
                                    List<String> resourceTypes) throws DocumentException {
        float pageW = document.getPageSize().getWidth();
        float pageH = document.getPageSize().getHeight();
        float contentW = pageW - MARGIN_LEFT - MARGIN_RIGHT;
        float contentH = pageH - MARGIN_TOP - MARGIN_BOTTOM;
        // The template's local space is the *swapped* content box — after a 90° rotation its
        // bounding box becomes exactly contentW x contentH again, so it fills the page's content
        // area with no clipping and no guesswork.
        float virtualW = contentH;
        float virtualH = contentW;

        PdfTemplate template = canvas.createTemplate(virtualW, virtualH);

        PdfPTable header = buildHeaderBlock(incident, session, "MESH TOPOLOGY MAP");
        header.setTotalWidth(virtualW);
        header.setLockedWidth(true);
        float headerHeight = header.getTotalHeight();
        header.writeSelectedRows(0, -1, 0, virtualH, template);

        float spacer = 8f;
        float bodyAreaHeight = virtualH - headerHeight - spacer;
        PdfPTable body = buildMapPageBody(mapImageBase64, resourceTypes, virtualW, bodyAreaHeight);
        body.writeSelectedRows(0, -1, 0, bodyAreaHeight, template);

        // 90° rotation matrix (a,b,c,d) = (0,1,-1,0), translated so the rotated template's
        // bounding box exactly covers the page's content area starting at (MARGIN_LEFT, MARGIN_BOTTOM).
        canvas.addTemplate(template, 0, 1, -1, 0, pageW - MARGIN_RIGHT, MARGIN_BOTTOM);
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
            PdfPCell cell = new PdfPCell(new Phrase(header, TABLE_HEADER_FONT));
            cell.setBackgroundColor(INK);
            cell.setBorderColor(INK);
            cell.setPadding(4f);
            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            table.addCell(cell);
        }

        if (nodes.isEmpty()) {
            PdfPCell empty = new PdfPCell(new Phrase("No nodes recorded", TABLE_CELL_FONT));
            empty.setColspan(headers.length);
            empty.setPadding(6f);
            empty.setBorderColor(AMBER_BORDER);
            table.addCell(empty);
            return table;
        }

        boolean stripe = false;
        for (MeshNodeSnapshotResponse n : nodes) {
            Color rowColor = stripe ? NEUTRAL_BAND : WHITE;
            String hostname = n.hostname() + (n.isLocalNode() ? " (local)" : "");
            addBodyCell(table, hostname, rowColor, TABLE_CELL_FONT);
            addBodyCell(table, nullToDash(n.model()), rowColor, TABLE_CELL_MUTED_FONT);
            addBodyCell(table, nullToDash(n.firmwareVersion()), rowColor, TABLE_CELL_MUTED_FONT);
            addBodyCell(table, nullToDash(n.channel()), rowColor, TABLE_CELL_FONT);
            addBodyCell(table, nullToDash(n.band()), rowColor, TABLE_CELL_FONT);
            addBodyCell(table, nullToDash(n.resourceIdentifier()), rowColor, TABLE_CELL_FONT);
            addBodyCell(table, locationText(n, openCheckInByResource), rowColor, TABLE_CELL_MUTED_FONT);
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
            PdfPCell cell = new PdfPCell(new Phrase(header, TABLE_HEADER_FONT));
            cell.setBackgroundColor(INK);
            cell.setBorderColor(INK);
            cell.setPadding(4f);
            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            table.addCell(cell);
        }

        if (links.isEmpty()) {
            PdfPCell empty = new PdfPCell(new Phrase("No links recorded", TABLE_CELL_FONT));
            empty.setColspan(headers.length);
            empty.setPadding(6f);
            empty.setBorderColor(AMBER_BORDER);
            table.addCell(empty);
            return table;
        }

        boolean stripe = false;
        for (MeshLinkSnapshotResponse l : links) {
            Color rowColor = stripe ? NEUTRAL_BAND : WHITE;
            addBodyCell(table, l.fromHostname(), rowColor, TABLE_CELL_FONT);
            addBodyCell(table, l.toHostname(), rowColor, TABLE_CELL_FONT);
            addBodyCell(table, linkTypeLabel(l.linkTypeNormalized()), rowColor, TABLE_CELL_FONT);
            addBodyCell(table, nullToDash(l.linkQualityStatus()), rowColor, TABLE_CELL_MUTED_FONT);
            addBodyCell(table, nullToDash(l.rxPercent()), rowColor, TABLE_CELL_FONT);
            addBodyCell(table, nullToDash(l.rttMs()), rowColor, TABLE_CELL_FONT);
            addBodyCell(table, nullToDash(l.snr()), rowColor, TABLE_CELL_FONT);
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
            PdfPCell cell = new PdfPCell(new Phrase(header, TABLE_HEADER_FONT));
            cell.setBackgroundColor(INK);
            cell.setBorderColor(INK);
            cell.setPadding(4f);
            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            table.addCell(cell);
        }

        if (lanClients.isEmpty()) {
            PdfPCell empty = new PdfPCell(new Phrase("No LAN devices recorded", TABLE_CELL_FONT));
            empty.setColspan(headers.length);
            empty.setPadding(6f);
            empty.setBorderColor(AMBER_BORDER);
            table.addCell(empty);
            return table;
        }

        boolean stripe = false;
        for (MeshLanClientSnapshotResponse c : lanClients) {
            Color rowColor = stripe ? NEUTRAL_BAND : WHITE;
            addBodyCell(table, c.deviceHostname(), rowColor, TABLE_CELL_FONT);
            addBodyCell(table, c.nodeHostname(), rowColor, TABLE_CELL_FONT);
            addBodyCell(table, nullToDash(c.resourceIdentifier()), rowColor, TABLE_CELL_FONT);
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

    private void addBodyCell(PdfPTable table, String text, Color background, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(background);
        cell.setBorderColor(AMBER_BORDER);
        cell.setPadding(3f);
        table.addCell(cell);
    }

    private Paragraph sectionLabel(String text) {
        return new Paragraph(text, SECTION_FONT);
    }

    private Paragraph spacer(float sizeInPoints) {
        Paragraph p = new Paragraph(" ", FontFactory.getFont(FontFactory.HELVETICA, sizeInPoints));
        p.setLeading(sizeInPoints);
        return p;
    }

    private String nullToDash(String value) {
        return value == null || value.isBlank() ? "—" : value;
    }
}
