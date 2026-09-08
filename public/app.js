/**
 * LLD Studio - Client Application Controller
 * Powered by Monaco Editor (The official VS Code Editor & IntelliSense engine)
 * With Live AI Reasoning (Gemini / OpenAI) and Deep Dynamic Syntax Analysis
 */

// Global State
const state = {
  problems: [],
  currentProblemId: null,
  currentProblem: null,
  currentLanguage: 'java',
  attempts: [],
  activeAttempt: null,
  latestResult: null,
  isEvaluating: false,
  monacoReady: false,
  apiKey: localStorage.getItem('lld_ai_api_key') || '',
  aiProvider: localStorage.getItem('lld_ai_provider') || 'gemini'
};

// Monaco Editor Instance reference
let monacoEditor = null;

// DOM Elements
const elements = {
  problemSelect: document.getElementById('problem-select'),
  problemTitle: document.getElementById('problem-title'),
  problemSummary: document.getElementById('problem-summary'),
  problemDifficulty: document.getElementById('problem-difficulty'),
  problemCategory: document.getElementById('problem-category'),
  problemTime: document.getElementById('problem-time'),

  functionalReqsList: document.getElementById('functional-reqs-list'),
  nonFunctionalReqsList: document.getElementById('non-functional-reqs-list'),
  constraintsList: document.getElementById('constraints-list'),
  entitiesTags: document.getElementById('entities-tags'),
  patternsTags: document.getElementById('patterns-tags'),
  problemChecklist: document.getElementById('problem-checklist'),
  changeScenariosList: document.getElementById('change-scenarios-list'),

  languageSelect: document.getElementById('language-select'),
  monacoContainer: document.getElementById('monaco-editor-container'),
  codeEditorFallback: document.getElementById('code-editor-fallback'),
  codeStats: document.getElementById('code-stats'),
  rationaleEditor: document.getElementById('rationale-editor'),
  diagramEditor: document.getElementById('diagram-editor'),
  diagramOutput: document.getElementById('diagram-output'),

  btnSubmitMain: document.getElementById('btn-submit-main'),
  btnResetTemplate: document.getElementById('btn-reset-template'),
  btnRenderDiagram: document.getElementById('btn-render-diagram'),
  btnViewHistory: document.getElementById('btn-view-history'),
  attemptCountBadge: document.getElementById('attempt-count-badge'),

  // AI Settings Modal
  btnAiSettings: document.getElementById('btn-ai-settings'),
  aiStatusText: document.getElementById('ai-status-text'),
  aiModal: document.getElementById('ai-modal'),
  btnCloseAiModal: document.getElementById('btn-close-ai-modal'),
  aiProviderSelect: document.getElementById('ai-provider-select'),
  inputApiKey: document.getElementById('input-api-key'),
  apiKeyGroup: document.getElementById('api-key-group'),
  aiKeyHint: document.getElementById('ai-key-hint'),
  aiKeyTestStatus: document.getElementById('ai-key-test-status'),
  btnTestAiKey: document.getElementById('btn-test-ai-key'),
  btnSaveAiKey: document.getElementById('btn-save-ai-key'),
  evaluatorProviderBadge: document.getElementById('evaluator-provider-badge'),

  // Evaluation Modal
  evalModal: document.getElementById('eval-modal'),
  evalTitle: document.getElementById('eval-modal-title'),
  evalDesc: document.getElementById('eval-modal-desc'),
  stepStatic: document.getElementById('step-static'),
  stepSolid: document.getElementById('step-solid'),
  stepReasoning: document.getElementById('step-reasoning'),
  stepStress: document.getElementById('step-stress'),

  // Feedback View
  feedbackOverlay: document.getElementById('feedback-overlay'),
  btnCloseFeedback: document.getElementById('btn-close-feedback'),
  btnIterateDesign: document.getElementById('btn-iterate-design'),
  btnOpenDiffFromFeedback: document.getElementById('btn-open-diff-from-feedback'),
  overallScoreNum: document.getElementById('overall-score-num'),
  scoreGradeBadge: document.getElementById('score-grade-badge'),
  attemptPill: document.getElementById('attempt-pill'),
  fallbackBadge: document.getElementById('fallback-badge'),
  feedbackProblemTitle: document.getElementById('feedback-problem-title'),
  feedbackTimestamp: document.getElementById('feedback-timestamp'),
  dimensionBars: document.getElementById('dimension-bars'),
  strengthsList: document.getElementById('strengths-list'),
  weaknessesList: document.getElementById('weaknesses-list'),
  smellsWrapper: document.getElementById('smells-wrapper'),
  smellsList: document.getElementById('smells-list'),
  suggestionsList: document.getElementById('suggestions-list'),
  checklistResults: document.getElementById('checklist-results'),
  simScenarioSelect: document.getElementById('sim-scenario-select'),
  btnRunSim: document.getElementById('btn-run-sim'),
  changeSimulationOutput: document.getElementById('change-simulation-output'),
  tradeoffsList: document.getElementById('tradeoffs-list'),

  // History & Diff Modal
  historyModal: document.getElementById('history-modal'),
  btnCloseHistory: document.getElementById('btn-close-history'),
  attemptsList: document.getElementById('attempts-list'),
  diffBaseSelect: document.getElementById('diff-base-select'),
  diffTargetSelect: document.getElementById('diff-target-select'),
  btnCompareAttempts: document.getElementById('btn-compare-attempts'),
  diffScoreDelta: document.getElementById('diff-score-delta'),
  diffCodeView: document.getElementById('diff-code-view'),
  diffRationaleView: document.getElementById('diff-rationale-view'),
  btnDiffCodeTab: document.getElementById('btn-diff-code-tab'),
  btnDiffRationaleTab: document.getElementById('btn-diff-rationale-tab')
};

