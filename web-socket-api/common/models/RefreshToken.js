const { DataTypes } = require('sequelize');

const RefreshTokenModel = {
	linkedUser: { type: DataTypes.STRING, allowNull: false, references: { model: 'users', key: 'email' } },
	tokenHash: { type: DataTypes.STRING, allowNull: false, unique: true },
	jti: { type: DataTypes.STRING, allowNull: false },
	expiresAt: { type: DataTypes.DATE, allowNull: false },
	revokedAt: { type: DataTypes.DATE },
	replacedBy: { type: DataTypes.STRING },
	createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
	ip: { type: DataTypes.STRING },
	userAgent: { type: DataTypes.STRING }
}

const modelIndexes = {
	indexes: [
		{
			fields: ['jti'],
		},
		{
			fields: ['expiresAt'],
		}
	]
}

module.exports = (sequelize) => sequelize.define('refreshToken', RefreshTokenModel, modelIndexes);