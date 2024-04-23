import { Logger } from "@grs/shared";
import { RaceGame, RaceParticipant, RacePhase, RaceStateOverview, RaceStateUpdate } from "@grs/shared/src/Types";

const NOOP = (..._: unknown[]) => { };

type RaceStateOptions = {
  games: string[],
  onStateUpdate?: (update: RaceStateUpdate) => void,
}

const LOGGER = Logger.getLogger("RaceState");

export default class RaceState {
  private participants: RaceParticipant[] = [];
  private phase: RacePhase = "NEW";
  private games: RaceGame[];

  private currentGame?: RaceGame;

  private onStateUpdate: (update: RaceStateUpdate) => void;

  constructor(options: RaceStateOptions) {
    if (options.games.length < 1) {
      throw new Error("Cannot create race state. Number of games must be at least 1");
    }
    this.games = options.games.map(e => ({ name: e }));
    this.onStateUpdate = options.onStateUpdate ?? NOOP;
  }

  /************************************************************************
  *  Public methods
  ************************************************************************/
  getStateSummary(): RaceStateOverview {
    return {
      phase: this.phase,
      currentGame: this.currentGame,
      participants: [...this.participants],
      games: [...this.games],
    };
  }

  startRace() {
    this.ensurePhase("NEW", "Could not start race");
    this.phase = "ACTIVE";
    this.updateState("phase");
  }

  addParticipant(name: string) {
    this.ensurePhase("NEW", "Could not add participant");
    if (this.participants.find(e => e.name === name)) {
      throw new Error(`Could not add participant. A participant named ${name} already exists`);
    }
    this.participants.push({ name: name, score: 0, leader: false, status: "CONNECTED" });
    this.updateState("participants");
  }

  completeGame(gameName: string, completedByParticipant: string) {
    this.ensurePhase("ACTIVE", "Could not mark game as completed");

    const game = this.games.find(e => e.name === gameName);
    if (!game) {
      throw new Error(`Could not mark game as completed. No game named ${gameName} found`);
    }
    if (game.completedByParticipant) {
      throw new Error(`Could not mark game as completed. Game ${game.name} already marked as completed by participant ${game.completedByParticipant}`);
    }

    const participant = this.participants.find(e => e.name === completedByParticipant);
    if (!participant) {
      throw `Could not mark game as completed. No participant named ${completedByParticipant} found`;
    }

    game.completedByParticipant = participant.name;

    this.updateParticipantScores();
    if(this.isRaceCompleted()) {
      this.phase = "ENDED";
      this.updateState("participants", "phase");
    }
    else {
      this.updateState("participants");
    }
  }

  setCurrentGame(gameName: string) {
    this.ensurePhase("ACTIVE", "Could not set game as current game");

    const game = this.games.find(e => e.name === gameName);
    if (!game) {
      throw new Error(`Could not set game as current game. No game named ${gameName} found`);
    }
    if (game.completedByParticipant) {
      throw new Error(`Could not set game as current game. Game ${game.name} already marked as completed by participant ${game.completedByParticipant}`);
    }

    this.currentGame = game;
    this.updateState("currentGame");
  }

  swapGameIfPossible() {
    if(this.phase !== "ACTIVE") {
      return LOGGER.info("Swap not possible. Race has ended");
    }

    // The 'alternatives' array might be an empty here, and then 'nextGame' will be undefined
    const alternatives = this.games.filter(game => game.completedByParticipant === undefined).filter(game => game !== this.currentGame);
    const nextGame = alternatives[getRandomInt(alternatives.length)];
    if(!nextGame) {
      return LOGGER.info("Swap not possible. No more games available");
    }

    this.setCurrentGame(nextGame.name);
  }


  /************************************************************************
  *  Private methods
  ************************************************************************/
  private updateState(...changedFields: (keyof RaceStateOverview)[]) {
    const state = this.getStateSummary();
    this.onStateUpdate({
      ...state,
      changes: changedFields
    });
  }

  private isRaceCompleted(): boolean {
    const gameCount = this.games.length;
    const completedCount = this.games.reduce((acc, curr) => acc += (curr.completedByParticipant ? 1 : 0), 0);

    if (completedCount === gameCount) {
      return true;
    }
    return false;
  }

  private updateParticipantScores() {
    const participantScores = {} as Record<string, number>;
    const mostScore = { name: [] as string[], score: 0 as number };

    for (const game of this.games) {
      const completerName = game.completedByParticipant;
      if (completerName) {
        const participantScore = (participantScores[completerName] ?? 0) + 1;
        participantScores[completerName] = participantScore;

        if(participantScore > mostScore.score) {
          mostScore.score = participantScore;
          mostScore.name = [completerName];
        }
        else if (participantScore === mostScore.score) {
          mostScore.name.push(completerName);
        }
      }
    }

    for(const p of this.participants) {
      p.leader = (p.name in mostScore.name);
      p.score = participantScores[p.name] ?? 0;
    }
  }

  private ensurePhase(desired: RacePhase, errorMessage: string) {
    if (desired !== this.phase) {
      throw new Error(`${errorMessage}. Race currently in phase ${this.phase}, must be in ${desired}`);
    }
  }
}

function getRandomInt(maxExclusive: number) {
  return Math.floor(Math.random() * maxExclusive);
}
