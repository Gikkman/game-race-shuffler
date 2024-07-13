import { SwapModeConfig } from "@grs/shared";
import { ManualSwapMode } from "./ManualSwapMode.js";
import { TiltifySwapMode } from "./TiltifySwapMode.js";
import { TimerSwapMode } from "./TimerSwapMode.js";

export default function createSwapMode(config: SwapModeConfig) {
  switch(config.swapMode) {
  case "manual": return new ManualSwapMode();
  case "tiltify": return new TiltifySwapMode(config.swapModeExtraData);
  case "timer": return new TimerSwapMode(config.swapModeExtraData);
  default: throw new Error("Unknown swap mode " + config.swapMode);
  }
}
