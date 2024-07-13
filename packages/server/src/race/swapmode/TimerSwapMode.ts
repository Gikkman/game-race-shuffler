import { FunctionUtils } from "@grs/shared";
import { SwapEventSink, SwapMode } from "./SwapMode.js";

export class TimerSwapMode implements SwapMode{
  private sink?: SwapEventSink;
  private timeout?: NodeJS.Timeout;
  private min: number;
  private max: number;

  constructor(timerConfig: string) {
    if(!timerConfig.match(/[0-9]+\|[0-9]+/)) {
      throw `Invalid TimerSwapMode config. Format must be '<min>|<max>'. Example: '3|10'. Got '${timerConfig}'`;
    }

    const [min,max] = timerConfig.split("|").map(s => parseInt(s));
    if(!min || !max) {
      throw `Invalid TimerSwapMode config. The min and max values must be integers. Example: '3|10'. Got '${min}|${max}'`;
    }
    this.min = min;
    this.max = max;
    this.setupTimeout();
  }

  bind(swapEventSink: SwapEventSink): void {
    this.sink = swapEventSink;
  }

  cleanup(): void {
    clearTimeout(this.timeout);
  }

  setupTimeout() {
    this.timeout = setTimeout(() => {
      if(this.sink) {
        this.sink("Timer Swap Event");
      }
      this.setupTimeout();
    }, generateTimeoutTime(this.min, this.max));
  }
}

function generateTimeoutTime(min: number, max: number) {
  return FunctionUtils.randomIntInRange(min, max) * 1000;
}
