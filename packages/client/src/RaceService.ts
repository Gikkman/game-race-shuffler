import { Logger, PathUtils } from "@grs/shared";
import { ClientConfigService } from "./ClientConfigService.js";
import fs from "node:fs/promises";
import { tipc } from "./bizhawk/WebServer.js";

const LOGGER = Logger.getLogger("RaceService");
let initialized = false;

type RoomData = {
  userKey?: string,
}

let roomData: RoomData;
let initialGame: string|undefined;

/************************************************************************
*  Exported Functions
************************************************************************/

export async function init() {
  if(initialized) {
    return;
  }
  const roomDataFileLocation = ClientConfigService.getRoomDataFileLocation();
  if(!PathUtils.existsSync(roomDataFileLocation)) {
    await fs.writeFile(roomDataFileLocation, "{}", "utf8");
  }

  const content = await fs.readFile(roomDataFileLocation, {encoding: "utf8"});
  roomData = JSON.parse(content) as RoomData;

  initialized = true;
}

export async function joinRace() {
  const roomName = ClientConfigService.getRoomName();
  const roomKey = ClientConfigService.getRoomKey();
  const userName = ClientConfigService.getUserName();

  if(roomData.userKey) {
    tipc().invoke("rejoinRace", {roomName, userName, userKey: roomData.userKey})
      .then(res => initialGame = res.raceState.currentGame?.gameName)
      .then(() => LOGGER.info("Successfully rejoined room " + roomName))
      .catch(e => {
        LOGGER.error("The server rejected our rejoin request");
        LOGGER.error(e);
        process.exit(1);
      });
  }
  else {
    tipc().invoke("joinRace", {roomName, roomKey, userName})
      .then(res => {
        initialGame = res.raceState.currentGame?.gameName;
        writeRoomData(res.userKey);
      })
      .then(() => LOGGER.info("Successfully rejoined room " + roomName))
      .catch(e => {
        LOGGER.error("The server rejected our join request");
        LOGGER.error(e);
        process.exit(1);
      });
  }
}

export function getInitialGame() {
  return initialGame;
}

function writeRoomData(userKey: string){
  const roomData: RoomData = {userKey};
  fs.writeFile(ClientConfigService.getRoomDataFileLocation(), JSON.stringify(roomData), "utf8");
}
