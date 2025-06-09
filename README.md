# game-race-shuffler

## Server Config
Server default config can be found in `server-config.base.json`.

If anything should be overwritten when running the server, create a file named `server-config.override.json` and override the values you wish to overwrite. This file will not be tracked by Git, so any secrets should be added to this file and not the config file containing defaults.

### Tiltify Config
When creating a Webhook from Tiltify, the config values goes under the `.tiltify` node.
* **enabled** - Controls whether Tiltify integration is enabled or not
* **webhookId** - The webhook to accept events from. It's the last UUID from the URL of the Webhook edit view. For example, if the URL is: `https://app.tiltify.com/developers/57ba4e70-8d28-4727-b9fa-47990ead05d2/webhooks/460748a6-9fc4-49d0-a681-585911d7d2ad/setup` it would map to `460748a6-9fc4-49d0-a681-585911d7d2ad`
* **webhookSecret** - This is what Tiltify calls "Webhook Signing ID" in their edit view
