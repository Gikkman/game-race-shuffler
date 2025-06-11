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
  swapCount: number,  // Number of swaps that have occurred
  swapQueueSize: number, // Number of swaps queued to be performed
  swapBlockedUntil: number, // Unix timestap until which no swaps can occurr
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

  private swapCount = 0;
  private swapQueueSize = 0;
  private swapBlockedUntil = 0;
  private swapBlockTimer?: NodeJS.Timeout;

  private swapMinCooldown: number;
  private swapMaxCooldown: number;

  private swapModeConfig: SwapModeConfig;
  private swapMode: SwapMode;
  private swapEventData: {msg: string, t: number}[] = [];

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

      this.swapCount = args.swapCount ?? 0;
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
      swapCount: this.swapCount,
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

    this.doPostGameCompletionActions(game);
  }

  swapGameIfPossible(swapsToPerforms:  number, ...additionalStatesToSignal:(keyof RaceStateOverview)[]) {
    if(this.swapBlockTimer) {
      this.swapQueueSize+=swapsToPerforms;
      this.updateState("swapQueueSize");
      return;
    }
    // The 'alternatives' array might be an empty here, if no more games are available, and then 'nextGame' will be undefined
    const alternatives = this.games.filter(game => game.completedByUser === undefined).filter(game => game.logicalName !== this.currentGame?.logicalName);
    const nextGame = alternatives[getRandomInt(alternatives.length)];
    if(!nextGame) {
      LOGGER.debug("Could not swap game. No more games available");
    }
    else {
      this.currentGame = nextGame;
      this.swapCount += 1;
      additionalStatesToSignal.push("currentGame", "swapCount");

      if(swapsToPerforms > 1) {
        this.swapQueueSize += swapsToPerforms - 1;
        additionalStatesToSignal.push("swapQueueSize");
      }
    }

    this.swapBlockedUntil = this.generateSwapBlockUntil();
    this.startSwapBlockTimer(this.swapBlockedUntil);
    this.updateState(...additionalStatesToSignal, "swapBlockedUntil");
  }

  __serialize(): RaceStateData {
    return {
      phase: this.phase,
      currentGame: this.currentGame,
      participants: [...this.participants],
      games: [...this.games],
      swapCount: this.swapCount,
      swapQueueSize: this.swapQueueSize,
      swapBlockedUntil: this.swapBlockedUntil,
      swapModeConfig: this.swapModeConfig,
      swapMinCooldown: this.swapMinCooldown,
      swapMaxCooldown: this.swapMaxCooldown,
    };
  }

  cleanup() {
    LOGGER.debug("Clear timeout of 'swapBlockTimer'");
    clearTimeout(this.swapBlockTimer);
    LOGGER.debug("Call cleanup on swapMode");
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
      this.swapGameIfPossible(1, "phase");
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

    this.swapEventData.push({msg: "Manual Admin Swap", t: Date.now()});
    if(this.swapEventData.length > 5) {
      this.swapEventData = this.swapEventData.slice(1);
    }

    this.currentGame = nextGame;
    this.updateState("currentGame", "swapEventData");
  }

  adminControl_manualSwapRandom() {
    LOGGER.debug("Admin request to swap to random game");
    this.swapEventData.push({msg: "Manual Admin Swap", t: Date.now()});
    if(this.swapEventData.length > 5) {
      this.swapEventData = this.swapEventData.slice(1);
    }
    this.swapGameIfPossible(1, "swapEventData");
  }

  adminControl_markGameAsCompleted(gameName: string, participantName: string) {
    LOGGER.debug("Admin request to game %s as completed by participant %s", gameName, participantName);
    const game = this.games.find(e => e.gameName === gameName);
    if (!game) {
      return LOGGER.warn(`Could not mark game '%s' as completed. No such game in the race`, gameName);
    }
    const participant = this.participants.find(e => e.userName === participantName);
    if (!participant) {
      return LOGGER.warn(`Could not mark game as completed. No user named '%s' registed in the race`, participantName);
    }

    game.completedByUser = participant.userName;

    this.doPostGameCompletionActions(game);
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
    delete game.completedByUser;

    this.updateParticipantScores();

    // If removing the "completed" mark made the race not ended anymore, start it up again
    if(this.phase === "ENDED" && !this.isRaceCompleted()) {
      this.phase = "ACTIVE";
      this.swapGameIfPossible(1, "participants", "phase");
    }
    // Otherwise, just push a state update
    else {
      this.updateState("participants", "games");
    }
  }

  adminControl_clearSwapQueue() {
    LOGGER.debug("Admin request to set swapQueueSize to 0");
    this.swapQueueSize = 0;
    this.updateState("swapQueueSize");
  }

  adminControl_clearBlockTimer() {
    LOGGER.debug("Admin request to clear swapBlockTimer");
    clearTimeout(this.swapBlockTimer);
    this.swapBlockTimer = undefined;
    this.swapBlockedUntil = 0;
    this.updateState("swapBlockedUntil");
  }

  adminControl_setBlockTimer() {
    LOGGER.debug("Admin request to set a (new) swapBlockTimer");
    // If we don't clear the previous timer that might be running, we'll
    // get several timer resolves after a while
    clearTimeout(this.swapBlockTimer);
    this.swapBlockedUntil = this.generateSwapBlockUntil();
    this.startSwapBlockTimer(this.swapBlockedUntil);
    this.updateState("swapBlockedUntil");
  }

  /************************************************************************
  *  Private methods
  ************************************************************************/
  private updateState(...changedFields: (keyof RaceStateOverview)[]) {
    const changes = [...new Set(changedFields)];
    const state = this.getStateSummary();
    this.onStateUpdate({
      ...state,
      changes,
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

  private doPostGameCompletionActions(completedGame: RaceGame) {
    this.updateParticipantScores();
    // If the last game was marked as completed, end the race
    if(this.isRaceCompleted()) {
      this.doRaceCompletedActions();
    }
    // If the current game was marked as completed, swap game
    else if(completedGame === this.currentGame) {
      this.swapGameIfPossible(1, "participants", "games");
    }
    // Otherwise, just push an update about the completion and score
    else {
      this.updateState("participants", "games");
    }
  }

  private doRaceCompletedActions() {
    this.phase = "ENDED";
    this.swapQueueSize = 0;
    this.swapBlockedUntil = 0;
    clearTimeout(this.swapBlockTimer);
    this.swapBlockTimer = undefined;
    this.updateState("phase", "swapBlockedUntil", "participants");
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
        this.swapGameIfPossible(1, "swapQueueSize");
      }
    }, timeout);
  }

  private generateSwapBlockUntil() {
    const delayLength = FunctionUtils.randomIntInRange(this.swapMinCooldown, this.swapMaxCooldown) * 1000;
    return Date.now() + delayLength;
  }

  private swapModeBind(eventData: string[]) {
    if(!eventData[0]) {
      LOGGER.error("EventData contained a falsy element", eventData);
      return;
    }
    try {
      LOGGER.debug(eventData.length + " swap event(s) received from SwapMode binding");

      this.swapEventData.push({msg: eventData[0], t: Date.now()});
      while(this.swapEventData.length > 5) {
        this.swapEventData = this.swapEventData.slice(1);
      }

      // If the race is active, trigger a swap for each event data
      // Otherwise, just send a state update
      if(this.phase==="ACTIVE") {
        this.swapGameIfPossible(eventData.length, "swapEventData");
      }
      else {
        this.updateState("swapEventData");
      }
    }
    catch (ex) {
      LOGGER.error(ex as Error);
    }
  }
}

function getRandomInt(maxExclusive: number) {
  return Math.floor(Math.random() * maxExclusive);
}
