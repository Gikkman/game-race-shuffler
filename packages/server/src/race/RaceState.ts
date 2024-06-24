import { RaceStateUpdate, Logger, RaceGame, RaceParticipant, RacePhase, RaceStateOverview, FunctionUtils, SwapModeConfig } from "@grs/shared";
import SwapModeFactory from "./swapmode/SwapModeFactory.js";
import { SwapMode } from "./swapmode/SwapMode.js";

type RaceStateArgs = {
  games: string[],
  swapModeConfig: SwapModeConfig,
  swapMinCooldown: number,
  swapMaxCooldown: number,
}

export type RaceStateData = {
  participants: RaceParticipant[],
  phase: RacePhase,
  games: RaceGame[],
  swapQueueSize: number,
  swapBlockedUntil: number,
  currentGame?: RaceGame,
  swapModeConfig: SwapModeConfig,
  swapMinCooldown: number,
  swapMaxCooldown: number,
}

export type StateUpdateCallback = (update: RaceStateUpdate) => void;

const LOGGER = Logger.getLogger("RaceState");

export default class RaceState {
  private participants: RaceParticipant[] = [];
  private phase: RacePhase = "NEW";
  private games: RaceGame[];
  private currentGame?: RaceGame;
  private onStateUpdate: StateUpdateCallback;

  private swapQueueSize = 0;
  private swapBlockedUntil = 0;
  private swapBlockTimer?: NodeJS.Timeout;

  private swapMinCooldown: number;
  private swapMaxCooldown: number;

  private swapModeConfig: SwapModeConfig;
  private swapMode: SwapMode;
  private swapEventData: string[] = [];

