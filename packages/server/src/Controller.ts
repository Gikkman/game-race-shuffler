import { Logger, RacePhase, isCreateRoomRequest } from '@grs/shared';
import type { CreateRoomRequest, DeleteRoomRequest, RaceAdminAction, RaceAdminChangeRacePhase, RaceAdminCompleteGame, RaceAdminSwapToGame, RaceAdminUncompleteGame } from "@grs/shared";
import type { Response } from 'express';
import * as Server from './Server.js';
import * as RoomManager from './race/RoomManager.js';

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
      return res.status(400).send("Room not found");
    }
    const view = room.getStateSummary();
    return res.json(view);
  });

  Server.bindPost("/api/room", (req, res) => {
    const body = req.body as CreateRoomRequest;
    LOGGER.info(`Request to create room: ${body.roomName}`);
    try {
      isCreateRoomRequest(body);
    }
    catch(e) {
      return  res.status(400).send(e);
    }
    const room = RoomManager.roomExists(body.roomName);
    if(room) {
      return res.status(400).send(`Room with name ${body.roomName} already exists`);
    }

    const adminKey = RoomManager.createRoom(body);
    return res.status(201).json(adminKey);
  });

  Server.bindDelete("/api/room/:name", (req, res) => {
    const body = req.body as DeleteRoomRequest;
    const {roomName, adminKey} = body;
    LOGGER.info(`Request to delete room: ${body.roomName}`);
    const room = RoomManager.roomExists(roomName);
    if(!room) {
      return res.status(400).send("Room not found");
    }
    if(!RoomManager.hasAdminAccess(room, adminKey)) {
      return res.status(401).send("Invalid admin key");
    }
    RoomManager.deleteRoom(room);
    return res.status(201).send();
  });

  /************************************************************************
   *  Admin Controls for Races
  ************************************************************************/
  Server.bindPost("/api/room/:name/admin-shuffle-game", (req, res) => {
    const body = req.body as RaceAdminAction;
    const room = validateAdminRequest_orReturn400(res, body);
    if(!room) {
      return;
    }
    RoomManager.swapGame(room);
    return res.status(204).send();
  });

  Server.bindPost("/api/room/:name/admin-set-game", (req, res) => {
    const body = req.body as RaceAdminSwapToGame;
    const room = validateAdminRequest_orReturn400(res, body, "gameName");
    if(!room) {
      return;
    }

    const roomOverview = RoomManager.getRoomOverview(room);
    if(!roomOverview.raceStateData.games.find(e => e.gameName === body.gameName)) {
      return res.status(400).send("No such game found in race");
    }
    if(roomOverview.raceStateData.currentGame?.gameName === body.gameName) {
      return res.status(400).send("Can't swap to the game that's already the current game");
    }
    RoomManager.setGame(room, body.gameName);
    return res.status(204).send();
  });

  Server.bindPost("/api/room/:name/admin-set-phase", (req, res) => {
    const body = req.body as RaceAdminChangeRacePhase;
    const room = validateAdminRequest_orReturn400(res, body, "phase");
    if(!room) {
      return;
    }
    const phases: RacePhase[] = ["NEW", "ACTIVE", "PAUSED", "ENDED"];
    if(!phases.includes(body.phase)) {
      return res.status(400).send("Invalid phase: " + body.phase);
    }
    RoomManager.changeRacePhase(room, body.phase);
    return res.status(204).send();
  });

  Server.bindPost("/api/room/:name/admin-complete-game", (req, res) => {
    const body = req.body as RaceAdminCompleteGame;
    const room = validateAdminRequest_orReturn400(res, body, "gameName", "participantName");
    if(!room) {
      return;
    }

    const roomOverview = RoomManager.getRoomOverview(room);
    if(!roomOverview.raceStateData.games.find(e => e.gameName === body.gameName)) {
      return res.status(400).send("No such game found in race");
    }
    if(!roomOverview.raceStateData.participants.find(e => e.userName === body.participantName)) {
      return res.status(400).send("No such participant found in race");
    }

    RoomManager.completeGame(room, body.participantName, body.gameName);
    return res.status(204).send();
  });

  Server.bindPost("/api/room/:name/admin-uncomplete-game", (req, res) => {
    const body = req.body as RaceAdminUncompleteGame;
    const room = validateAdminRequest_orReturn400(res, body, "gameName");
    if(!room) {
      return;
    }

    const roomOverview = RoomManager.getRoomOverview(room);
    if(!roomOverview.raceStateData.games.find(e => e.gameName === body.gameName)) {
      return res.status(400).send("No such game found in race");
    }

    // TODO
    return res.status(204).send();
  });

  /************************************************************************
  *  TIPC handlers
  ************************************************************************/

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
    const {roomId, raceStateData: raceState} = RoomManager.getRoomOverview(room);
    return {userKey, roomId, gameLogicalName: raceState.currentGame?.logicalName};
  });

  Server.tipc().addHandler("rejoinRace", (data) => {
    const {roomName, userName, userKey} = data;
    LOGGER.info(`Request to rejoin race: ${roomName}`);
    const room = RoomManager.roomExists(roomName);
    if(!room) {
      throw new Error("Room not found");
    }
    if(!RoomManager.hasUserAccess(room, userName, userKey)) {
      throw new Error("Invalid user key");
    }
    // TODO: Rejoin action?
    const raceState = RoomManager.getRoomOverview(room).raceStateData;
    return {gameLogicalName: raceState.currentGame?.logicalName};
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

/************************************************************************
*  Admin action handlers
************************************************************************/
function validateAdminRequest_orReturn400<T extends RaceAdminAction>(res: Response, body: T, ...extraFields: (keyof T)[]) {
  LOGGER.info(`Request to admin race %s`, body.roomName);

  if(!hasFields(body, "adminKey", "roomName", ...extraFields)) {
    res.status(400).send("Invalid request format");
    return false;
  }

  const room = RoomManager.roomExists(body.roomName);
  if(!room) {
    res.status(400).send("Room not found");
    return false;
  }
  if(!RoomManager.hasAdminAccess(room, body.adminKey)) {
    res.status(401).send("Invalid admin key");
    return false;
  }
  return room;
}

function hasFields<T extends object>(body: T, ...fields: (keyof T)[]): body is T {
  return fields.reduce((acc, curr) => acc && (curr in body) ,true);
}