// Initialize Mermaid
if (window.mermaid) {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
      primaryColor: '#1e293b',
      primaryBorderColor: '#6366f1',
      primaryTextColor: '#f8fafc',
      lineColor: '#06b6d4',
      secondaryColor: '#0f172a',
      tertiaryColor: '#1e1b4b'
    }
  });
}

/**
 * Bootstrapping
 */
document.addEventListener('DOMContentLoaded', async () => {
  updateAiStatusBadge();
  setupEventListeners();
  await initMonacoEditor();
  await loadProblemList();
});

/**
 * Monaco Editor Setup with VS Code Dark Theme & Rich LLD Autocompletions
 */
function initMonacoEditor() {
  return new Promise((resolve) => {
    if (typeof window.require !== 'undefined') {
      window.require.config({
        paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }
      });

      window.require(['vs/editor/editor.main'], () => {
        registerMonacoLLDSuggestions();

        const initialLang = mapToMonacoLanguage(state.currentLanguage);
        monacoEditor = monaco.editor.create(elements.monacoContainer, {
          value: '// Loading starter template...',
          language: initialLang,
          theme: 'vs-dark', // Authentic VS Code Dark Theme
          automaticLayout: true,
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace",
          fontLigatures: true,
          tabSize: 4,
          scrollBeyondLastLine: false,
          minimap: { enabled: true, renderCharacters: false },
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true, indentation: true },
          wordBasedSuggestions: 'allDocuments',
          suggestOnTriggerCharacters: true,
          quickSuggestions: { other: true, comments: false, strings: true },
          parameterHints: { enabled: true },
          suggest: {
            showIcons: true,
            showMethods: true,
            showFunctions: true,
            showConstructors: true,
            showFields: true,
            showVariables: true,
            showClasses: true,
            showInterfaces: true,
            showModules: true
          }
        });

        monacoEditor.onDidChangeModelContent(() => {
          updateCodeStats();
        });

        state.monacoReady = true;
        updateCodeStats();
        resolve(monacoEditor);
      });
    } else {
      console.warn('Monaco AMD loader not available, falling back to textarea.');
      elements.codeEditorFallback.classList.remove('hidden');
      resolve(null);
    }
  });
}

/**
 * Custom LLD Autocompletions & Snippets for Monaco
 */
function registerMonacoLLDSuggestions() {
  const languages = ['java', 'typescript', 'python', 'cpp'];

  languages.forEach(lang => {
    monaco.languages.registerCompletionItemProvider(lang, {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        const suggestions = [
          {
            label: 'StrategyPattern',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'LLD Strategy Pattern boilerplate for pluggable algorithms.',
            insertText: lang === 'java' ?
              `public interface \${1:StrategyName} {\n    \${2:ReturnType} execute(\${3:Params});\n}\n\npublic class Concrete\${1:StrategyName} implements \${1:StrategyName} {\n    @Override\n    public \${2:ReturnType} execute(\${3:Params}) {\n        // \${0:Implementation}\n    }\n}` :
              lang === 'typescript' ?
              `export interface \${1:IStrategy} {\n  execute(\${2:params}): \${3:void};\n}\n\nexport class Concrete\${1:Strategy} implements \${1:IStrategy} {\n  execute(\${2:params}): \${3:void} {\n    // \${0:Implementation}\n  }\n}` :
              `class \${1:Strategy}(ABC):\n    @abstractmethod\n    def execute(self, \${2:params}):\n        pass\n`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: 'StatePattern',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'LLD State Pattern for stateful domain entities.',
            insertText: lang === 'java' ?
              `public interface \${1:State} {\n    void handleAction(\${2:Context} context);\n}` :
              `export interface \${1:State} {\n  handleAction(context: \${2:Context}): void;\n}`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: 'ObserverPattern',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'Observer / Event Listener pattern boilerplate.',
            insertText: lang === 'java' ?
              `public interface Observer {\n    void onUpdate(\${1:Event} event);\n}\n\npublic interface Subject {\n    void registerObserver(Observer o);\n    void removeObserver(Observer o);\n    void notifyObservers(\${1:Event} event);\n}` :
              `export interface IObserver {\n  update(event: \${1:any}): void;\n}`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: 'ReentrantLock_Concurrency',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'Thread-safe lock guard to prevent race conditions on shared mutable state.',
            insertText: lang === 'java' ?
              `private final java.util.concurrent.locks.ReentrantLock lock = new java.util.concurrent.locks.ReentrantLock();\n\npublic boolean safeOperation() {\n    lock.lock();\n    try {\n        // \${0:critical section}\n        return true;\n    } finally {\n        lock.unlock();\n    }\n}` :
              `// Concurrency guard\n`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: 'SingletonPattern',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'Thread-safe Singleton implementation.',
            insertText: lang === 'java' ?
              `private static volatile \${1:ClassName} instance;\nprivate \${1:ClassName}() {}\npublic static \${1:ClassName} getInstance() {\n    if (instance == null) {\n        synchronized (\${1:ClassName}.class) {\n            if (instance == null) {\n                instance = new \${1:ClassName}();\n            }\n        }\n    }\n    return instance;\n}` :
              `private static instance: \${1:ClassName};\nprivate constructor() {}\npublic static getInstance(): \${1:ClassName} {\n  if (!this.instance) this.instance = new \${1:ClassName}();\n  return this.instance;\n}`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: 'ParkingSpot_Class',
            kind: monaco.languages.CompletionItemKind.Class,
            documentation: 'Standard LLD Parking Spot domain entity.',
            insertText: 'ParkingSpot',
            range
          },
          {
            label: 'PricingStrategy_Interface',
            kind: monaco.languages.CompletionItemKind.Interface,
            documentation: 'Pluggable pricing policy interface.',
            insertText: 'PricingStrategy',
            range
          },
          {
            label: 'ElevatorCar_Class',
            kind: monaco.languages.CompletionItemKind.Class,
            documentation: 'Elevator car domain model.',
            insertText: 'ElevatorCar',
            range
          }
        ];

        return { suggestions };
      }
    });
  });
}