  constructor(args: RaceStateArgs|RaceStateData, onStateUpdate: StateUpdateCallback) {
    this.swapModeConfig = args.swapModeConfig;
    this.swapMode = SwapModeFactory(args.swapModeConfig);
    this.swapMode.bind((e) => this.swapModeBind(e));

    this.swapMinCooldown = args.swapMinCooldown ?? 5;
    this.swapMaxCooldown = args.swapMaxCooldown ?? 5;

    if("phase" in args) {
      this.participants = args.participants;
      this.phase = args.phase;
      this.games = args.games;
      this.currentGame = args.currentGame;

      this.swapQueueSize = args.swapQueueSize;
      this.swapBlockedUntil = args.swapBlockedUntil;
      if(this.swapQueueSize) {
        this.startSwapBlockTimer(args.swapBlockedUntil);
      }
    }
    else {
      if (args.games.length < 1) {
        throw new Error("Cannot create race state. Number of games must be at least 1");
      }
      this.games = args.games.map(e => ({ gameName: e, logicalName: FunctionUtils.calculateLogicalName(e) }));
    }
    this.onStateUpdate = onStateUpdate;
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
      swapQueueSize: this.swapQueueSize,
      swapBlockedUntil: this.swapBlockedUntil,
      swapMode: this.swapModeConfig.swapMode,
      swapMinCooldown: this.swapMinCooldown,
      swapMaxCooldown: this.swapMaxCooldown,
      swapEventData: this.swapEventData,
    };
  }

  addParticipant(userName: string) {
    if (this.participants.find(e => e.userName === userName)) {
      return LOGGER.info(`Could not add participant. A user named %s already exists`, userName);
    }
    this.participants.push({ userName, score: 0, leader: false, status: "CONNECTED" });
    this.updateState("participants");
    return true;
  }

  completeGame(gameName: string, participantName: string) {
    const game = this.games.find(e => e.gameName === gameName);
    if (!game) {
      return LOGGER.warn(`Could not mark game '%s' as completed. No such game in the race`, gameName);
    }
    if (game.completedByUser) {
      return LOGGER.warn(`Could not mark game as completed. Game '%s' already marked as completed by participant '%s'`, gameName, game.completedByUser);
    }

    const participant = this.participants.find(e => e.userName === participantName);
    if (!participant) {
      return LOGGER.warn(`Could not mark game as completed. No user named '%s' registed in the race`, participantName);
    }

    game.completedByUser = participant.userName;

    this.updateParticipantScores();
    if(this.isRaceCompleted()) {
      this.phase = "ENDED";
      this.updateState("participants", "phase");
    }
    else {
      this.swapGameIfPossible("participants");
    }
  }

  swapGameIfPossible(...additionalStatesToSignal:(keyof RaceStateOverview)[]) {
    if(this.swapBlockTimer) {
      this.swapQueueSize+=1;
      this.updateState("swapQueueSize");
      return;
    }
    // The 'alternatives' array might be an empty here, if no more games are available, and then 'nextGame' will be undefined
    const alternatives = this.games.filter(game => game.completedByUser === undefined).filter(game => game.logicalName !== this.currentGame?.logicalName);
    const nextGame = alternatives[getRandomInt(alternatives.length)];
    if(!nextGame) {
      return LOGGER.info("Could not swap game. No more games available");
    }
    this.currentGame = nextGame;

    this.swapBlockedUntil = this.generateSwapBlockUntil();
    this.startSwapBlockTimer(this.swapBlockedUntil);
    this.updateState(...additionalStatesToSignal, "currentGame", "swapBlockedUntil");
  }

  __serialize(): RaceStateData {
    return {
      phase: this.phase,
      currentGame: this.currentGame,
      participants: [...this.participants],
      games: [...this.games],
      swapQueueSize: this.swapQueueSize,
      swapBlockedUntil: this.swapBlockedUntil,
      swapModeConfig: this.swapModeConfig,
      swapMinCooldown: this.swapMinCooldown,
      swapMaxCooldown: this.swapMaxCooldown,
    };
  }

  swapModeBind(eventData: string) {
    LOGGER.info("Swap event received from SwapMode binding");

    this.swapEventData.push(eventData);
    if(this.swapEventData.length > 5) {
      this.swapEventData = this.swapEventData.slice(1);
    }

    // If the race is active, trigger a swap
    // Otherwise, just send a state update
    if(this.phase==="ACTIVE") {
      this.swapGameIfPossible("swapEventData");
    }
    else {
      this.updateState("swapEventData");
    }
  }

  cleanup() {
    clearTimeout(this.swapBlockTimer);
    this.swapMode.cleanup();
  }

  /************************************************************************
  *  Admin control functions
  ************************************************************************/
  adminControl_changePhase(phase: RacePhase) {
    if(this.phase === phase) {
      return;
    }
    this.phase = phase;

    if(phase === "ACTIVE" && !this.currentGame) {
      this.swapGameIfPossible("phase");
    }
    else {
      this.updateState("phase");
    }
  }

  adminControl_manualSwapToGame(gameName: string) {
    LOGGER.debug("Admin request to swap to game %s", gameName);
    if(this.currentGame && this.currentGame.gameName === gameName) {
      return LOGGER.debug("Swapping to specific game is not allowed when it is already the current game");
    }
    if(this.phase === "ACTIVE") {
      return LOGGER.debug("Swapping to specific game is not allowed when race is active");
    }

    const nextGame = this.games.find(e => e.gameName === gameName);
    if(!nextGame) {
      return LOGGER.debug("Swapping to specific game is not possible when the game is not in the race");
    }

    this.swapEventData.push("Manual Admin Swap");
    if(this.swapEventData.length > 5) {
      this.swapEventData = this.swapEventData.slice(1);
    }

    this.currentGame = nextGame;
    this.updateState("currentGame", "swapEventData");
  }

  adminControl_manualSwapRandom() {
    LOGGER.debug("Admin request to swap to random game");
    this.swapEventData.push("Manual Admin Swap");
    if(this.swapEventData.length > 5) {
      this.swapEventData = this.swapEventData.slice(1);
    }
    this.swapGameIfPossible("swapEventData");
  }

  adminControl_markGameAsCompleted(gameName: string, participantName: string) {
    LOGGER.debug("Admin request to game %s as completed by participant %s", gameName, participantName);
    this.completeGame(gameName, participantName);
  }

  adminControl_markGameAsUncompleted(gameName: string) {
    LOGGER.debug("Admin request to remove completed status from game %s", gameName);
    const game = this.games.find(e => e.gameName === gameName);
    if (!game) {
      return LOGGER.warn(`Could not remove completed status from game '%s'. No such game in the race`, gameName);
    }
    if (!game.completedByUser) {
      return LOGGER.warn(`Could not remove completed status from game '%s'. It was not marked as completed`, gameName);
    }

    this.updateParticipantScores();
    // If removing the "completed" mark made the race not ended anymore, start it up again
    if(this.phase === "ENDED" && !this.isRaceCompleted()) {
      this.phase = "ACTIVE";
      this.updateState("participants", "phase");
    }
    else {
      this.swapGameIfPossible("participants");
    }
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
    const completedCount = this.games.reduce((acc, curr) => acc += (curr.completedByUser ? 1 : 0), 0);

    if (completedCount === gameCount) {
      return true;
    }
    return false;
  }

  private updateParticipantScores() {
    const participantScores = {} as Record<string, number>;
    const mostScore = { name: [] as string[], score: 0 as number };

    for (const game of this.games) {
      const completerName = game.completedByUser;
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
      p.leader = (mostScore.name.includes(p.userName));
      p.score = participantScores[p.userName] ?? 0;
    }
  }

  private startSwapBlockTimer(swapBlockUntilUnix: number) {
    const timeout = Math.max(swapBlockUntilUnix - Date.now(), 0);
    this.swapBlockTimer = setTimeout(() => {
      this.swapBlockTimer = undefined;
      if(this.swapQueueSize > 0) {
        this.swapQueueSize--;
        this.swapGameIfPossible("swapQueueSize");
      }
    }, timeout);
  }


  private generateSwapBlockUntil() {
    const min = Math.ceil(this.swapMinCooldown);
    const max = Math.floor(this.swapMaxCooldown);
    const delayLenght = (Math.floor(Math.random() * (max - min + 1)) + min) * 1000;
    return Date.now() + delayLenght;
  }
}

function getRandomInt(maxExclusive: number) {
  return Math.floor(Math.random() * maxExclusive);
}
