/**
 * Base Evaluator Interface
 * Demonstrates the Strategy Pattern for pluggable evaluation techniques.
 */
export class IEvaluator {
  /**
   * Evaluate a submission against a problem definition.
   * @param {import('../domain/Submission.js').Submission} submission
   * @param {import('../domain/Problem.js').Problem} problem
   * @returns {Promise<object>} Partial or complete evaluation result
   */
  async evaluate(submission, problem) {
    throw new Error('evaluate() must be implemented by subclass');
  }
}