function mapToMonacoLanguage(lang) {
  switch (lang) {
    case 'typescript': return 'typescript';
    case 'python': return 'python';
    case 'cpp': return 'cpp';
    case 'java':
    default: return 'java';
  }
}

function getEditorCode() {
  if (monacoEditor && state.monacoReady) {
    return monacoEditor.getValue();
  }
  return elements.codeEditorFallback ? elements.codeEditorFallback.value : '';
}

function setEditorCode(code, language = state.currentLanguage) {
  const monacoLang = mapToMonacoLanguage(language);
  if (monacoEditor && state.monacoReady) {
    const model = monacoEditor.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, monacoLang);
    }
    monacoEditor.setValue(code);
  } else if (elements.codeEditorFallback) {
    elements.codeEditorFallback.value = code;
  }
  updateCodeStats();
}

function updateCodeStats() {
  const code = getEditorCode();
  const lineCount = code ? code.split('\n').length : 0;
  elements.codeStats.textContent = `${lineCount} lines | ${state.currentLanguage.toUpperCase()} (VS Code Theme)`;
}

function updateAiStatusBadge() {
  if (state.apiKey && state.apiKey.trim().length > 5 && state.aiProvider !== 'offline') {
    elements.aiStatusText.textContent = state.aiProvider === 'openai' ? 'AI: OpenAI GPT-4o' : 'AI: Google Gemini Live';
    elements.btnAiSettings.classList.add('btn-primary');
    elements.btnAiSettings.classList.remove('btn-secondary');
  } else {
    elements.aiStatusText.textContent = 'AI: Offline Analyzer';
    elements.btnAiSettings.classList.remove('btn-primary');
    elements.btnAiSettings.classList.add('btn-secondary');
  }
}

/**
 * Event Listeners
 */
