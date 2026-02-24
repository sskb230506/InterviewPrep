import pdfParse from './pdfWrapper.cjs';

/**
 * Parses a PDF buffer and extracts text.
 * @param {Buffer} fileBuffer - The PDF file as a buffer.
 * @returns {Promise<string>} The extracted text.
 */
export async function parseResumePdf(fileBuffer) {
    try {
        const data = await pdfParse(fileBuffer);
        return data.text.trim();
    } catch (error) {
        console.error('Error parsing PDF:', error);
        throw new Error('Failed to parse resume PDF. Ensure it is a valid PDF document.');
    }
}
