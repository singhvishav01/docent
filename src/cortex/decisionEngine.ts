import { CortexContext, Signal, CortexAction } from './types';
import {
  Rule,
  VisitorSpokeRule,
  VisitorInterruptedRule,
  ArtworkTransitionRule,
  AwkwardSilenceRule,
  SessionResumedRule,
  VisitorWaitingRule,
  EngagementDroppingRule,
  SessionFatigueRule,
  ConnectionOpportunityRule,
  IdleRule,
} from './rules/index';

export class DecisionEngine {
  private rules: Rule[];

  constructor() {
    // Priority order: highest first
    this.rules = [
      new VisitorSpokeRule(),
      new VisitorInterruptedRule(),
      new SessionResumedRule(),       // before silence/waiting rules — resume overrides them
      new ArtworkTransitionRule(),
      new AwkwardSilenceRule(),
      new VisitorWaitingRule(),
      new EngagementDroppingRule(),
      new SessionFatigueRule(),
      new ConnectionOpportunityRule(),
      new IdleRule(),
    ];
  }

  decide(context: CortexContext, signal: Signal): CortexAction {
    for (const rule of this.rules) {
      if (rule.matches(context, signal)) {
        return rule.getAction(context, signal);
      }
    }
    return { type: 'wait', params: {}, timestamp: Date.now() };
  }
}
