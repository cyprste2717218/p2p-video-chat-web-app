const { DataTypes } = require('sequelize');

const CallModel = {
	userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
	callId: { type: DataTypes.UUID, allowNull: false, unique: true, primaryKey: true },
	wsDetails: { type: DataTypes.JSON, allowNull: false }
};

module.exports = (sequelize) => sequelize.define('call', CallModel);