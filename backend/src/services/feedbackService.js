/**
 * Aggregates scores and builds the final actionable feedback object.
 * @param {Array<Object>} evaluations - Array of evaluation records from the DB
 * @returns {Object} Final feedback structure
 */
export function generateFinalFeedback(evaluations) {
    if (!evaluations || evaluations.length === 0) {
        return { error: "No evaluations found for this session." };
    }

    let totals = {
        tech: 0,
        relevance: 0,
        depth: 0,
        clarity: 0,
        structure: 0,
        confidence: 0
    };

    evaluations.forEach(ev => {
        totals.tech += ev.scoreTech;
        totals.relevance += ev.scoreRelevance;
        totals.depth += ev.scoreDepth;
        totals.clarity += ev.scoreClarity;
        totals.structure += ev.scoreStructure;
        totals.confidence += ev.scoreConfidence; // Might be null/undefined depending on schema map
    });

    const count = evaluations.length;

    const averages = {
        tech: (totals.tech / count).toFixed(1),
        relevance: (totals.relevance / count).toFixed(1),
        depth: (totals.depth / count).toFixed(1),
        clarity: (totals.clarity / count).toFixed(1),
        structure: (totals.structure / count).toFixed(1),
        confidence: (totals.confidence / count).toFixed(1)
    };

    return {
        metrics: averages,
        overallScore: (
            (parseFloat(averages.tech) +
                parseFloat(averages.relevance) +
                parseFloat(averages.depth)) / 3
        ).toFixed(1),
        summary: "Final score aggregate computed successfully. Review the metrics object for dimension-specific averages."
    };
}
