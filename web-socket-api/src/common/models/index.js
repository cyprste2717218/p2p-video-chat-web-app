const sequelize = require('../database');

const defineUser = require('./User');
const defineCall = require('./Call');
const defineRefreshToken = require('./RefreshToken');
const defineCallParticipants = require('./CallParticipants');

const User = defineUser(sequelize);
const Call = defineCall(sequelize);
const RefreshToken = defineRefreshToken(sequelize);
const CallParticipants = defineCallParticipants(sequelize);

User.belongsToMany(Call, { through: CallParticipants });
Call.belongsToMany(User, { through: CallParticipants });
User.hasOne(RefreshToken);

sequelize.sync();

module.exports = { sequelize, User, Call, RefreshToken, CallParticipants };