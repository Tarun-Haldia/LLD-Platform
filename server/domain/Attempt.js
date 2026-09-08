import { Submission } from './Submission.js';

export { Submission };

/**
 * Attempt Lifecycle State Machine
 */
export const AttemptStatus = Object.freeze({
  PENDING: 'PENDING',
  EVALUATING: 'EVALUATING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
});

export class Attempt {
  constructor({
    id,
    problemId,
    attemptNumber = 1,
    submission,
    status = AttemptStatus.PENDING,
    result = null,
    error = null,
    createdAt = new Date().toISOString(),
    completedAt = null
  }) {
    this.id = id;
    this.problemId = problemId;
    this.attemptNumber = attemptNumber;
    this.submission = submission instanceof Submission ? submission : new Submission(submission);
    this.status = status;
    this.result = result;
    this.error = error;
    this.createdAt = createdAt;
    this.completedAt = completedAt;
  }

  markEvaluating() {
    this.status = AttemptStatus.EVALUATING;
  }

  markCompleted(result) {
    this.status = AttemptStatus.COMPLETED;
    this.result = result;
    this.completedAt = new Date().toISOString();
    this.error = null;
  }

  markFailed(errorMessage) {
    this.status = AttemptStatus.FAILED;
    this.error = errorMessage;
    this.completedAt = new Date().toISOString();
  }
}
