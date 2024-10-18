import { Client as NotionClient } from "@notionhq/client";
import { Client as DiscordClient, GatewayIntentBits, Message, MessageReaction, TextChannel, User } from "discord.js";
import * as dotenv from "dotenv";
import { Db, type DatabaseEntry, Progress, type Rating } from "./db.js";

// Load environment variables from .env file
dotenv.config();

const notion = new NotionClient({
    auth: process.env.NOTION_TOKEN,
});

let page = await notion.pages.retrieve({ page_id: "2e8d7ec2c1fc4423b7e3ad351fa46b63" });
let databaseId = "12233626fc7481389943f2617fdc42c3";
let db = new Db(notion, databaseId);

const client = new DiscordClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
});

let channelIds = ["1192107903155454122"];
client.on("ready", async () => {
    if (!client.user) return;
    console.log(`Logged in as ${client.user.tag}!`);

    for (let channelId of channelIds) {
        const channel = client.channels.cache.get(channelId);
        if (channel && channel.isTextBased()) {
            await cacheAllMessages(channel as TextChannel);
        }
    }
    console.log("Finished caching messages.");
});

/**
 * Recursively fetch and cache all messages in the channel.
 */
async function cacheAllMessages(channel: TextChannel) {
    let lastMessageId: string | undefined;
    let batchSize = 100;
    let fetchedMessages;

    console.log(`Fetching messages for channel: ${channel.id}`);

    do {
        fetchedMessages = await channel.messages.fetch({ limit: batchSize, before: lastMessageId });

        if (fetchedMessages.size > 0) {
            lastMessageId = fetchedMessages.last()?.id;
            console.log(`Fetched ${fetchedMessages.size} messages, last message ID: ${lastMessageId}`);
        }
    } while (fetchedMessages.size === batchSize);
}

let options = [
    { name: "Plan to watch", category: "progress", emoji: "👍" },
    { name: "In progress", category: "progress", emoji: "😂" },
    { name: "Done", category: "progress", emoji: "🎉" },
    { name: "S", category: "rating", emoji: "🇸" },
    { name: "A", category: "rating", emoji: "🇦" },
    { name: "B", category: "rating", emoji: "🇧" },
    { name: "D", category: "rating", emoji: "🇩" },
    { name: "F", category: "rating", emoji: "🇫" },
];

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (!channelIds.includes(message.channelId)) return;

    try {
        let newItem: DatabaseEntry = {
            Name: message.content,
            Priority: "Low",
            Progress: "Plan to watch",
        };
        await db.addItemToDatabase(newItem);
    } catch (error) {
        console.error("Failed to add item to database:", error);
    }

    try {
        for (const opt of options) {
            await message.react(opt.emoji);
        }
    } catch (error) {
        console.error("Failed to add reactions:", error);
    }
});

let selectedProgress: Progress = "Plan to watch";

async function removeEmoji(message: Message, option: { name: string; category: string; emoji: string }, user: User) {
    let reactions = message.reactions.cache;
    reactions.forEach((reaction) => {
        if (option.emoji === reaction.emoji.name) {
            reaction.users.remove(user.id);
        }
    });
}

async function setProgress(
    option: { name: string; category: string; emoji: string },
    message: Message,
    reaction: MessageReaction,
    user: User
) {
    let reactions = message.reactions.cache;
    selectedProgress = <Progress>option.name;
    await db.updateEntryByName(message.content, { Progress: selectedProgress });

    reactions.forEach((reaction) => {
        if (option.emoji !== reaction.emoji.name) {
            let opt = options.find((opt) => opt.emoji === reaction.emoji.name);
            if (!opt || opt.category !== "progress") {
                return;
            }
            console.log("remove progress emoji");
            reaction.users.remove(user.id);
        }
    });
}

async function setRating(option: { name: string; category: string; emoji: string }, message: Message, reaction: MessageReaction, user: User) {
    let reactions = message.reactions.cache;
    await db.updateEntryByName(message.content, { Rating: <Rating>option.name });

    reactions.forEach((reaction) => {
        if (option.emoji !== reaction.emoji.name) {
            let opt = options.find((opt) => opt.emoji === reaction.emoji.name);
            if (!opt || opt.category !== "rating") {
                return;
            }
            console.log("remove rating emoji");
            reaction.users.remove(user.id);
        }
    });
}

client.on("messageReactionAdd", async (reaction, user) => {
    if (user.bot) return;

    try {
        const clickedEmoji = reaction.emoji.name;
        const option = options.find((option) => option.emoji === clickedEmoji);
        const message = await reaction.message.fetch();

        if (option && option.category === "progress") {
            await setProgress(option, message, <MessageReaction>reaction, <User>user);
        } else if (option && option.category === "rating") {
            await setRating(option, message, <MessageReaction>reaction, <User>user);
        }
    } catch (error) {
        console.error("Error fetching reactions:", error);
    }
});

client.login(process.env.DISCORD_TOKEN);