function setupEventListeners() {
  // Problem Selection
  elements.problemSelect.addEventListener('change', async (e) => {
    await selectProblem(e.target.value);
  });

  // Language Change
  elements.languageSelect.addEventListener('change', (e) => {
    state.currentLanguage = e.target.value;
    loadStarterTemplateForLanguage(state.currentLanguage);
  });

  // Template Reset
  elements.btnResetTemplate.addEventListener('click', () => {
    if (confirm('Reset code to initial starter template? Any unsaved edits will be replaced.')) {
      loadStarterTemplateForLanguage(state.currentLanguage);
    }
  });

  // Diagram Render
  elements.btnRenderDiagram.addEventListener('click', () => {
    renderMermaidDiagram();
  });

  // AI Settings Modal
  elements.btnAiSettings.addEventListener('click', () => {
    elements.aiProviderSelect.value = state.aiProvider;
    elements.inputApiKey.value = state.apiKey;
    elements.apiKeyGroup.style.display = state.aiProvider === 'offline' ? 'none' : 'block';
    elements.aiKeyTestStatus.style.display = 'none';
    elements.aiModal.classList.remove('hidden');
  });

  elements.btnCloseAiModal.addEventListener('click', () => {
    elements.aiModal.classList.add('hidden');
  });

  elements.aiProviderSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    elements.apiKeyGroup.style.display = val === 'offline' ? 'none' : 'block';
    if (val === 'gemini') {
      elements.aiKeyHint.innerHTML = '💡 Get a free Gemini API key in 10 seconds: <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:#38bdf8; text-decoration:underline;">Google AI Studio</a> (No credit card needed).';
      elements.inputApiKey.placeholder = 'Paste your Google Gemini API key (AIzaSy...)';
    } else if (val === 'openai') {
      elements.aiKeyHint.innerHTML = '💡 OpenAI API key from <a href="https://platform.openai.com/api-keys" target="_blank" style="color:#38bdf8; text-decoration:underline;">OpenAI Platform</a>.';
      elements.inputApiKey.placeholder = 'Paste your OpenAI API key (sk-...)';
    }
  });

  elements.btnTestAiKey.addEventListener('click', async () => {
    const provider = elements.aiProviderSelect.value;
    const apiKey = elements.inputApiKey.value.trim();
    if (provider === 'offline') {
      elements.aiKeyTestStatus.style.display = 'block';
      elements.aiKeyTestStatus.style.background = 'rgba(16, 185, 129, 0.15)';
      elements.aiKeyTestStatus.style.color = '#6ee7b7';
      elements.aiKeyTestStatus.textContent = '✓ Offline Code-Aware Analyzer is always available and active.';
      return;
    }

    elements.aiKeyTestStatus.style.display = 'block';
    elements.aiKeyTestStatus.style.background = 'rgba(99, 102, 241, 0.15)';
    elements.aiKeyTestStatus.style.color = '#c7d2fe';
    elements.aiKeyTestStatus.textContent = 'Testing connection with live AI API...';

    try {
      const res = await fetch('/api/test-ai-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, provider })
      });
      const data = await res.json();
      if (data.success) {
        elements.aiKeyTestStatus.style.background = 'rgba(16, 185, 129, 0.15)';
        elements.aiKeyTestStatus.style.color = '#6ee7b7';
        elements.aiKeyTestStatus.textContent = `✓ ${data.message}`;
      } else {
        elements.aiKeyTestStatus.style.background = 'rgba(244, 63, 94, 0.15)';
        elements.aiKeyTestStatus.style.color = '#fda4af';
        elements.aiKeyTestStatus.textContent = `✕ ${data.error}`;
      }
    } catch (e) {
      elements.aiKeyTestStatus.style.background = 'rgba(244, 63, 94, 0.15)';
      elements.aiKeyTestStatus.style.color = '#fda4af';
      elements.aiKeyTestStatus.textContent = `✕ Network error: ${e.message}`;
    }
  });

  elements.btnSaveAiKey.addEventListener('click', () => {
    state.aiProvider = elements.aiProviderSelect.value;
    state.apiKey = elements.inputApiKey.value.trim();
    localStorage.setItem('lld_ai_provider', state.aiProvider);
    localStorage.setItem('lld_ai_api_key', state.apiKey);
    updateAiStatusBadge();
    elements.aiModal.classList.add('hidden');
  });

  // Tab navigation (Problem Info Tabs)
  document.querySelectorAll('.problem-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.problem-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.pane .tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');
    });
  });

  // Tab navigation (Editor Tabs)
  document.querySelectorAll('.editor-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.editor-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.editor-body .editor-pane-tab').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.editorTab);
      if (target) {
        target.classList.add('active');
        if (btn.dataset.editorTab === 'editor-tab-code') {
          setTimeout(() => monacoEditor?.layout(), 50);
        } else if (btn.dataset.editorTab === 'editor-tab-diagram') {
          renderMermaidDiagram();
        }
      }
    });
  });

  // Window resize to layout Monaco
  window.addEventListener('resize', () => {
    if (monacoEditor) monacoEditor.layout();
  });

  // Submit Action
  elements.btnSubmitMain.addEventListener('click', () => {
    submitSolution();
  });

  // Close Feedback
  elements.btnCloseFeedback.addEventListener('click', () => {
    elements.feedbackOverlay.classList.add('hidden');
  });

  elements.btnIterateDesign.addEventListener('click', () => {
    elements.feedbackOverlay.classList.add('hidden');
    if (monacoEditor) monacoEditor.focus();
  });

  // Requirement Change Re-test
  elements.btnRunSim.addEventListener('click', () => {
    reRunSimulation();
  });

  // History & Diff
  elements.btnViewHistory.addEventListener('click', () => {
    openHistoryModal();
  });

  elements.btnOpenDiffFromFeedback.addEventListener('click', () => {
    elements.feedbackOverlay.classList.add('hidden');
    openHistoryModal();
  });

  elements.btnCloseHistory.addEventListener('click', () => {
    elements.historyModal.classList.add('hidden');
  });

  elements.btnCompareAttempts.addEventListener('click', () => {
    compareSelectedAttempts();
  });

  // Diff subtabs
  elements.btnDiffCodeTab.addEventListener('click', () => {
    elements.btnDiffCodeTab.classList.add('active');
    elements.btnDiffRationaleTab.classList.remove('active');
    elements.diffCodeView.classList.add('active');
    elements.diffRationaleView.classList.remove('active');
  });

  elements.btnDiffRationaleTab.addEventListener('click', () => {
    elements.btnDiffRationaleTab.classList.add('active');
    elements.btnDiffCodeTab.classList.remove('active');
    elements.diffRationaleView.classList.add('active');
    elements.diffCodeView.classList.remove('active');
  });
}

/**
 * API: Load Problem List
 */
async function loadProblemList() {
  try {
    const res = await fetch('/api/problems');
    const data = await res.json();
    if (data.success && data.data.length > 0) {
      state.problems = data.data;
      elements.problemSelect.innerHTML = state.problems.map(p => `
        <option value="${p.id}">${p.title} (${p.difficulty})</option>
      `).join('');

      await selectProblem(state.problems[0].id);
    }
  } catch (err) {
    console.error('Failed to load problems:', err);
  }
}

/**
 * API: Select and Load Problem Details
 */
async function selectProblem(problemId) {
  try {
    state.currentProblemId = problemId;
    const res = await fetch(`/api/problems/${problemId}`);
    const data = await res.json();
    if (data.success) {
      state.currentProblem = data.data;
      renderProblemDetails(state.currentProblem);
      loadStarterTemplateForLanguage(state.currentLanguage);
      await refreshAttemptsList();
    }
  } catch (err) {
    console.error('Failed to fetch problem detail:', err);
  }
}

