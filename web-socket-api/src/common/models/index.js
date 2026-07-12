import process from 'node:process';
import bcrypt from 'bcryptjs';
import sequelize from '../database.js';
import defineUser from './user.js';
import defineCall from './call.js';
import defineRefreshToken from './refresh-token.js';
import defineCallParticipants from './call-participants.js';

const User = defineUser(sequelize);
const Call = defineCall(sequelize);
const RefreshToken = defineRefreshToken(sequelize);
const CallParticipants = defineCallParticipants(sequelize);

User.belongsToMany(Call, {through: CallParticipants});
Call.belongsToMany(User, {through: CallParticipants});
User.hasOne(RefreshToken, {
	foreignKey: {
		allowNull: false,
	},
});
RefreshToken.belongsTo(User);

const seedUsers = [
	{
		username: 'john2739',
		email: 'john.smith@gmail.com',
		password: 'ExamplePassword123',
	},
	{
		username: 'sam8282',
		email: 'sam.clarence@gmail.com',
		password: 'ExamplePassword456',
	},
];

async function seed() {
	await Promise.all(
		seedUsers.map(async (seedUser) => {
			const hashed = await bcrypt.hash(seedUser.password, 10);
			await User.findOrCreate({
				where: {email: seedUser.email},
				defaults: {username: seedUser.username, password: hashed},
			});
		}),
	);
}

async function syncWithRetry(retries = 5, delay = 3000) {
	try {
		await sequelize.sync();
		if (process.env.NODE_ENV === 'dev') {
			await seed();
		}
	} catch (error) {
		if (retries <= 1) {
			throw new Error('Could not connect to database after retries', {
				cause: error,
			});
		}

		await new Promise((resolve) => {
			setTimeout(resolve, delay);
		});
		await syncWithRetry(retries - 1, delay);
	}
}

try {
	await syncWithRetry();
} catch (error) {
	console.error('Database connection failed:', error.message);
	throw error;
}

export {User, Call, RefreshToken, CallParticipants};

export {Op} from 'sequelize';
export {default as sequelize} from '../database.js';
