import { IEvaluator } from './IEvaluator.js';

export class ReasoningEvaluator extends IEvaluator {
  constructor({ apiKey = process.env.GEMINI_API_KEY || null, aiProvider = 'gemini' } = {}) {
    super();
    this.defaultApiKey = apiKey;
    this.defaultProvider = aiProvider;
  }

  /**
   * Generates qualitative, explainable reasoning critique.
   * Supports real external AI (Gemini / OpenAI) or deep dynamic syntax-aware offline analysis.
   */
  async evaluate(submission, problem, options = {}) {
    const apiKey = options.apiKey || this.defaultApiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    const provider = (options.aiProvider || this.defaultProvider || 'gemini').toLowerCase();

    // 1. If API Key is provided, call real AI (Google Gemini or OpenAI)
    if (apiKey) {
      try {
        if (provider === 'openai' || apiKey.startsWith('sk-')) {
          const openAiResult = await this._callOpenAI(submission, problem, options, apiKey);
          if (openAiResult) return openAiResult;
        } else {
          const geminiResult = await this._callGeminiAPI(submission, problem, options, apiKey);
          if (geminiResult) return geminiResult;
        }
      } catch (err) {
        console.warn(`External AI evaluation failed (${err.message}). Falling back to Deep Dynamic Heuristic Analyzer.`);
      }
    }

    // 2. Deep Dynamic Syntax-Aware Analyzer (tailored to user's actual code, language, and problem)
    return this._generateDeepDynamicAnalysis(submission, problem, options);
  }

  /**
   * Call real Google Gemini API
   */
  async _callGeminiAPI(submission, problem, context, apiKey) {
    const model = 'gemini-1.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `You are a Principal Software Engineer conducting a rigorous Low-Level Design (LLD) interview code review.

Problem Title: ${problem.title}
Problem Category: ${problem.category}
Functional Requirements:
${problem.functionalRequirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Non-Functional Requirements:
${problem.nonFunctionalRequirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Targeted Design Patterns: ${problem.patternsTargeted.join(', ')}
Candidate Submission Language: ${submission.language}

Candidate Code:
\`\`\`${submission.language}
${submission.code}
\`\`\`

Candidate Design Decisions & Rationale:
${submission.rationale || 'None provided'}

Checklist & Smells context:
${JSON.stringify(context.smells || [])}

Please evaluate the candidate's actual code thoroughly and return a valid JSON object matching this schema:
{
  "overallScore": number (0 to 100),
  "dimensionScores": {
    "solid": number (0 to 100),
    "extensibility": number (0 to 100),
    "patterns": number (0 to 100),
    "concurrency": number (0 to 100),
    "codeQuality": number (0 to 100)
  },
  "strengths": [
    "specific strength citing candidate's actual class, method, or design choice",
    "specific strength citing candidate's actual class, method, or design choice"
  ],
  "weaknesses": [
    "specific critique citing candidate's actual class, method, or design flaw",
    "specific critique citing candidate's actual class, method, or design flaw"
  ],
  "actionableSuggestions": [
    {
      "title": "Clear refactoring title",
      "issue": "What is wrong in candidate's code",
      "explanation": "Why this violates LLD best practices and how to fix it",
      "codeSnippet": "Concrete refactored code block in ${submission.language}"
    }
  ],
  "tradeOffAnalysis": [
    "Meaningful architectural trade-off in candidate's design",
    "Concurrency vs memory trade-off in candidate's design"
  ]
}
Return ONLY valid JSON.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 14000);

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      })
    });

    clearTimeout(timeout);
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Gemini API returned HTTP ${resp.status}: ${errText.slice(0, 150)}`);
    }

    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini API');

    const parsed = JSON.parse(text);
    return {
      type: 'reasoning',
      overallScore: parsed.overallScore || context.overallScore || 75,
      dimensionScores: parsed.dimensionScores,
      strengths: parsed.strengths || [],
      weaknesses: parsed.weaknesses || [],
      actionableSuggestions: parsed.actionableSuggestions || [],
      tradeOffAnalysis: parsed.tradeOffAnalysis || [],
      isAiGenerated: true,
      evaluatorProvider: 'Google Gemini 1.5 Flash (Live AI)'
    };
  }

