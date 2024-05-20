export type RaceGame = {
  gameName: string,
  completedByUser?: string,
}

export type RaceParticipant = {
  userName: string,
  score: number,
  leader: boolean,
  status: "DISCONNECTED"|"CONNECTED"
}

export type RacePhase = "NEW"|"ACTIVE"|"ENDED"

export type RaceStateOverview = {
  games: RaceGame[],
  participants: RaceParticipant[],
  phase: RacePhase,
  currentGame?: RaceGame,
  swapQueueSize: number,
  swapBlockedUntil: number,
}

export type RaceStateUpdate = RaceStateOverview & {
  changes: (keyof RaceStateOverview)[]
}
