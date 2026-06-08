const { DataTypes } = require('sequelize');

const CallModel = {
	callID: { type: DataTypes.UUID, allowNull: false, unique: true, primaryKey: true },
	callURL: { type: DataTypes.STRING, allowNull: false },
	totalDurationSecs: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
	partcipants: { type: DataTypes.JSON, allowNull: false, references: { model: 'users', key: 'email' } },
	pendingParticipants: { type: DataTypes.JSON, allowNull: false, references: { model: 'users', key: 'email' } },
	activeCall: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
};

module.exports = (sequelize) => sequelize.define('call', CallModel);