  /**
   * Call real OpenAI API
   */
  async _callOpenAI(submission, problem, context, apiKey) {
    const endpoint = 'https://api.openai.com/v1/chat/completions';
    const prompt = `You are a Principal Software Engineer conducting a rigorous Low-Level Design (LLD) interview code review.
Problem: ${problem.title}
Language: ${submission.language}
Requirements: ${problem.functionalRequirements.join('; ')}

Candidate Code:
\`\`\`${submission.language}
${submission.code}
\`\`\`
Candidate Rationale:
${submission.rationale}

Provide evaluation in JSON:
{
  "overallScore": number (0-100),
  "dimensionScores": { "solid": number, "extensibility": number, "patterns": number, "concurrency": number, "codeQuality": number },
  "strengths": ["string", "string"],
  "weaknesses": ["string", "string"],
  "actionableSuggestions": [{ "title": "string", "issue": "string", "explanation": "string", "codeSnippet": "string" }],
  "tradeOffAnalysis": ["string", "string"]
}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 14000);

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert LLD interviewer. Respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      })
    });

    clearTimeout(timeout);
    if (!resp.ok) throw new Error(`OpenAI API returned ${resp.status}`);

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);

    return {
      type: 'reasoning',
      overallScore: parsed.overallScore || 75,
      dimensionScores: parsed.dimensionScores,
      strengths: parsed.strengths || [],
      weaknesses: parsed.weaknesses || [],
      actionableSuggestions: parsed.actionableSuggestions || [],
      tradeOffAnalysis: parsed.tradeOffAnalysis || [],
      isAiGenerated: true,
      evaluatorProvider: 'OpenAI GPT-4o-mini (Live AI)'
    };
  }

  /**
   * Deep Dynamic Code-Aware Analysis (Offline Mode)
   * Dynamically inspects the candidate's actual syntax, class names, methods, and language.
   */
  _generateDeepDynamicAnalysis(submission, problem, context = {}) {
    const code = submission.code || '';
    const rationale = submission.rationale || '';
    const lang = submission.language || 'java';
    const smells = context.smells || [];

    // Extract user's declared classes, interfaces, and methods
    const declaredClasses = [...code.matchAll(/\b(?:class|struct)\s+([A-Za-z0-9_]+)/g)].map(m => m[1]);
    const declaredInterfaces = [...code.matchAll(/\b(?:interface|abstract\s+class|\bABC\b)\s+([A-Za-z0-9_]+)/g)].map(m => m[1]);
    const declaredMethods = [...code.matchAll(/\b(?:public|private|protected|def|fn|function)\s+(?:[A-Za-z0-9_<>[\]]+\s+)?([A-Za-z0-9_]+)\s*\(/g)].map(m => m[1]);

    // Handle blank or stub-only submissions
    if (declaredClasses.length === 0 && declaredInterfaces.length === 0) {
      return {
        type: 'reasoning',
        overallScore: 0,
        strengths: ['Attempt submitted for evaluation.'],
        weaknesses: [
          'No domain classes or interfaces were implemented. The code appears blank or contains only comments/stubs.',
          'Cannot evaluate SOLID principles, object relationships, or design patterns without class definitions.'
        ],
        actionableSuggestions: [{
          title: 'Implement Core Domain Classes',
          issue: 'No domain model found in editor.',
          explanation: `A Low-Level Design solution requires modeling the primary entities and relationships. Start by creating classes for: ${(problem.keyEntities || []).slice(0, 3).join(', ')}.`,
          codeSnippet: `// Example domain skeleton:\npublic class ${(problem.keyEntities?.[0] || 'DomainEntity')} {\n    // Add attributes, constructors, and core methods\n}`
        }],
        tradeOffAnalysis: ['Review the problem requirements tab on the left to understand necessary classes and contracts.'],
        isAiGenerated: false,
        evaluatorProvider: 'Deep Dynamic Code-Aware Analyzer'
      };
    }

    const strengths = [];
    const weaknesses = [];
    const actionableSuggestions = [];
    const tradeOffAnalysis = [];

    // 1. Dynamic Strengths citing user's actual classes
    if (declaredInterfaces.length > 0) {
      strengths.push(`Clean contract design: Introduced explicit abstraction (${declaredInterfaces.join(', ')}) to decouple clients from concrete implementations.`);
    }

    if (declaredClasses.length > 0) {
      const coreClasses = declaredClasses.slice(0, 3).join(', ');
      strengths.push(`Domain decomposition: Modeled domain entities with explicit types: ${coreClasses}.`);
    }

    const hasConcurrency = /\b(synchronized|ReentrantLock|Lock|Atomic|mutex|lock_guard|threading|volatile|ConcurrentHashMap)\b/i.test(code);
    if (hasConcurrency) {
      const lockType = code.includes('ReentrantLock') ? 'ReentrantLock' :
                       code.includes('synchronized') ? 'synchronized monitor locks' :
                       code.includes('mutex') ? 'std::mutex' : 'atomic primitives';
      strengths.push(`Thread safety awareness: Guarded concurrent state mutations using ${lockType}.`);
    }

    const hasStrategyOrState = declaredClasses.some(c => /Strategy|State|Policy|Algorithm/i.test(c)) ||
                               declaredInterfaces.some(i => /Strategy|State|Policy|Algorithm/i.test(i));
    if (hasStrategyOrState) {
      const patternName = code.includes('State') ? 'State Pattern' : 'Strategy Pattern';
      strengths.push(`Design Pattern adoption: Applied the ${patternName} to encapsulate interchangeable domain behaviors.`);
    }

    if (rationale.length > 40) {
      strengths.push(`Articulated architectural trade-offs: Rationale clarifies concurrency assumptions and design decisions.`);
    }

    if (strengths.length === 0) {
      strengths.push('Provided initial class and interface definitions to represent the domain problem.');
    }

    // 2. Dynamic Weaknesses & Context-Aware Actionable Suggestions
    if (declaredInterfaces.length === 0) {
      weaknesses.push('High coupling: All components are bound directly to concrete classes with zero interface abstraction.');
      actionableSuggestions.push(this._getMissingInterfaceSuggestion(problem, lang, declaredClasses));
    }

    if (!hasConcurrency && (problem.id === 'parking-lot' || problem.id === 'rate-limiter' || problem.id === 'elevator-system')) {
      const targetClass = declaredClasses.find(c => /Spot|Limiter|Car|Machine|Slot/i.test(c)) || declaredClasses[0] || 'DomainEntity';
      weaknesses.push(`Race condition risk: Class '${targetClass}' performs state modifications without synchronization.`);
      actionableSuggestions.push(this._getConcurrencySuggestion(problem, lang, targetClass));
    }

    // Check for hardcoded type branching
    const switchSmell = smells.find(s => s.type === 'HARDCODED_TYPE_SWITCH');
    if (switchSmell) {
      weaknesses.push(`Open/Closed violation: Found conditional branching on concrete types. Adding new variants requires modifying existing logic.`);
      actionableSuggestions.push(this._getPolymorphismSuggestion(problem, lang));
    }

    // Check for God Class
    const godClassSmell = smells.find(s => s.type === 'GOD_CLASS');
    if (godClassSmell) {
      const godClassName = declaredClasses.find(c => /Controller|Manager|System|Lot|Machine/i.test(c)) || declaredClasses[0] || 'Controller';
      weaknesses.push(`Single Responsibility violation: '${godClassName}' handles coordination, state management, and business logic concurrently.`);
      actionableSuggestions.push(this._getGodClassSuggestion(problem, lang, godClassName));
    }

    // Missing problem entities
    const missingEntities = (problem.keyEntities || []).filter(e => !code.includes(e));
    if (missingEntities.length > 0) {
      weaknesses.push(`Incomplete domain coverage: Missing key abstractions (${missingEntities.slice(0, 3).join(', ')}).`);
    }

    if (weaknesses.length === 0) {
      weaknesses.push('Edge case resilience: Ensure explicit exception handling for invalid states and boundary inputs.');
    }

    // 3. Problem-Specific Trade-Off Commentary
    tradeOffAnalysis.push(...this._getProblemTradeOffs(problem.id));

    return {
      type: 'reasoning',
      strengths,
      weaknesses,
      actionableSuggestions,
      tradeOffAnalysis,
      isAiGenerated: false,
      evaluatorProvider: 'Deep Dynamic Code-Aware Analyzer'
    };
  }

  _getMissingInterfaceSuggestion(problem, lang, declaredClasses) {
    if (problem.id === 'parking-lot') {
      return {
        title: 'Decouple Fee Calculation via IPricingStrategy',
        issue: 'Parking fee calculation is tightly bound to concrete classes.',
        explanation: 'Introduce an IPricingStrategy interface so tiered, surge, and EV kilowatt pricing can be added without altering Ticket or ParkingLot.',
        codeSnippet: lang === 'typescript' ?
          `export interface IPricingStrategy {\n  calculateFee(entryTime: Date, exitTime: Date): number;\n}` :
          `public interface PricingStrategy {\n    double calculateFee(Ticket ticket, Date exitTime);\n}`
      };
    } else if (problem.id === 'elevator-system') {
      return {
        title: 'Decouple Dispatching via IDispatcherStrategy',
        issue: 'Elevator scheduling is hardcoded inside the car or controller.',
        explanation: 'Abstract floor dispatching behind an interface (e.g. SCAN/LOOK vs Nearest Car) to allow easy scheduling policy changes.',
        codeSnippet: lang === 'typescript' ?
          `export interface IDispatcherStrategy {\n  selectElevator(cars: ElevatorCar[], floor: number, dir: Direction): ElevatorCar;\n}` :
          `public interface DispatcherStrategy {\n    ElevatorCar selectElevator(List<ElevatorCar> cars, int floor, Direction dir);\n}`
      };
    } else {
      return {
        title: 'Introduce Strategy Abstraction',
        issue: 'Core algorithms are coupled to the main class.',
        explanation: 'Define an interface to encapsulate the variable behavior.',
        codeSnippet: `public interface ExecutionStrategy {\n    boolean execute();\n}`
      };
    }
  }

  _getConcurrencySuggestion(problem, lang, targetClass) {
    if (lang === 'typescript') {
      return {
        title: `Protect Shared State in ${targetClass}`,
        issue: `Concurrent requests modifying state in ${targetClass} can race.`,
        explanation: 'Ensure atomic state checks or sequential queue processing.',
        codeSnippet: `// In ${targetClass}:\nprivate isLocked = false;\npublic async acquire(): Promise<boolean> {\n  if (this.isLocked) return false;\n  this.isLocked = true;\n  return true;\n}`
      };
    } else if (lang === 'python') {
      return {
        title: `Thread-Safe Mutex in ${targetClass}`,
        issue: `Race condition on mutable instance state in ${targetClass}.`,
        explanation: 'Use threading.Lock() around state mutation.',
        codeSnippet: `import threading\nclass ${targetClass}:\n    def __init__(self):\n        self._lock = threading.Lock()\n    def update_state(self):\n        with self._lock:\n            # thread-safe mutation\n            pass`
      };
    } else {
      return {
        title: `Synchronize State Mutation in ${targetClass}`,
        issue: `Concurrent threads checking state in ${targetClass} will read stale values.`,
        explanation: 'Use fine-grained ReentrantLock to guard state changes without blocking entire lot.',
        codeSnippet: `// Inside ${targetClass}:\nprivate final java.util.concurrent.locks.ReentrantLock lock = new java.util.concurrent.locks.ReentrantLock();\npublic boolean assign() {\n    lock.lock();\n    try {\n        if (!occupied) { occupied = true; return true; }\n        return false;\n    } finally { lock.unlock(); }\n}`
      };
    }
  }

  _getPolymorphismSuggestion(problem, lang) {
    return {
      title: 'Replace Conditional Type Checks with Polymorphic Dispatch',
      issue: 'Switching or if-else on type enums violates the Open/Closed Principle.',
      explanation: 'Delegate type-specific behavior (e.g. dimensions, capacity, hourly rate multiplier) to polymorphic subclass methods.',
      codeSnippet: `// Instead of switch(type): prefer polymorphism:\npublic abstract class BaseEntity {\n    public abstract boolean canAccommodate(SpotType spot);\n}`
    };
  }

  _getGodClassSuggestion(problem, lang, godClassName) {
    return {
      title: `Decompose '${godClassName}' into Focused Services`,
      issue: `'${godClassName}' violates Single Responsibility Principle (SRP).`,
      explanation: `Split '${godClassName}' into dedicated collaborators: AllocationService, StateManager, and NotificationPublisher.`,
      codeSnippet: `public class SubsystemCoordinator {\n    private final ServiceA serviceA;\n    private final ServiceB serviceB;\n}`
    };
  }

  _getProblemTradeOffs(problemId) {
    if (problemId === 'parking-lot') {
      return [
        'Trade-off: Per-Spot Fine-Grained Locking vs. Global Lot Lock. Fine-grained spot locking enables high concurrent gate throughput at the expense of maintaining individual lock objects per spot.',
        'Trade-off: In-Memory Spatial Allocation (Nearest Entrance) vs. Round-Robin Load Balancing across floors.'
      ];
    } else if (problemId === 'elevator-system') {
      return [
        'Trade-off: SCAN / LOOK Elevator Scheduling vs. Shortest Seek First (Nearest Car). LOOK minimizes passenger wait variance and eliminates starvation, but nearest-car dispatching may have lower latency under light load.',
        'Trade-off: Centralized Dispatcher Controller vs. Decentralized Car Peer Negotiation.'
      ];
    } else if (problemId === 'vending-machine') {
      return [
        'Trade-off: Explicit GoF State Pattern vs. State Transition Matrix. The State Pattern encapsulates actions cleanly in dedicated classes, whereas a matrix simplifies serialization and persistence.',
        'Trade-off: Immediate Change Return vs. Credit Retention for subsequent purchases.'
      ];
    } else if (problemId === 'rate-limiter') {
      return [
        'Trade-off: Token Bucket vs. Sliding Window Log. Token Bucket has O(1) memory footprint and easily handles bursts, whereas Sliding Window Log provides 100% accurate rate bounding at the cost of unbounded memory overhead for high QPS.',
        'Trade-off: Atomic Compare-And-Swap (CAS) vs. Synchronized Locks for token replenishment.'
      ];
    }
    return [
      'Trade-off: Extensibility vs. Simplicity. Additional interface layers increase modularity at the cost of indirection.'
    ];
  }
}
