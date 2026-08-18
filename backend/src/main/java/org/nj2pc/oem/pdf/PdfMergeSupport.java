package org.nj2pc.oem.pdf;

import org.openpdf.text.Document;
import org.openpdf.text.pdf.PdfCopy;
import org.openpdf.text.pdf.PdfReader;

import java.io.ByteArrayOutputStream;
import java.util.List;

/**
 * Concatenates independently-generated PDFs (each its own complete document) into one final
 * document, page order preserved — used to embed another service's exact PDF output (e.g. the
 * real ICS-205 comms-plan PDF) verbatim into a larger report rather than re-implementing its
 * layout, which would risk drifting from the standalone version over time.
 */
public final class PdfMergeSupport {

    private PdfMergeSupport() {
    }

    public static byte[] merge(List<byte[]> pdfs) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Document document = new Document();
            PdfCopy copy = new PdfCopy(document, out);
            document.open();
            for (byte[] pdf : pdfs) {
                PdfReader reader = new PdfReader(pdf);
                int pageCount = reader.getNumberOfPages();
                for (int page = 1; page <= pageCount; page++) {
                    copy.addPage(copy.getImportedPage(reader, page));
                }
                reader.close();
            }
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to merge PDF sections", e);
        }
    }
}
