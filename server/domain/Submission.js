/**
 * Submission Payload Domain Entity
 */
export class Submission {
  constructor({
    code = '',
    language = 'java',
    rationale = '',
    diagram = '',
    format = 'standard'
  } = {}) {
    this.code = code ? String(code).trim() : '';
    this.language = language || 'java';
    this.rationale = rationale ? String(rationale).trim() : '';
    this.diagram = diagram ? String(diagram).trim() : '';
    this.format = format;
  }

  validate() {
    const errors = [];
    if (!this.code || this.code.length < 20) {
      errors.push('Submission code must be at least 20 characters long to provide a meaningful design.');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
