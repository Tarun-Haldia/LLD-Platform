# 🚀 LLD Studio: Low-Level Design Practice & Feedback Platform

A focused, interactive web platform engineered to help software engineers practice **Low-Level Design (LLD)**, submit solutions across multiple facets (Code, Rationale, and Diagrams), and receive **explainable, multi-dimensional feedback** with attempt diffing.

---

## 🌟 The Learner Practice Loop
The platform is built strictly around the six-stage iterative practice cycle:
$$\mathbf{Choose\ Problem} \longrightarrow \mathbf{Think\ \&\ Design} \longrightarrow \mathbf{Submit} \longrightarrow \mathbf{Get\ Explainable\ Feedback} \longrightarrow \mathbf{Review\ \&\ Diff} \longrightarrow \mathbf{Try\ Again}$$

---

## ✨ Key Capabilities

1. **Curated Problem Catalog:**
   - **Smart Multi-Floor Parking Lot** *(Creational, Strategy & Concurrency)*
   - **Multi-Car Elevator Dispatcher System** *(State Machine & Scheduling)*
   - **Smart Snack & Beverage Vending Machine** *(State Pattern & Strategy)*
   - **Distributed In-Memory Rate Limiter** *(Behavioral & Low-Latency Concurrency)*
   - Detailed functional requirements, non-functional requirements, constraints, entity checklists, and starter templates.

2. **Multi-Facet Practice Studio:**
   - **Monaco Code Editor (Official VS Code Engine):** Authentic **VS Code Dark Theme (`vs-dark`)**, real-time syntax highlighting, bracket pair colorization, minimap, and **built-in IntelliSense autocompletions** with custom snippets for LLD design patterns (Strategy, State, Observer, Singleton, Concurrency locks). Supports **Java**, **TypeScript**, **Python**, and **C++**.
   - **Design Decisions & Assumptions:** Structured scratchpad for documenting pattern choices, trade-offs, and concurrency assumptions.
   - **Live Class Diagram (Mermaid.js):** Interactive class diagram preview rendering relationships (`--|>`, `..|>`, `*--`, `-->`).

3. **Hybrid Evaluation Engine (Live AI & Deep Dynamic Analyzer):**
   - **Real Live AI Reasoning (Google Gemini & OpenAI):** Connect a free Gemini API key (or OpenAI key) right from the UI via the **AI Settings** modal. The platform sends your exact code, rationale, and problem criteria to **Gemini 1.5 Flash** for personalized, line-by-line code review, custom scores, tailored refactoring suggestions, and trade-offs.
   - **Deep Dynamic Code-Aware Analyzer (Offline Engine):** Even without an API key, the offline engine dynamically parses your actual syntax, extracts declared classes, interfaces, and methods by name, and delivers customized feedback referencing your exact code identifiers rather than static templates.
   - **Deterministic Structural Stage:** Catches God classes (>10 methods), hardcoded type-switching, missing interfaces, public field leaks, and unsynchronized shared mutable state under concurrent operations.
   - **Requirement Change Simulator:** Dynamically stress-tests the submitted design against unexpected requirement shifts (e.g. *"Support EV charging spots with per-kWh metering"*), classifying adaptable classes vs. vulnerable coupling hotspots.
   - **Resilient Fallback Mode:** 15-second timeout guard guarantees evaluation never hangs or fails.

4. **Attempt Progression & Visual Diffing:**
   - Chronological attempt timeline per problem.
   - Side-by-side unified code and rationale diff viewer.
   - Score delta tracker ($\Delta$) showing how subsequent attempts improve over previous iterations.

---

## 🛠️ Tech Stack & Design Decisions
- **Backend:** Node.js (v24 ES Modules), Express.js.
- **Domain Layer:** Clean Architecture with the **Strategy Pattern** (`IEvaluator`) and **Pipeline Pattern** (`CompositeEvaluatorPipeline`).
- **Frontend:** Vanilla HTML5, Modern CSS3 Design System (bespoke dark mode, glassmorphism, accent glows, responsive flex/grid layouts), Vanilla ES6 JavaScript, Mermaid.js.
- **Testing:** Node.js native test runner (`node:test` + `node:assert/strict`).

