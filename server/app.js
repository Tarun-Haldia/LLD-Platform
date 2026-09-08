import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import { ProblemRepository } from './repositories/ProblemRepository.js';
import { SubmissionRepository } from './repositories/SubmissionRepository.js';
import { CompositeEvaluatorPipeline } from './evaluators/CompositeEvaluatorPipeline.js';
import { Submission } from './domain/Submission.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp({
  problemRepo = new ProblemRepository(),
  submissionRepo = new SubmissionRepository(),
  pipeline = new CompositeEvaluatorPipeline()
} = {}) {
  const app = express();

  // Enable CORS for all origins (supports Live Server port 5500, Vite, or direct access)
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '5mb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // --- API Routes ---

  // 1. Get all problems
  app.get('/api/problems', (req, res) => {
    try {
      const problems = problemRepo.getAll();
      res.json({ success: true, data: problems });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Get specific problem by ID
  app.get('/api/problems/:id', (req, res) => {
    try {
      const problem = problemRepo.getById(req.params.id);
      if (!problem) {
        return res.status(404).json({ success: false, error: 'Problem not found' });
      }
      res.json({ success: true, data: problem });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Submit a new solution attempt
  app.post('/api/submissions', async (req, res) => {
    try {
      const { problemId, code, language, rationale, diagram, format, apiKey, aiProvider } = req.body;

      const problem = problemRepo.getById(problemId);
      if (!problem) {
        return res.status(404).json({ success: false, error: 'Problem not found' });
      }

      const submission = new Submission({ code, language, rationale, diagram, format });
      const validation = submission.validate();
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: validation.errors[0],
          details: validation.errors
        });
      }

      // Create attempt in PENDING status
      const attempt = submissionRepo.createAttempt({ problemId, submission });

      // Run evaluation asynchronously in the background so the client can track status
      (async () => {
        try {
          attempt.markEvaluating();
          submissionRepo.updateAttempt(attempt);

          // Simulated brief delay for smooth status transitions in UI
          await new Promise(r => setTimeout(r, 600));

          const result = await pipeline.evaluate(submission, problem, { apiKey, aiProvider });
          attempt.markCompleted(result);
          submissionRepo.updateAttempt(attempt);
        } catch (evalErr) {
          console.error(`Evaluation failed for attempt ${attempt.id}:`, evalErr);
          attempt.markFailed(evalErr.message || 'Evaluation encountered an unexpected error.');
          submissionRepo.updateAttempt(attempt);
        }
      })();

      res.status(202).json({
        success: true,
        message: 'Submission received and queued for evaluation.',
        data: {
          attemptId: attempt.id,
          problemId: attempt.problemId,
          attemptNumber: attempt.attemptNumber,
          status: attempt.status,
          createdAt: attempt.createdAt
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Poll status & get results for an attempt
  app.get('/api/submissions/:id/status', (req, res) => {
    try {
      const attempt = submissionRepo.getById(req.params.id);
      if (!attempt) {
        return res.status(404).json({ success: false, error: 'Attempt not found' });
      }

      res.json({
        success: true,
        data: {
          id: attempt.id,
          problemId: attempt.problemId,
          attemptNumber: attempt.attemptNumber,
          status: attempt.status,
          score: attempt.result?.overallScore ?? null,
          createdAt: attempt.createdAt,
          completedAt: attempt.completedAt,
          result: attempt.result,
          error: attempt.error
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Get all attempts for a problem
  app.get('/api/problems/:id/attempts', (req, res) => {
    try {
      const attempts = submissionRepo.getByProblem(req.params.id);
      res.json({
        success: true,
        data: attempts.map(a => ({
          id: a.id,
          attemptNumber: a.attemptNumber,
          status: a.status,
          createdAt: a.createdAt,
          completedAt: a.completedAt,
          score: a.result?.overallScore ?? null,
          isFallback: a.result?.isFallback ?? false
        }))
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Get single attempt details
  app.get('/api/attempts/:id', (req, res) => {
    try {
      const attempt = submissionRepo.getById(req.params.id);
      if (!attempt) {
        return res.status(404).json({ success: false, error: 'Attempt not found' });
      }
      res.json({ success: true, data: attempt });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. Compare two attempts (Diff view)
  app.get('/api/attempts/compare/:id1/:id2', (req, res) => {
    try {
      const comparison = submissionRepo.compareAttempts(req.params.id1, req.params.id2);
      if (!comparison) {
        return res.status(404).json({ success: false, error: 'One or both attempts not found.' });
      }
      res.json({ success: true, data: comparison });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8. Retry an attempt
  app.post('/api/attempts/:id/retry', async (req, res) => {
    try {
      const attempt = submissionRepo.getById(req.params.id);
      if (!attempt) {
        return res.status(404).json({ success: false, error: 'Attempt not found' });
      }

      const problem = problemRepo.getById(attempt.problemId);
      if (!problem) {
        return res.status(404).json({ success: false, error: 'Problem not found' });
      }

      attempt.markEvaluating();
      submissionRepo.updateAttempt(attempt);

      (async () => {
        try {
          const result = await pipeline.evaluate(attempt.submission, problem);
          attempt.markCompleted(result);
          submissionRepo.updateAttempt(attempt);
        } catch (err) {
          attempt.markFailed(err.message);
          submissionRepo.updateAttempt(attempt);
        }
      })();

      res.json({
        success: true,
        message: 'Retry initiated',
        data: { id: attempt.id, status: attempt.status }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 9. Interactive Requirement Change Simulation
  app.post('/api/simulate-change', (req, res) => {
    try {
      const { problemId, scenarioId, code, rationale } = req.body;
      const problem = problemRepo.getById(problemId);
      if (!problem) {
        return res.status(404).json({ success: false, error: 'Problem not found' });
      }

      const submission = new Submission({ code, rationale });
      const simulation = pipeline.simulator.simulate(submission, problem, scenarioId);

      res.json({ success: true, data: simulation });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 10. Test AI API Key Connectivity
  app.post('/api/test-ai-key', async (req, res) => {
    try {
      const { apiKey, provider = 'gemini' } = req.body;
      if (!apiKey || apiKey.trim().length < 5) {
        return res.status(400).json({ success: false, error: 'Please enter a valid API key.' });
      }

      if (provider.toLowerCase() === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;
        const testRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Hello, respond with OK' }] }]
          })
        });
        if (!testRes.ok) {
          const errText = await testRes.text();
          return res.status(400).json({ success: false, error: `Gemini verification failed (${testRes.status}): ${errText.slice(0, 120)}` });
        }
        return res.json({ success: true, message: 'Google Gemini 1.5 Flash connected successfully!' });
      } else {
        const testRes = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey.trim()}` }
        });
        if (!testRes.ok) {
          return res.status(400).json({ success: false, error: `OpenAI verification failed (${testRes.status})` });
        }
        return res.json({ success: true, message: 'OpenAI connected successfully!' });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return app;
}
