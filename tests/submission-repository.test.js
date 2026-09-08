import test from 'node:test';
import assert from 'node:assert/strict';

import { SubmissionRepository } from '../server/repositories/SubmissionRepository.js';
import { Submission, AttemptStatus } from '../server/domain/Attempt.js';
import { EvaluationResult } from '../server/domain/EvaluationResult.js';

test('SubmissionRepository', async (t) => {
  const repo = new SubmissionRepository();

  await t.test('creates attempts with auto-incrementing attempt numbers per problem', () => {
    const sub1 = new Submission({ code: 'class Solution1 {}' });
    const sub2 = new Submission({ code: 'class Solution2 {}' });

    const attempt1 = repo.createAttempt({ problemId: 'parking-lot', submission: sub1 });
    const attempt2 = repo.createAttempt({ problemId: 'parking-lot', submission: sub2 });
    const attemptElevator = repo.createAttempt({ problemId: 'elevator-system', submission: sub1 });

    assert.equal(attempt1.attemptNumber, 1);
    assert.equal(attempt2.attemptNumber, 2);
    assert.equal(attemptElevator.attemptNumber, 1);
    assert.equal(attempt1.status, AttemptStatus.PENDING);
  });

  await t.test('updates attempt status through lifecycle', () => {
    const sub = new Submission({ code: 'class ParkingLot {}' });
    const attempt = repo.createAttempt({ problemId: 'parking-lot', submission: sub });

    attempt.markEvaluating();
    repo.updateAttempt(attempt);
    assert.equal(repo.getById(attempt.id).status, AttemptStatus.EVALUATING);

    const evalResult = new EvaluationResult({ overallScore: 82 });
    attempt.markCompleted(evalResult);
    repo.updateAttempt(attempt);

    const updated = repo.getById(attempt.id);
    assert.equal(updated.status, AttemptStatus.COMPLETED);
    assert.equal(updated.result.overallScore, 82);
    assert.ok(updated.completedAt);
  });

  await t.test('computes code diff and score delta between attempts', () => {
    const sub1 = new Submission({ code: 'class ParkingLot {\n  int fee = 10;\n}', rationale: 'Initial draft' });
    const sub2 = new Submission({ code: 'class ParkingLot {\n  IPricingStrategy pricing;\n}', rationale: 'Refactored to Strategy pattern' });

    const a1 = repo.createAttempt({ problemId: 'parking-lot', submission: sub1 });
    a1.markCompleted(new EvaluationResult({ overallScore: 60 }));
    repo.updateAttempt(a1);

    const a2 = repo.createAttempt({ problemId: 'parking-lot', submission: sub2 });
    a2.markCompleted(new EvaluationResult({ overallScore: 85 }));
    repo.updateAttempt(a2);

    const comparison = repo.compareAttempts(a1.id, a2.id);

    assert.equal(comparison.scoreDelta, 25);
    assert.equal(comparison.baseAttempt.score, 60);
    assert.equal(comparison.targetAttempt.score, 85);
    assert.ok(comparison.codeDiff.length > 0);
  });
});
