import { Logger } from '@grs/shared';
import * as Server from './Server';

const LOGGER = Logger.getLogger("Controller");
let initialized = false;
let lastNumber = -1;

export async function init() {
  if(initialized) {
    return;
  }

  Server.bindPost("/load/:id", (req,res) => {
    const id = req.params['id'];
    LOGGER.debug("Request to load game %s", id);

    if(!id) {
      return res.status(400).send("Missing path param /load/<id>");
    }
    const num = parseInt(id);
    if(isNaN(num) || num < 0 || num > 2) {
      return res.status(400).send("Invalid number " + num + ". Must be a number between 0 and 2 (inclusive)");
    }
    Server.tipc().send("loadGame", num);
    return res.send("OK");
  });

  Server.bindPost("/random", (req,res) => {
    LOGGER.debug("Request to load random game");
    let num = Math.PI;
    do {
      num = Math.floor(Math.random()*3);
    } while(num === lastNumber);
    lastNumber = num;
    LOGGER.debug("Generated random number %d", lastNumber);
    Server.tipc().send("loadGame", lastNumber);
    return res.send("OK");

  });

  initialized = true;
}
