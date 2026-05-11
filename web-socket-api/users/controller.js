const sequelize = require('../common/database');
const defineUser = require('../common/models/User');
const User = defineUser(sequelize);

exports.getUser = async (req, res) => {

	try {
		const user = await User.findByPk(req.user.userId);
		return res.json({ data: user });
	} catch (err) {
		return res.status(404).json({ error: 'User not found' });
	}

};

exports.getAllUsers = async (req, res) => {
	try {
		const users = await User.findAll();
		return res.json({ data: users });

	} catch (err) {
		return res.status(500).json({ error: 'Internal server error' });
	}




};