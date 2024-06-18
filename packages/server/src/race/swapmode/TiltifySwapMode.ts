import { Logger } from "@grs/shared";
import InternalMessages from "../../InternalMessages.js";
import { SwapEventSink, SwapMode } from "./SwapMode.js";
import { TipcSubscription } from "tipc/cjs";

const LOGGER = Logger.getLogger("TiltifySwapMode");

export class TiltifySwapMode implements SwapMode{
  private campaignId: string;
  private sink?: SwapEventSink;
  private handler: TipcSubscription;

  constructor(campaignId: string) {
    this.campaignId = campaignId;

    this.handler = InternalMessages().addListener("tiltifyWebhook", (event) => {
      if(event.campaign_id !== this.campaignId) {
        LOGGER.debug("Webhook campaignId did not match. Skipping");
        return;
      }
      if(this.sink) {
        LOGGER.debug("Webhook campaignId matched. Sending event to sink");
        const info = `${event.donor_name}: ${event.amount.value}${event.amount.currency}`;
        this.sink( info );
      }
    });
  }

  bind(swapEventSink: SwapEventSink): void {
    this.sink = swapEventSink;
  }

  cleanup(): void {
    this.handler.unsubscribe();
  }
}
