import { IEvaluator } from './IEvaluator.js';

export class DeterministicRuleEvaluator extends IEvaluator {
  /**
   * Deterministically evaluate code structure, entity coverage, SOLID smells, and checklist items.
   */
  async evaluate(submission, problem) {
    const code = submission.code || '';
    const rationale = submission.rationale || '';
    const keyEntities = problem.keyEntities || [];

    // Strip comments and whitespace to check substantive code
    const codeWithoutComments = code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '')
      .replace(/#.*/g, '')
      .trim();

    const declaredClasses = [...code.matchAll(/\b(?:class|interface|enum|struct)\s+([A-Za-z0-9_]+)/g)].map(m => m[1]);

    // If completely blank or no classes declared at all: score is 0
    if (codeWithoutComments.length === 0 || declaredClasses.length === 0) {
      return {
        type: 'deterministic',
        overallScore: 0,
        dimensions: {
          solid: { name: 'SOLID Principles', score: 0, summary: 'No classes or abstractions found in code to evaluate.' },
          extensibility: { name: 'Extensibility & Modularity', score: 0, summary: 'No extensible contracts or polymorphic interfaces found.' },
          patterns: { name: 'Design Patterns & Abstraction', score: 0, summary: 'No design patterns implemented.' },
          concurrency: { name: 'Concurrency & State Safety', score: 0, summary: 'No concurrency controls or state handling found.' },
          codeQuality: { name: 'Domain Completeness & Robustness', score: 0, summary: 'Code is blank or lacks domain entity definitions.' }
        },
        entityAnalysis: { covered: [], missing: keyEntities },
        smells: [{
          type: 'EMPTY_CODE',
          severity: 'HIGH',
          title: 'Empty / Missing Implementation',
          description: 'The submission does not contain any class or interface definitions.',
          recommendation: `Declare the core domain classes (e.g. ${keyEntities.slice(0, 3).join(', ')}) to receive an evaluation.`
        }],
        checklistResults: (problem.checklist || []).map(c => ({
          id: c.id,
          label: c.label,
          category: c.category,
          passed: false,
          note: 'Code is empty or lacks classes.'
        })),
        metrics: {
          totalLines: code.split('\n').length,
          hasRationale: rationale.length > 30,
          hasDiagram: false,
          entityCoverageRatio: 0
        }
      };
    }

    // 1. Entity Coverage Analysis
    const entityAnalysis = this._checkEntityCoverage(code, keyEntities);

    // 2. Code Smells & Anti-pattern Detection
    const smells = this._detectSmells(code, problem);

    // 3. Checklist Verification
    const checklistResults = this._evaluateChecklist(code, rationale, problem);

    // 4. Dimensional Scoring (0 - 100)
    const dimensions = this._calculateDimensions({
      code,
      rationale,
      entityAnalysis,
      smells,
      checklistResults,
      problem,
      declaredClasses
    });

    const overallScore = Math.round(
      (dimensions.solid.score * 0.25) +
      (dimensions.extensibility.score * 0.25) +
      (dimensions.patterns.score * 0.20) +
      (dimensions.concurrency.score * 0.15) +
      (dimensions.codeQuality.score * 0.15)
    );

    return {
      type: 'deterministic',
      overallScore,
      dimensions,
      entityAnalysis,
      smells,
      checklistResults,
      metrics: {
        totalLines: code.split('\n').length,
        hasRationale: rationale.length > 30,
        hasDiagram: (submission.diagram || '').length > 10,
        entityCoverageRatio: entityAnalysis.covered.length / Math.max(1, keyEntities.length)
      }
    };
  }

  _checkEntityCoverage(code, keyEntities) {
    const covered = [];
    const missing = [];

    for (const entity of keyEntities) {
      // Look for class Entity, interface Entity, enum Entity, struct Entity, def Entity
      const pattern = new RegExp(`\\b(class|interface|enum|struct|type)\\s+${entity}\\b`, 'i');
      if (pattern.test(code) || code.includes(entity)) {
        covered.push(entity);
      } else {
        missing.push(entity);
      }
    }

    return { covered, missing };
  }

