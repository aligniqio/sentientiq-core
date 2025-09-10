// Debate State Machine - Theatrical phases for dramatic debates
export type Phase = 
  | "opening"          // Initial statements from all personas
  | "elimination_poll" // Moderator recommends top 3 for elimination
  | "semifinal"        // Reduced roster debates
  | "final"            // Final showdown between last 2-3
  | "synthesis";       // Moderator's final synthesis

export interface Choice {
  name: string;
  score: number;
  rationale: string;
}

export interface Ranking {
  ranked: Choice[];
}

export interface ElimState {
  phase: Phase;
  rid: string;              // Round ID
  roster: string[];         // All 12 personas initially
  active: string[];         // Currently in play
  recommended: string[];    // Top-3 suggested by Moderator for elimination
  selected: string[];       // User's selection or auto-selected
  eliminated: string[];     // Personas eliminated so far
}

export class DebateStateMachine {
  private state: ElimState;
  
  constructor(roster: string[]) {
    this.state = {
      phase: "opening",
      rid: this.generateRoundId(),
      roster: roster,
      active: [...roster],
      recommended: [],
      selected: [],
      eliminated: []
    };
  }
  
  private generateRoundId(): string {
    return `r${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Transition to next phase
  advance(userSelection?: string[]): ElimState {
    switch (this.state.phase) {
      case "opening":
        // After opening, move to elimination poll
        this.state.phase = "elimination_poll";
        // Moderator will recommend 3 weakest performers
        this.state.recommended = this.calculateWeakest();
        break;
        
      case "elimination_poll":
        // User selects or auto-select from recommended
        this.state.selected = userSelection || this.autoSelect();
        this.eliminate(this.state.selected);
        
        // If we have 6 or fewer, go to semifinal
        if (this.state.active.length <= 6 && this.state.active.length > 3) {
          this.state.phase = "semifinal";
        } else if (this.state.active.length <= 3) {
          this.state.phase = "final";
        }
        this.state.rid = this.generateRoundId();
        break;
        
      case "semifinal":
        // After semifinal, another elimination
        this.state.phase = "elimination_poll";
        this.state.recommended = this.calculateWeakest();
        break;
        
      case "final":
        // After final, synthesis
        this.state.phase = "synthesis";
        break;
        
      case "synthesis":
        // Debate complete
        break;
    }
    
    return this.getState();
  }
  
  private calculateWeakest(): string[] {
    // In real implementation, this would analyze debate performance
    // For now, random selection from active personas
    const shuffled = [...this.state.active].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(3, Math.floor(this.state.active.length / 3)));
  }
  
  private autoSelect(): string[] {
    // Auto-select 1-2 from recommended
    const numToEliminate = this.state.active.length > 6 ? 2 : 1;
    return this.state.recommended.slice(0, numToEliminate);
  }
  
  private eliminate(personas: string[]): void {
    this.state.active = this.state.active.filter(p => !personas.includes(p));
    this.state.eliminated.push(...personas);
    this.state.recommended = [];
    this.state.selected = [];
  }
  
  getState(): ElimState {
    return { ...this.state };
  }
  
  getPhase(): Phase {
    return this.state.phase;
  }
  
  getActive(): string[] {
    return [...this.state.active];
  }
  
  getEliminated(): string[] {
    return [...this.state.eliminated];
  }
  
  isComplete(): boolean {
    return this.state.phase === "synthesis";
  }
  
  // Get dramatic description of current phase
  getPhaseDescription(): string {
    switch (this.state.phase) {
      case "opening":
        return "Opening statements from all contestants";
      case "elimination_poll":
        return `Vote to eliminate ${this.state.recommended.length} weakest performers`;
      case "semifinal":
        return `Semifinal round - ${this.state.active.length} remain`;
      case "final":
        return `Final showdown - ${this.state.active.length} finalists`;
      case "synthesis":
        return "The Moderator's final verdict";
      default:
        return "";
    }
  }
}

// Export helper to track debate state across SSE streams
export const debateStates = new Map<string, DebateStateMachine>();

export function getOrCreateDebateState(debateId: string, roster: string[]): DebateStateMachine {
  if (!debateStates.has(debateId)) {
    debateStates.set(debateId, new DebateStateMachine(roster));
  }
  return debateStates.get(debateId)!;
}

export function clearDebateState(debateId: string): void {
  debateStates.delete(debateId);
}