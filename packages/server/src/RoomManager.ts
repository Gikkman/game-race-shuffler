import { Logger, FunctionUtils } from '../../shared/dist/_index.js';

import * as Server from './Server.js';
import RaceState from './RaceState.js';
import { ServerConfigService } from './ServerConfigService.js';

const LOGGER = Logger.getLogger("RoomMananger");
let initialized = false;

let raceState: RaceState;

export async function init() {
  const tipc = Server.tipc();
  const raceGames = ServerConfigService.getGamesList().games;
  const nameToLogical = new Map(raceGames.map(g => [g, FunctionUtils.calculateLogicalName(g)]));
  const logicalToName = new Map(raceGames.map(g => [FunctionUtils.calculateLogicalName(g), g]));
  if(initialized) {
    return;
  }

  raceState = new RaceState({
    games: raceGames,

    onStateUpdate(update) {
      tipc.send("raceStateUpdate", update);

      if("currentGame" in update.changes && update.currentGame) {
        const newGameLogicalName = nameToLogical.get(update.currentGame.name);
        if(!newGameLogicalName) {
          LOGGER.error("Race state said to load game '%s', but that game has no computed logical name", update.currentGame.name);
        }
        else {
          tipc.send("loadGame", newGameLogicalName);
        }
      }

      if("phase" in update.changes && update.phase === "ENDED") {
        tipc.send("raceEnded", update.participants);
      }
    },
  });

  tipc.addHandler("completeGame", (participantName, gameLogicalName) => {
    const stateSummary = raceState.getStateSummary();
    const gameName = logicalToName.get(gameLogicalName);
    if(!gameName) {
      LOGGER.warn(`No game name mapping for for logical name ${gameLogicalName}. Requested by participant ${participantName}`);
      return false;
    }
    if(stateSummary.phase !== "ACTIVE") {
      LOGGER.warn(`Cannot complete a game unless the race is active. Race is currently %s`, stateSummary.phase);
      return false;
    }
    raceState.completeGame(gameName, participantName);
    raceState.swapGameIfPossible();
    return true;
  });

  initialized = true;
}

export function startRace() {
  raceState.startRace();
}

export function swapGame() {
  raceState.swapGameIfPossible();
}