  _detectSmells(code, problem) {
    const detected = [];

    // Smell 1: God Class / Monolithic Controller
    const classMatches = code.match(/class\s+([A-Za-z0-9_]+)[^{]*\{/g) || [];
    for (const match of classMatches) {
      const className = match.replace(/class\s+/, '').split(/[\s{]/)[0];
      const methodCount = (code.match(new RegExp(`public\\s+[A-Za-z0-9_<>\\[\\]]+\\s+[a-zA-Z0-9_]+\\s*\\(`, 'g')) || []).length;
      if (methodCount > 10 && (className.toLowerCase().includes('controller') || className.toLowerCase().includes('manager') || className.toLowerCase().includes('lot'))) {
        detected.push({
          type: 'GOD_CLASS',
          severity: 'HIGH',
          title: `Potential God Class: ${className}`,
          description: `The class '${className}' appears to accumulate excessive responsibilities (${methodCount}+ methods), which compromises Single Responsibility Principle (SRP).`,
          recommendation: `Decompose '${className}' into dedicated collaborators (e.g., separate ticket generation from spot allocation strategy).`
        });
      }
    }

    // Smell 2: Hardcoded Type Switching (Open/Closed violation)
    const switchOnType = /switch\s*\([^)]*(getType|type|status|state)[^)]*\)/i.test(code) ||
                         /if\s*\([^)]*(VehicleType|SpotType|Direction|getType|instanceof)[^)]*\)[\s\S]*?else\s+if/i.test(code);
    if (switchOnType) {
      detected.push({
        type: 'HARDCODED_TYPE_SWITCH',
        severity: 'MEDIUM',
        title: 'Hardcoded Type Branching (OCP Smell)',
        description: 'Found switch or nested if-else statements branching directly on concrete entity types or enums instead of polymorphic behavior.',
        recommendation: 'Refactor type checks into polymorphic methods or apply the Strategy Pattern to allow adding new types without modifying existing branching logic.'
      });
    }

    // Smell 3: Lack of Abstractions / Interfaces
    const hasInterfaces = /\b(interface|abstract\s+class|\bABC\b|virtual\b)/i.test(code);
    if (!hasInterfaces) {
      detected.push({
        type: 'MISSING_ABSTRACTIONS',
        severity: 'HIGH',
        title: 'Lack of Abstractions / Interface Decoupling',
        description: 'No interfaces or abstract classes were detected. Directly binding components to concrete classes makes the design rigid and hard to test or extend.',
        recommendation: 'Introduce interfaces for critical extension points (e.g. IParkingStrategy, IPricingStrategy, or IDispatcher).'
      });
    }

    // Smell 4: Direct Public Field Mutation (Encapsulation violation)
    const publicFieldSmell = /\bpublic\s+(String|int|double|boolean|List|Map)\s+[a-zA-Z0-9_]+\s*;/i.test(code);
    if (publicFieldSmell) {
      detected.push({
        type: 'ENCAPSULATION_VIOLATION',
        severity: 'LOW',
        title: 'Direct Public State Mutation',
        description: 'Found public mutable fields in domain entities, breaking information hiding and encapsulation.',
        recommendation: 'Declare fields private or protected and provide controlled getter and mutation methods to enforce invariants.'
      });
    }

    // Smell 5: Concurrency Safety (if problem targets concurrency)
    const isConcurrencyCritical = problem.patternsTargeted.some(p => p.toLowerCase().includes('concurrency')) ||
                                  problem.id === 'parking-lot' || problem.id === 'rate-limiter';
    const hasConcurrencyPrimitives = /\b(synchronized|ReentrantLock|Lock|Atomic|mutex|lock_guard|thread|threading|volatile|ConcurrentHashMap)\b/i.test(code);
    if (isConcurrencyCritical && !hasConcurrencyPrimitives) {
      detected.push({
        type: 'MISSING_CONCURRENCY_CONTROL',
        severity: 'HIGH',
        title: 'Unsynchronized Shared Mutable State',
        description: 'This problem requires concurrent gate/request operations, but no locks, mutexes, atomic primitives, or synchronized blocks were found.',
        recommendation: 'Protect shared state mutations (e.g. spot occupancy flag or token refills) using mutexes, ReentrantLock, or atomic references.'
      });
    }

