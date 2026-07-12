import process from 'node:process';
import {Sequelize} from 'sequelize';

const sequelize = new Sequelize(
	process.env.DB_NAME,
	'root',
	process.env.DB_PASSWORD,
	{
		host: process.env.DB_HOST,
		dialect: 'mysql',
		port: process.env.DB_PORT || 3306,
		logging: true,
	},
);

export default sequelize;
