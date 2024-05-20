import { Logger, CreateRoomRequest, StartRaceRequest, isCreateRoomRequest, SwapGameRequest } from '@grs/shared';

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
    const room = RoomManager.roomExists(req.params['name']??"UNKNOWN");
    if(!room) {
      return res.status(404).send("Room not found");
    }
    return res.json(room);
  });

  Server.bindPost("/api/room", (req, res) => {
    const body = req.body as CreateRoomRequest;
    LOGGER.info(`Request to create room: ${body.roomName}`);
    if(!isCreateRoomRequest(body)) {
      return res.status(400).send("Invalid request format");
    }
    const adminKey = RoomManager.createRoom(body);
    return res.status(201).json(adminKey);
  });

  Server.bindPost("/api/room/:name/start", (req,res) => {
    const body = req.body as StartRaceRequest;
    const {roomName, adminKey} = body;
    LOGGER.info(`Request to start race: ${roomName}`);
    const room = RoomManager.roomExists(roomName);
    if(!room) {
      return res.status(400).send("Room not found");
    }
    if(!RoomManager.hasAdminAccess(room, adminKey)) {
      return res.status(401).send("Invalid room key");
    }
    RoomManager.startRace(room);
    return res.status(201).send();
  });

  Server.bindPost("/api/room/:name/swap", (req,res) => {
    const body = req.body as SwapGameRequest;
    LOGGER.info(`Request to swap game: ${body.roomName}`);

    const room = RoomManager.roomExists(body.roomName);
    if(!room) {
      return res.status(400).send("Room not found");
    }
    if(!RoomManager.hasAdminAccess(room, body.adminKey)) {
      return res.status(401).send("Invalid room key");
    }
    RoomManager.swapGame(room);
    return res.status(201).send();
  });

  Server.tipc().addHandler("joinRace", (data) => {
    const {roomName, roomKey, userName} = data;
    LOGGER.info(`Request to join race: ${roomName}`);
    const room = RoomManager.roomExists(roomName);
    if(!room) {
      throw new Error("Room not found");
    }
    if(!RoomManager.hasRoomAccess(room, roomKey)) {
      throw new Error("Invalid room key");
    }
    if(!RoomManager.usernameIsAvailable(room, userName)) {
      throw new Error("User name already in use");
    }
    const userKey = RoomManager.joinRace(room, userName);
    const raceState = RoomManager.getRoomOverview(room).raceState;
    return {...userKey, raceState};
  });

  Server.tipc().addHandler("completeGame", (data) => {
    const {roomName, userName, userKey, gameLogicalName} = data;
    const room = RoomManager.roomExists(roomName);
    if(!room) {
      LOGGER.warn("Could not mark game '%s' as complete in room '%s' by user '%s'. No such room", data.gameLogicalName, data.roomName, data.userName);
      return false;
    }
    if(!RoomManager.hasUserAccess(room, userName, userKey)) {
      LOGGER.warn("Could not mark game '%s' as complete in room '%s' by user '%s'. Invalid user key", data.gameLogicalName, data.roomName, data.userName);
      return false;
    }
    const gameName = RoomManager.getGameNameForRace(room, gameLogicalName);
    if(!gameName) {
      LOGGER.warn("Could not mark game '%s' as complete in room %s by user '%s'. No game mapped to the logical name", data.gameLogicalName, data.roomName, data.userName);
      return false;
    }
    RoomManager.completeGame(room, userName, gameName);
    return true;
  });

  initialized = true;
}
