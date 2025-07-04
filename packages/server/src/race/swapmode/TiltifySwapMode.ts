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
          const info = `Donation: ${event.amount.value} ${event.amount.currency}`;
          // One swap for 1€, then an extra swap every 2€, to a max of 20 swaps
          // Floor(donation amount), to remove cents
          // Ceil(amount/2), to get (1 or 2 = 1), (3 or 4 = 2), (5 or 6 = 3) and so on
          // Min(sum,50), to get at most 50 swaps
          const count = Math.min(Math.ceil(Math.floor(event.amount.value) / 2), 50);
          const events = new Array<string>();
          for(let i = 1; i <= count; i++) {
            events.push(info + ` (${i}/${count})`);
          }
          this.sink(events);
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
