package org.nj2pc.oem.checkin;

import org.nj2pc.oem.common.ApiException;
import org.nj2pc.oem.incident.Incident;
import org.nj2pc.oem.incident.IncidentRepository;
import org.nj2pc.oem.pdf.CapturedImagePdfSupport;
import org.nj2pc.oem.pdf.OperatorCredentialPdfSupport;
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

import java.io.ByteArrayOutputStream;
import java.util.List;

@Service
public class OperatorTimesheetPdfService {

    private final IncidentRepository incidentRepository;
    private final OperatorCheckInService operatorCheckInService;

    public OperatorTimesheetPdfService(IncidentRepository incidentRepository,
                                        OperatorCheckInService operatorCheckInService) {
        this.incidentRepository = incidentRepository;
        this.operatorCheckInService = operatorCheckInService;
    }

    @Transactional(readOnly = true)
    public byte[] generate(Long incidentId, OperatorTimesheetPdfRequest request) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> ApiException.notFound("Incident not found: " + incidentId));
        List<OperatorCheckInResponse> checkIns = operatorCheckInService.findByIncident(incidentId);
        List<String> teamCardPages = request.teamCardsImageBase64() != null ? request.teamCardsImageBase64() : List.of();

        Document document = new Document(PageSize.LETTER.rotate(),
                PdfSupport.MARGIN_LEFT, PdfSupport.MARGIN_RIGHT, PdfSupport.MARGIN_TOP, PdfSupport.MARGIN_BOTTOM);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new PdfSupport.PaperBackground());
            document.open();

            if (teamCardPages.isEmpty()) {
                document.add(buildHeaderBlock(incident, "TEAM ROSTER"));
                document.add(PdfSupport.spacer(8f));
                document.add(new Paragraph("No team members have checked in to this incident yet.", PdfTheme.VALUE_FONT));
            } else {
                for (int i = 0; i < teamCardPages.size(); i++) {
                    if (i > 0) document.newPage();
                    addTeamCardsPage(document, incident, teamCardPages.get(i));
                }
            }

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

    /** One "TEAM ROSTER" page per client-captured credential-card-grid image (4x2 cards each) —
     * a client-side snapshot of the real CredentialCardCompact components rather than a
     * server-side rebuild, so the PDF matches the web Team page exactly (same pattern as the
     * incident map page's client-captured mapImageBase64). */
    private void addTeamCardsPage(Document document, Incident incident, String imageBase64) throws DocumentException {
        PdfPTable header = buildHeaderBlock(incident, "TEAM ROSTER");
        float availableWidth = document.getPageSize().getWidth() - document.leftMargin() - document.rightMargin();
        header.setTotalWidth(availableWidth);
        float headerHeight = header.getTotalHeight();
        document.add(header);
        float spacerHeight = 8f;
        document.add(PdfSupport.spacer(spacerHeight));
        float availableHeight = document.getPageSize().getHeight() - document.topMargin() - document.bottomMargin()
                - headerHeight - spacerHeight;
        document.add(CapturedImagePdfSupport.decodeFitted(imageBase64, availableWidth, availableHeight));
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
