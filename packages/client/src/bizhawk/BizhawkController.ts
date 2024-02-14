import { bindGet, bindPost } from './WebServer';
import * as BizhawkService from './BizhawkService';
import { Logger } from '@grs/shared';

const LOGGER = Logger.getLogger("BizhawkController");
let initialized = false;

export function init() {
  if (initialized) {
    return;
  }
  initialized = true;

  bindGet("/bizhawk", (_, res) => {
    const event = BizhawkService.peekBizhawkEventQueue();
    if (event) {
      const str = event.action + ":" + (event.path ? event.path : "");
      LOGGER.info("<<< Sending " + str);
      res.send(str);
    }
    else {
      res.send();
    }
  });

  bindPost("/bizhawk", (_, res) => {
    const event = BizhawkService.popBizhawkEventQueue();
    res.send(event);
  });

  bindPost("/bizhawk/pong", (_, res) => {
    BizhawkService.bizhawkPong();
    res.send();
  });
}
