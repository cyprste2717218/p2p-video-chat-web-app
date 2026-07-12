import {DataTypes} from 'sequelize';

const RefreshTokenModel = {
	tokenHash: {type: DataTypes.STRING, allowNull: false, unique: true},
	jti: {type: DataTypes.STRING, allowNull: false},
	expiresAt: {type: DataTypes.DATE, allowNull: false},
	revokedAt: {type: DataTypes.DATE},
	replacedBy: {type: DataTypes.STRING},
	createdAt: {type: DataTypes.DATE, defaultValue: DataTypes.NOW},
	ip: {type: DataTypes.STRING},
	userAgent: {type: DataTypes.STRING},
};

const modelIndexes = {
	indexes: [
		{
			fields: ['jti'],
		},
		{
			fields: ['expiresAt'],
		},
	],
};

export default function defineRefreshToken(sequelize) {
	return sequelize.define(
		'refreshToken',
		RefreshTokenModel,
		{timestamps: false},
		modelIndexes,
	);
}
