const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('View the full stock dashboard'),

  async execute(interaction) {
    const db = new sqlite3.Database('./data/stock.db');
    const icons = JSON.parse(fs.readFileSync('./data/icons.json'));

    db.all("SELECT item, amount FROM stock ORDER BY item ASC", [], (err, rows) => {
      if (err) return interaction.reply('Database error.');

      const embed = new EmbedBuilder()
        .setTitle('📊 Stock Dashboard')
        .setColor(0x3498db)
        .setTimestamp();

      let desc = '';

      for (const row of rows) {
        desc += `**${row.item}** — \`${row.amount}\`\n`;
      }

      embed.setDescription(desc);

      interaction.reply({ embeds: [embed] });
    });
  }
};
