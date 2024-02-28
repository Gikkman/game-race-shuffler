import { bindGet, bindPost, tipc } from './WebServer';
import * as BizhawkService from './BizhawkService';
import { Logger } from '@grs/shared';
import { getClientConfig } from '../ClientConfigService';

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

  bindPost("/bizhawk/pong", (_, res) => {
    LOGGER.debug("POST -> /bizhawk/pong");
    BizhawkService.bizhawkPong();
    res.send("");
  });

  bindPost("/load/:id", (req, res) => {
    LOGGER.debug("POST -> /bizhawk/:id");
    const params = req.params as {id?: number};
    const num = params.id;

    if(!num) {
      return res.status(400).send("Invalid request. Path parameter /:id required");
    }

    if (num < 0) {
      return res.status(400).send("Invalid number. Must be greater than 0");
    }
    const gameConfig = getClientConfig().games[num];
    if(!gameConfig) {
      return res.status(400).send("Invalid number. Can't be greater than the number of games");
    }

    BizhawkService.loadGame({absolutePath: gameConfig.path, name: gameConfig.name});
    return res.send("OK");
  });

  bindPost("/random", (req, res) => {
    LOGGER.debug("POST -> /random");

    const gameConfigs = getClientConfig().games;
    const idx = Math.floor(Math.random() * gameConfigs.length);
    const gameConfig = gameConfigs[idx];
    if(!gameConfig) {
      return res.status(400).send("Invalid number. Can't be greater than the number of games");
    }

    BizhawkService.loadGame({absolutePath: gameConfig.path, name: gameConfig.name});
    return res.send("OK");
  });

  tipc().addListener("loadGame", (num) => {
    LOGGER.debug("TIPC request on 'loadGame'");
    if (num < 0) {
      return LOGGER.error("Argument 'num' is less than 0");
    }
    const gameConfig = getClientConfig().games[num];
    if(!gameConfig) {
      return LOGGER.error("Argument 'num' doesn't map against a game index");
    }

    BizhawkService.loadGame({absolutePath: gameConfig.path, name: gameConfig.name});
  });

  initialized = true;
}
