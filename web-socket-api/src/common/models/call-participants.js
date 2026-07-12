import {DataTypes} from 'sequelize';

const CallParticipantsModel = {
	status: {
		type: DataTypes.TEXT,
		allowNull: false,
		defaultValue: 'pending',
		validate: {
			isIn: [['pending', 'active']],
		},
	},
};

export default function defineCallParticipants(sequelize) {
	return sequelize.define('callParticipants', CallParticipantsModel, {
		timestamps: false,
	});
}