/**
 * Render Problem Header & Tabs
 */
function renderProblemDetails(problem) {
  elements.problemTitle.textContent = problem.title;
  elements.problemSummary.textContent = problem.summary;

  // Meta Badges
  elements.problemDifficulty.textContent = problem.difficulty;
  elements.problemDifficulty.className = `badge badge-${problem.difficulty.toLowerCase()}`;
  elements.problemCategory.textContent = problem.category;
  elements.problemTime.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
    ${problem.estimatedTime}
  `;

  // Requirements Lists
  elements.functionalReqsList.innerHTML = problem.functionalRequirements.map(req => `<li>${escapeHtml(req)}</li>`).join('');
  elements.nonFunctionalReqsList.innerHTML = problem.nonFunctionalRequirements.map(req => `<li>${escapeHtml(req)}</li>`).join('');
  elements.constraintsList.innerHTML = problem.constraints.map(c => `<li>${escapeHtml(c)}</li>`).join('');

  // Entities & Patterns
  elements.entitiesTags.innerHTML = problem.keyEntities.map(e => `
    <span class="entity-tag" data-entity="${e}">${escapeHtml(e)}</span>
  `).join('');

  elements.patternsTags.innerHTML = problem.patternsTargeted.map(p => `
    <span class="pattern-tag">${escapeHtml(p)}</span>
  `).join('');

  // Checklist
  elements.problemChecklist.innerHTML = (problem.checklist || []).map(item => `
    <li><strong>[${escapeHtml(item.category)}]</strong> ${escapeHtml(item.label)}</li>
  `).join('');

  // Change Scenarios
  elements.changeScenariosList.innerHTML = (problem.changeScenarios || []).map(s => `
    <div class="scenario-card-item">
      <h4>${escapeHtml(s.title)}</h4>
      <p>${escapeHtml(s.prompt)}</p>
    </div>
  `).join('');

  // Populate Simulation Select
  elements.simScenarioSelect.innerHTML = (problem.changeScenarios || []).map(s => `
    <option value="${s.id}">${s.title}</option>
  `).join('');

  // Default Diagram
  elements.diagramEditor.value = getDefaultDiagram(problem.id);
}

/**
 * Starter Templates
 */
function loadStarterTemplateForLanguage(lang) {
  if (!state.currentProblem) return;
  const template = state.currentProblem.starterTemplates?.[lang] ||
                   state.currentProblem.starterTemplates?.java ||
                   '// Write your design here...';

  setEditorCode(template, lang);

  if (!elements.rationaleEditor.value.trim()) {
    elements.rationaleEditor.value = `### Design Rationale\n- **Pattern Choices**: Used Strategy pattern for algorithms to ensure Open/Closed principle.\n- **Concurrency Strategy**: Handled concurrent requests using fine-grained synchronization.\n- **Trade-offs**: Prioritized low coupling and testability.`;
  }
}

/**
 * Diagram Renderer using Mermaid
 */
function renderMermaidDiagram() {
  const code = elements.diagramEditor.value.trim();
  if (!code) {
    elements.diagramOutput.innerHTML = '<p class="empty-hint">No diagram code entered.</p>';
    return;
  }

  try {
    const id = `mermaid-svg-${Date.now()}`;
    mermaid.render(id, code).then(result => {
      elements.diagramOutput.innerHTML = result.svg;
    }).catch(err => {
      elements.diagramOutput.innerHTML = `<p class="empty-hint" style="color:#f87171">Diagram syntax error: ${escapeHtml(err.message || 'Invalid Mermaid class diagram')}</p>`;
    });
  } catch (e) {
    elements.diagramOutput.innerHTML = `<p class="empty-hint" style="color:#f87171">Failed to render diagram.</p>`;
  }
}

function getDefaultDiagram(problemId) {
  if (problemId === 'parking-lot') {
    return `classDiagram
    class Vehicle {
      <<abstract>>
      +String licensePlate
      +VehicleType type
    }
    class Car {
    }
    class ParkingSpot {
      -String id
      -boolean occupied
      +assignVehicle(Vehicle v)
      +vacate()
    }
    class ParkingAllocationStrategy {
      <<interface>>
      +findSpot(floors, vehicle)
    }
    class PricingStrategy {
      <<interface>>
      +calculateFee(ticket, exitTime)
    }
    class ParkingLot {
      -List~ParkingFloor~ floors
      +parkVehicle(Vehicle v)
      +unparkVehicle(Ticket t)
    }

    Vehicle <|-- Car
    ParkingLot o-- ParkingSpot
    ParkingLot --> ParkingAllocationStrategy
    ParkingLot --> PricingStrategy`;
  } else if (problemId === 'elevator-system') {
    return `classDiagram
    class ElevatorCar {
      -int currentFloor
      -ElevatorState state
      +requestFloor(int f)
      +openDoor()
    }
    class ElevatorState {
      <<interface>>
      +move(ElevatorCar car)
      +openDoor(ElevatorCar car)
    }
    class MovingUpState {
      +move(ElevatorCar car)
    }
    class IdleState {
      +move(ElevatorCar car)
    }
    class IDispatcherStrategy {
      <<interface>>
      +dispatch(cars, floor, direction)
    }

    ElevatorState <|.. MovingUpState
    ElevatorState <|.. IdleState
    ElevatorCar --> ElevatorState
    ElevatorCar --> IDispatcherStrategy`;
  }
  return `classDiagram
    class DomainEntity {
      +String id
      +execute()
    }`;
}

