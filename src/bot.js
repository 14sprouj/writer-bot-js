require('dotenv').config();

const client = require('./utils/client')
const { Collection } = require('discord.js')
const DB = require('./classes/database');
const cron = require('./tasks/main')
const logger = require('./utils/logger');
const uuid = require('uuid');
const Task = require('./classes/task');
const fs = require('node:fs');
const path = require('node:path');

// Load globals.
require('./utils/globals');

// Load all the commands onto the client object.
client.commands = new Collection();
require('./utils/commands')(client);

client.READY = false;

client.on('ready', () => {
	logger.info(`[CLUSTER ${client.cluster.id}] [LOGIN] ${client.user.tag} has logged in`);
	client.READY = true;
});

client.on('interactionCreate', async interaction => {

	// If it's not a slash command, stop.
	if (!interaction.isChatInputCommand()) {
		return;
	}

	// Get the command based on its name.
	const command = client.commands.get(interaction.commandName);
	if (!command) {
		return;
	}

	// If the client isn't ready, don't try to do anything.
	if (!client.READY) {
		return;
	}

	let uid = uuid.v4();

	// Log command usage.
	logger.info(`user ${interaction.user.id} called ${interaction.commandName} in server ${interaction.guildId}`, {
		options: interaction.options.data,
		uuid: uid
	});

	// Create database connection to use in command.
	const db = new DB();
	await db.connect();

	// Try and execute the command.
	try {

		// Execute the command.
		await command.execute(interaction, client, db);

		// Close database connection and free up pool slot.
		await db.end();
	} catch (err) {
		
		// Close database connection and free up pool slot.
		await db.end();

		logger.error(`Error running command: ${interaction.commandName}`, {
			uuid: uid,
			stack: err.stack
		})

		await interaction.followUp({
			content: 'There was an error while executing this command!\n' +
				'If it persists, please ask for help on the support server: ' + process.env.SUPPORT_SERVER + '\n' +
				'Your error code to quote is: `' + uid + '`',
			ephemeral: true
		});
	}
});


// EVENTS
let eventsPath = path.join(__dirname, 'events');
let eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js') && !file.startsWith('._'));

i = 0;
for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
	logger.debug(`Loaded event file: ${event.name}`);
	i++;
}
logger.debug(`Loaded ${i} event files`);


// Login to the API.
client.login(process.env.TOKEN).then(() => {
	// If we are on the first cluster, set up the scheduled tasks to run.
	if (client.cluster.id === 0) {
		logger.info(`[CLUSTER ${client.cluster.id}] Starting scheduled tasks`);
		(async () => {
			await Task.setup();
		})();

		// Start the main task.
		client.task = {
			last: 0,
			interval: setInterval(() => cron(client), (process.env.TASK_TIMER * 1000)),
		};
	}
});

function shutdown() {
	client.guilds.cache.get('1059244615363985458').channels.cache.get('1100219428005756998').send(`Writer Bot (${process.env.environment} (${process.env.device})) offline`);
	setTimeout(() => {
		client.destroy();
		process.exit();
	}, 1000);
}

process.on("unhandledRejection", async (reason, p) => {
	return;
});
process.on("uncaughtException", async (err, origin) => {
	return;
});
process.on("uncaughtExceptionMonitor", async (err, origin) => {
	return;
});

process.on('SIGINT', async () => {
	logger.info(`[CLUSTER ${client.cluster.id}] Received SIGINT, exiting...`);
	shutdown();
});

process.on('SIGTERM', async () => {
	logger.info(`[CLUSTER ${client.cluster.id}] Received SIGTERM, exiting...`);
	shutdown();
});

process.on('exit', async () => {
	logger.info(`[CLUSTER ${client.cluster.id}] Received exit, exiting...`);
	shutdown();
});

process.on('message', async (msg) => {
	if (msg === 'shutdown') {
		logger.info(`[CLUSTER ${client.cluster.id}] Received shutdown message, exiting...`);
		client.destroy();
		process.exit(0);
	}
});

process.on('disconnect', async () => {
	logger.info(`[CLUSTER ${client.cluster.id}] Received disconnect, exiting...`);
	client.destroy();
	process.exit(0);
});