export type SwapEventSink = (eventInfo: string) => void;

export type SwapMode = {
  bind( swapEventSink: SwapEventSink ): void;
  cleanup(): void;
}
