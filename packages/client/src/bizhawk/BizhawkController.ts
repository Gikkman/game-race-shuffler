import * as BizhawkService from './BizhawkService';
import * as GameFinderService from '../GameFinderService';
import { bindGet, bindPost, tipc } from './WebServer';
import { Logger } from '@grs/shared';

const LOGGER = Logger.getLogger("BizhawkController");
let initialized = false;

export function init() {
  if (initialized) {
    return;
  }

  bindGet("/bizhawk", (_, res) => {
    LOGGER.debug("GET -> /bizhawk");
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
    // TODO: tipc().send("completeGame", "")
    res.send("");
  });

  bindPost("/bizhawk/pong", (_, res) => {
    LOGGER.debug("POST -> /bizhawk/pong");
    BizhawkService.bizhawkPong();
    res.send("");
  });

  tipc().addListener("loadGame", (name) => {
    LOGGER.debug("TIPC request on 'loadGame'");
    const gameConfig = GameFinderService.getGameForName(name);
    if(!gameConfig) {
      return LOGGER.error("Argument 'name' doesn't map against a game: " + name);
    }
    BizhawkService.loadGame(gameConfig);
  });

  initialized = true;
}
