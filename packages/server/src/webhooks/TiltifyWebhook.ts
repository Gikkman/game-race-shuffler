import * as crypto from 'node:crypto';
import { Request } from "express";
import { Logger, PathUtils } from '@grs/shared';
import * as Server from '../Server.js';
import { getConfig } from '../ServerConfig.js';
import InternalMessages from '../InternalMessages.js';
import Datastore from 'nedb-promises';

type TiltifyEvent = {
  data: {
    amount: {
      currency: string;
      value: string;
    };
    campaign_id: string;
    completed_at: string;
    created_at: string;
    donor_comment: string;
    donor_name: string;
    fundraising_event_id: string | null;
    id: string;
    legacy_id: number;
    poll_id: string | null;
    poll_option_id: string | null;
    reward_id: string | null;
    sustained: boolean;
    target_id: string | null;
    team_event_id: string | null;
  };
  meta: {
    attempted_at: string;
    event_type: string;
    generated_at: string;
    id: string;
    subscription_source_id: string;
    subscription_source_type: string;
  };
};

const seenIdsAndTtl = new Map<string, number>();

const LOGGER = Logger.getLogger("TiltifyWebhook");
let tiltifyWebhookId: string;
let tiltifyWebhookSecret: string;
let tiltifyEvents: Datastore<Partial<TiltifyEvent>>;
let initialized = false;

export function init() {
  if(initialized) {
    return;
  }
  initialized = true;

  if(!getConfig().tiltify.enabled) {
    return;
  }

  tiltifyWebhookSecret = getConfig().tiltify.webhookSecret;
  tiltifyWebhookId = getConfig().tiltify.webhookId;

  Server.bindPost("/webhook/tiltify", (req, res) => {
    const ok = handleWebhook(req);
    if(ok) {
      res.send("OK");
      LOGGER.debug("Tiltify webhook handled OK");
    }
    else {
      res.status(400).send("BAD REQUEST");
    }
  });

  const tiltifyEventLog = PathUtils.pathRelativeToWorkspaceRoot("tiltify-events.db");
  tiltifyEvents = Datastore.create({filename: tiltifyEventLog});

  InternalMessages().addListener("cleanupCron", () => cleanupOldWebhookEventIds());
}

function handleWebhook(req: Request) {
  const userAgent = req.headers['user-agent'] as string;
  if(userAgent !== "Tiltify Outgoing Webhook") {
    LOGGER.warn("Invalid header %s", userAgent);
    return false;
  }

  const timestamp = req.headers['x-tiltify-timestamp'] as string;
  const signature = req.headers['x-tiltify-signature'] as string;
  const endpoint  = req.headers['x-tiltify-endpoint'] as string;
  const rawBody = (("rawBody" in req) ? req.rawBody : "") as string;

  if(endpoint !== tiltifyWebhookId) {
    LOGGER.warn("Unknown endpoint called: %s Expected: %s", endpoint, tiltifyWebhookId);
    return false;
  }

  const timestampDelta = Date.now() - Date.parse(timestamp);
  if(timestampDelta < 0 || timestampDelta > 60_000) {
    LOGGER.warn("Timestamp outdated: %s", timestamp);
    return false;
  }

  const calculatedSignature = calculateSignature(tiltifyWebhookSecret, timestamp, rawBody);
  if(signature !== calculatedSignature) {
    LOGGER.warn("Calculated signature didn't match. Expected %s but got %s", signature, calculatedSignature);
    return false;
  }

  const body = req.body as TiltifyEvent;
  if(seenIdsAndTtl.has(body.meta.id)) {
    LOGGER.info("Duplicate webhook event ID detected. Skipping");
    return true;
  }

  if(!body.meta.event_type || !body.meta.event_type.includes("donation")) {
    LOGGER.info("Unsupported webhook event type: %s. Skipping", body.meta.event_type);
    return true;
  }

  // Keep event IDs for 5 minutes at least
  seenIdsAndTtl.set(body.meta.id, Date.now() + (5 * 60 * 1000));

  try {
    InternalMessages().send("tiltifyWebhook", {
      amount: {
        currency: body.data.amount.currency,
        value: parseFloat(body.data.amount.value)
      },
      campaign_id: body.data.campaign_id,
      donor_name: body.data.donor_name,
      id: body.meta.id
    });
    tiltifyEvents.insert(body);
  }
  catch(ex: unknown) {
    LOGGER.error(ex as Error);
  }
  return true;
}

/**
 * Verifies a Tiltify Webhook Signature is valid
 */
function calculateSignature(secret: string, timestamp: string, body: string) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${timestamp}.${body}`);
  return hmac.digest('base64');
}

function cleanupOldWebhookEventIds() {
  LOGGER.debug("Cleaning out old webhook events");
  const now = Date.now();
  let cleanupCounter = 0;
  for(const [id, ttl] of seenIdsAndTtl.entries()) {
    if(now >= ttl) {
      seenIdsAndTtl.delete(id);
      cleanupCounter++;
    }
  }
  LOGGER.debug("Cleaned out %s old webhook events", cleanupCounter);
}
