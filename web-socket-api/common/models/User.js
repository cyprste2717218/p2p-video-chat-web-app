const { DataTypes } = require('sequelize');

const UserModel = {
	username: { type: DataTypes.STRING, allowNull: false },
	email: { type: DataTypes.STRING, allowNull: false, unique: true, primaryKey: true },
	password: { type: DataTypes.STRING, allowNull: false },
};

module.exports = (sequelize) => sequelize.define('user', UserModel);