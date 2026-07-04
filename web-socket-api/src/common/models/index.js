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

sequelize.sync().then(() => process.env.NODE_ENV === 'dev' && seed());

module.exports={sequelize,User,Call,RefreshToken,CallParticipants,Op};