    return detected;
  }

  _evaluateChecklist(code, rationale, problem) {
    const checklist = problem.checklist || [];
    return checklist.map(item => {
      let passed = false;
      let note = '';

      switch (item.id) {
        case 'c1': // Entities
          const entitiesMatch = (problem.keyEntities || []).filter(e => code.includes(e));
          passed = entitiesMatch.length >= Math.ceil((problem.keyEntities || []).length * 0.5);
          note = passed ? `Identified ${entitiesMatch.length} core entities in code.` : 'Key domain entities appear missing or unnamed.';
          break;
        case 'c2': // Strategy / State Pattern
          passed = /\b(Strategy|State|Algorithm|Dispatcher)\b/i.test(code);
          note = passed ? 'Found strategy/state pattern interfaces and implementations.' : 'No clear strategy or state abstraction identified.';
          break;
        case 'c3': // SOLID / Pricing / Decoupling
          passed = /\b(Pricing|Payment|Floor|Inventory|Rule)\b/i.test(code) && /\b(interface|abstract|implements|extends|class)\b/i.test(code);
          note = passed ? 'Good decoupling of pricing/state/subsystem logic.' : 'Core subsystems appear tightly bound to main controller.';
          break;
        case 'c4': // Concurrency / State
          passed = /\b(lock|sync|atomic|mutex|volatile|DoorStatus|MovingUp)\b/i.test(code);
          note = passed ? 'Found state or concurrency management mechanisms.' : 'Missing synchronization or explicit state transition handling.';
          break;
        case 'c5': // Observer / Events / Modularity
          passed = /\b(Observer|Listener|Event|Display|notify|update)\b/i.test(code) || rationale.toLowerCase().includes('observer');
          note = passed ? 'Observer / event mechanism addressed.' : 'Display board / event notifications not explicitly modeled.';
          break;
        default:
          passed = code.length > 100;
          note = passed ? 'Criteria verified.' : 'Needs further clarification.';
      }

      return {
        id: item.id,
        label: item.label,
        category: item.category,
        passed,
        note
      };
    });
  }

  _calculateDimensions({ code, rationale, entityAnalysis, smells, checklistResults, problem, declaredClasses = [] }) {
    const totalKeyEntities = Math.max(1, problem.keyEntities.length);
    const coverageRatio = entityAnalysis.covered.length / totalKeyEntities;
    const hasInterface = /\b(interface|abstract\s+class|\bABC\b|virtual\b)/i.test(code);
    const hasStrategy = /\b(interface|abstract)\s+[A-Za-z0-9_]*(Strategy|Policy|Algorithm|Dispatcher|State)\b/i.test(code);
    const hasLock = /\b(ReentrantLock|synchronized|mutex|lock_guard|atomic|ConcurrentHashMap)\b/i.test(code);

    // 1. SOLID Principles (0 - 100)
    let solidScore = 0;
    if (declaredClasses.length >= 2) solidScore += 25;
    else if (declaredClasses.length === 1) solidScore += 10;

    if (declaredClasses.length >= 4) solidScore += 15;
    if (hasInterface) solidScore += 30; // Abstraction
    if (code.includes('private ') || code.includes('protected ') || code.includes('self._')) solidScore += 20; // Encapsulation
    if (rationale.length > 50) solidScore += 10;

    if (smells.some(s => s.type === 'GOD_CLASS')) solidScore -= 25;
    if (smells.some(s => s.type === 'HARDCODED_TYPE_SWITCH')) solidScore -= 20;
    if (smells.some(s => s.type === 'MISSING_ABSTRACTIONS')) solidScore -= 20;
    if (smells.some(s => s.type === 'ENCAPSULATION_VIOLATION')) solidScore -= 10;
    solidScore = Math.max(0, Math.min(100, Math.round(solidScore)));

    // 2. Extensibility & Modularity (0 - 100)
    let extScore = 0;
    if (hasInterface) extScore += 30;
    if (hasStrategy) extScore += 35;
    if (coverageRatio >= 0.5) extScore += 20;
    if (declaredClasses.length >= 3) extScore += 15;
    if (smells.some(s => s.type === 'HARDCODED_TYPE_SWITCH')) extScore -= 25;
    extScore = Math.max(0, Math.min(100, Math.round(extScore)));

    // 3. Design Patterns & Abstraction (0 - 100)
    let patternScore = 0;
    const matchedPatterns = problem.patternsTargeted.filter(p => {
      const patternWord = p.split(' ')[0].toLowerCase();
      return code.toLowerCase().includes(patternWord) || rationale.toLowerCase().includes(patternWord);
    });
    patternScore += (matchedPatterns.length * 25);
    if (hasStrategy) patternScore += 25;
    patternScore = Math.max(0, Math.min(100, Math.round(patternScore)));

    // 4. Concurrency & State Safety (0 - 100)
    let concurrencyScore = 0;
    const isConcurrencyCritical = problem.patternsTargeted.some(p => p.toLowerCase().includes('concurrency')) ||
                                  problem.id === 'parking-lot' || problem.id === 'rate-limiter';
    if (isConcurrencyCritical) {
      if (hasLock) {
        concurrencyScore = 85;
      } else {
        concurrencyScore = 15; // Failed concurrency
      }
    } else {
      const hasStatePattern = /class\s+[A-Za-z0-9_]*State\b/i.test(code);
      if (hasStatePattern) concurrencyScore = 85;
      else if (code.includes('state') || code.includes('State')) concurrencyScore = 50;
      else concurrencyScore = 20;
    }

    // 5. Domain Completeness & Robustness (0 - 100)
    let qualityScore = Math.round(coverageRatio * 70);
    if (code.includes('throw new') || code.includes('Exception') || code.includes('null') || code.includes('try {')) {
      qualityScore += 20;
    }
    if (declaredClasses.length >= 3) {
      qualityScore += 10;
    }
    qualityScore = Math.max(0, Math.min(100, qualityScore));

    return {
      solid: {
        name: 'SOLID Principles',
        score: solidScore,
        summary: solidScore >= 75 ? 'Clean separation of concerns with strong single responsibility.' :
                 solidScore >= 40 ? 'Moderate design structure; needs deeper decoupling.' :
                 'Violates core SOLID principles or lacks class structure.'
      },
      extensibility: {
        name: 'Extensibility & Modularity',
        score: extScore,
        summary: extScore >= 75 ? 'Open for extension; new policies can be plugged in easily.' :
                 extScore >= 40 ? 'Partially extensible; some behaviors are tightly coupled.' :
                 'Rigid design with hardcoded logic.'
      },
      patterns: {
        name: 'Design Patterns & Abstraction',
        score: patternScore,
        summary: patternScore >= 70 ? 'Appropriate design patterns applied cleanly.' :
                 patternScore >= 40 ? 'Foundational patterns detected with room for refinement.' :
                 'Missing design patterns targeted by this problem.'
      },
      concurrency: {
        name: 'Concurrency & State Safety',
        score: concurrencyScore,
        summary: concurrencyScore >= 70 ? 'Race conditions and state transitions guarded safely.' :
                 'Shared mutable state is unprotected or risks race conditions.'
      },
      codeQuality: {
        name: 'Domain Completeness & Robustness',
        score: qualityScore,
        summary: qualityScore >= 70 ? 'Cohesive domain entities with adequate error handling.' :
                 qualityScore >= 40 ? 'Basic entities present; some core requirements missing.' :
                 'Missing most required domain entities.'
      }
    };
  }
}
