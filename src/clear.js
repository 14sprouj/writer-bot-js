require('dotenv').config();

const { Client, GatewayIntentBits, Collection, SlashCommandBuilder, Routes } = require('discord.js');
const { logger } = require('./utils/logger.js');

const { REST } = require('@discordjs/rest');
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

console.log('Starting clear.js');

try {
	rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
	console.log('Successfully deleted all global commands.');
} catch (error) {
	console.error(error);
}

try {
	rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: [] });
	console.log('Successfully deleted all guild commands.');
} catch (error) {
	console.error(error);
}