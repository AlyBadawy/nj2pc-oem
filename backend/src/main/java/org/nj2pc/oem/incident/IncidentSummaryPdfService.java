package org.nj2pc.oem.incident;

import org.nj2pc.oem.checkin.OperatorCheckInResponse;
import org.nj2pc.oem.checkin.OperatorCheckInService;
import org.nj2pc.oem.checkin.ResourceCheckInResponse;
import org.nj2pc.oem.checkin.ResourceCheckInService;
import org.nj2pc.oem.commsplan.Ics205PdfService;
import org.nj2pc.oem.commsplan.IncidentCommsPlanApplicationResponse;
import org.nj2pc.oem.commsplan.IncidentCommsPlanApplicationService;
import org.nj2pc.oem.common.ApiException;
import org.nj2pc.oem.deploymentlocation.DeploymentLocationResponse;
import org.nj2pc.oem.deploymentlocation.DeploymentLocationService;
import org.nj2pc.oem.mesh.MeshNodeSnapshotResponse;
import org.nj2pc.oem.mesh.MeshSessionDetailResponse;
import org.nj2pc.oem.mesh.MeshSessionService;
import org.nj2pc.oem.mesh.MeshSessionSummaryResponse;
import org.nj2pc.oem.pdf.CapturedImagePdfSupport;
import org.nj2pc.oem.pdf.DeploymentMapSupport;
import org.nj2pc.oem.pdf.MeshMapPdfSupport;
import org.nj2pc.oem.pdf.OperatorCredentialPdfSupport;
import org.nj2pc.oem.pdf.PdfMergeSupport;
import org.nj2pc.oem.pdf.PdfSupport;
import org.nj2pc.oem.pdf.PdfTheme;
import org.openpdf.text.Document;
import org.openpdf.text.DocumentException;
import org.openpdf.text.Element;
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
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class IncidentSummaryPdfService {

    private record ScanSummary(MeshSessionSummaryResponse summary, List<String> bandsUsed) {
    }

    private final IncidentRepository incidentRepository;
    private final OperatorCheckInService operatorCheckInService;
    private final IncidentLogService incidentLogService;
    private final MeshSessionService meshSessionService;
    private final ResourceCheckInService resourceCheckInService;
    private final DeploymentLocationService deploymentLocationService;
    private final IncidentCommsPlanApplicationService incidentCommsPlanApplicationService;
    private final Ics205PdfService ics205PdfService;

    public IncidentSummaryPdfService(IncidentRepository incidentRepository,
                                      OperatorCheckInService operatorCheckInService,
                                      IncidentLogService incidentLogService,
                                      MeshSessionService meshSessionService,
                                      ResourceCheckInService resourceCheckInService,
                                      DeploymentLocationService deploymentLocationService,
                                      IncidentCommsPlanApplicationService incidentCommsPlanApplicationService,
                                      Ics205PdfService ics205PdfService) {
        this.incidentRepository = incidentRepository;
        this.operatorCheckInService = operatorCheckInService;
        this.incidentLogService = incidentLogService;
        this.meshSessionService = meshSessionService;
        this.resourceCheckInService = resourceCheckInService;
        this.deploymentLocationService = deploymentLocationService;
        this.incidentCommsPlanApplicationService = incidentCommsPlanApplicationService;
        this.ics205PdfService = ics205PdfService;
    }

    @Transactional(readOnly = true)
    public byte[] generate(Long incidentId, IncidentPdfRequest request) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> ApiException.notFound("Incident not found: " + incidentId));

        List<OperatorCheckInResponse> operatorCheckIns = operatorCheckInService.findByIncident(incidentId);
        List<IncidentLogResponse> logs = incidentLogService.findByIncident(incidentId);
        List<MeshSessionSummaryResponse> meshSessions = meshSessionService.findByIncident(incidentId);
        List<ResourceCheckInResponse> resourceCheckIns = resourceCheckInService.findByIncident(incidentId);
        List<DeploymentLocationResponse> deploymentLocations = deploymentLocationService.findByIncident(incidentId);

        IncidentCommsPlanApplicationResponse activeCommsPlan =
                incidentCommsPlanApplicationService.findActive(incidentId).orElse(null);

        // Mesh scan list only carries node/link counts — bands live per-node on each scan's own
        // detail response, so pull each scan's detail once to aggregate its distinct bands. Same
        // per-session access pattern MeshSessionPdfService already uses; incident scan counts are
        // small in practice so this stays a handful of extra reads, not a real N+1 concern.
        List<ScanSummary> scanSummaries = meshSessions.stream()
                .map(s -> {
                    MeshSessionDetailResponse detail = meshSessionService.findById(incidentId, s.id());
                    List<String> bands = detail.nodes().stream()
                            .map(MeshNodeSnapshotResponse::band)
                            .filter(b -> b != null && !b.isBlank())
                            .distinct().sorted().toList();
                    return new ScanSummary(s, bands);
                }).toList();

        // Only currently-deployed gear — used by the Deployment Locations & Gear page's
        // historical-vs-current distinction below, not the map (see mapNodeTypes).
        List<ResourceCheckInResponse> deployedGear = resourceCheckIns.stream()
                .filter(c -> c.checkedOutAt() == null)
                .toList();

        // The Deployment Locations & Gear page, unlike the map legend above, is a historical
        // record of the incident — it should list every piece of gear that was *ever* deployed
        // to each location, not just what's still checked in there right now (which would go
        // empty for a closed incident, since ending an incident checks everything out).
        // deploymentLocationId/latitude/longitude are retained permanently on a check-in row —
        // checkout only sets checkedOutAt (see ResourceCheckInService.checkOut) — so the full,
        // unfiltered check-in list already carries this history. One row per resource per
        // location (its most recent check-in there) avoids listing the same item twice if it
        // was checked in/out at the same spot more than once.
        Map<Long, List<ResourceCheckInResponse>> gearByLocationId = resourceCheckIns.stream()
                .filter(c -> c.deploymentLocationId() != null)
                .collect(Collectors.groupingBy(
                        ResourceCheckInResponse::deploymentLocationId,
                        Collectors.collectingAndThen(Collectors.toList(), list -> list.stream()
                                .collect(Collectors.toMap(ResourceCheckInResponse::resourceId, c -> c,
                                        (a, b) -> a.checkedInAt().isAfter(b.checkedInAt()) ? a : b))
                                .values().stream()
                                .sorted(Comparator.comparing(ResourceCheckInResponse::resourceIdentifier, String.CASE_INSENSITIVE_ORDER))
                                .toList())));

        boolean rotateMapContent = "PORTRAIT".equalsIgnoreCase(request.orientation());

        // The map page shows only the most recent mesh scan's nodes (frontend sends a snapshot
        // captured from exactly that scan's data, not the dashboard's broader "all deployed gear"
        // mix) — so the legend must be built from that same scan's nodes, not from deployed gear,
        // or it would list equipment types (batteries, cameras, etc.) that never appear on the map.
        MeshSessionSummaryResponse latestSession = meshSessions.stream()
                .max(Comparator.comparing(MeshSessionSummaryResponse::capturedAt))
                .orElse(null);
        List<String> mapNodeTypes = latestSession == null ? List.of()
                : meshSessionService.findById(incidentId, latestSession.id()).nodes().stream()
                        .map(MeshNodeSnapshotResponse::resourceTypeName)
                        .filter(t -> t != null && !t.isBlank())
                        .distinct().sorted().toList();

        byte[] partA = renderPartA(incident, request, rotateMapContent, operatorCheckIns, mapNodeTypes);
        byte[] commsPlanPart = activeCommsPlan != null
                ? ics205PdfService.generate(activeCommsPlan.communicationPlanId())
                : renderNoCommsPlanPage(incident);
        byte[] partB = renderPartB(incident, logs, scanSummaries, deploymentLocations, gearByLocationId);

        return PdfMergeSupport.merge(List.of(partA, commsPlanPart, partB));
    }

    /** Summary, Map, and Team Roster/Timesheet pages. */
    private byte[] renderPartA(Incident incident, IncidentPdfRequest request, boolean rotateMapContent,
                                List<OperatorCheckInResponse> operatorCheckIns, List<String> mapNodeTypes) {
        return renderDocument((document, writer) -> {
            addSummaryPage(document, incident);

            document.newPage();
            if (rotateMapContent) {
                MeshMapPdfSupport.addRotatedMapPage(document, writer.getDirectContent(),
                        buildHeaderBlock(incident, "INCIDENT MAP"), request.mapImageBase64(), mapNodeTypes);
            } else {
                PdfPTable header = buildHeaderBlock(incident, "INCIDENT MAP");
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

            // Team roster — one page per client-captured credential-card-grid image (same
            // client-side capture the dedicated Team/Timesheet PDF uses), so the page matches
            // the web Team page pixel-for-pixel instead of a server-rebuilt approximation.
            List<String> teamCardPages = request.teamCardsImageBase64() != null ? request.teamCardsImageBase64() : List.of();
            for (String teamCardImage : teamCardPages) {
                document.newPage();
                PdfPTable teamHeader = buildHeaderBlock(incident, "TEAM ROSTER");
                float teamAvailableWidth = document.getPageSize().getWidth() - document.leftMargin() - document.rightMargin();
                teamHeader.setTotalWidth(teamAvailableWidth);
                float teamHeaderHeight = teamHeader.getTotalHeight();
                document.add(teamHeader);
                document.add(PdfSupport.spacer(8f));
                float teamAvailableHeight = document.getPageSize().getHeight() - document.topMargin() - document.bottomMargin()
                        - teamHeaderHeight - 8f;
                document.add(CapturedImagePdfSupport.decodeFitted(teamCardImage, teamAvailableWidth, teamAvailableHeight));
            }

            document.newPage();
            document.add(buildHeaderBlock(incident, "OPERATOR TIME SHEET"));
            document.add(PdfSupport.spacer(8f));
            document.add(OperatorCredentialPdfSupport.buildTimeSheetTable(operatorCheckIns));
        });
    }

    /** Message Log, Mesh Scans, and Deployment Locations & Gear pages. */
    private byte[] renderPartB(Incident incident, List<IncidentLogResponse> logs, List<ScanSummary> scanSummaries,
                               List<DeploymentLocationResponse> deploymentLocations,
                               Map<Long, List<ResourceCheckInResponse>> gearByLocationId) {
        return renderDocument((document, writer) -> {
            document.add(buildHeaderBlock(incident, "MESSAGE LOG"));
            document.add(PdfSupport.spacer(8f));
            document.add(buildMessageLogTable(logs));

            document.newPage();
            document.add(buildHeaderBlock(incident, "MESH SCANS"));
            document.add(PdfSupport.spacer(8f));
            document.add(buildMeshScansTable(scanSummaries));

            document.newPage();
            document.add(buildHeaderBlock(incident, "DEPLOYMENT LOCATIONS & GEAR"));
            document.add(PdfSupport.spacer(8f));
            addDeploymentLocationsSection(document, deploymentLocations, gearByLocationId);
        });
    }

    private byte[] renderNoCommsPlanPage(Incident incident) {
        return renderDocument((document, writer) -> {
            document.add(buildHeaderBlock(incident, "COMMUNICATIONS PLAN"));
            document.add(PdfSupport.spacer(8f));
            document.add(new Paragraph("No communications plan is currently applied to this incident.", PdfTheme.VALUE_FONT));
        });
    }

    private interface DocumentBuilder {
        void build(Document document, PdfWriter writer) throws DocumentException;
    }

    private byte[] renderDocument(DocumentBuilder builder) {
        Document document = new Document(PageSize.LETTER.rotate(),
                PdfSupport.MARGIN_LEFT, PdfSupport.MARGIN_RIGHT, PdfSupport.MARGIN_TOP, PdfSupport.MARGIN_BOTTOM);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new PdfSupport.PaperBackground());
            document.open();
            builder.build(document, writer);
            document.close();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate incident PDF section", e);
        }
        return out.toByteArray();
    }

    private void addSummaryPage(Document document, Incident incident) {
        try {
            document.add(buildHeaderBlock(incident, "INCIDENT SUMMARY"));
            document.add(PdfSupport.spacer(10f));

            PdfPTable grid = new PdfPTable(2);
            grid.setWidthPercentage(100);
            grid.setWidths(new float[]{1f, 1f});
            grid.addCell(PdfSupport.nestedLabeledCell("Name", incident.getName()));
            grid.addCell(PdfSupport.nestedLabeledCell("Status", incident.getStatus().name()));
            grid.addCell(PdfSupport.nestedLabeledCell("Location", incident.getLocation()));
            grid.addCell(PdfSupport.nestedLabeledCell("Created By", incident.getCreatedBy() != null ? incident.getCreatedBy().getCallsign() : null));
            grid.addCell(PdfSupport.nestedLabeledCell("Planned Start", formatInstant(incident.getPlannedStartTime())));
            grid.addCell(PdfSupport.nestedLabeledCell("Planned End", formatInstant(incident.getPlannedEndTime())));
            grid.addCell(PdfSupport.nestedLabeledCell("Actual Start", formatInstant(incident.getActualStartTime())));
            grid.addCell(PdfSupport.nestedLabeledCell("Actual End", formatInstant(incident.getActualEndTime())));
            document.add(grid);
            document.add(PdfSupport.spacer(10f));

            document.add(PdfSupport.sectionLabel("Description"));
            document.add(PdfSupport.spacer(3f));
            PdfPTable descBox = new PdfPTable(1);
            descBox.setWidthPercentage(100);
            PdfPCell descCell = new PdfPCell(new Phrase(PdfSupport.nullToDash(incident.getDescription()), PdfTheme.VALUE_FONT));
            descCell.setBackgroundColor(PdfTheme.PAPER);
            descCell.setBorderColor(PdfTheme.AMBER_BORDER);
            descCell.setPadding(8f);
            descCell.setMinimumHeight(80f);
            descBox.addCell(descCell);
            document.add(descBox);
        } catch (DocumentException e) {
            throw new RuntimeException("Failed to render incident summary page", e);
        }
    }

    private String formatInstant(java.time.Instant instant) {
        return instant == null ? "—" : PdfTheme.DATE_TIME_FMT.format(instant);
    }

    private PdfPTable buildHeaderBlock(Incident incident, String title) {
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
        orgText.add(new Phrase("Incident Report", PdfTheme.ORG_TAGLINE_FONT));
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
        rightNested.addCell(PdfSupport.nestedLabeledCell("Status", incident.getStatus().name()));

        PdfPCell rightCell = new PdfPCell(rightNested);
        rightCell.setPadding(0f);
        rightCell.setBorderColor(PdfTheme.AMBER_BORDER);
        table.addCell(rightCell);

        return table;
    }

    private PdfPTable buildMessageLogTable(List<IncidentLogResponse> logs) {
        String[] headers = {"Logged At", "From", "To", "Subject", "Message", "Priority"};
        float[] widths = {1f, 0.8f, 0.8f, 1.1f, 2f, 0.7f};

        PdfPTable table = newTable(headers, widths);
        if (logs.isEmpty()) {
            addEmptyRow(table, headers.length, "No messages logged");
            return table;
        }

        boolean stripe = false;
        for (IncidentLogResponse l : logs) {
            Color rowColor = stripe ? PdfTheme.NEUTRAL_BAND : PdfTheme.WHITE;
            PdfSupport.addBodyCell(table, formatInstant(l.loggedAt()), rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, PdfSupport.nullToDash(l.operatorCallsign()), rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, PdfSupport.nullToDash(l.toOperatorCallsign()), rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, PdfSupport.nullToDash(l.subject()), rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, PdfSupport.nullToDash(l.message()), rowColor, PdfTheme.TABLE_CELL_MUTED_FONT);

            PdfPCell priorityCell = new PdfPCell(new Phrase(l.priority().name(),
                    org.openpdf.text.FontFactory.getFont(org.openpdf.text.FontFactory.HELVETICA_BOLD, 7, priorityColor(l.priority()))));
            priorityCell.setBackgroundColor(rowColor);
            priorityCell.setBorderColor(PdfTheme.AMBER_BORDER);
            priorityCell.setPadding(3f);
            table.addCell(priorityCell);
            stripe = !stripe;
        }
        return table;
    }

    private Color priorityColor(Priority priority) {
        return switch (priority) {
            case EMERGENCY -> PdfTheme.RED;
            case PRIORITY -> PdfTheme.AMBER_TEXT;
            case ROUTINE -> PdfTheme.GREEN;
        };
    }

    private PdfPTable buildMeshScansTable(List<ScanSummary> scans) {
        String[] headers = {"Label", "Captured At", "Nodes", "Links", "Bands Used"};
        float[] widths = {1.2f, 1f, 0.6f, 0.6f, 1.4f};

        PdfPTable table = newTable(headers, widths);
        if (scans.isEmpty()) {
            addEmptyRow(table, headers.length, "No mesh scans recorded");
            return table;
        }

        boolean stripe = false;
        for (ScanSummary s : scans) {
            Color rowColor = stripe ? PdfTheme.NEUTRAL_BAND : PdfTheme.WHITE;
            PdfSupport.addBodyCell(table, PdfSupport.nullToDash(s.summary().label()), rowColor, PdfTheme.TABLE_CELL_FONT);
            String capturedAt = s.summary().capturedAt() == null ? "—" : PdfTheme.DATE_TIME_FMT_ET.format(s.summary().capturedAt());
            PdfSupport.addBodyCell(table, capturedAt, rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, String.valueOf(s.summary().nodeCount()), rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, String.valueOf(s.summary().linkCount()), rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, s.bandsUsed().isEmpty() ? "—" : String.join(", ", s.bandsUsed()), rowColor, PdfTheme.TABLE_CELL_MUTED_FONT);
            stripe = !stripe;
        }
        return table;
    }

    private void addDeploymentLocationsSection(Document document, List<DeploymentLocationResponse> locations,
                                                Map<Long, List<ResourceCheckInResponse>> gearByLocationId) throws DocumentException {
        if (locations.isEmpty()) {
            document.add(new Paragraph("No deployment locations recorded for this incident.", PdfTheme.VALUE_FONT));
            return;
        }

        Map<String, java.awt.image.BufferedImage> tileCache = DeploymentMapSupport.newTileCache();

        boolean first = true;
        for (DeploymentLocationResponse loc : locations) {
            if (!first) {
                document.add(PdfSupport.spacer(8f));
            }
            first = false;

            PdfPTable locHeader = new PdfPTable(2);
            locHeader.setWidthPercentage(100);
            locHeader.setWidths(new float[]{2f, 1f});
            locHeader.addCell(PdfSupport.nestedLabeledCell(loc.name(), PdfSupport.nullToDash(loc.notes())));
            String coords = loc.latitude() != null && loc.longitude() != null
                    ? loc.latitude() + ", " + loc.longitude() : null;
            locHeader.addCell(PdfSupport.nestedLabeledCell("Coordinates", coords));
            document.add(locHeader);
            document.add(PdfSupport.spacer(6f));

            List<ResourceCheckInResponse> gear = gearByLocationId.getOrDefault(loc.id(), List.of());

            // Small static map beside the gear table — a fixed 2in x 2in square (per-location
            // "where is this" snapshot), not an interactive map.
            PdfPTable mapAndGear = new PdfPTable(2);
            mapAndGear.setWidthPercentage(100);
            mapAndGear.setWidths(new float[]{1f, 3f});
            mapAndGear.addCell(DeploymentMapSupport.buildMapCell(loc.latitude(), loc.longitude(), tileCache));
            PdfPCell gearCell = new PdfPCell(buildGearTable(gear));
            gearCell.setBorder(0);
            gearCell.setPadding(0f);
            mapAndGear.addCell(gearCell);
            document.add(mapAndGear);
        }
    }

    private PdfPTable buildGearTable(List<ResourceCheckInResponse> gear) {
        String[] headers = {"Identifier", "Type"};
        float[] widths = {1.5f, 1.5f};

        PdfPTable table = newTable(headers, widths);
        if (gear.isEmpty()) {
            addEmptyRow(table, headers.length, "No gear currently at this location");
            return table;
        }

        boolean stripe = false;
        for (ResourceCheckInResponse c : gear) {
            Color rowColor = stripe ? PdfTheme.NEUTRAL_BAND : PdfTheme.WHITE;
            PdfSupport.addBodyCell(table, PdfSupport.nullToDash(c.resourceIdentifier()), rowColor, PdfTheme.TABLE_CELL_FONT);
            PdfSupport.addBodyCell(table, PdfSupport.nullToDash(c.resourceTypeName()), rowColor, PdfTheme.TABLE_CELL_MUTED_FONT);
            stripe = !stripe;
        }
        return table;
    }

    private PdfPTable newTable(String[] headers, float[] widths) {
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
        return table;
    }

    private void addEmptyRow(PdfPTable table, int colspan, String text) {
        PdfPCell empty = new PdfPCell(new Phrase(text, PdfTheme.TABLE_CELL_FONT));
        empty.setColspan(colspan);
        empty.setPadding(6f);
        empty.setBorderColor(PdfTheme.AMBER_BORDER);
        table.addCell(empty);
    }
}
