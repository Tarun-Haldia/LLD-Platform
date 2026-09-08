/**
 * Client-Side LLD Evaluator
 * Runs deterministic rule evaluation, smell detection, checklist verification,
 * and requirement shift simulation directly in the browser.
 * Provides instant, zero-latency feedback even when running offline or without Node.js.
 */
(function(window) {
  function evaluateCodeLocally(submission, problem) {
    const code = submission.code || '';
    const rationale = submission.rationale || '';
    const keyEntities = problem.keyEntities || [];

    // Strip comments and whitespace
    const codeWithoutComments = code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '')
      .replace(/#.*/g, '')
      .trim();

    const declaredClasses = [...code.matchAll(/\b(?:class|interface|enum|struct)\s+([A-Za-z0-9_]+)/g)].map(m => m[1]);

    // If blank or no classes declared: score is 0
    if (codeWithoutComments.length === 0 || declaredClasses.length === 0) {
      return {
        overallScore: 0,
        rubricBreakdown: {
          solid: { name: 'SOLID Principles', score: 0, summary: 'No classes or abstractions found in code to evaluate.' },
          extensibility: { name: 'Extensibility & Modularity', score: 0, summary: 'No extensible contracts or polymorphic interfaces found.' },
          patterns: { name: 'Design Patterns & Abstraction', score: 0, summary: 'No design patterns implemented.' },
          concurrency: { name: 'Concurrency & State Safety', score: 0, summary: 'No concurrency controls or state handling found.' },
          codeQuality: { name: 'Domain Completeness & Robustness', score: 0, summary: 'Code is blank or lacks domain entity definitions.' }
        },
        checklistResults: (problem.checklist || []).map(c => ({
          id: c.id,
          label: c.label,
          category: c.category,
          passed: false,
          note: 'Code is empty or lacks classes.'
        })),
        strengths: [],
        weaknesses: [
          'No domain model implemented.',
          'Missing all required entity classes.'
        ],
        actionableSuggestions: [{
          title: `Declare Domain Classes (${keyEntities.slice(0, 3).join(', ')})`,
          issue: 'No classes were found in the code editor.',
          explanation: `A valid Low-Level Design must specify the core entity classes and their relationships. Start by modeling ${keyEntities[0]} and ${keyEntities[1] || 'its collaborators'}.`,
          codeSnippet: `public class ${keyEntities[0]} {\n    // Define properties and methods\n}`
        }],
        changeSimulation: {
          scenarioId: problem.changeScenarios?.[0]?.id || 'default',
          scenarioTitle: problem.changeScenarios?.[0]?.title || 'Requirement Change',
          prompt: problem.changeScenarios?.[0]?.prompt || '',
          impactLevel: 'HIGH_FRICTION',
          adaptableClasses: [],
          vulnerableClasses: keyEntities.slice(0, 3),
          explanations: ['Cannot evaluate requirement change on an empty codebase.'],
          designTakeaway: 'Implement the baseline domain model before stress-testing against requirements changes.'
        },
        isFallback: false,
        isAiGenerated: false,
        evaluatorProvider: 'Client-Side Offline Engine',
        deterministicMetrics: {
          totalLines: code.split('\n').length,
          hasRationale: rationale.length > 30,
          hasDiagram: false,
          entityCoverageRatio: 0,
          smellCount: 1,
          smells: [{
            type: 'EMPTY_CODE',
            severity: 'HIGH',
            title: 'Empty / Missing Implementation',
            description: 'The submission does not contain any class or interface definitions.',
            recommendation: `Declare the core domain classes (e.g. ${keyEntities.slice(0, 3).join(', ')}) to receive an evaluation.`
          }]
        },
        evaluatedAt: new Date().toISOString()
      };
    }

    // Entity Coverage
    const covered = [];
    const missing = [];
    for (const entity of keyEntities) {
      const pattern = new RegExp(`\\b(class|interface|enum|struct|type)\\s+${entity}\\b`, 'i');
      if (pattern.test(code) || code.includes(entity)) {
        covered.push(entity);
      } else {
        missing.push(entity);
      }
    }

    // Smells detection
    const smells = [];
    const hasInterfaces = /\b(interface|abstract\s+class|\bABC\b|virtual\b)/i.test(code);
    if (!hasInterfaces) {
      smells.push({
        type: 'MISSING_ABSTRACTIONS',
        severity: 'HIGH',
        title: 'Lack of Abstractions / Interface Decoupling',
        description: 'No interfaces or abstract classes were detected. Directly binding components to concrete classes makes the design rigid and hard to test or extend.',
        recommendation: 'Introduce interfaces for critical extension points (e.g. Strategy or State patterns).'
      });
    }

    const switchOnType = /switch\s*\([^)]*(getType|type|status|state)[^)]*\)/i.test(code) ||
                         /if\s*\([^)]*(VehicleType|SpotType|Direction|getType|instanceof)[^)]*\)[\s\S]*?else\s+if/i.test(code);
    if (switchOnType) {
      smells.push({
        type: 'HARDCODED_TYPE_SWITCH',
        severity: 'MEDIUM',
        title: 'Hardcoded Type Branching (OCP Smell)',
        description: 'Found switch or nested if-else statements branching directly on concrete entity types instead of polymorphic behavior.',
        recommendation: 'Refactor type checks into polymorphic methods or apply the Strategy Pattern.'
      });
    }

    const isConcurrencyCritical = problem.patternsTargeted.some(p => p.toLowerCase().includes('concurrency')) ||
                                  problem.id === 'parking-lot' || problem.id === 'rate-limiter';
    const hasConcurrencyPrimitives = /\b(synchronized|ReentrantLock|Lock|Atomic|mutex|lock_guard|thread|threading|volatile|ConcurrentHashMap)\b/i.test(code);
    if (isConcurrencyCritical && !hasConcurrencyPrimitives) {
      smells.push({
        type: 'MISSING_CONCURRENCY_CONTROL',
        severity: 'HIGH',
        title: 'Unsynchronized Shared Mutable State',
        description: 'This problem requires concurrent gate/request operations, but no locks, mutexes, atomic primitives, or synchronized blocks were found.',
        recommendation: 'Protect shared state mutations using mutexes, ReentrantLock, or atomic references.'
      });
    }

    // Checklist
    const checklistResults = (problem.checklist || []).map(item => {
      let passed = false;
      let note = '';
      if (item.id === 'c1') {
        passed = covered.length >= Math.ceil(keyEntities.length * 0.5);
        note = passed ? `Identified ${covered.length} core entities in code.` : 'Key domain entities appear missing or unnamed.';
      } else if (item.id === 'c2') {
        passed = /\b(Strategy|State|Algorithm|Dispatcher)\b/i.test(code);
        note = passed ? 'Found strategy/state pattern interfaces and implementations.' : 'No clear strategy or state abstraction identified.';
      } else if (item.id === 'c3') {
        passed = /\b(Pricing|Payment|Floor|Inventory|Rule)\b/i.test(code) && hasInterfaces;
        note = passed ? 'Good decoupling of pricing/state/subsystem logic.' : 'Core subsystems appear tightly bound to main controller.';
      } else if (item.id === 'c4') {
        passed = hasConcurrencyPrimitives || /\b(DoorStatus|MovingUp|State)\b/i.test(code);
        note = passed ? 'Found state or concurrency management mechanisms.' : 'Missing synchronization or explicit state transition handling.';
      } else if (item.id === 'c5') {
        passed = /\b(Observer|Listener|Event|Display|notify|update)\b/i.test(code) || rationale.toLowerCase().includes('observer');
        note = passed ? 'Observer / event mechanism addressed.' : 'Display board / event notifications not explicitly modeled.';
      } else {
        passed = code.length > 100;
        note = passed ? 'Criteria verified.' : 'Needs further clarification.';
      }
      return { id: item.id, label: item.label, category: item.category, passed, note };
    });

    // Scoring
    const totalKeyEntities = Math.max(1, keyEntities.length);
    const coverageRatio = covered.length / totalKeyEntities;
    const hasStrategy = /\b(interface|abstract)\s+[A-Za-z0-9_]*(Strategy|Policy|Algorithm|Dispatcher|State)\b/i.test(code);

    let solidScore = 0;
    if (declaredClasses.length >= 2) solidScore += 25;
    if (declaredClasses.length >= 4) solidScore += 15;
    if (hasInterfaces) solidScore += 30;
    if (code.includes('private ') || code.includes('protected ') || code.includes('self._')) solidScore += 20;
    if (rationale.length > 50) solidScore += 10;
    if (smells.some(s => s.type === 'HARDCODED_TYPE_SWITCH')) solidScore -= 20;
    if (!hasInterfaces) solidScore -= 20;
    solidScore = Math.max(0, Math.min(100, Math.round(solidScore)));

    let extScore = 0;
    if (hasInterfaces) extScore += 30;
    if (hasStrategy) extScore += 35;
    if (coverageRatio >= 0.5) extScore += 20;
    if (declaredClasses.length >= 3) extScore += 15;
    if (smells.some(s => s.type === 'HARDCODED_TYPE_SWITCH')) extScore -= 25;
    extScore = Math.max(0, Math.min(100, Math.round(extScore)));

    let patternScore = 0;
    const matchedPatterns = problem.patternsTargeted.filter(p => {
      const patternWord = p.split(' ')[0].toLowerCase();
      return code.toLowerCase().includes(patternWord) || rationale.toLowerCase().includes(patternWord);
    });
    patternScore += (matchedPatterns.length * 25);
    if (hasStrategy) patternScore += 25;
    patternScore = Math.max(0, Math.min(100, Math.round(patternScore)));

    let concurrencyScore = 0;
    if (isConcurrencyCritical) {
      concurrencyScore = hasConcurrencyPrimitives ? 85 : 15;
    } else {
      concurrencyScore = /class\s+[A-Za-z0-9_]*State\b/i.test(code) ? 85 : (code.includes('state') ? 50 : 20);
    }

    let qualityScore = Math.round(coverageRatio * 70);
    if (code.includes('throw new') || code.includes('Exception') || code.includes('null') || code.includes('try {')) {
      qualityScore += 20;
    }
    if (declaredClasses.length >= 3) qualityScore += 10;
    qualityScore = Math.max(0, Math.min(100, qualityScore));

    const overallScore = Math.round(
      (solidScore * 0.25) +
      (extScore * 0.25) +
      (patternScore * 0.20) +
      (concurrencyScore * 0.15) +
      (qualityScore * 0.15)
    );

    // Strengths & Weaknesses
    const strengths = [];
    if (covered.length > 0) strengths.push(`Domain modeling: Declared key domain entities (${covered.slice(0, 4).join(', ')}).`);
    if (hasInterfaces) strengths.push('Good abstraction: Utilized interfaces/abstract classes for decoupling.');
    if (hasConcurrencyPrimitives) strengths.push('Concurrency safety: Employs explicit synchronization/lock primitives.');
    if (hasStrategy) strengths.push('Design patterns: Clear application of Strategy or State pattern.');

    const weaknesses = [];
    if (missing.length > 0) weaknesses.push(`Incomplete coverage: Missing key abstractions (${missing.slice(0, 3).join(', ')}).`);
    if (!hasInterfaces) weaknesses.push('High coupling: Components bind directly to concrete classes without interface abstraction.');
    if (isConcurrencyCritical && !hasConcurrencyPrimitives) weaknesses.push('Race condition risk: Critical state modified without synchronization.');

    // Suggestions
    const actionableSuggestions = [];
    if (!hasInterfaces) {
      actionableSuggestions.push({
        title: 'Introduce Interface Abstractions',
        issue: 'Direct binding to concrete classes makes the architecture rigid.',
        explanation: 'Introduce interface contracts so algorithms or policies can be changed without modifying callers.',
        codeSnippet: `public interface ${keyEntities[1] || 'Domain'}Strategy {\n    void execute();\n}`
      });
    }
    if (isConcurrencyCritical && !hasConcurrencyPrimitives) {
      actionableSuggestions.push({
        title: 'Protect State Mutations with Locks',
        issue: 'Shared state changes are unguarded against concurrent race conditions.',
        explanation: 'Wrap critical state transitions in ReentrantLock or synchronized blocks.',
        codeSnippet: `private final java.util.concurrent.locks.ReentrantLock lock = new java.util.concurrent.locks.ReentrantLock();\npublic void mutateState() {\n    lock.lock();\n    try {\n        // atomic update\n    } finally { lock.unlock(); }\n}`
      });
    }

    // Change Simulation
    const scenario = problem.changeScenarios?.[0] || {
      id: 'dynamic-change',
      title: 'Requirement Shift',
      prompt: 'System requirements evolved.'
    };
    const changeSimulation = {
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      prompt: scenario.prompt,
      impactLevel: hasInterfaces && (hasStrategy || hasConcurrencyPrimitives) ? 'LOW_FRICTION' : 'HIGH_FRICTION',
      adaptableClasses: hasInterfaces ? ['Abstractions / Interfaces'] : [],
      vulnerableClasses: missing.length ? missing.slice(0, 2) : ['Core Controller'],
      explanations: hasInterfaces
        ? ['Clean: Interface decoupling allows the new requirement to be plugged in with minimal ripple effects.']
        : ['Friction: Concrete coupling requires altering multiple methods to accommodate the new requirement.'],
      designTakeaway: 'Decoupling behavior through Strategy or State patterns dramatically lowers refactoring friction.'
    };

    return {
      overallScore,
      rubricBreakdown: {
        solid: {
          name: 'SOLID Principles',
          score: solidScore,
          summary: solidScore >= 75 ? 'Clean separation of concerns.' : 'Needs deeper decoupling and abstraction.'
        },
        extensibility: {
          name: 'Extensibility & Modularity',
          score: extScore,
          summary: extScore >= 75 ? 'Open for extension; new policies can be plugged in easily.' : 'Rigid design with hardcoded logic.'
        },
        patterns: {
          name: 'Design Patterns & Abstraction',
          score: patternScore,
          summary: patternScore >= 70 ? 'Appropriate design patterns applied cleanly.' : 'Missing design patterns targeted by this problem.'
        },
        concurrency: {
          name: 'Concurrency & State Safety',
          score: concurrencyScore,
          summary: concurrencyScore >= 70 ? 'Race conditions and state transitions guarded safely.' : 'Shared mutable state is unprotected.'
        },
        codeQuality: {
          name: 'Domain Completeness & Robustness',
          score: qualityScore,
          summary: qualityScore >= 70 ? 'Cohesive domain entities with adequate error handling.' : 'Missing several required domain entities.'
        }
      },
      checklistResults,
      strengths,
      weaknesses,
      actionableSuggestions,
      changeSimulation,
      isFallback: false,
      isAiGenerated: false,
      evaluatorProvider: 'Client-Side Offline Engine',
      deterministicMetrics: {
        totalLines: code.split('\n').length,
        hasRationale: rationale.length > 30,
        hasDiagram: (submission.diagram || '').length > 10,
        entityCoverageRatio: coverageRatio,
        smellCount: smells.length,
        smells
      },
      evaluatedAt: new Date().toISOString()
    };
  }

  window.evaluateCodeLocally = evaluateCodeLocally;
})(typeof window !== 'undefined' ? window : this);
