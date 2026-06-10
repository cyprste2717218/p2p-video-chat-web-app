const { DataTypes } = require('sequelize');

const CallParticipantsModel = {
	callID: {
		type: DataTypes.UUID, references: {
			model: 'calls',
			key: 'callID'
		}
	},
	email: {
		type: DataTypes.STRING, references: {
			model: 'users',
			key: 'email'
		}
	},
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