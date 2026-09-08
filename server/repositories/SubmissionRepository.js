import { Attempt, AttemptStatus } from '../domain/Attempt.js';

export class SubmissionRepository {
  constructor() {
    this.attemptsById = new Map();
    this.attemptsByProblem = new Map(); // problemId -> Array<Attempt>
    this.nextId = 1;
  }

  createAttempt({ problemId, submission }) {
    const id = `att_${Date.now()}_${this.nextId++}`;
    const problemAttempts = this.attemptsByProblem.get(problemId) || [];
    const attemptNumber = problemAttempts.length + 1;

    const attempt = new Attempt({
      id,
      problemId,
      attemptNumber,
      submission,
      status: AttemptStatus.PENDING,
      createdAt: new Date().toISOString()
    });

    this.attemptsById.set(id, attempt);
    if (!this.attemptsByProblem.has(problemId)) {
      this.attemptsByProblem.set(problemId, []);
    }
    this.attemptsByProblem.get(problemId).push(attempt);

    return attempt;
  }

  getById(id) {
    return this.attemptsById.get(id) || null;
  }

  getByProblem(problemId) {
    return this.attemptsByProblem.get(problemId) || [];
  }

  updateAttempt(attempt) {
    this.attemptsById.set(attempt.id, attempt);
    const list = this.attemptsByProblem.get(attempt.problemId) || [];
    const index = list.findIndex(a => a.id === attempt.id);
    if (index !== -1) {
      list[index] = attempt;
    }
    return attempt;
  }

  /**
   * Compare two attempts for a given problem to display progress and diff
   */
  compareAttempts(attemptId1, attemptId2) {
    const a1 = this.getById(attemptId1);
    const a2 = this.getById(attemptId2);
    if (!a1 || !a2) return null;

    const scoreDiff = (a2.result?.overallScore || 0) - (a1.result?.overallScore || 0);
    const codeDiff = this._computeLineDiff(a1.submission.code, a2.submission.code);

    return {
      problemId: a1.problemId,
      baseAttempt: {
        id: a1.id,
        number: a1.attemptNumber,
        score: a1.result?.overallScore || 0,
        createdAt: a1.createdAt
      },
      targetAttempt: {
        id: a2.id,
        number: a2.attemptNumber,
        score: a2.result?.overallScore || 0,
        createdAt: a2.createdAt
      },
      scoreDelta: scoreDiff,
      codeDiff,
      rationaleDiff: this._computeLineDiff(a1.submission.rationale, a2.submission.rationale)
    };
  }

  _computeLineDiff(text1 = '', text2 = '') {
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');
    const diff = [];
    const maxLen = Math.max(lines1.length, lines2.length);

    let i = 0, j = 0;
    while (i < lines1.length || j < lines2.length) {
      const line1 = lines1[i];
      const line2 = lines2[j];

      if (line1 === line2) {
        diff.push({ type: 'unchanged', text: line1, lineBase: i + 1, lineTarget: j + 1 });
        i++;
        j++;
      } else if (line1 !== undefined && (line2 === undefined || !lines2.slice(j).includes(line1))) {
        diff.push({ type: 'removed', text: line1, lineBase: i + 1 });
        i++;
      } else if (line2 !== undefined && (line1 === undefined || !lines1.slice(i).includes(line2))) {
        diff.push({ type: 'added', text: line2, lineTarget: j + 1 });
        j++;
      } else {
        diff.push({ type: 'modified', textBase: line1, textTarget: line2, lineBase: i + 1, lineTarget: j + 1 });
        i++;
        j++;
      }
    }
    return diff;
  }
}
