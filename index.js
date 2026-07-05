require('dotenv').config();

const { Client, Events, GatewayIntentBits, WebhookClient } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const token = process.env.DISCORD_TOKEN;
const webhookUrl = process.env.WEBHOOK_URL;

// Comma-separated ID lists, e.g. WHITELISTED_CHANNEL_IDS=123,456
const parseIdList = (value) =>
    (value ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);

const whitelistedChannels = parseIdList(process.env.WHITELISTED_CHANNEL_IDS);
const ignoredRoles = parseIdList(process.env.IGNORED_ROLE_IDS);

// WEBHOOK_URL is optional; without it, deletions are simply not logged.
const webhook = webhookUrl ? new WebhookClient({ url: webhookUrl }) : null;

const isWhitelistedChannel = (channelId) => whitelistedChannels.includes(channelId);

// member is null for system/webhook messages, so default to "no ignored role"
const hasIgnoredRole = (member) =>
    member?.roles.cache.some((role) => ignoredRoles.includes(role.id)) ?? false;

const sendLogToWebhook = async (content) => {
    if (!webhook) return;
    await webhook.send(content);
};

const linkPattern = /https?:\/\/\S+/i;

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}. Watching for links.`);
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.inGuild()) return;
    if (!linkPattern.test(message.content)) return;
    if (isWhitelistedChannel(message.channel.id) || hasIgnoredRole(message.member)) return;

    try {
        await message.delete();
        await sendLogToWebhook(
            `Deleted message from ${message.author.tag} in #${message.channel.name} containing a link.`,
        );
    } catch (error) {
        console.error('Failed to delete message or send log:', error);
    }
});

client.login(token);
