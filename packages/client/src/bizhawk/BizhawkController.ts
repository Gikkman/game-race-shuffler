import * as BizhawkService from './BizhawkService';
import * as GameFinderService from '../GameFinderService';
import { bindGet, bindPost, tipc } from './WebServer';
import { Logger } from '@grs/shared';
import { ClientConfigService } from '../ClientConfigService';

const LOGGER = Logger.getLogger("BizhawkController");
let initialized = false;

export function init() {
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
    const clientName = ClientConfigService.getClientName();
    const currentGame = BizhawkService.getCurrentGame();
    const gameLogicalName = GameFinderService.getLogicalNameForGame(currentGame);
    tipc().invoke("completeGame", clientName, gameLogicalName)
      .then((ok) => {
        if(ok){
          LOGGER.info("We marked game %s as completed", currentGame.name);
        }
        else {
          LOGGER.warn("Server rejecting us completing game %s", currentGame.name);
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

  tipc().addListener("loadGame", (logicalName) => {
    LOGGER.debug("TIPC request on 'loadGame'");
    const gameConfig = GameFinderService.getGameForLogicalName(logicalName);
    if(!gameConfig) {
      return LOGGER.error("Argument 'name' doesn't map against a game: %s", logicalName);
    }
    BizhawkService.loadGame(gameConfig);
  });

  initialized = true;
}