/**
 * Submit Solution Flow with Animated Progress Steps
 */
async function submitSolution() {
  const code = getEditorCode().trim();
  const rationale = elements.rationaleEditor.value.trim();
  const diagram = elements.diagramEditor.value.trim();

  if (code.length < 20) {
    alert('Please write at least 20 characters of code before submitting.');
    return;
  }

  // Show Animated Evaluation Modal
  showEvaluationProgress();

  try {
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problemId: state.currentProblemId,
        code,
        language: state.currentLanguage,
        rationale,
        diagram,
        apiKey: state.apiKey,
        aiProvider: state.aiProvider
      })
    });

    const data = await res.json();
    if (!data.success) {
      hideEvaluationProgress();
      alert(`Submission error: ${data.error}`);
      return;
    }

    const attemptId = data.data.attemptId;
    await pollAttemptStatus(attemptId);
  } catch (err) {
    hideEvaluationProgress();
    alert(`Network error: ${err.message}`);
  }
}

function showEvaluationProgress() {
  elements.evalModal.classList.remove('hidden');
  resetStepIndicators();
  elements.stepStatic.classList.add('active');

  setTimeout(() => {
    elements.stepStatic.classList.remove('active');
    elements.stepStatic.classList.add('done');
    elements.stepSolid.classList.add('active');
  }, 400);

  setTimeout(() => {
    elements.stepSolid.classList.remove('active');
    elements.stepSolid.classList.add('done');
    elements.stepReasoning.classList.add('active');
  }, 800);

  setTimeout(() => {
    elements.stepReasoning.classList.remove('active');
    elements.stepReasoning.classList.add('done');
    elements.stepStress.classList.add('active');
  }, 1200);
}

function resetStepIndicators() {
  [elements.stepStatic, elements.stepSolid, elements.stepReasoning, elements.stepStress].forEach(s => {
    s.classList.remove('active', 'done');
  });
}

function hideEvaluationProgress() {
  elements.evalModal.classList.add('hidden');
}

/**
 * Poll Status until COMPLETED or FAILED
 */
async function pollAttemptStatus(attemptId) {
  let attemptsCount = 0;
  const interval = setInterval(async () => {
    attemptsCount++;
    try {
      const res = await fetch(`/api/submissions/${attemptId}/status`);
      const json = await res.json();

      if (json.success && json.data) {
        const attempt = json.data;

        if (attempt.status === 'COMPLETED') {
          clearInterval(interval);
          hideEvaluationProgress();
          state.latestResult = attempt.result;
          state.activeAttempt = attempt;
          await refreshAttemptsList();
          renderFeedbackDashboard(attempt);
        } else if (attempt.status === 'FAILED') {
          clearInterval(interval);
          hideEvaluationProgress();
          alert(`Evaluation failed: ${attempt.error || 'Unknown error'}`);
        }
      }

      if (attemptsCount > 25) {
        clearInterval(interval);
        hideEvaluationProgress();
        alert('Evaluation took longer than expected. Please check Attempt History.');
      }
    } catch (e) {
      clearInterval(interval);
      hideEvaluationProgress();
    }
  }, 500);
}

/**
 * Render Complete Feedback Dashboard
 */
