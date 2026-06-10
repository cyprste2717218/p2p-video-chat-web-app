const { DataTypes } = require('sequelize');

const CallModel = {
	callID: { type: DataTypes.UUID, allowNull: false, unique: true, primaryKey: true },
	callURL: { type: DataTypes.STRING, allowNull: false },
	totalDurationSecs: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
	activeCall: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
	startedAt: { type: DataTypes.DATE, allowNull: true },
	finishedAt: { type: DataTypes.DATE, allowNull: true }
};

module.exports = (sequelize) => sequelize.define('call', CallModel, { timestamps: false });