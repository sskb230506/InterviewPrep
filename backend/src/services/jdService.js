/**
 * Cleans and normalizes job description text.
 * @param {string} rawJD - The raw job description input.
 * @returns {string} The cleaned job description.
 */
export function processJobDescription(rawJD) {
    if (!rawJD || typeof rawJD !== 'string') {
        throw new Error('Invalid Job Description provided.');
    }

    // Basic cleanup: remove excessive whitespace and newlines
    const cleaned = rawJD
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    return cleaned;
}
