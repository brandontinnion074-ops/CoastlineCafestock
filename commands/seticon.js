const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('seticon')
    .setDescription('Update the icon for an ingredient')
    .addStringOption(o =>
      o.setName('item')
        .setDescription('Ingredient name')
        .setRequired(true)
    )
    .addAttachmentOption(o =>
      o.setName('image')
        .setDescription('Upload the new icon')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const item = interaction.options.getString('item').toUpperCase();
    const image = interaction.options.getAttachment('image');

    if (!image.contentType.startsWith('image/')) {
      return interaction.reply({ content: 'File must be an image.', ephemeral: true });
    }

    const icons = JSON.parse(fs.readFileSync('./data/icons.json'));

    const filename = item.toLowerCase().replace(/ /g, '-') + '.png';
    const filepath = `./icons/${filename}`;

    const res = await fetch(image.url);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(filepath, buffer);

    icons[item] = `icons/${filename}`;
    fs.writeFileSync('./data/icons.json', JSON.stringify(icons, null, 2));

    interaction.reply(`Updated icon for **${item}**`);
  }
};
