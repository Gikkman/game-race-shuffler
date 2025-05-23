export type SwapEventSink = (eventsInfo: string[]) => void;

export type SwapMode = {
  bind( swapEventSink: SwapEventSink ): void;
  cleanup(): void;
}
