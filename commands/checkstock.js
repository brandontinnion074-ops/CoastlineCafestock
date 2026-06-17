const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkstock')
    .setDescription('Check stock for a single ingredient')
    .addStringOption(o =>
      o.setName('item')
        .setDescription('Ingredient name')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async execute(interaction) {
    const item = interaction.options.getString('item').toUpperCase();

    const db = new sqlite3.Database('./data/stock.db');
    const icons = JSON.parse(fs.readFileSync('./data/icons.json'));

    db.get("SELECT amount FROM stock WHERE item = ?", [item], (err, row) => {
      if (err) return interaction.reply('Database error.');

      const amount = row ? row.amount : 0;

      const embed = new EmbedBuilder()
        .setTitle('🔍 Stock Check')
        .setColor(0x3498db)
        .addFields(
          { name: 'Item', value: item, inline: true },
          { name: 'Amount', value: `${amount}`, inline: true }
        )
        .setTimestamp();

      if (icons[item]) embed.setThumbnail(icons[item]);

      interaction.reply({ embeds: [embed] });
    });
  }
};
