import {DataTypes} from 'sequelize';

const UserModel = {
	username: {type: DataTypes.STRING, allowNull: false},
	email: {
		type: DataTypes.STRING,
		allowNull: false,
		unique: true,
		primaryKey: true,
	},
	password: {type: DataTypes.STRING, allowNull: false},
};

export default function defineUser(sequelize) {
	return sequelize.define('user', UserModel, {timestamps: false});
}
