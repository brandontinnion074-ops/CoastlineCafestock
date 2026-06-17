const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const {
  Client,
  Collection,
  GatewayIntentBits,
  REST,
  Routes,
  EmbedBuilder
} = require('discord.js');
const config = require('./config');
require('dotenv').config();

// --- CLIENT ---

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();

// --- LOAD COMMANDS ---

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
  } else {
    console.warn(`[WARN] Command at ${filePath} is missing "data" or "execute".`);
  }
}

// --- DB SETUP ---

const dbPath = path.join(__dirname, 'data', 'stock.db');
const db = new sqlite3.Database(dbPath);

const itemsPath = path.join(__dirname, 'data', 'items.json');
const items = JSON.parse(fs.readFileSync(itemsPath));

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS stock (
      item TEXT PRIMARY KEY,
      amount INTEGER DEFAULT 0
    )
  `);

  const startingStock = {
    "EGGS": 200,
    "AMERICAN CHEESE": 400,
    "MILK": 400,
    "CHICKEN BREAST": 200,
    "LETTUCE": 200,
    "RAW BEEF": 200,
    "TOMATOES": 400,
    "TRUFFLE OIL": 200,
    "BURGER BUNS": 600,
    "BACON": 200,
    "ICE CUBES": 600,
    "TEA BAGS": 200,
    "LIME JUICE": 200,
    "COCOA MIX": 200,
    "VANILLA SYRUP": 200,
    "SPRINKLES": 0
  };

  const stmt = db.prepare("INSERT OR IGNORE INTO stock (item, amount) VALUES (?, ?)");
  for (const item of items) {
    const start = startingStock[item] ?? 0;
    stmt.run(item, start);
  }
  stmt.finalize();
});

// --- ICONS / LOG CHANNEL HELPERS ---

function getIcons() {
  const iconsPath = path.join(__dirname, 'data', 'icons.json');
  return JSON.parse(fs.readFileSync(iconsPath));
}

function saveIcons(icons) {
  const iconsPath = path.join(__dirname, 'data', 'icons.json');
  fs.writeFileSync(iconsPath, JSON.stringify(icons, null, 2));
}

function getLogChannel() {
  return client.channels.cache.get(config.logChannelId);
}

// --- REGISTER SLASH COMMANDS ---

const rest = new REST({ version: '10' }).setToken(config.token);

async function registerCommands() {
  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, config.guildId),
      { body: commands }
    );
    console.log('[INFO] Slash commands registered.');
  } catch (error) {
    console.error('[ERROR] Failed to register commands:', error);
  }
}

// --- READY ---

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerCommands();

  // Daily report every 24 hours
  setInterval(() => {
    db.all("SELECT item, amount FROM stock ORDER BY item ASC", [], (err, rows) => {
      if (err) {
        console.error('[ERROR] Daily report DB error:', err);
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('📅 Daily Stock Report')
        .setColor(0x9b59b6)
        .setTimestamp();

      let desc = '';
      for (const row of rows) {
        desc += `**${row.item}** — \`${row.amount}\`\n`;
      }
      embed.setDescription(desc || 'No items found.');

      const channel = getLogChannel();
      if (channel) channel.send({ embeds: [embed] });
    });
  }, 24 * 60 * 60 * 1000);
});

// --- INTERACTIONS (SLASH + AUTOCOMPLETE) ---

client.on('interactionCreate', async interaction => {
  // Autocomplete for item names
  if (interaction.isAutocomplete()) {
    const focused = interaction.options.getFocused(true);
    if (focused.name === 'item') {
      const value = focused.value.toLowerCase();
      const filtered = items
        .filter(i => i.toLowerCase().includes(value))
        .slice(0, 25);
      await interaction.respond(filtered.map(i => ({ name: i, value: i })));
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: 'There was an error executing that command.',
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: 'There was an error executing that command.',
        ephemeral: true
      });
    }
  }
});

// --- AUTO ICON DETECTION FROM MESSAGES ---

client.on('messageCreate', async msg => {
  if (!msg.attachments.size) return;
  if (!msg.content) return;

  const text = msg.content.toUpperCase();
  let icons = getIcons();

  for (const item of Object.keys(icons)) {
    if (text.includes(item)) {
      const image = msg.attachments.first();
      if (!image.contentType || !image.contentType.startsWith('image/')) return;

      const filename = item.toLowerCase().replace(/ /g, '-') + '.png';
      const filePath = path.join(__dirname, 'icons', filename);

      try {
        const res = await fetch(image.url);
        const buffer = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(filePath, buffer);

        icons[item] = `icons/${filename}`;
        saveIcons(icons);

        msg.reply(`Updated icon for **${item}** automatically.`);
      } catch (err) {
        console.error('[ERROR] Auto icon update failed:', err);
        msg.reply('Failed to update icon.');
      }
      return;
    }
  }
});

// --- LOGIN ---

client.login(config.token);
