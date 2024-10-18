import {Client as NotionClient} from "npm:@notionhq/client"
import { Client as DiscordClient, GatewayIntentBits, Message, TextChannel } from 'npm:discord.js';
import "jsr:@std/dotenv/load";
import { Db, type DatabaseEntry } from "./db.ts";
const notion = new NotionClient({
    auth: Deno.env.get("NOTION_TOKEN"),
})


let page = await notion.pages.retrieve({page_id: '2e8d7ec2c1fc4423b7e3ad351fa46b63'})
//@ts-ignore
// console.dir(await notion.databases.retrieve({database_id: "12233626fc7481389943f2617fdc42c3"}), {depth: null});
let databaseId = '12233626fc7481389943f2617fdc42c3'
let db = new Db(notion, databaseId);

// const newItem: DatabaseEntry = {
//     Name: 'One Pace',
//     Priority: 'Low',
//     Progress: 'Plan to watch',
// };
// await db.addItemToDatabase(databaseId, newItem);
// await db.updateEntryByName('One Piece', { Progress: 'Done' });
const client = new DiscordClient({ intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ] });


let channelIds = ['1192107903155454122'];
client.on('ready', async () => {
    if (!client.user) return;
    console.log(`Logged in as ${client.user.tag}!`);

   // Add more IDs as needed

    for (let channelId of channelIds) {
        const channel = client.channels.cache.get(channelId);
        if (channel && channel.isTextBased()) {
            await cacheAllMessages(channel as TextChannel);
        }
    }
    console.log('Finished caching messages.');
});



/**
 * Recursively fetch and cache all messages in the channel.
 * @param channel The TextChannel to fetch messages from
 */
async function cacheAllMessages(channel: TextChannel) {
    let lastMessageId: string | undefined;
    let batchSize = 100;
    let fetchedMessages;

    console.log(`Fetching messages for channel: ${channel.id}`);

    do {
        // Fetch the next batch of messages, using the last message ID to paginate
        fetchedMessages = await channel.messages.fetch({ limit: batchSize, before: lastMessageId });

        if (fetchedMessages.size > 0) {
            // Set the last message ID to the ID of the last message in this batch
            lastMessageId = fetchedMessages.last()?.id;
            console.log(`Fetched ${fetchedMessages.size} messages, last message ID: ${lastMessageId}`);
        }

    } while (fetchedMessages.size === batchSize); // Continue until less than 100 messages are fetched
}
let options = [
    {
        name: "plan-to-watch",
        category: "progress",
        emoji: "👍",
    },
    {
        name: "watching",
        category: "progress",
        emoji: "😂",
    },
    {
        name: "done",
        category: "progress",
        emoji: "🎉",
    },
    {
        name: "s",
        category: "rating",
        emoji: "🇸",//F emoji
    },
    {
        name: "a",
        category: "rating",
        emoji: "🇦",//E emoji
    },
    {
        name: "b",
        category: "rating",
        emoji: "🇧",//D emoji
    },
    {
        name: "d",
        category: "rating",
        emoji: "🇩",//C emoji
    },
    {
        name: "f",
        category: "rating",
        emoji: "🇫",//B emoji
    }

]
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (!channelIds.includes(message.channelId)) return;
    try {
        // Add each reaction to the message
        for (const opt of options) {
            await message.react(opt.emoji);
        }
    } catch (error) {
        console.error('Failed to add reactions:', error);
    }
})

async function setProgress(option: { name: string, category: string, emoji: string }, message: Message) {

}
async function setRating(option: { name: string, category: string, emoji: string }, message: Message) {

}
client.on('messageReactionAdd',async (reaction, user) => {
    if (user.bot) return;
    try {
        let clickedEmoji = reaction.emoji.name;
        let option = options.find(option => option.emoji === clickedEmoji);
        const message = await reaction.message.fetch();
        if (option && option.category === "progress") {
            await setProgress(option, message);
        }else if (option && option.category === "rating") {
            await setRating(option, message);
        }

        // Get all reactions on this message
        const reactions = message.reactions.cache;

        // Log the reactions on the message
        reactions.forEach(reaction => {
            console.log(`Emoji: ${reaction.emoji.name}, Count: ${reaction.count}, User: ${reaction.users.cache.first()?.tag}`);
        });
        // await reaction.users.remove(user.id);
        console.log(`${user.tag} added reaction: ${reaction.emoji.name} to message: ${message.id}`);
    } catch (error) {
        console.error('Error fetching reactions:', error);
    }
})
client.login(Deno.env.get("DISCORD_TOKEN"));

