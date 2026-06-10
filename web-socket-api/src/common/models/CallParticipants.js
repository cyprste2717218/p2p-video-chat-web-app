const { DataTypes } = require('sequelize');

const CallParticipantsModel = {
	status: {
		type: DataTypes.TEXT,
		allowNull: false,
		defaultValue: 'pending',
		validate: {
			isIn: [['pending', 'active']]
		}
	}
};

module.exports = (sequelize) => sequelize.define('callParticipants', CallParticipantsModel);