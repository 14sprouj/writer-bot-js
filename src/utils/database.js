require('dotenv').config();

const fs = require('fs');
const mariadb = require('mysql2');

// Create pool of connections to pick from. This should make connecting a little bit faster.
const connection = mariadb.createPool({
	host: process.env.DB_HOST,
	database: process.env.DB_NAME,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	port: process.env.DB_PORT,
	connectionLimit: process.env.DB_POOL_LIMIT,
	waitForConnections: true,
	multipleStatements: true,
	ssl: {
		ca: fs.readFileSync('./src/ca-certificate.crt')
	}
});

module.exports = {
	connection
};