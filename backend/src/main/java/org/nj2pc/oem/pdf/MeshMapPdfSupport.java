package org.nj2pc.oem.pdf;

import org.openpdf.text.Chunk;
import org.openpdf.text.Document;
import org.openpdf.text.DocumentException;
import org.openpdf.text.Element;
import org.openpdf.text.Image;
import org.openpdf.text.Paragraph;
import org.openpdf.text.pdf.PdfContentByte;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;
import org.openpdf.text.pdf.PdfTemplate;

import java.awt.Color;
import java.util.Base64;
import java.util.List;

/**
 * Map-image and legend helpers for any PDF that embeds a client-captured mesh-map snapshot
 * (currently the per-mesh-scan PDF and the incident-summary PDF). Kept separate from
 * {@link PdfSupport} because the color-hashing here encodes a cross-language contract with
 * frontend/src/lib/meshVisual.ts's `hashHue`/`resourceTypeColor` — the same resource type name
 * must always map to the same marker color in the browser and in the PDF.
 */
public final class MeshMapPdfSupport {

    private MeshMapPdfSupport() {
    }

    private static final float LEGEND_WIDTH = 150f;
    private static final float LEGEND_GAP = 10f;

    // Mirrors frontend/src/lib/meshVisual.ts's LINK_TYPE_COLOR — DTD/Tunnel/Unknown links get a
    // fixed color per type; RF links are colored by channel instead (see resourceTypeColor-style
    // hashHue below), so there's no single "RF color" swatch to match against.
    private static final Color LINK_DTD = new Color(0x2E, 0x6C, 0xA4);
    private static final Color LINK_TUNNEL = new Color(0x9C, 0x6B, 0x12);
    private static final Color LINK_UNKNOWN = new Color(0x8A, 0x8A, 0x8A);
    private static final Color LINK_RF_SWATCH = new Color(0x1D, 0x7E, 0x5C);

    private static Image decodeMapImage(String base64) {
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

    private static Image buildMapImage(String base64, float availableWidth, float availableHeight) {
        Image image = decodeMapImage(base64);
        image.scaleToFit(availableWidth, availableHeight);
        image.setAlignment(Element.ALIGN_CENTER);
        return image;
    }

    /** Deterministic hue-from-string hash matching the frontend's `hashHue` (meshVisual.ts) — a
     * 32-bit int hash truncated the same way JS's `| 0` does, so a given resource type name maps
     * to the exact same marker color here as it does on the incident/mesh-scan map pages. */
    public static int hashHue(String value) {
        int hash = 0;
        for (int i = 0; i < value.length(); i++) {
            hash = hash * 31 + value.charAt(i);
        }
        return Math.abs(hash) % 360;
    }

    /** Mirrors `resourceTypeColor` in meshVisual.ts (`hsl(hue, 68%, 46%)`). */
    public static Color resourceTypeColor(String typeName) {
        return hslToColor(hashHue(typeName), 0.68f, 0.46f);
    }

    private static Color hslToColor(int hueDeg, float saturation, float lightness) {
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
    private static Paragraph legendLine(String label, Color color) {
        Paragraph p = new Paragraph();
        p.setSpacingAfter(3f);
        Chunk swatch = new Chunk(" ", PdfTheme.TABLE_CELL_FONT);
        swatch.setBackground(color, 5f, 2f, 1f, 2f);
        p.add(swatch);
        p.add(new org.openpdf.text.Phrase("  " + label, PdfTheme.TABLE_CELL_FONT));
        return p;
    }

    private static void addSpacer(PdfPCell cell) {
        Paragraph spacer = new Paragraph(" ", PdfTheme.TABLE_CELL_FONT);
        spacer.setSpacingAfter(2f);
        cell.addElement(spacer);
    }

    /** Mirrors the on-screen `MeshMapLegend` component: equipment-type colors (only the types
     * actually present on this map), link-type colors, and the fixed local-node / off-site
     * marker styles. */
    private static PdfPCell buildMapLegendCell(List<String> resourceTypes) {
        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(PdfTheme.PAPER);
        cell.setBorderColor(PdfTheme.AMBER_BORDER);
        cell.setPadding(8f);

        if (!resourceTypes.isEmpty()) {
            Paragraph heading = new Paragraph("EQUIPMENT TYPE", PdfTheme.LABEL_FONT);
            heading.setSpacingAfter(3f);
            cell.addElement(heading);
            for (String type : resourceTypes) {
                cell.addElement(legendLine(type, resourceTypeColor(type)));
            }
            addSpacer(cell);
        }

        Paragraph linkHeading = new Paragraph("LINK TYPE", PdfTheme.LABEL_FONT);
        linkHeading.setSpacingAfter(3f);
        cell.addElement(linkHeading);
        cell.addElement(legendLine("RF — colored by channel", LINK_RF_SWATCH));
        Paragraph rfNote = new Paragraph("Same color = same channel", PdfTheme.SMALL_ITALIC_FONT);
        rfNote.setSpacingAfter(3f);
        cell.addElement(rfNote);
        cell.addElement(legendLine("Direct (DtD)", LINK_DTD));
        cell.addElement(legendLine("Tunnel", LINK_TUNNEL));
        cell.addElement(legendLine("Unknown", LINK_UNKNOWN));
        addSpacer(cell);

        Paragraph nodeHeading = new Paragraph("NODE STYLE", PdfTheme.LABEL_FONT);
        nodeHeading.setSpacingAfter(3f);
        cell.addElement(nodeHeading);
        cell.addElement(legendLine("Local node (scanned from)", PdfTheme.BLUE_DEEP));
        cell.addElement(legendLine("Off-site / not deployed here", new Color(0xB9, 0xB3, 0xA6)));

        return cell;
    }

    /** Map image alongside its legend, laid out the same way as the on-screen mesh-map (map +
     * sidebar legend) so the PDF page matches what the app shows. */
    public static PdfPTable buildMapPageBody(String base64, List<String> resourceTypes, float availableWidth, float availableHeight) {
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
        mapCell.setBorderColor(PdfTheme.AMBER_BORDER);
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

    /** Renders the given header table + map image onto an off-page template sized as if it were
     * a *portrait* content area, then stamps that template onto the (always-landscape) page
     * rotated 90° — the physical page stays landscape like every other page in the document, but
     * the reader turns the printed page sideways to view this one right-side-up, the same
     * convention used for fold-out/rotated pages in printed reports. The caller supplies its own
     * (not-yet-sized) header table so this helper stays agnostic of what kind of document it's
     * embedded in. */
    public static void addRotatedMapPage(Document document, PdfContentByte canvas, PdfPTable header,
                                          String mapImageBase64, List<String> resourceTypes) throws DocumentException {
        float pageW = document.getPageSize().getWidth();
        float pageH = document.getPageSize().getHeight();
        float contentW = pageW - PdfSupport.MARGIN_LEFT - PdfSupport.MARGIN_RIGHT;
        float contentH = pageH - PdfSupport.MARGIN_TOP - PdfSupport.MARGIN_BOTTOM;
        // The template's local space is the *swapped* content box — after a 90° rotation its
        // bounding box becomes exactly contentW x contentH again, so it fills the page's content
        // area with no clipping and no guesswork.
        float virtualW = contentH;
        float virtualH = contentW;

        PdfTemplate template = canvas.createTemplate(virtualW, virtualH);

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
        canvas.addTemplate(template, 0, 1, -1, 0, pageW - PdfSupport.MARGIN_RIGHT, PdfSupport.MARGIN_BOTTOM);
    }
}
