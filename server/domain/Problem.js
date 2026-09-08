/**
 * Problem Domain Entity
 */
export class Problem {
  constructor({
    id,
    title,
    difficulty, // 'Easy' | 'Medium' | 'Hard'
    category,   // e.g. 'Creational & Behavioral', 'State Machine & Concurrency'
    estimatedTime,
    summary,
    functionalRequirements = [],
    nonFunctionalRequirements = [],
    constraints = [],
    keyEntities = [],
    patternsTargeted = [],
    starterTemplates = {},
    checklist = [],
    changeScenarios = []
  }) {
    this.id = id;
    this.title = title;
    this.difficulty = difficulty;
    this.category = category;
    this.estimatedTime = estimatedTime;
    this.summary = summary;
    this.functionalRequirements = functionalRequirements;
    this.nonFunctionalRequirements = nonFunctionalRequirements;
    this.constraints = constraints;
    this.keyEntities = keyEntities;
    this.patternsTargeted = patternsTargeted;
    this.starterTemplates = starterTemplates;
    this.checklist = checklist;
    this.changeScenarios = changeScenarios;
  }
}
