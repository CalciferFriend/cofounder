import { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { createHH } from "@his-and-hers/sdk";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const hh = createHH();

// Register slash commands
const commands = [
  new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask your H2 peer a question")
    .addStringOption((option) =>
      option.setName("question").setDescription("Your question").setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("render")
    .setDescription("Generate an image or render a scene")
    .addStringOption((option) =>
      option.setName("prompt").setDescription("Render prompt").setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("summarize")
    .setDescription("Summarize a URL or document")
    .addStringOption((option) =>
      option.setName("url").setDescription("URL to summarize").setRequired(true)
    ),
];

client.once("ready", async () => {
  console.log(`Bot ready as ${client.user.tag}`);

  // Register commands globally (or per-guild for testing)
  await client.application.commands.set(commands);
  console.log("Slash commands registered");
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options } = interaction;

  // Defer reply immediately (we'll edit it later)
  await interaction.deferReply();

  let task = "";
  switch (commandName) {
    case "ask":
      task = options.getString("question");
      break;
    case "render":
      task = `Generate an image: ${options.getString("prompt")}`;
      break;
    case "summarize":
      task = `Summarize this URL: ${options.getString("url")}`;
      break;
    default:
      await interaction.editReply("Unknown command");
      return;
  }

  // Create progress embed
  const embed = new EmbedBuilder()
    .setTitle(`⏳ ${commandName}`)
    .setDescription(`\`\`\`\n${task}\n\`\`\``)
    .setColor(0xf97316) // orange
    .addFields({ name: "Status", value: "Sending to H2 peer..." });

  await interaction.editReply({ embeds: [embed] });

  let chunks = "";
  try {
    const result = await hh.send(task, {
      wait: true,
      timeoutMs: 5 * 60 * 1000, // 5 min
      onChunk: (chunk) => {
        chunks += chunk;
        // Update embed every 2 seconds to avoid rate limits
        embed.setFields(
          { name: "Status", value: "⚙️ Working..." },
          { name: "Preview", value: chunks.slice(-200) + "..." } // last 200 chars
        );
        interaction.editReply({ embeds: [embed] }).catch(() => {});
      },
    });

    // Final result
    embed
      .setColor(result.success ? 0x10b981 : 0xef4444) // green or red
      .setFields(
        { name: "Status", value: result.success ? "✅ Complete" : "❌ Failed" },
        { name: "Output", value: result.output?.slice(0, 1000) ?? "No output" },
        {
          name: "Stats",
          value: `${result.durationMs}ms · ${result.tokensUsed ?? 0} tokens · $${result.costUsd?.toFixed(4) ?? "0.00"}`,
        }
      );

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    embed
      .setColor(0xef4444)
      .setFields({ name: "Status", value: "❌ Error" }, { name: "Error", value: err.message });
    await interaction.editReply({ embeds: [embed] });
  }
});

client.login(process.env.DISCORD_TOKEN);