---

## ⚡ Quick Start

### 1. Prerequisites
- Node.js (version 18+ recommended, tested on v24)
- npm (version 9+)

### 2. Installation
```powershell
npm install
```

### 3. Run Application
```powershell
npm start
```
The server will start at **`http://localhost:3000`**. Open this URL in any modern browser.

### 4. Run Automated Tests
```powershell
npm test
```
Executes all 20 unit and API tests covering:
- Deterministic smell rules (God class, OCP type switching, missing entities, concurrency)
- Pipeline timeout guards and fallback execution
- Submission repository lifecycle states and attempt diffing
- REST API endpoints and validation error handling

---

## 📂 Project Structure

```
lld-practice-platform/
├── server/
│   ├── domain/
│   │   ├── Problem.js               # Problem entity & requirements
│   │   ├── Submission.js            # Submission payload model & validation
│   │   ├── Attempt.js               # Attempt lifecycle state machine
│   │   └── EvaluationResult.js      # Structured evaluation result value object
│   ├── evaluators/
│   │   ├── IEvaluator.js            # Strategy pattern interface contract
│   │   ├── DeterministicRuleEvaluator.js # Structural AST & smell checks
│   │   ├── ReasoningEvaluator.js    # Deep qualitative reasoning engine
│   │   ├── RequirementChangeSimulator.js # Dynamic requirement stress-testing
│   │   └── CompositeEvaluatorPipeline.js # Orchestrator with timeout & fallback
│   ├── repositories/
│   │   ├── ProblemRepository.js     # Curated problem catalog
│   │   └── SubmissionRepository.js  # Attempt tracking & unified diff engine
│   ├── app.js                       # Express app & REST API routes
│   └── index.js                     # Server bootstrap
├── public/
│   ├── index.html                   # Semantic HTML5 layout & components
│   ├── styles.css                   # Bespoke dark-mode glassmorphic CSS
│   └── app.js                       # Client controller & state management
├── tests/
│   ├── deterministic-evaluator.test.js # Smell & rule tests
│   ├── evaluator-pipeline.test.js      # Orchestration & fallback tests
│   ├── submission-repository.test.js   # Attempt & diff engine tests
│   └── api.test.js                     # API integration tests
├── RESEARCH_NOTE.md                 # 1-2 page research on learner problem & gaps
├── DESIGN_NOTE.md                   # Architecture, domain classes & trade-offs
├── AI_USAGE.md                      # 4 meaningful AI-assisted decisions
└── README.md                        # Project documentation & run guide
```

---

## ⚖️ Limitations & Next Steps
1. **In-Memory Storage:** Attempts are currently stored in memory. In a production deployment, this would be backed by PostgreSQL or DynamoDB.
2. **Language Compilation:** Currently evaluates code statically and heuristically. A future enhancement could spin up secure Docker sandbox runners to compile and run candidate code against unit test harnesses.
3. **Interactive Visual Diagramming:** Mermaid.js diagrams are currently rendered from text; future iterations could include a drag-and-drop UML canvas.

---

## 📄 Deliverables Summary
- 📖 [RESEARCH_NOTE.md](file:///c:/Users/skgjd/OneDrive/Desktop/Aditya's%20work/LLD%20website/RESEARCH_NOTE.md): Learner problems, competitive landscape, market gaps, product direction.
- 📐 [DESIGN_NOTE.md](file:///c:/Users/skgjd/OneDrive/Desktop/Aditya's%20work/LLD%20website/DESIGN_NOTE.md): Domain design, user journey, classes, evaluation approach, and the 5 core design questions.
- 🤖 [AI_USAGE.md](file:///c:/Users/skgjd/OneDrive/Desktop/Aditya's%20work/LLD%20website/AI_USAGE.md): Meaningful AI-assisted decisions, accepted vs. rejected alternatives, and rationale.
