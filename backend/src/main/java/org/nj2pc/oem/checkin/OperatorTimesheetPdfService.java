package org.nj2pc.oem.checkin;

import org.nj2pc.oem.common.ApiException;
import org.nj2pc.oem.incident.Incident;
import org.nj2pc.oem.incident.IncidentRepository;
import org.nj2pc.oem.operator.Operator;
import org.nj2pc.oem.operator.OperatorPhotoService;
import org.nj2pc.oem.operator.OperatorRepository;
import org.nj2pc.oem.operator.Permission;
import org.nj2pc.oem.operator.PermissionGuard;
import org.nj2pc.oem.pdf.OperatorCredentialCardData;
import org.nj2pc.oem.pdf.OperatorCredentialPdfSupport;
import org.nj2pc.oem.pdf.PdfSupport;
import org.nj2pc.oem.pdf.PdfTheme;
import org.nj2pc.oem.vehicle.Vehicle;
import org.nj2pc.oem.vehicle.VehiclePlateFormatter;
import org.nj2pc.oem.vehicle.VehicleRepository;
import org.openpdf.text.Document;
import org.openpdf.text.Element;
import org.openpdf.text.PageSize;
import org.openpdf.text.Paragraph;
import org.openpdf.text.Phrase;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;
import org.openpdf.text.pdf.PdfWriter;
import org.springframework.core.io.Resource;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class OperatorTimesheetPdfService {

    private final IncidentRepository incidentRepository;
    private final OperatorCheckInService operatorCheckInService;
    private final OperatorRepository operatorRepository;
    private final VehicleRepository vehicleRepository;
    private final OperatorPhotoService operatorPhotoService;
    private final PermissionGuard permissionGuard;

    public OperatorTimesheetPdfService(IncidentRepository incidentRepository,
                                        OperatorCheckInService operatorCheckInService,
                                        OperatorRepository operatorRepository,
                                        VehicleRepository vehicleRepository,
                                        OperatorPhotoService operatorPhotoService,
                                        PermissionGuard permissionGuard) {
        this.incidentRepository = incidentRepository;
        this.operatorCheckInService = operatorCheckInService;
        this.operatorRepository = operatorRepository;
        this.vehicleRepository = vehicleRepository;
        this.operatorPhotoService = operatorPhotoService;
        this.permissionGuard = permissionGuard;
    }

    @Transactional(readOnly = true)
    public byte[] generate(Authentication authentication, Long incidentId) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> ApiException.notFound("Incident not found: " + incidentId));
        List<OperatorCheckInResponse> checkIns = operatorCheckInService.findByIncident(incidentId);
        List<OperatorCredentialCardData> team = buildTeamCards(authentication, checkIns);

        Document document = new Document(PageSize.LETTER.rotate(),
                PdfSupport.MARGIN_LEFT, PdfSupport.MARGIN_RIGHT, PdfSupport.MARGIN_TOP, PdfSupport.MARGIN_BOTTOM);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new PdfSupport.PaperBackground());
            document.open();

            document.add(buildHeaderBlock(incident, "TEAM ROSTER"));
            document.add(PdfSupport.spacer(8f));
            document.add(OperatorCredentialPdfSupport.buildCredentialGrid(team, "0Y-AuxComs"));

            document.newPage();
            document.add(buildHeaderBlock(incident, "OPERATOR TIME SHEET"));
            document.add(PdfSupport.spacer(8f));
            document.add(OperatorCredentialPdfSupport.buildTimeSheetTable(checkIns));

            document.close();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate operator timesheet PDF", e);
        }

        return out.toByteArray();
    }

    /** One card per team member (most recent check-in on this incident determines role and
     * checked-in/out status), matching frontend IncidentOperators.tsx's `team` memo exactly.
     * Public so the incident-summary PDF's team/timesheet page can build the exact same card
     * data rather than a second, possibly-drifting implementation. */
    public List<OperatorCredentialCardData> buildTeamCards(Authentication authentication, List<OperatorCheckInResponse> checkIns) {
        Operator caller = operatorRepository.findByCallsignIgnoreCase(authentication.getName()).orElse(null);
        boolean canViewAll = permissionGuard.has(authentication, Permission.OPERATOR_VIEW_CONTACT);

        Map<Long, OperatorCheckInResponse> lastByOperator = new LinkedHashMap<>();
        for (OperatorCheckInResponse c : checkIns) {
            lastByOperator.putIfAbsent(c.operatorId(), c);
        }

        Map<Long, Operator> operatorById = new LinkedHashMap<>();
        for (Operator o : operatorRepository.findAllById(lastByOperator.keySet())) {
            operatorById.put(o.getId(), o);
        }

        List<OperatorCredentialCardData> team = new ArrayList<>();
        for (Map.Entry<Long, OperatorCheckInResponse> entry : lastByOperator.entrySet()) {
            Long operatorId = entry.getKey();
            OperatorCheckInResponse c = entry.getValue();
            Operator op = operatorById.get(operatorId);
            boolean canViewContact = canViewAll || (caller != null && caller.getId().equals(operatorId));

            byte[] photoBytes = null;
            if (op != null && op.getPhotoPath() != null) {
                try {
                    Resource resource = operatorPhotoService.load(operatorId);
                    photoBytes = resource.getInputStream().readAllBytes();
                } catch (Exception ignored) {
                    photoBytes = null;
                }
            }

            List<Vehicle> vehicles = vehicleRepository.findByOperatorId(operatorId);

            team.add(new OperatorCredentialCardData(
                    operatorId,
                    c.operatorCallsign(),
                    op != null ? op.getName() : c.operatorCallsign(),
                    op != null ? op.getLicenseClass() : null,
                    c.roleName(),
                    c.roleColor(),
                    c.roleAccessLevel(),
                    op != null ? op.getPhone() : null,
                    op != null ? op.getEmail() : null,
                    VehiclePlateFormatter.summarize(vehicles),
                    canViewContact,
                    photoBytes,
                    c.checkedOutAt() == null,
                    c.checkedInAt(),
                    null
            ));
        }
        team.sort((a, b) -> a.callsign().compareToIgnoreCase(b.callsign()));
        return team;
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
        orgText.add(new Phrase("Team Roster & Timesheet", PdfTheme.ORG_TAGLINE_FONT));
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

        PdfPCell rightCell = new PdfPCell(rightNested);
        rightCell.setPadding(0f);
        rightCell.setBorderColor(PdfTheme.AMBER_BORDER);
        table.addCell(rightCell);

        return table;
    }
}
