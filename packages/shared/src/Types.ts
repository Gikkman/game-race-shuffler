export type RaceGame = {
  gameName: string,
  logicalName: string,
  completedByUser?: string,
}

export type RaceParticipant = {
  userName: string,
  score: number,
  leader: boolean,
  status: "DISCONNECTED"|"CONNECTED"
}

export type RacePhase = "NEW"|"ACTIVE"|"PAUSED"|"ENDED";

export type RaceStateOverview = {
  games: RaceGame[],
  participants: RaceParticipant[],
  phase: RacePhase,
  currentGame?: RaceGame,
  swapCount: number,
  swapQueueSize: number,
  swapBlockedUntil: number,
  swapMode: string,
  swapEventData: {msg: string, t: number}[],
  swapMinCooldown: number,
  swapMaxCooldown: number,
}

export type RaceStateUpdate = RaceStateOverview & {
  changes: (keyof RaceStateOverview)[]
}