function renderFeedbackDashboard(attempt) {
  const result = attempt.result;
  if (!result) return;

  // Header
  elements.overallScoreNum.textContent = result.overallScore;
  elements.attemptPill.textContent = `Attempt #${attempt.attemptNumber}`;
  elements.feedbackProblemTitle.textContent = `Feedback: ${state.currentProblem?.title || 'LLD Solution'}`;
  elements.feedbackTimestamp.textContent = `Evaluated at ${new Date(result.evaluatedAt).toLocaleTimeString()}`;

  // Score Grade
  const score = result.overallScore;
  if (score >= 85) {
    elements.scoreGradeBadge.textContent = 'Mastery-Level Design';
    elements.scoreGradeBadge.className = 'badge badge-success';
  } else if (score >= 70) {
    elements.scoreGradeBadge.textContent = 'Proficient Design';
    elements.scoreGradeBadge.className = 'badge badge-primary';
  } else if (score >= 50) {
    elements.scoreGradeBadge.textContent = 'Developing Design';
    elements.scoreGradeBadge.className = 'badge badge-warning';
  } else {
    elements.scoreGradeBadge.textContent = 'Needs Restructuring';
    elements.scoreGradeBadge.className = 'badge badge-hard';
  }

  // Evaluator Provider Badge
  const providerText = result.evaluatorProvider || (result.isAiGenerated ? 'Live AI' : 'Deep Dynamic Analyzer');
  if (elements.evaluatorProviderBadge) {
    elements.evaluatorProviderBadge.textContent = providerText;
    if (result.isAiGenerated) {
      elements.evaluatorProviderBadge.className = 'badge badge-success';
    } else {
      elements.evaluatorProviderBadge.className = 'badge badge-category';
    }
  }

  // Fallback badge
  if (result.isFallback) {
    elements.fallbackBadge.classList.remove('hidden');
  } else {
    elements.fallbackBadge.classList.add('hidden');
  }

  // 5 Dimension Progress Bars
  renderDimensionBars(result.rubricBreakdown);

  // Strengths & Weaknesses
  elements.strengthsList.innerHTML = (result.strengths || []).map(s => `<li>${escapeHtml(s)}</li>`).join('');
  elements.weaknessesList.innerHTML = (result.weaknesses || []).map(w => `<li>${escapeHtml(w)}</li>`).join('');

  // Smells
  const smells = result.deterministicMetrics?.smells || [];
  if (smells.length > 0) {
    elements.smellsWrapper.style.display = 'block';
    elements.smellsList.innerHTML = smells.map(smell => `
      <div class="smell-card">
        <div class="smell-header">
          <h4>${escapeHtml(smell.title)}</h4>
          <span class="badge badge-${smell.severity === 'HIGH' ? 'hard' : 'warning'}">${escapeHtml(smell.severity)}</span>
        </div>
        <p>${escapeHtml(smell.description)}</p>
        <div class="smell-rec">💡 Suggestion: ${escapeHtml(smell.recommendation)}</div>
      </div>
    `).join('');
  } else {
    elements.smellsWrapper.style.display = 'none';
  }

  // Actionable Suggestions
  elements.suggestionsList.innerHTML = (result.actionableSuggestions || []).map(sug => `
    <div class="suggestion-card">
      <h4>${escapeHtml(sug.title)}</h4>
      <p>${escapeHtml(sug.explanation || sug.issue)}</p>
      ${sug.codeSnippet ? `
        <div class="code-snippet-box">
          <pre><code>${escapeHtml(sug.codeSnippet)}</code></pre>
        </div>
      ` : ''}
    </div>
  `).join('');

  // Checklist
  elements.checklistResults.innerHTML = (result.checklistResults || []).map(chk => `
    <div class="checklist-item-card">
      <span><strong>${escapeHtml(chk.label)}</strong> — <small style="color:var(--text-muted)">${escapeHtml(chk.note)}</small></span>
      <span class="${chk.passed ? 'chk-status-pass' : 'chk-status-fail'}">${chk.passed ? 'PASS ✓' : 'WARN ⚠'}</span>
    </div>
  `).join('');

  // Change Simulation
  renderSimulationResult(result.changeSimulation);

  // Trade-offs
  elements.tradeoffsList.innerHTML = (result.tradeOffAnalysis || []).map(t => `
    <div class="tradeoff-card">⚖️ ${escapeHtml(t)}</div>
  `).join('');

  // Show Overlay
  elements.feedbackOverlay.classList.remove('hidden');
}

function renderDimensionBars(breakdown = {}) {
  const dims = [
    breakdown.solid,
    breakdown.extensibility,
    breakdown.patterns,
    breakdown.concurrency,
    breakdown.codeQuality
  ].filter(Boolean);

  elements.dimensionBars.innerHTML = dims.map(dim => `
    <div class="dim-bar-item">
      <div class="dim-bar-header">
        <span>${escapeHtml(dim.name)}</span>
        <span>${dim.score}/100</span>
      </div>
      <div class="dim-bar-track">
        <div class="dim-bar-fill" style="width: ${dim.score}%"></div>
      </div>
      <span class="dim-bar-desc">${escapeHtml(dim.summary)}</span>
    </div>
  `).join('');
}

