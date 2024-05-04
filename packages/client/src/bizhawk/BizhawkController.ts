import { Logger } from '@grs/shared';

import * as BizhawkService from './BizhawkService.js';
import * as GameFinderService from '../GameFinderService.js';
import { bindGet, bindPost, getUserKey, tipc } from './WebServer.js';
import { ClientConfigService } from '../ClientConfigService.js';

const LOGGER = Logger.getLogger("BizhawkController");
let initialized = false;

export async function init() {
  if (initialized) {
    return;
  }

  bindGet("/bizhawk", (_, res) => {
    const event = BizhawkService.peekBizhawkEventQueue();
    if (event) {
      const str = event.action + ":" + (event.path ? event.path : "");
      LOGGER.info("<<< Sending " + str);
      res.send(str);
    }
    else {
      res.send("");
    }
  });

  bindPost("/bizhawk/ack", (_, res) => {
    LOGGER.debug("POST -> /bizhawk/ack");
    BizhawkService.popBizhawkEventQueue();
    res.send("");
  });

  bindPost("/bizhawk/complete", (_, res) => {
    LOGGER.debug("POST -> /bizhawk/complete");
    const userName = ClientConfigService.getUserName();
    const currentGame = BizhawkService.getCurrentGame();
    const gameLogicalName = GameFinderService.getLogicalNameForGame(currentGame);
    const userKey = getUserKey();
    const roomName = ClientConfigService.getRoomName();

    tipc().invoke("completeGame", {userName, gameLogicalName, userKey, roomName})
      .then((ok) => {
        if(ok){
          LOGGER.info("We marked game %s as completed", currentGame.gameName);
        }
        else {
          LOGGER.warn("Server rejecting us completing game %s", currentGame.gameName);
        }
      })
      .catch((e) => LOGGER.error(e));
    res.send("");
  });

  bindPost("/bizhawk/pong", (_, res) => {
    LOGGER.debug("POST -> /bizhawk/pong");
    BizhawkService.bizhawkPong();
    res.send("");
  });

  tipc().addListener("loadGame", (loadData) => {
    console.log(loadData);
    if(loadData.roomName !== ClientConfigService.getRoomName()) {
      return;
    }
    LOGGER.debug("TIPC request on 'loadGame'");
    const gameConfig = GameFinderService.getGameForLogicalName(loadData.gameLogicalName);
    if(!gameConfig) {
      return LOGGER.error("Argument 'name' doesn't map against a game: %s", loadData.gameLogicalName);
    }
    BizhawkService.loadGame(gameConfig);
  });

  initialized = true;
}
