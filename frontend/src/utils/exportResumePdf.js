import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/**
 * Captures `node` (expected to be A4_WIDTH px wide, natural height) as a
 * high-resolution image and assembles it into a PDF, splitting across
 * multiple A4 pages if the content is taller than one page.
 */
export async function exportNodeToPdf(node, filename) {
    const canvas = await html2canvas(node, {
        scale: 2, // 2x for crisp text/print quality
        useCORS: true,
        backgroundColor: "#ffffff",
    });

    const imgWidthMm = A4_WIDTH_MM;
    const pxPerMm = canvas.width / imgWidthMm;
    const pageHeightPx = A4_HEIGHT_MM * pxPerMm;

    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const totalPages = Math.ceil(canvas.height / pageHeightPx);

    for (let page = 0; page < totalPages; page++) {
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = Math.min(pageHeightPx, canvas.height - page * pageHeightPx);

        const ctx = sliceCanvas.getContext("2d");
        ctx.drawImage(
            canvas,
            0, page * pageHeightPx, canvas.width, sliceCanvas.height,
            0, 0, canvas.width, sliceCanvas.height
        );

        const sliceImgData = sliceCanvas.toDataURL("image/png");
        const sliceHeightMm = sliceCanvas.height / pxPerMm;

        if (page > 0) pdf.addPage();
        pdf.addImage(sliceImgData, "PNG", 0, 0, imgWidthMm, sliceHeightMm);
    }

    pdf.save(filename);
}