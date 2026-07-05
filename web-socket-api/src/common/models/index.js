const {DataTypes,Op}=require('sequelize');
const bcrypt=require('bcryptjs');
const sequelize=require('../database');


const defineUser=require('./User');
const defineCall=require('./Call');
const defineRefreshToken=require('./RefreshToken');
const defineCallParticipants=require('./CallParticipants');

const User=defineUser(sequelize);
const Call=defineCall(sequelize);
const RefreshToken=defineRefreshToken(sequelize);
const CallParticipants=defineCallParticipants(sequelize);

User.belongsToMany(Call,{through: CallParticipants});
Call.belongsToMany(User,{through: CallParticipants});
User.hasOne(RefreshToken,{
	foreignKey: {
		allowNull: false,
	},
});
RefreshToken.belongsTo(User);

const seedUsers=[
	{username: 'john2739',email: 'john.smith@gmail.com',password: 'ExamplePassword123'},
	{username: 'sam8282',email: 'sam.clarence@gmail.com',password: 'ExamplePassword456'},
];

async function seed() {
	for (const u of seedUsers) {
		const hashed=await bcrypt.hash(u.password,10);
		await User.findOrCreate({where: {email: u.email},defaults: {username: u.username,password: hashed}});
	}
}

async function syncWithRetry(retries = 5, delay = 3000) {
	for (let i = 0; i < retries; i++) {
		try {
			await sequelize.sync();
			if (process.env.NODE_ENV === 'dev') await seed();
			return;
		} catch {
			if (i < retries - 1) await new Promise(r => setTimeout(r, delay));
			else throw new Error('Could not connect to database after retries');
		}
	}
}

syncWithRetry().catch(err => {
	console.error('Database connection failed:', err.message);
	process.exit(1);
});

module.exports={sequelize,User,Call,RefreshToken,CallParticipants,Op};