import test from 'node:test';
import assert from 'node:assert/strict';

import { CompositeEvaluatorPipeline } from '../server/evaluators/CompositeEvaluatorPipeline.js';
import { DeterministicRuleEvaluator } from '../server/evaluators/DeterministicRuleEvaluator.js';
import { ReasoningEvaluator } from '../server/evaluators/ReasoningEvaluator.js';
import { RequirementChangeSimulator } from '../server/evaluators/RequirementChangeSimulator.js';
import { Submission } from '../server/domain/Submission.js';
import { ProblemRepository } from '../server/repositories/ProblemRepository.js';

test('CompositeEvaluatorPipeline', async (t) => {
  const problemRepo = new ProblemRepository();
  const problem = problemRepo.getById('parking-lot');

  await t.test('evaluates submission end-to-end successfully', async () => {
    const pipeline = new CompositeEvaluatorPipeline();
    const submission = new Submission({
      code: problem.starterTemplates.java,
      language: 'java',
      rationale: 'Applied Strategy pattern for allocation and ReentrantLock for thread safety.'
    });

    const result = await pipeline.evaluate(submission, problem);

    assert.ok(result.overallScore > 0);
    assert.equal(result.isFallback, false);
    assert.ok(Array.isArray(result.strengths));
    assert.ok(result.strengths.length > 0);
    assert.ok(Array.isArray(result.actionableSuggestions));
    assert.ok(result.changeSimulation);
    assert.ok(result.changeSimulation.scenarioTitle);
  });

  await t.test('gracefully falls back when reasoning evaluator times out', async () => {
    // Mock slow reasoning evaluator that exceeds the timeout
    class SlowReasoningEvaluator extends ReasoningEvaluator {
      async evaluate() {
        await new Promise(resolve => setTimeout(resolve, 200));
        return { strengths: [], weaknesses: [] };
      }
    }

    const pipeline = new CompositeEvaluatorPipeline({
      reasoningEvaluator: new SlowReasoningEvaluator(),
      timeoutMs: 50 // Short timeout to trigger fallback
    });

    const submission = new Submission({
      code: problem.starterTemplates.java,
      language: 'java'
    });

    const result = await pipeline.evaluate(submission, problem);

    assert.equal(result.isFallback, true, 'Expected result to be marked as fallback');
    assert.ok(result.overallScore > 0, 'Score should still be computed deterministically');
    assert.ok(result.weaknesses.some(w => w.includes('fallback mode')));
  });

  await t.test('RequirementChangeSimulator flags coupled designs as high friction', async () => {
    const simulator = new RequirementChangeSimulator();
    // Rigid code without pricing strategy
    const rigidCode = `
      class ParkingLot {
        public double calculateFee(int hours) {
          return hours * 20.0;
        }
      }
    `;
    const submission = new Submission({ code: rigidCode, language: 'java' });
    const simulation = simulator.simulate(submission, problem, 'ev-charging');

    assert.ok(simulation.vulnerableClasses.length > 0);
    assert.ok(simulation.impactLevel === 'HIGH_FRICTION' || simulation.impactLevel === 'MODERATE_FRICTION');
  });
});
