# Low-Level Design (LLD) Practice Platform: Design Note

## 1. MVP Scope & User Journey
The MVP provides an end-to-end, distraction-free practice experience centered on the **closed feedback loop**:

$$\text{Select Problem} \longrightarrow \text{Model \& Code} \longrightarrow \text{Submit Attempt} \longrightarrow \text{Analyze Explainable Feedback} \longrightarrow \text{Compare Diff} \longrightarrow \text{Iterate}$$

### Key Components of the MVP
1. **Curated Problem Catalog:** Four rich, industry-standard LLD challenges (*Smart Parking Lot*, *Multi-Elevator Dispatcher*, *Smart Vending Machine*, and *Distributed Rate Limiter*). Each includes functional requirements, non-functional requirements, constraints, starter code (Java, TypeScript, Python, C++), and rubric checklists.
2. **Interactive Multi-Facet Workspace:**
   - Code & class hierarchy editor with starter templates.
   - Design Decisions & Rationale scratchpad.
   - Live Mermaid.js visual class diagram preview.
3. **Hybrid Evaluation Pipeline:** Combines deterministic AST/regex static analysis with reasoning feedback and dynamic requirement change simulation.
4. **Attempt History & Diff Comparator:** Versioned attempt tracking per problem with score deltas ($\Delta$) and line-by-line colored diffs.

---

## 2. Core Domain Architecture & Important Classes

The platform is designed following Clean Architecture and Object-Oriented Principles:

```
[ Domain Entities & Value Objects ]
  ├── Problem.js                  (Requirements, constraints, rubrics, templates, change scenarios)
  ├── Submission.js               (Payload: code, language, rationale, diagram, format)
  ├── Attempt.js                  (State machine: PENDING -> EVALUATING -> COMPLETED / FAILED)
  └── EvaluationResult.js         (Scores, 5-dimension breakdown, strengths, weaknesses, smells)

[ Evaluator Subsystem (Strategy & Pipeline Patterns) ]
  ├── IEvaluator.js               (Interface contract: evaluate(submission, problem))
  ├── DeterministicRuleEvaluator  (Entity coverage, God classes, OCP type switching, concurrency smells)
  ├── ReasoningEvaluator          (Heuristic qualitative analysis + optional external Gemini LLM)
  ├── RequirementChangeSimulator  (Stress-tests design against unexpected requirement pivots)
  └── CompositeEvaluatorPipeline  (Orchestrator with timeout guard and resilient fallback)

[ Repositories ]
  ├── ProblemRepository.js        (In-memory seeded catalog)
  └── SubmissionRepository.js     (Attempt history, attempt numbering, line-by-line diff engine)
```

### Important Classes & Responsibilities
- **`Submission` & `Attempt`:** Encapsulate the learner's inputs and track the lifecycle state machine (`PENDING` $\to$ `EVALUATING` $\to$ `COMPLETED` / `FAILED`).
- **`IEvaluator` (Strategy Pattern):** Defines the contract for all evaluators. Any new evaluation engine (e.g. unit test compilation, AST parser, or UML diagram validator) can be introduced by implementing this interface.
- **`DeterministicRuleEvaluator`:** Implements rule-based static inspection. Detects architectural smells:
  - *God Class:* Classes accumulating excessive methods or cross-cutting domain concerns.
  - *Hardcoded Type Switching:* `switch` or nested `if-else` chains on vehicle/spot types violating Open/Closed.
  - *Missing Abstractions:* Implementations lacking interfaces for critical extension points.
  - *Concurrency Safety:* Absence of locks or synchronization primitives on shared state.
- **`ReasoningEvaluator`:** Generates natural language critique, actionable refactoring code snippets, and trade-off explanations. Uses an intelligent offline heuristic engine by default with zero external dependencies, and supports Google Gemini 1.5 Flash when `GEMINI_API_KEY` is present.
- **`RequirementChangeSimulator`:** Tests the extensibility of the candidate's design by checking which classes remain open for extension vs. which classes become coupling hotspots under a requirement change.
- **`SubmissionRepository`:** Handles attempt versioning (`Attempt #1`, `Attempt #2`) and computes line-by-line unified diffs comparing code and design rationale across iterations.

---

## 3. Addressing the Five Core Design Questions

### Question 1: What does a learner actually need to provide for an LLD attempt to be meaningful?
- **Code & Class Definitions:** High-level diagrams alone omit critical details such as method signatures, return types, concurrency locks, and encapsulation. Pure code alone, however, can obscure the candidate's architectural intent.
- **Design Rationale & Assumptions:** Explaining *why* a particular pattern was chosen (e.g. Strategy vs. State) and what assumptions were made regarding concurrency or persistence.
- **Visual Diagram (Mermaid.js):** Visualizing relationships (`--|>`, `..|>`, `*--`, `-->`) helps verify coupling at a glance.
- **Starter Templates:** Pre-populated skeleton classes in Java, TypeScript, Python, and C++ remove boilerplate friction so learners focus purely on domain design.

