const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addstock')
    .setDescription('Add to stock for an ingredient')
    .addStringOption(o =>
      o.setName('item')
        .setDescription('Ingredient name')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption(o =>
      o.setName('amount')
        .setDescription('Amount to add')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const item = interaction.options.getString('item').toUpperCase();
    const amount = interaction.options.getInteger('amount');

    const db = new sqlite3.Database('./data/stock.db');
    const icons = JSON.parse(fs.readFileSync('./data/icons.json'));

    db.get("SELECT amount FROM stock WHERE item = ?", [item], (err, row) => {
      if (err) return interaction.reply('Database error.');

      const current = row ? row.amount : 0;
      const newAmount = current + amount;

      db.run("UPDATE stock SET amount = ? WHERE item = ?", [newAmount, item], err2 => {
        if (err2) return interaction.reply('Database error.');

        const embed = new EmbedBuilder()
          .setTitle('📦 Stock Added')
          .setColor(0x2ecc71)
          .addFields(
            { name: 'Item', value: item, inline: true },
            { name: 'Added', value: `+${amount}`, inline: true },
            { name: 'New Total', value: `${newAmount}`, inline: true }
          )
          .setTimestamp();

        if (icons[item]) embed.setThumbnail(icons[item]);

        interaction.reply({ embeds: [embed] });
      });
    });
  }
};
