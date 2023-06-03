require('dotenv').config();

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const HumanDate = require('human-date');
const moment = require('moment');
const Helper = require('../../classes/helper');
const { connection } = require('../../utils/database');
const logger = require('../../utils/logger');

module.exports = {

	data: new SlashCommandBuilder()
		.setName('info')
		.setDescription('Displays information and statistics about the bot'),

	/**
	 * Execute the info command
	 * @param interaction
	 * @param client
	 * @param db
	 * @returns {Promise<void>}
	 */
	async execute(interaction, client, db) {

		// Defer the reply.
		await interaction.deferReply();

		const shardID = interaction.guild.shardId;
		const now = new Date();

		const promises = [
			client.cluster.fetchClientValues('guilds.cache.size'),
			client.cluster.broadcastEval(c => c.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)),
		];

		connection.getConnection(function (err, conn) {
			if (err) {
				logger.error(`[CLUSTER ${client.cluster.id}] [DATABASE] Error connecting to database: ${err.stack}`);
				interaction.editReply({ content: 'Error connecting to database. Please try again later.' });
				return;
			}

			// Build the fields for the embedded message.
			let fields = [];
			fields.push({ name: 'Version', value: process.env.VERSION, inline: true });
			fields.push({ name: 'Up since', value: HumanDate.relativeTime(client.uptime / 1000, { futureSuffix: 'ago', allUnits: true }), inline: true });
			fields.push({ name: 'Latency', value: client.ws.ping.toString() + 'ms', inline: true });
			fields.push({ name: 'Server Time', value: moment(now).format('DD-MMM-YYYY, HH:mm'), inline: true });
			fields.push({ name: 'Shard #', value: shardID.toString(), inline: true });

			let actSQL = 'SELECT COUNT(id) as cnt FROM ' + 'sprints WHERE completed = 0 AND end >= ?';
			console.log(actSQL);
			let actSprints, compSprints;
			conn.query(actSQL, function (err, result) {
				if (err) {
					logger.error(`[CLUSTER ${client.cluster.id}] [DATABASE] Error getting active sprint count: ${err.stack}`);
					interaction.editReply({ content: 'Error getting active sprint count. Please try again later.' });
					return;
				}
				actSprints = result[0].cnt;
			});
			conn.query('SELECT COUNT(id) as cnt FROM ' + 'sprints WHERE completed > 0', function (err, result) {
				if (err) {
					logger.error(`[CLUSTER ${client.cluster.id}] [DATABASE] Error getting completed sprint count: ${err.stack}`);
					interaction.editReply({ content: 'Error getting completed sprint count. Please try again later.' });
					return;
				}
				compSprints = result[0].cnt;
			});

			Promise.all(promises)
				.catch(console.error)
				.then(results => {

					let stats = [];
					stats.push(`- Total Servers: ${results[0].reduce((acc, guildCount) => acc + guildCount, 0).toLocaleString()}`);
					stats.push(`- Total Users: ${results[1].reduce((acc, memberCount) => acc + memberCount, 0).toLocaleString()}`);
					stats.push(`- Total Active Sprints: ${actSprints.toLocaleString()}`);
					stats.push(`- Total Completed Sprints: ${compSprints.toLocaleString()}`);
					fields.push({ name: 'General Statistics', value: stats.join("\n") });

					// Build embedded message with bot info.
					const embed = new EmbeddedMessage(interaction.user)
						.build({
							title: 'About the bot',
							url: process.env.SUPPORT_SERVER,
							description: 'This is a fork of CMR\'s Writer Bot, which will be shutting down soon. Countless hours have gone into the development of this bot and we will keep it online for as long as possible. For help with the bot, please visit the Support Server (link above)',
							fields: fields,
						});

					return interaction.editReply({ embeds: [embed] });

				});

		})

	}

};