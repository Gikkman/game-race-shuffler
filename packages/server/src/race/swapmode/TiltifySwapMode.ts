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
      const matchesCampaignId = event.campaign_id === this.campaignId;
      const acceptAnyCampaign = this.campaignId === "*";
      if( matchesCampaignId || acceptAnyCampaign ) {
        if( this.sink ) {
          LOGGER.debug("Webhook campaignId matched. Sending event to sink");
          const info = `Donation: ${event.amount.value}${event.amount.currency}`;
          this.sink( info );
        }
        else {
          LOGGER.warn("Webhook matched, but no event sink was set. Skipping");
        }
      }
      else {
        LOGGER.debug("Webhook campaignId did not match. Skipping");
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
