const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dailyreport')
    .setDescription('Post a daily stock report')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const db = new sqlite3.Database('./data/stock.db');

    db.all("SELECT item, amount FROM stock ORDER BY item ASC", [], (err, rows) => {
      if (err) return interaction.reply('Database error.');

      const embed = new EmbedBuilder()
        .setTitle('📅 Daily Stock Report')
        .setColor(0x9b59b6)
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