### Question 2: What makes feedback useful when there can be more than one valid LLD solution?
- **Principle-Based, Not Canonical-Matching:** The platform never demands a specific "single right answer". Instead, it evaluates across **5 Universal Dimensions**:
  1. *SOLID Principles Adherence* (25%)
  2. *Extensibility & Modularity* (25%)
  3. *Design Pattern Appropriateness* (20%)
  4. *Concurrency & State Safety* (15%)
  5. *Domain Completeness & Robustness* (15%)
- **The "Requirement Shift" Acid Test:** The platform tests how the candidate's design responds to a sudden requirement change (e.g., adding EV fast-charging spots to the parking lot). If the pricing strategy is decoupled via an interface, the design adapts with minimal friction; if hardcoded inside the ticket class, it is flagged as a coupling hotspot.
- **Actionable Refactoring Code Diffs:** Instead of vague advice like *"improve separation of concerns"*, the engine outputs concrete before-and-after refactoring snippets.

### Question 3: Which parts of evaluation should be deterministic, and which parts benefit from an LLM?
- **Deterministic (Fast, 100% Reliable, Zero Token Cost):**
  - Verification of core domain entities (e.g. `ParkingSpot`, `Vehicle`, `Ticket`, `PricingStrategy`).
  - Detection of God classes (>10 public methods on orchestrators).
  - Detection of hardcoded type switching (anti-polymorphism smell).
  - Missing interfaces / abstract classes.
  - Concurrency checks on mutable shared state.
- **LLM / Reasoning (Deep Qualitative Nuance):**
  - Assessing architectural trade-offs (e.g. coarse-grained vs. fine-grained locking).
  - Evaluating naming clarity and domain semantic cohesion.
  - Contextual code review and tailored advice.
- **Hybrid Fusion:** Deterministic metrics form a structural baseline. The reasoning engine enriches this with natural language explanations and refactoring examples.

### Question 4: How would the design accommodate another evaluation approach or submission format later?
- **Evaluation Extensibility:** Via the `IEvaluator` strategy interface and `CompositeEvaluatorPipeline`. If we later want to add:
  - *Dynamic Test Runner:* Run compile-and-execute unit tests against candidate classes.
  - *AST Analyzer:* Use Babel / Tree-sitter for detailed abstract syntax tree traversal.
  - *UML Validator:* Parse visual diagram nodes and validate dependency arrows.
  These can be added as pipeline stages with zero changes to existing domain entities.
- **Submission Format Extensibility:** The `Submission` entity supports a `format` discriminator (e.g., `'standard'`, `'github_repo'`, `'interactive_canvas'`). A new parser strategy can ingest repositories or Jupyter notebooks into standard domain abstractions.

### Question 5: What should happen if evaluation takes time or fails?
- **Asynchronous Lifecycle:** Submissions return immediately (`HTTP 202 Accepted`) with an attempt ID. The client polls the status endpoint (`PENDING` $\to$ `EVALUATING` $\to$ `COMPLETED` / `FAILED`), keeping the UI responsive.
- **Timeout Protection:** The reasoning stage is wrapped in a 15-second timeout guard.
- **Resilient Fallback Mode:** If the external LLM or reasoning engine times out or errors, the pipeline automatically falls back to deterministic metrics with an informative `isFallback: true` badge. The user is never blocked.
- **Single-Click Retry:** Users can retry any failed attempt via `POST /api/attempts/:id/retry`.

---

## 4. Key Trade-Offs Made in this Design

| Decision | Trade-off Chosen | Rationale & Alternative Considered |
| :--- | :--- | :--- |
| **Persistence: In-Memory Map vs. PostgreSQL / SQLite** | In-Memory Repository with state tracking | For a 2-day LLD prototype, spinning up external databases adds DevOps overhead without contributing to domain design. In-memory structures model repositories cleanly and are trivially swappable with Prisma/TypeORM. |
| **Evaluation: Hybrid Fallback vs. Pure External LLM** | Deterministic baseline + Heuristic engine with optional Gemini API | Relying 100% on external LLMs creates latency, costs, rate limits, and network failure points. The built-in expert heuristic engine ensures 100% test pass rate and offline availability. |
| **Client Tech: Vanilla HTML/CSS/JS vs. Next.js / React** | Vanilla ES6 + Modern CSS Design System | Zero build step, instant startup, zero node_modules bundle bloat, and total control over animations, glassmorphism, and performance. |
