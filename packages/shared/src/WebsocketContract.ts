import { RaceParticipant, RaceStateUpdate } from "./Types.js";

export interface WebsocketContract {
  loadGame: string,
  raceStateUpdate: RaceStateUpdate & {roomName: string},
  raceEnded: RaceParticipant[]
  completeGame: (participantName: string, gameLogicalName: string) => boolean,
}
