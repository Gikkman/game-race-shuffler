import { Logger, CreateRoomRequest, isCreateRoomRequest, DeleteRoomRequest, RaceAdminAction } from '@grs/shared';

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
  Server.bindPost("/api/room/:name/admin", (req, res) => {
    const body = req.body as RaceAdminAction;
    LOGGER.info(`Request to admin race %s`, body.roomName);

    if(!body.command || !body.command.action) {
      return res.send(400).send("Invalid 'command' parameter");
    }

    const room = RoomManager.roomExists(body.roomName);
    if(!room) {
      return res.status(400).send("Room not found");
    }
    if(!RoomManager.hasAdminAccess(room, body.adminKey)) {
      return res.status(401).send("Invalid admin key");
    }

    const roomState = room.getStateSummary();
    const command = body.command;
    switch(command.action) {

    case "changeRacePhase": {
      const currentPhase = roomState.raceStateData.phase;
      if(!["NEW","ACTIVE","ENDED"].includes(command.phase)) {
        return res.status(400).send("Unknown phase " + command.phase);
      }
      if(currentPhase === command.phase) {
        return res.status(400).send("Race already in phase " + command.phase);
      }
      RoomManager.changeRacePhase(room, command.phase);
      break;
    }

    case "swapRandomGame":{
      RoomManager.swapGame(room);
      break;
    }

    case "swapToGame":{
      break;
    }

    case "completeGame":{
      RoomManager.completeGame(room, command.participantName, command.gameName);
      break;
    }

    case "uncompleteGame":{
      break;
    }

    }
    return res.status(204).send("");
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
