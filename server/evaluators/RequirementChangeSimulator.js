export class RequirementChangeSimulator {
  /**
   * Simulates how the submitted design handles an unexpected real-world requirement change.
   * @param {import('../domain/Submission.js').Submission} submission
   * @param {import('../domain/Problem.js').Problem} problem
   * @param {string} [scenarioId]
   */
  simulate(submission, problem, scenarioId) {
    const scenarios = problem.changeScenarios || [];
    const scenario = scenarioId
      ? scenarios.find(s => s.id === scenarioId) || scenarios[0]
      : scenarios[0];

    if (!scenario) {
      return {
        scenarioTitle: 'Standard Extension Test',
        impactScore: 'LOW',
        analysis: 'Design structure allows basic component extension.'
      };
    }

    const code = submission.code || '';
    const adaptableClasses = [];
    const vulnerableClasses = [];
    const explanations = [];

    // Analyze based on problem type and patterns present
    if (problem.id === 'parking-lot') {
      const hasPricingStrategy = /\bPricingStrategy\b/i.test(code);
      const hasSpotSubclassing = /class\s+[A-Za-z0-9_]*ElectricSpot\b/i.test(code) || /SpotType.*ELECTRIC/i.test(code);

      if (hasPricingStrategy) {
        adaptableClasses.push('PricingStrategy (Open for extension via EVHourlyPricingStrategy)');
        explanations.push('Clean: Pricing calculation is decoupled through an interface. Adding kWh billing can be implemented as a new strategy or decorator without altering existing vehicle billing.');
      } else {
        vulnerableClasses.push('Ticket / ParkingLot / ExitGate');
        explanations.push('Friction: Pricing appears hardcoded inside the ticket or gate logic. Introducing kWh metering requires invasive modifications to fee calculation methods.');
      }

      if (hasSpotSubclassing) {
        adaptableClasses.push('ParkingSpot (Supports specialized spot types)');
      } else {
        vulnerableClasses.push('ParkingSpot (Needs charger state & meter sensors)');
        explanations.push('ParkingSpot needs new state to track charging status, which may cause ripple effects in spot allocation logic.');
      }
    } else if (problem.id === 'elevator-system') {
      const hasStatePattern = /class\s+[A-Za-z0-9_]*State\b/i.test(code) && /interface\s+ElevatorState\b/i.test(code);

      if (hasStatePattern) {
        adaptableClasses.push('ElevatorState (New VIPOverrideState can be added)');
        explanations.push('Clean: Elevator state transitions are encapsulated in state classes. VIP override can be handled by transitioning the car into an EmergencyOverrideState that ignores intermediate hall calls.');
      } else {
        vulnerableClasses.push('ElevatorCar / ElevatorController');
        explanations.push('Friction: Elevator behavior relies on switch-case or nested conditional checks. Adding an override requires modifying movement loops and button listeners.');
      }
    } else if (problem.id === 'vending-machine') {
      const hasState = /class\s+[A-Za-z0-9_]*State\b/i.test(code);
      if (hasState) {
        adaptableClasses.push('VendingState (State transitions protected)');
      } else {
        vulnerableClasses.push('VendingMachine (State logic tightly coupled)');
      }
    } else {
      // General heuristic
      const hasInterface = /interface\s+[A-Za-z0-9_]+/i.test(code);
      if (hasInterface) {
        adaptableClasses.push('Strategy / Policy Interfaces');
        explanations.push('Abstraction barriers provide clean extension points.');
      } else {
        vulnerableClasses.push('Core Controller');
        explanations.push('Lack of interfaces forces direct modifications to core orchestration classes.');
      }
    }

    const impactLevel = vulnerableClasses.length > adaptableClasses.length ? 'HIGH_FRICTION' :
                        vulnerableClasses.length > 0 ? 'MODERATE_FRICTION' : 'MINIMAL_FRICTION';

    return {
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      prompt: scenario.prompt,
      impactLevel,
      adaptableClasses,
      vulnerableClasses,
      explanations,
      designTakeaway: scenario.evaluationFocus
    };
  }
}