function renderSimulationResult(sim) {
  if (!sim) {
    elements.changeSimulationOutput.innerHTML = '<p class="empty-hint">No simulation available.</p>';
    return;
  }

  const impactClass = sim.impactLevel === 'HIGH_FRICTION' ? 'impact-badge-high' :
                      sim.impactLevel === 'MODERATE_FRICTION' ? 'impact-badge-moderate' : 'impact-badge-minimal';

  elements.changeSimulationOutput.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
      <h4 style="color:#c7d2fe; font-size:0.95rem;">${escapeHtml(sim.scenarioTitle)}</h4>
      <span class="badge ${impactClass}">${escapeHtml(sim.impactLevel)}</span>
    </div>
    <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:1rem;">${escapeHtml(sim.prompt)}</p>

    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem; margin-bottom:1rem;">
      <div style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2); padding:0.75rem; border-radius:8px;">
        <strong style="color:#6ee7b7; font-size:0.8rem; display:block; margin-bottom:0.35rem;">Open for Extension (Clean):</strong>
        <ul style="font-size:0.8rem; color:#cbd5e1; list-style:disc; padding-left:1.2rem;">
          ${sim.adaptableClasses?.length ? sim.adaptableClasses.map(c => `<li>${escapeHtml(c)}</li>`).join('') : '<li>None identified</li>'}
        </ul>
      </div>
      <div style="background:rgba(244,63,94,0.08); border:1px solid rgba(244,63,94,0.2); padding:0.75rem; border-radius:8px;">
        <strong style="color:#fda4af; font-size:0.8rem; display:block; margin-bottom:0.35rem;">Vulnerable Hotspots (Needs Edit):</strong>
        <ul style="font-size:0.8rem; color:#cbd5e1; list-style:disc; padding-left:1.2rem;">
          ${sim.vulnerableClasses?.length ? sim.vulnerableClasses.map(c => `<li>${escapeHtml(c)}</li>`).join('') : '<li>None identified</li>'}
        </ul>
      </div>
    </div>

    ${sim.explanations?.length ? `
      <div style="font-size:0.82rem; color:var(--text-secondary); line-height:1.5;">
        ${sim.explanations.map(e => `<p style="margin-bottom:0.35rem;">▸ ${escapeHtml(e)}</p>`).join('')}
      </div>
    ` : ''}
  `;
}

async function reRunSimulation() {
  const scenarioId = elements.simScenarioSelect.value;
  try {
    const res = await fetch('/api/simulate-change', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problemId: state.currentProblemId,
        scenarioId,
        code: getEditorCode(),
        rationale: elements.rationaleEditor.value
      })
    });
    const data = await res.json();
    if (data.success) {
      renderSimulationResult(data.data);
    }
  } catch (err) {
    console.error('Simulation error:', err);
  }
}

/**
 * Attempts History & Diff Comparison
 */
async function refreshAttemptsList() {
  if (!state.currentProblemId) return;
  try {
    const res = await fetch(`/api/problems/${state.currentProblemId}/attempts`);
    const data = await res.json();
    if (data.success) {
      state.attempts = data.data;
      elements.attemptCountBadge.textContent = state.attempts.length;
      renderAttemptsHistory();
    }
  } catch (e) {
    console.error('Failed to load attempts:', e);
  }
}

function renderAttemptsHistory() {
  if (state.attempts.length === 0) {
    elements.attemptsList.innerHTML = '<p class="empty-hint">No attempts submitted yet for this problem.</p>';
    elements.diffBaseSelect.innerHTML = '<option disabled>No attempts</option>';
    elements.diffTargetSelect.innerHTML = '<option disabled>No attempts</option>';
    return;
  }

  elements.attemptsList.innerHTML = state.attempts.map(a => `
    <div class="attempt-history-item ${state.activeAttempt?.id === a.id ? 'active' : ''}" data-id="${a.id}">
      <div class="attempt-item-header">
        <span>Attempt #${a.attemptNumber}</span>
        <span class="badge ${a.score >= 75 ? 'badge-success' : 'badge-warning'}">${a.score ?? '---'} pts</span>
      </div>
      <div class="attempt-item-time">${new Date(a.createdAt).toLocaleString()}</div>
    </div>
  `).join('');

  document.querySelectorAll('.attempt-history-item').forEach(el => {
    el.addEventListener('click', async () => {
      const id = el.dataset.id;
      await viewAttemptDetails(id);
    });
  });

  // Populate Selects for Diff
  elements.diffBaseSelect.innerHTML = state.attempts.map((a, i) => `
    <option value="${a.id}" ${i === 0 ? 'selected' : ''}>Attempt #${a.attemptNumber} (${a.score ?? 0} pts)</option>
  `).join('');

  elements.diffTargetSelect.innerHTML = state.attempts.map((a, i) => `
    <option value="${a.id}" ${i === state.attempts.length - 1 ? 'selected' : ''}>Attempt #${a.attemptNumber} (${a.score ?? 0} pts)</option>
  `).join('');
}

async function viewAttemptDetails(attemptId) {
  try {
    const res = await fetch(`/api/attempts/${attemptId}`);
    const data = await res.json();
    if (data.success) {
      elements.historyModal.classList.add('hidden');
      renderFeedbackDashboard(data.data);
    }
  } catch (err) {
    console.error('Error fetching attempt:', err);
  }
}

function openHistoryModal() {
  elements.historyModal.classList.remove('hidden');
  renderAttemptsHistory();
  if (state.attempts.length >= 2) {
    compareSelectedAttempts();
  }
}

async function compareSelectedAttempts() {
  const baseId = elements.diffBaseSelect.value;
  const targetId = elements.diffTargetSelect.value;
  if (!baseId || !targetId || baseId === targetId) {
    elements.diffScoreDelta.textContent = 'Select two different attempts';
    return;
  }

  try {
    const res = await fetch(`/api/attempts/compare/${baseId}/${targetId}`);
    const data = await res.json();
    if (data.success) {
      const comp = data.data;

      // Score Delta
      const delta = comp.scoreDelta;
      elements.diffScoreDelta.textContent = `Δ ${delta >= 0 ? '+' : ''}${delta} pts`;
      elements.diffScoreDelta.className = `score-delta-badge ${delta >= 0 ? 'badge-success' : 'badge-warning'}`;

      // Code Diff
      elements.diffCodeView.innerHTML = renderDiffLines(comp.codeDiff);
      // Rationale Diff
      elements.diffRationaleView.innerHTML = renderDiffLines(comp.rationaleDiff);
    }
  } catch (err) {
    console.error('Diff error:', err);
  }
}

function renderDiffLines(diff = []) {
  if (!diff || diff.length === 0) {
    return '<p class="empty-hint">No differences found.</p>';
  }

  return diff.map(line => {
    let lineClass = 'unchanged';
    let lineNum = line.lineTarget || line.lineBase || '';
    let content = line.text || '';

    if (line.type === 'added') {
      lineClass = 'added';
      content = `+ ${line.text}`;
    } else if (line.type === 'removed') {
      lineClass = 'removed';
      content = `- ${line.text}`;
    } else if (line.type === 'modified') {
      lineClass = 'modified';
      content = `~ ${line.textTarget || line.textBase}`;
    } else {
      content = `  ${line.text}`;
    }

    return `
      <div class="diff-line ${lineClass}">
        <span class="diff-line-num">${lineNum}</span>
        <span class="diff-line-content">${escapeHtml(content)}</span>
      </div>
    `;
  }).join('');
}

// Utility
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
