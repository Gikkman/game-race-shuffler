import { RaceParticipant, RaceStateUpdate } from "./Types.js";

export interface WebsocketContract {
  loadGame: {gameLogicalName: string, roomName: string},
  raceStateUpdate: RaceStateUpdate & {roomName: string},
  raceEnded: {participants: RaceParticipant[], roomName: string}
  completeGame: (data:{roomName: string, userName: string, gameLogicalName: string, userKey: string}) => boolean,
}
