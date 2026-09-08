import { EvaluationResult } from '../domain/EvaluationResult.js';
import { DeterministicRuleEvaluator } from './DeterministicRuleEvaluator.js';
import { ReasoningEvaluator } from './ReasoningEvaluator.js';
import { RequirementChangeSimulator } from './RequirementChangeSimulator.js';

export class CompositeEvaluatorPipeline {
  constructor({
    deterministicEvaluator = new DeterministicRuleEvaluator(),
    reasoningEvaluator = new ReasoningEvaluator(),
    simulator = new RequirementChangeSimulator(),
    timeoutMs = 15000
  } = {}) {
    this.deterministicEvaluator = deterministicEvaluator;
    this.reasoningEvaluator = reasoningEvaluator;
    this.simulator = simulator;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Run the full multi-stage evaluation pipeline.
   * @param {import('../domain/Submission.js').Submission} submission
   * @param {import('../domain/Problem.js').Problem} problem
   * @param {object} [options]
   * @returns {Promise<EvaluationResult>}
   */
  async evaluate(submission, problem, options = {}) {
    console.log(`[Pipeline] ▶ Starting evaluation pipeline for problem "${problem.id}" (${submission.language})`);

    // Stage 1: Deterministic Static & Smell Analysis
    const detResult = await this.deterministicEvaluator.evaluate(submission, problem);
    console.log(`[Pipeline] ✓ Stage 1 (Deterministic): Score ${detResult.overallScore}/100, Smells: ${detResult.smells?.length || 0}`);

    // Stage 2: Deep Qualitative Reasoning with Timeout Guard & Fallback
    let reasoningResult = null;
    let isFallback = false;

    try {
      reasoningResult = await this._withTimeout(
        this.reasoningEvaluator.evaluate(submission, problem, {
          smells: detResult.smells,
          entityAnalysis: detResult.entityAnalysis,
          overallScore: detResult.overallScore,
          apiKey: options.apiKey,
          aiProvider: options.aiProvider
        }),
        this.timeoutMs
      );
      console.log(`[Pipeline] ✓ Stage 2 (Reasoning): Completed via ${reasoningResult.evaluatorProvider || 'Analyzer'}`);
    } catch (err) {
      console.warn(`[Pipeline] ⚠ Reasoning evaluation timed out or failed (${err.message}). Using resilient fallback.`);
      isFallback = true;
      reasoningResult = {
        strengths: [
          'Code structure provided for evaluation.',
          `Found ${detResult.entityAnalysis?.covered?.length || 0} core entities in domain model.`
        ],
        weaknesses: [
          'Evaluation engine operated in resilient fallback mode due to reasoning stage timeout.'
        ],
        actionableSuggestions: (detResult.smells || []).map(s => ({
          title: s.title,
          issue: s.description,
          explanation: s.recommendation,
          codeSnippet: '// Refer to rubric suggestions above.'
        })),
        tradeOffAnalysis: ['Review thread safety and coupling metrics in the deterministic breakdown.'],
        evaluatorProvider: 'Resilient Deterministic Analyzer'
      };
    }

    // Stage 3: Dynamic Requirement Stress Test
    const changeSimulation = this.simulator.simulate(
      submission,
      problem,
      options.scenarioId
    );
    console.log(`[Pipeline] ✓ Stage 3 (Stress Simulation): Scenario "${changeSimulation.scenarioTitle}" -> Impact: ${changeSimulation.impactLevel}`);

    // Stage 4: Synthesize Final Score & Rubric Breakdown
    // If external AI provided an overallScore, blend 40% deterministic + 60% deep reasoning
    const overallScore = reasoningResult.overallScore !== undefined && reasoningResult.isAiGenerated
      ? Math.round((detResult.overallScore * 0.4) + (reasoningResult.overallScore * 0.6))
      : detResult.overallScore;

    return new EvaluationResult({
      overallScore,
      rubricBreakdown: detResult.dimensions,
      checklistResults: detResult.checklistResults,
      strengths: reasoningResult.strengths || [],
      weaknesses: reasoningResult.weaknesses || [],
      actionableSuggestions: reasoningResult.actionableSuggestions || [],
      changeSimulation,
      isFallback,
      isAiGenerated: !!reasoningResult.isAiGenerated,
      evaluatorProvider: reasoningResult.evaluatorProvider || 'Deep Dynamic Code-Aware Analyzer',
      deterministicMetrics: {
        ...detResult.metrics,
        smellCount: (detResult.smells || []).length,
        smells: detResult.smells
      }
    });
  }

  _withTimeout(promise, ms) {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Evaluator timeout after ${ms}ms`)), ms);
    });

    return Promise.race([
      promise.finally(() => clearTimeout(timer)),
      timeoutPromise
    ]);
  }
}
