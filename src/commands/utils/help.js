const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
require('dotenv').config();

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Help with how to use the bot and its commands'),
	execute(interaction, client) {
		let avatarURL = "https://cdn.discordapp.com/embed/avatars/0.png";
		if (client.user.avatar) {
			avatarURL = interaction.user.avatarURL();
		}
		// Build embedded message with invite link.
		const embed = new EmbedBuilder()
			.setTitle('Help')
			.setDescription('Use the above link to access the bot Wiki for help with commands')
			.setURL(process.env.SUPPORT_SERVER)
			.setColor("#567afe")
			.setFooter({
				text: `Requested by ${interaction.user.username}#${interaction.user.discriminator}`,
				iconURL: avatarURL
			});

		interaction.reply({ embeds: [embed] });
	},
};