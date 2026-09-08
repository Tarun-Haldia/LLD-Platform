import test from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../server/app.js';
import { ProblemRepository } from '../server/repositories/ProblemRepository.js';
import { SubmissionRepository } from '../server/repositories/SubmissionRepository.js';
import { CompositeEvaluatorPipeline } from '../server/evaluators/CompositeEvaluatorPipeline.js';

test('API Endpoints', async (t) => {
  const problemRepo = new ProblemRepository();
  const submissionRepo = new SubmissionRepository();
  const pipeline = new CompositeEvaluatorPipeline();
  const app = createApp({ problemRepo, submissionRepo, pipeline });

  // Start temporary test server
  const server = await new Promise(resolve => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  t.after(() => {
    server.close();
  });

  await t.test('GET /api/problems returns all seeded problems', async () => {
    const res = await fetch(`${baseUrl}/api/problems`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 4);
    assert.ok(body.data.some(p => p.id === 'parking-lot'));
  });

  await t.test('GET /api/problems/:id returns problem detail with starter templates', async () => {
    const res = await fetch(`${baseUrl}/api/problems/parking-lot`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.id, 'parking-lot');
    assert.ok(body.data.starterTemplates.java);
    assert.ok(body.data.checklist.length > 0);
  });

  await t.test('POST /api/submissions rejects invalid short code', async () => {
    const res = await fetch(`${baseUrl}/api/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problemId: 'parking-lot',
        code: 'short'
      })
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.error.includes('at least 20 characters'));
  });

  await t.test('POST /api/submissions and status polling flow', async () => {
    const problem = problemRepo.getById('parking-lot');
    const res = await fetch(`${baseUrl}/api/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problemId: 'parking-lot',
        code: problem.starterTemplates.java,
        language: 'java',
        rationale: 'Testing submission endpoint'
      })
    });

    assert.equal(res.status, 202);
    const body = await res.json();
    assert.equal(body.success, true);
    const attemptId = body.data.attemptId;

    // Wait briefly for background evaluation
    await new Promise(r => setTimeout(r, 800));

    const statusRes = await fetch(`${baseUrl}/api/submissions/${attemptId}/status`);
    assert.equal(statusRes.status, 200);
    const statusBody = await statusRes.json();
    assert.equal(statusBody.success, true);
    assert.ok(['EVALUATING', 'COMPLETED'].includes(statusBody.data.status));
  });

  await t.test('POST /api/simulate-change simulates requirement shift', async () => {
    const problem = problemRepo.getById('parking-lot');
    const res = await fetch(`${baseUrl}/api/simulate-change`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problemId: 'parking-lot',
        scenarioId: 'ev-charging',
        code: problem.starterTemplates.java,
        rationale: 'Testing change simulator'
      })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.scenarioTitle.includes('EV'));
    assert.ok(body.data.impactLevel);
  });
});
