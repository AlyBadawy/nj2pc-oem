package org.nj2pc.oem.pdf;

import org.openpdf.text.Element;
import org.openpdf.text.Image;
import org.openpdf.text.pdf.PdfPCell;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URI;
import java.util.HashMap;
import java.util.Map;

/**
 * A single small (144pt = 2in square) static map image per deployment location, for the
 * "Deployment Locations & Gear" page of the incident summary PDF. Fetches one OSM raster tile at
 * a fixed zoom rather than embedding a full slippy-map viewer — this is a print artifact, not an
 * interactive map. Any fetch/decode failure (offline server, tile host unreachable, no
 * coordinates) falls back to a plain placeholder cell rather than failing the whole PDF.
 */
public final class DeploymentMapSupport {

    private DeploymentMapSupport() {
    }

    private static final int ZOOM = 15;
    private static final int TILE_SIZE = 256;
    // Output canvas in pixels — the point is always placed at the exact center of this square,
    // composited from however many tiles overlap it (usually 4, since it straddles tile
    // boundaries in the general case), rather than just drawing the single tile the point
    // happens to fall in and pinning it wherever within that tile it lands.
    private static final int OUTPUT_SIZE = 320;
    private static final float MAP_POINTS = 144f; // 2in x 2in at 72pt/in
    // OSM's tile usage policy requires a real identifying User-Agent — this is a low-volume,
    // one-tile-per-location fetch at PDF-generation time, not a live tile server for an app.
    private static final String USER_AGENT = "NJ2PC-OEM/1.0 (incident PDF deployment map)";

    // Scoped to one generate() call by the caller — a location list in a single incident PDF
    // often reuses the same tile (locations near each other), so this avoids re-fetching it.
    public static Map<String, BufferedImage> newTileCache() {
        return new HashMap<>();
    }

    private static double lonToTileXFrac(double lon, int zoom) {
        return (lon + 180.0) / 360.0 * (1 << zoom);
    }

    private static double latToTileYFrac(double lat, int zoom) {
        double latRad = Math.toRadians(lat);
        return (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * (1 << zoom);
    }

    private static BufferedImage fetchTile(int x, int y, int zoom, Map<String, BufferedImage> cache) {
        String key = zoom + "/" + x + "/" + y;
        BufferedImage cached = cache.get(key);
        if (cached != null) return cached;

        try {
            URI uri = URI.create("https://tile.openstreetmap.org/" + zoom + "/" + x + "/" + y + ".png");
            HttpURLConnection conn = (HttpURLConnection) uri.toURL().openConnection();
            conn.setRequestProperty("User-Agent", USER_AGENT);
            conn.setConnectTimeout(4000);
            conn.setReadTimeout(4000);
            BufferedImage img = ImageIO.read(conn.getInputStream());
            if (img != null) cache.put(key, img);
            return img;
        } catch (IOException e) {
            return null;
        }
    }

    private static BufferedImage placeholder(String message) {
        BufferedImage img = new BufferedImage(OUTPUT_SIZE, OUTPUT_SIZE, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setColor(new Color(0xE4, 0xE1, 0xD8));
        g.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
        g.setColor(new Color(0x8A, 0x8A, 0x8A));
        g.setFont(g.getFont().deriveFont(16f));
        java.awt.FontMetrics fm = g.getFontMetrics();
        int textWidth = fm.stringWidth(message);
        g.drawString(message, (OUTPUT_SIZE - textWidth) / 2f, OUTPUT_SIZE / 2f);
        g.dispose();
        return img;
    }

    /** Renders a 2in x 2in static map with the (lat, lon) point pinned at the exact center of
     * the frame, or a labeled placeholder if coordinates are missing or no tile can be fetched.
     * Composites however many OSM tiles overlap the centered viewport (the point generally
     * straddles a tile boundary, so this is usually more than one tile) rather than drawing a
     * single tile and placing the pin wherever within it the point happens to fall. */
    public static Image buildMapImage(String latitude, String longitude, Map<String, BufferedImage> tileCache) {
        Double lat = parseCoord(latitude);
        Double lon = parseCoord(longitude);
        BufferedImage rendered;
        if (lat == null || lon == null) {
            rendered = placeholder("No coordinates");
        } else {
            try {
                double worldX = lonToTileXFrac(lon, ZOOM) * TILE_SIZE;
                double worldY = latToTileYFrac(lat, ZOOM) * TILE_SIZE;
                double originX = worldX - OUTPUT_SIZE / 2.0;
                double originY = worldY - OUTPUT_SIZE / 2.0;

                int tileMinX = (int) Math.floor(originX / TILE_SIZE);
                int tileMaxX = (int) Math.floor((originX + OUTPUT_SIZE - 1) / TILE_SIZE);
                int tileMinY = (int) Math.floor(originY / TILE_SIZE);
                int tileMaxY = (int) Math.floor((originY + OUTPUT_SIZE - 1) / TILE_SIZE);

                BufferedImage canvas = new BufferedImage(OUTPUT_SIZE, OUTPUT_SIZE, BufferedImage.TYPE_INT_RGB);
                Graphics2D g = canvas.createGraphics();
                g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                g.setColor(new Color(0xE4, 0xE1, 0xD8));
                g.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

                boolean anyTile = false;
                for (int tx = tileMinX; tx <= tileMaxX; tx++) {
                    for (int ty = tileMinY; ty <= tileMaxY; ty++) {
                        BufferedImage tile = fetchTile(tx, ty, ZOOM, tileCache);
                        if (tile == null) continue;
                        anyTile = true;
                        int drawX = (int) Math.round(tx * (double) TILE_SIZE - originX);
                        int drawY = (int) Math.round(ty * (double) TILE_SIZE - originY);
                        g.drawImage(tile, drawX, drawY, null);
                    }
                }

                if (!anyTile) {
                    g.dispose();
                    rendered = placeholder("Map unavailable");
                } else {
                    int pinX = OUTPUT_SIZE / 2;
                    int pinY = OUTPUT_SIZE / 2;
                    g.setColor(new Color(0x1F, 0x4E, 0x79));
                    g.fillOval(pinX - 6, pinY - 6, 12, 12);
                    g.setColor(Color.WHITE);
                    g.setStroke(new java.awt.BasicStroke(2f));
                    g.drawOval(pinX - 6, pinY - 6, 12, 12);
                    g.dispose();
                    rendered = canvas;
                }
            } catch (Exception e) {
                rendered = placeholder("Map unavailable");
            }
        }

        try {
            Image image = Image.getInstance(rendered, null);
            image.scaleToFit(MAP_POINTS, MAP_POINTS);
            return image;
        } catch (Exception e) {
            throw new RuntimeException("Failed to render deployment location map", e);
        }
    }

    private static Double parseCoord(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return Double.parseDouble(raw.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** A fixed 2in x 2in cell holding the map image, sized so every location's row stays uniform
     * regardless of whether the fetch succeeded. */
    public static PdfPCell buildMapCell(String latitude, String longitude, Map<String, BufferedImage> tileCache) {
        Image image = buildMapImage(latitude, longitude, tileCache);
        PdfPCell cell = new PdfPCell(image, false);
        cell.setFixedHeight(MAP_POINTS + 8f);
        cell.setBorderColor(PdfTheme.AMBER_BORDER);
        cell.setPadding(4f);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        return cell;
    }
}
