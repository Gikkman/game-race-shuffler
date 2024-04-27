import { Logger } from '../../shared/dist/_index.js';

import * as Server from './Server.js';
import * as RoomManager from './RoomManager.js';

const LOGGER = Logger.getLogger("Controller");
let initialized = false;

export async function init() {
  if(initialized) {
    return;
  }

  Server.bindPost("/start", (req,res) => {
    LOGGER.info("Request to start race");
    res.send("OK");
    RoomManager.startRace();
  });

  Server.bindPost("/random", (req,res) => {
    LOGGER.info("Request to load random game");
    res.send("OK");
    RoomManager.swapGame();
  });

  initialized = true;
}
