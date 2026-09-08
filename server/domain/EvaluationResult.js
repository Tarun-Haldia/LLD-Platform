/**
 * Evaluation Result Value Object
 */
export class EvaluationResult {
  constructor({
    overallScore = 0,
    rubricBreakdown = {},
    checklistResults = [],
    strengths = [],
    weaknesses = [],
    actionableSuggestions = [],
    changeSimulation = null,
    isFallback = false,
    isAiGenerated = false,
    evaluatorProvider = 'Dynamic LLD Analyzer',
    deterministicMetrics = {},
    evaluatedAt = new Date().toISOString()
  } = {}) {
    this.overallScore = Math.max(0, Math.min(100, Math.round(overallScore)));
    this.rubricBreakdown = rubricBreakdown;
    this.checklistResults = checklistResults;
    this.strengths = strengths;
    this.weaknesses = weaknesses;
    this.actionableSuggestions = actionableSuggestions;
    this.changeSimulation = changeSimulation;
    this.isFallback = isFallback;
    this.isAiGenerated = isAiGenerated;
    this.evaluatorProvider = evaluatorProvider;
    this.deterministicMetrics = deterministicMetrics;
    this.evaluatedAt = evaluatedAt;
  }
}
