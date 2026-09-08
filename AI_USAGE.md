# AI Usage & Key Decisions Log (`AI_USAGE.md`)

In accordance with Section 6 of the engineering assignment, this document details four meaningful AI-assisted decisions made during the architecture and development of the **LLD Practice Platform**.

---

### Decision 1: Hybrid Evaluation Pipeline vs. Pure LLM Prompting
* **What the AI Suggested:** 
  The AI initially suggested routing all submissions directly to a single large LLM prompt (e.g. OpenAI or Gemini) to parse the code, assess SOLID principles, and return a JSON score.
* **What Was Accepted vs. Rejected:** 
  **Rejected** the pure LLM approach. **Accepted** a decoupled, multi-stage pipeline using the **Strategy Pattern** (`IEvaluator`) with:
  1. `DeterministicRuleEvaluator`: Instant regex/structural checks for God classes, hardcoded `switch` statements, missing entities, and unsynchronized shared mutable state.
  2. `ReasoningEvaluator`: Qualitative reasoning, trade-off analysis, and concrete refactoring code diffs.
  3. `CompositeEvaluatorPipeline`: Orchestrator with timeout protection and resilient fallback.
* **Engineering Rationale:** 
  LLMs are non-deterministic, have latency, consume API tokens, and can fail or hallucinate when network requests drop. In an engineering assessment, candidates and users should never be blocked by external API outages. The hybrid pipeline guarantees 100% offline functionality and instantaneous structural feedback, while still allowing optional deep reasoning.

---

### Decision 2: Introducing the "Requirement Change Simulator"
* **What the AI Suggested:** 
  The AI recommended evaluating code correctness using simulated unit tests or checking whether specific method names matched a standard reference solution.
* **What Was Accepted vs. Rejected:** 
  **Rejected** rigid reference matching. **Accepted** the creation of the `RequirementChangeSimulator` (e.g., *"What if EV charging spots with per-kWh metering are added?"*).
* **Engineering Rationale:** 
  Low-Level Design has no single correct implementation. A candidate who uses an enum-based strategy is not necessarily "wrong," but their design will experience high friction if a new requirement is introduced. The Requirement Change Simulator directly tests the **Open/Closed Principle** by showing which classes can absorb the new requirement vs. which classes become coupling hotspots requiring invasive edits.

---

### Decision 3: Attempt Versioning with Visual Diffing
* **What the AI Suggested:** 
  The AI suggested a basic "History" tab that simply lists previous attempt submission timestamps and scores.
* **What Was Accepted vs. Rejected:** 
  **Rejected** a static history list. **Accepted** an interactive **Attempt Version Comparator** with line-by-line unified diffing (code and rationale) and score progression ($\Delta$).
* **Engineering Rationale:** 
  The assignment highlighted the learner practice loop: *Choose $\to$ Design $\to$ Submit $\to$ Get Feedback $\to$ Review $\to$ Try Again*. Without side-by-side visual diffs, the learner cannot verify whether their refactoring successfully resolved previous architectural smells. Diffing directly connects feedback to measurable improvement.

---

### Decision 4: Monolithic Domain Layer vs. Distributed Queue Overhead
* **What the AI Suggested:** 
  The AI suggested setting up a Redis BullMQ background queue, Docker containers, and a SQLite/PostgreSQL schema for async job processing.
* **What Was Accepted vs. Rejected:** 
  **Rejected** external queues and databases. **Accepted** an in-memory asynchronous state machine (`PENDING` $\to$ `EVALUATING` $\to$ `COMPLETED` / `FAILED`) and domain repository layer.
* **Engineering Rationale:** 
  Section 5 of the challenge explicitly states: *"This is primarily an LLD/domain-design exercise. Do not spend the majority of your time on Kubernetes, microservices, multi-region deployment, sharding... Keep this practical; do not turn the assignment into a distributed-systems project."* An in-memory repository adheres strictly to clean architecture and repository patterns while ensuring the application runs instantly with `npm start` without configuring Docker or Redis.
