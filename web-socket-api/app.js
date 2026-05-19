const cors = require('cors');
const sequelize = require('./common/database');


const defineUser = require('./common/models/User');
const User = defineUser(sequelize);

const defineCall = require('./common/models/Call');
const Call = defineCall(sequelize);

User.hasMany(Call, { foreignKey: 'userId', as: 'calls' });
Call.belongsTo(User, { foreignKey: 'userId', as: 'user' });

const express = require('express');
const app = express();

app.use(cors({
	origin: '*',
	methods: ['GET', 'POST', 'PUT', 'DELETE'],
	allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

sequelize.sync();

const authRoutes = require('./authorization/routes');
app.use('/', authRoutes);

const userRoutes = require('./users/routes');
app.use('/user', userRoutes);

const callRoutes = require('./call/routes');
app.use('/call', callRoutes);


const PORT = process.env.PORT || 3000;
const HOST = "192.168.0.60";

app.listen(PORT, HOST, () => {
	console.log(`Server running on http://${HOST}:${PORT}`);
});