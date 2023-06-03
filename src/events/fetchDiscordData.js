require('dotenv').config();

const logger = require('../utils/logger');
const { connection } = require('../utils/database.js');
const { log } = require('winston');

//const { setTimeout } = require("timers/promises");

module.exports = {
	name: 'ready',
	once: true,
	execute(client) {
		if (process.env.environment === 'production') {
			client.user.setStatus('online');
		} else if (process.env.environment === 'development') {
			client.user.setStatus('dnd');
		} else {
			client.user.setStatus('idle');
		}
		logger.info('Bot connected!');

		try {
			const msg = client.guilds.cache.get('1059244615363985458').channels.cache.get('1100219428005756998').send(`Writer Bot (${process.env.environment} (${process.env.device})) online`);
		} catch (error) {
			logger.error(error);
		}

		const un = client.user.username;
		if (un != 'Writer Bot') {
			logger.info('Updating bot username');
			client.user.setUsername('Writer Bot');
		}

		connection.getConnection((err, conn) => {
			if (err) {
				logger.error(err);
				return;
			}
			connection.query(`SELECT * FROM Bots WHERE discordUserID = ${client.user.id}`, (err, result) => {
				const createdDate = client.user.createdAt.toISOString().slice(0, 19).replace('T', ' ');
				if (err) {
					logger.error(err);
				}
				if (result.length == 0) {
					const sql = `INSERT INTO Bots (BotName, discordUserID, DateCreated) VALUES ('${client.user.username}', '${client.user.id}', '${createdDate}')`;
					connection.query(sql, (err) => {
						if (err) {
							logger.error(err);
						}
					});
				} else if (result.length == 1) {
					if (result[0].BotName != client.user.username) {
						const sql = `UPDATE Bots SET BotName = '${client.user.username}' WHERE discordUserID = ${client.user.id}`;
						connection.query(sql, (err) => {
							if (err) {
								logger.error(err);
							}
						});
					}
				}
			});
			conn.release();
		});

		function fetchUser() {
			console.log("Fetch Users");
			connection.getConnection(function (error) {
				if (error) {
					logger.error(error);
					return;
				}

				client.guilds.fetch().then(() => {
					client.guilds.cache.forEach(guild => {
						guild.members.fetch().then(() => {
							guild.members.cache.forEach(member => {
								const userSince = new Date(member.user.createdAt).toISOString().slice(0, 19).replace('T', ' ');
								logger.info('[' + guild.name + '] Checking user: ' + member.user.tag + '');

								// Check users table
								const sql = `SELECT * FROM users WHERE discordUserID = '${member.user.id}'`;
								connection.query(sql, function (error, result) {
									if (error) {
										logger.error(error);
									}

									if (result.length === 0) {
										logger.info('[' + guild.name + '] Adding user: ' + member.user.tag + '');
										const sql = `INSERT INTO users (discordUserID, discordUsername, discordDiscriminator, discordTag, UserSince) VALUES ('${member.user.id}', '${member.user.username}', '${member.user.discriminator}', '${member.user.tag}', '${userSince}')`;
										connection.query(sql, function (error) {
											if (error) {
												logger.error(error);
											}


										});
									} else if (result.length === 1) {
										// TODO Update user
									} else {
										logger.error('[' + guild.name + '] Multiple users found for: ' + member.user.tag + '');
									}
								});
							});
						});
					});
				});
			});
		}

		function fetchChannel() {
			console.log("Fetch Channels");
			connection.getConnection(function (err) {
				if (err) {
					logger.error(err);
					return;
				}

				client.guilds.fetch().then(() => {
					client.guilds.cache.forEach(guild => {
						const createDate = new Date(guild.createdAt).toISOString().slice(0, 19).replace('T', ' ');

						connection.query(`SELECT * FROM guilds WHERE discordGuildID = '${guild.id}'`, function (error, result) {
							if (error) {
								logger.error(error);
							}

							if (result.length === 0) {
								// get date bot joined
								logger.info('[' + guild.name + '] Adding guild: ' + guild.name + '');
								const sql = `INSERT INTO guilds (discordGuildID, GuildName, DateCreated, GuildOwner) VALUES ('${guild.id}', "${guild.name}", '${createDate}', '${guild.ownerId}')`;
								connection.query(sql, function (error) {
									if (error) {
										logger.error(error);
									}
								});
							} else if (result.length === 1) {
								// TODO Update guild
							}
						});

						guild.channels.fetch().then(() => {
							guild.channels.cache.forEach(channel => {
								if (channel.type === 11 || channel.type === 12 || channel.type === 3 || channel.type === 1) return;
								logger.info('[' + guild.name + '] Checking channel: ' + channel.name + '');

								const sql = `SELECT * FROM channels WHERE discordChannelID = '${channel.id}' AND Guild = '${guild.id}'`;
								connection.query(sql, function (error, result) {
									if (error) {
										logger.error(error);
									}
									if (result.length === 0 && channel.type != 11) {
										logger.info('[' + guild.name + '] Adding channel: ' + channel.name + '');
										let nsfw = 0;
										if (channel.nsfw === true) {
											nsfw = 1;
										} else {
											nsfw = 0;
										}

										if (channel.parentId == null) {
											channel.parentId = 0;
										}

										if (channel.rateLimitPerUser == null || channel.rateLimitPerUser == 'undefined') {
											channel.rateLimitPerUser = 0;
										}

										if (channel.topic == null || channel.topic == 'undefined') {
											channel.topic = "NULL";
										}

										const sql2 = `INSERT INTO channels (discordChannelID, Guild, ChannelName, ChannelType, Topic, Category, Position, RateLimit) VALUES ('${channel.id}', '${guild.id}', "${channel.name}", '${channel.type}', "` + String(channel.topic) + `", '${channel.parentId}', '${channel.position}', '${channel.rateLimitPerUser}')`;
										connection.query(sql2, function (error) {
											if (error) {
												logger.error(error);
											}
										});
										logger.debug(sql2);
									} else if (result.length === 1) {
										if (channel.name != result[0].ChannelName || channel.type != result[0].ChannelType || channel.parentId != result[0].Category || channel.position != result[0].Position || (channel.rateLimitPerUser != result[0].RateLimit && channel.rateLimitPerUser != null && channel.rateLimitPerUser != 'undefined') || channel.topic != result[0].Topic) {
											let sql3 = `UPDATE channels SET `;
											if (channel.name != result[0].ChannelName) {
												sql3 += `ChannelName = "${channel.name}", `;
											}
											if (channel.type != result[0].ChannelType) {
												sql3 += `ChannelType = '${channel.type}', `;
											}
											if (channel.parentId != result[0].Category) {
												if (channel.parentId == null) {
													channel.parentId = 0;
												}
												sql3 += `Category = '${channel.parentId}', `;
											}
											if (channel.position != result[0].Position) {
												sql3 += `Position = '${channel.position}', `;
											}
											if (channel.rateLimitPerUser != result[0].RateLimit && channel.rateLimitPerUser != null && channel.rateLimitPerUser != 'undefined') {
												sql3 += `RateLimit = '${channel.rateLimitPerUser}', `;
											}
											if (channel.topic != result[0].Topic) {
												sql3 += `Topic = "` + String(channel.topic) + `", `;
											}


											sql3 = sql3.slice(0, -2) + ` WHERE discordChannelID = '${channel.id}' AND Guild = '${guild.id}'`;
											connection.query(sql3, function (error) {
												if (error) {
													logger.error(error);
												}
											});
										}
									} else if (result.length > 1) {
										logger.error('[' + guild.name + '] Duplicate channel: ' + channel.name + '');
									}
								});
							});
						});
					});
				});
			});
		}

		function fetchRole() {
			console.log("Fetch Roles");
			connection.getConnection(function (err) {
				if (err) {
					logger.error(err);
					return;
				}

				client.guilds.fetch().then(() => {
					client.guilds.cache.forEach(guild => {
						guild.roles.fetch().then(() => {
							guild.roles.cache.forEach(role => {
								logger.info('[' + guild.name + '] Checking role: ' + role.name + '');

								const sql = `SELECT * FROM roles WHERE discordRoleID = '${role.id}' AND Guild = '${guild.id}'`;
								connection.query(sql, function (error, result) {
									if (error) {
										logger.error(error);
									}

									if (result.length === 0) {
										logger.info('[' + guild.name + '] Adding role: ' + role.name + '');
										let h;
										if (role.hoist === false) { h = 0 }
										else { h = 1 }
										let m;
										if (role.mentionable === false) { m = 0 }
										else { m = 1 }

										const sql = `INSERT INTO roles (discordRoleID, Guild, RoleName, Color, Position, Hoist, Mentionable) VALUES ('${role.id}', '${guild.id}', '${role.name}', '${role.color}', '${role.position}', '${h}', '${m}')`;
										connection.query(sql, function (error) {
											if (error) {
												logger.error(error);
											}
										});
									} else if (result.length === 1) {
										if (result[0].RoleName != role.name || result[0].Color != role.color || result[0].Position != role.position || (result[0].Hoist === 0 && role.hoist === true) || (result[0].Hoist === 1 && role.hoist === false)) {
											let sqlC = "UPDATE roles SET ";
											logger.info('[' + guild.name + '] Updating role: ' + role.name + '');
											if (result[0].RoleName != role.name) {
												logger.info('Updating role name: ' + role.name + '');
												sqlC = sqlC + `RoleName = '${role.name}', `;
											}
											if (result[0].Color != role.color) {
												logger.info('Updating role color: ' + role.name + '');
												sqlC = sqlC + `Color = '${role.color}', `;
											}
											if (result[0].Position != role.position) {
												logger.info('Updating role position: ' + role.name + '');
												sqlC = sqlC + `Position = '${role.position}', `;
											}
											if ((result[0].Hoist === 0 && role.hoist === true) || (result[0].Hoist === 1 && role.hoist === false)) {
												logger.info('Updating role hoist: ' + role.name + '');
												let v;
												if (role.hoist === false) { v = 0 }
												else { v = 1 }
												sqlC = sqlC + `Hoist = '${v}', `;
											}
											if ((result[0].Mentionable === 0 && role.mentionable === true) || (result[0].Mentionable === 1 && role.mentionable === false)) {
												logger.info('Updating role mentionable: ' + role.name + '');
												let v;
												if (role.mentionable === false) { v = 0 }
												else { v = 1 }
												sqlC = sqlC + `Mentionable = '${v}', `;
											}

											sqlC = sqlC.slice(0, -2) + ` WHERE discordRoleID = '${role.id}' AND Guild = '${guild.id}';`;
											connection.query(sqlC, function (error) {
												if (error) {
													logger.error(error);
												}
											});
										}
									} else {
										logger.error('[' + guild.name + '] Multiple roles found for: ' + role.name + ' (' + role.id + ') in Guild: ' + guild.name + ' (' + guild.id + ')');
									}
								});
							});
						});
					});
				});
			});
		}

		async function getDiscordData() {
			const [userResult, channelResult, roleResult] = await Promise.allSettled([
				fetchUser(),
				fetchChannel(),
				fetchRole()
			])

			if (userResult.status === 'rejected') {
				logger.error("Error fetching users");
				logger.error(userResult.reason);
			} else {
				setTimeout(fetchUser, 1000 * 60 * 60 * 2);
			}

			if (channelResult.status === 'rejected') {
				logger.error(channelResult.reason);
			} else {
				setTimeout(fetchChannel, 1000 * 60 * 60 * 2);
			}

			if (roleResult.status === 'rejected') {
				logger.error(roleResult.reason);
			} else {
				setTimeout(fetchRole, 1000 * 60 * 60 * 2);
			}
		}

		getDiscordData();
	},
};