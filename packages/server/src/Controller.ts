import { Logger, CreateRoomRequest, StartRaceRequest, isCreateRoomRequest, JoinRaceRequest, SwapGameRequest } from '@grs/shared';

import * as Server from './Server.js';
import * as RoomManager from './RoomManager.js';

const LOGGER = Logger.getLogger("Controller");
let initialized = false;

export async function init() {
  if(initialized) {
    return;
  }

  Server.bindGet("/api/room", (_, res) => {
    return res.json(RoomManager.listRooms());
  });

  Server.bindGet("/api/room/:name", (req, res) => {
    const room = RoomManager.getRoom(req.params['name']);
    if(!room) {
      return res.status(404).send("No such room found");
    }
    return res.json(room);
  });

  Server.bindPost("/api/room", (req, res) => {
    const body = req.body as CreateRoomRequest;
    LOGGER.info(`Request to create room: ${body.roomName}`);
    if(!isCreateRoomRequest(body)) {
      return res.status(400).send("Invalid request format");
    }
    RoomManager.createRoom(body);
    return res.status(201).send();
  });

  Server.bindPost("/api/room/:name/start", (req,res) => {
    const body = req.body as StartRaceRequest;
    LOGGER.info(`Request to start race: ${body.roomName}`);
    if(!RoomManager.roomExists(body.roomName)) {
      return res.status(400).send("Room not found");
    }
    if(!RoomManager.hasAdminAccess(body.roomName, body.adminKey)) {
      return res.status(401).send("Invalid room key");
    }
    RoomManager.startRace(body.roomName);
    return res.status(201).send();
  });

  Server.bindPost("/api/room/:name/join", (req,res) => {
    const body = req.body as JoinRaceRequest;
    LOGGER.info(`Request to join race: ${body.roomName}`);

    if(!RoomManager.roomExists(body.roomName)) {
      return res.status(400).send("Room not found");
    }
    if(!RoomManager.hasRoomAccess(body.roomName, body.roomKey)) {
      return res.status(401).send("Invalid room key");
    }
    if(!RoomManager.usernameIsAvailable(body.roomName, body.userName)) {
      return res.status(400).send("User name already in use");
    }
    else {
      const key = RoomManager.joinRace(body.roomName, body.userName);
      return res.status(200).json(key);
    }
  });

  Server.bindPost("/api/room/:name/swap", (req,res) => {
    const body = req.body as SwapGameRequest;
    LOGGER.info(`Request to swap game: ${body.roomName}`);

    if(!RoomManager.roomExists(body.roomName)) {
      return res.status(400).send("Room not found");
    }
    if(!RoomManager.hasAdminAccess(body.roomName, body.adminKey)) {
      return res.status(401).send("Invalid room key");
    }
    else {
      RoomManager.swapGame(body.roomName);
      return res.status(201).send();
    }
  });

  Server.tipc().addHandler("completeGame", (data) => {
    const {roomName, userName, userKey, gameLogicalName} = data;
    if(!RoomManager.hasUserAccess({roomName, userName, userKey})) {
      LOGGER.warn("Could not mark game '%s' as complete in room '%s' by user '%s'. Invalid user key", data.gameLogicalName, data.roomName, data.userName);
      return false;
    }
    const gameName = RoomManager.getGameNameForRace({roomName, gameLogicalName});
    if(!gameName) {
      LOGGER.warn("Could not mark game '%s' as complete in room %s by user '%s'. No game mapped to the logical name", data.gameLogicalName, data.roomName, data.userName);
      return false;
    }
    RoomManager.completeGame(roomName, userName, gameName);
    return true;
  });

  initialized = true;
}
