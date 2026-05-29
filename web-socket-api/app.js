const cors = require('cors');
const sequelize = require('./common/database');


const defineUser = require('./common/models/User');
const User = defineUser(sequelize);

const defineCall = require('./common/models/Call');
const Call = defineCall(sequelize);

Call.hasMany(User, { foreignKey: 'email', as: 'calls' });


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

app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});