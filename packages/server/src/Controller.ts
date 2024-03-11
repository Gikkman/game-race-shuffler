import { Logger } from '@grs/shared';
import * as Server from './Server';
import { getGamesList } from './ServerConfigService';

const LOGGER = Logger.getLogger("Controller");
let initialized = false;
let lastNumber = -1;

export async function init() {
  if(initialized) {
    return;
  }

  Server.bindPost("/random", (req,res) => {
    LOGGER.info("Request to load random game");
    const potentialGames = getGamesList();

    let num = Math.PI;
    do {
      num = Math.floor(Math.random()*potentialGames.length);
    } while(num === lastNumber);
    lastNumber = num;
    LOGGER.debug("Generated random number %d", lastNumber);

    const name = potentialGames[lastNumber];
    if(!name) {
      LOGGER.error("Somehow generated an invalid random number" + lastNumber);
      return res.status(400).send("Could not load new game");
    }

    LOGGER.info("Requesting to load game by name: %s", name);
    Server.tipc().send("loadGame", name);
    return res.send("OK");
  });

  initialized = true;
}
