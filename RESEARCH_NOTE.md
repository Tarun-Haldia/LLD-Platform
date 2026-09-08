# Low-Level Design (LLD) Practice Platform: Research Note

## 1. The Core Learner Problem
Low-Level Design (LLD) and Object-Oriented Design (OOD) are critical components of senior and staff engineering interviews, yet practicing LLD remains one of the most frustrating experiences for learners. 

Unlike Data Structures and Algorithms (DSA), where a solution either passes or fails deterministic unit test cases with clear time/space complexity, LLD problems (e.g., *Parking Lot*, *Elevator System*, *Vending Machine*, *Rate Limiter*) have **no single canonical answer**. A learner can design a parking lot using an enum-driven monolithic controller, a state machine, or an event-driven strategy pipeline—and all of them can theoretically "work".

However, learners constantly face four unaddressed questions:
1. **"Are my abstractions actually good, or am I over-engineering?"**
2. **"Does my code violate Single Responsibility or Open/Closed principles in subtle ways?"**
3. **"If the interviewer introduces a sudden requirement change, will my design gracefully extend or completely collapse?"**
4. **"Did my second attempt actually improve over my first attempt?"**

---

## 2. Research on Existing Approaches & Tools

| Approach / Platform | Strengths | Critical Gaps |
| :--- | :--- | :--- |
| **LeetCode / HackerRank** | Excellent automated test harness, instant pass/fail, large user base. | **Blind to Architecture:** Only tests function return values. A 500-line monolithic `switch` statement with zero OOP abstractions passes as easily as a clean Strategy pattern. |
| **Educative ("Grokking LLD") / Books (Gang of Four, Clean Code)** | High-quality reference architectures, UML diagrams, explanations of trade-offs. | **Passive Consumption:** Reading a reference solution provides no active practice or critique of the learner's own mental models. No feedback loop. |
| **Ad-Hoc LLM Prompting (ChatGPT, Claude)** | Instant natural language responses, capable of code critique. | **Inconsistent & Sycophantic:** LLMs tend to be overly agreeable, lack consistent rubrics across attempts, cannot diff attempt versions, and frequently hallucinate missing requirements. |
| **Peer / Mentor Mock Interviews** | Context-rich, conversational, assesses trade-offs and edge cases. | **Unscalable & Expensive:** Finding qualified senior engineers for repeated LLD mocks is cost-prohibitive and difficult to schedule on demand. |

---

## 3. Key Market Gaps Identified

### Gap A: Absence of Multi-Dimensional Evaluation Rubrics
Learners are either told *"looks good"* or given stylistic nitpicks. What is missing is a structured breakdown across the core pillars of LLD:
- **SOLID Adherence:** SRP violations (God classes), OCP violations (hardcoded `switch` statements), Interface Segregation.
- **Extensibility:** Pluggable strategies vs. hardcoded conditional branching.
- **Design Pattern Appropriateness:** Applying patterns because they genuinely fit (e.g. State for elevator cabs, Strategy for pricing), not resume padding.
- **Concurrency & Thread Safety:** Managing shared mutable state under concurrent operations (e.g. parking spot allocation).
- **Domain Completeness:** Handling real-world invariants and edge cases.

### Gap B: Disconnect Between Deterministic Rules and Reasoning
Pure LLMs can miss structural syntax details or hallucinate class coverage. Conversely, pure linting tools cannot evaluate whether choosing the *Strategy Pattern* was a better trade-off than the *Decorator Pattern*. A hybrid pipeline is required.

### Gap C: Lack of Progression Tracking (Diffing Iterations)
Real learning occurs during iteration: *Choose $\to$ Design $\to$ Submit $\to$ Review Feedback $\to$ Refactor $\to$ Re-submit*. Current tools treat every submission as an isolated event, preventing learners from seeing whether their refactoring successfully resolved previously flagged smells.

### Gap D: The "Requirement Shift" Acid Test
In real interviews, an interviewer will let a candidate design for 20 minutes, then ask: *"What if we need to support electric vehicle charging spots with hourly kilowatt metering?"* The candidate's design either adapts with minimal edits (open for extension) or requires rewriting the core controller. No existing platform tests this interactively.

---

## 4. Product Direction & Value Proposition

To solve these gaps, our LLD Practice Platform introduces a focused, high-leverage practice studio:

1. **Multi-Facet Practice Studio:** Enables candidates to express their design through **Code** (Java, TypeScript, Python, C++), **Design Decisions & Rationale**, and **Live Visual Class Diagrams (Mermaid.js)**.
2. **Hybrid Evaluation Engine:**
   - *Deterministic Stage:* Fast, zero-token static analysis detecting God classes, hardcoded type-switching, missing domain entities, and missing concurrency primitives.
   - *Reasoning Stage:* Deep architectural critique explaining trade-offs, strengths, weaknesses, and concrete refactoring snippets.
3. **Interactive Requirement Change Simulator:** Dynamically subjects the learner's code to unexpected requirement shifts, classifying which classes are cleanly open for extension vs. which are vulnerable coupling hotspots.
4. **Attempt History & Visual Line Diffing:** Preserves all attempts per problem, calculating score deltas ($\Delta$) and displaying side-by-side code/rationale diffs to prove learning progress.
5. **Zero-Failure Resilient Architecture:** Runs completely offline out of the box using built-in heuristic reasoning, while supporting external LLMs (e.g. Gemini) with a 15-second timeout and automatic fallback.
