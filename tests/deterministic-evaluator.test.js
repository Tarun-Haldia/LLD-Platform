import test from 'node:test';
import assert from 'node:assert/strict';

import { DeterministicRuleEvaluator } from '../server/evaluators/DeterministicRuleEvaluator.js';
import { Submission } from '../server/domain/Submission.js';
import { ProblemRepository } from '../server/repositories/ProblemRepository.js';

test('DeterministicRuleEvaluator', async (t) => {
  const evaluator = new DeterministicRuleEvaluator();
  const problemRepo = new ProblemRepository();
  const parkingLotProblem = problemRepo.getById('parking-lot');

  await t.test('detects covered and missing domain entities', async () => {
    const code = `
      class ParkingLot { }
      class ParkingFloor { }
      class ParkingSpot { }
    `;
    const submission = new Submission({ code, language: 'java' });
    const result = await evaluator.evaluate(submission, parkingLotProblem);

    assert.ok(result.entityAnalysis.covered.includes('ParkingLot'));
    assert.ok(result.entityAnalysis.covered.includes('ParkingFloor'));
    assert.ok(result.entityAnalysis.covered.includes('ParkingSpot'));
    assert.ok(result.entityAnalysis.missing.includes('Vehicle'));
    assert.ok(result.entityAnalysis.missing.includes('Ticket'));
  });

  await t.test('detects God Class smell when class accumulates excessive responsibilities', async () => {
    const methods = Array.from({ length: 14 }, (_, i) => `public void method${i}() { }`).join('\n');
    const code = `
      class ParkingLotController {
        ${methods}
      }
    `;
    const submission = new Submission({ code, language: 'java' });
    const result = await evaluator.evaluate(submission, parkingLotProblem);

    const godClassSmell = result.smells.find(s => s.type === 'GOD_CLASS');
    assert.ok(godClassSmell, 'Expected GOD_CLASS smell to be detected');
    assert.equal(godClassSmell.severity, 'HIGH');
  });

  await t.test('detects hardcoded type switching (Open/Closed violation)', async () => {
    const code = `
      class FeeCalculator {
        public double calculate(Vehicle vehicle) {
          if (vehicle.getType() == VehicleType.CAR) {
            return 20.0;
          } else if (vehicle.getType() == VehicleType.TRUCK) {
            return 50.0;
          }
          return 10.0;
        }
      }
    `;
    const submission = new Submission({ code, language: 'java' });
    const result = await evaluator.evaluate(submission, parkingLotProblem);

    const switchSmell = result.smells.find(s => s.type === 'HARDCODED_TYPE_SWITCH');
    assert.ok(switchSmell, 'Expected HARDCODED_TYPE_SWITCH smell to be detected');
  });

  await t.test('detects missing concurrency primitives on concurrency-critical problems', async () => {
    const code = `
      class ParkingSpot {
        private boolean isOccupied = false;
        public boolean assign() {
          if (!isOccupied) {
            isOccupied = true;
            return true;
          }
          return false;
        }
      }
    `;
    const submission = new Submission({ code, language: 'java' });
    const result = await evaluator.evaluate(submission, parkingLotProblem);

    const concurrencySmell = result.smells.find(s => s.type === 'MISSING_CONCURRENCY_CONTROL');
    assert.ok(concurrencySmell, 'Expected MISSING_CONCURRENCY_CONTROL smell to be detected');
  });

  await t.test('calculates 5-dimension rubric scores correctly', async () => {
    const code = parkingLotProblem.starterTemplates.java;
    const submission = new Submission({
      code,
      language: 'java',
      rationale: 'Used Strategy pattern for fee computation and ReentrantLock for thread safety.'
    });
    const result = await evaluator.evaluate(submission, parkingLotProblem);

    assert.ok(result.overallScore >= 50 && result.overallScore <= 100);
    assert.ok(result.dimensions.solid);
    assert.ok(result.dimensions.extensibility);
    assert.ok(result.dimensions.patterns);
    assert.ok(result.dimensions.concurrency);
    assert.ok(result.dimensions.codeQuality);
  });

  await t.test('evaluates blank or comment-only code as 0 score', async () => {
    const code = `// Just comments here and nothing else\n// no classes at all`;
    const submission = new Submission({ code, language: 'java' });
    const result = await evaluator.evaluate(submission, parkingLotProblem);

    assert.equal(result.overallScore, 0, 'Blank code must score 0');
    assert.equal(result.dimensions.solid.score, 0);
    assert.equal(result.dimensions.extensibility.score, 0);
    assert.equal(result.dimensions.patterns.score, 0);
    assert.equal(result.dimensions.concurrency.score, 0);
    assert.equal(result.dimensions.codeQuality.score, 0);
  });
});
