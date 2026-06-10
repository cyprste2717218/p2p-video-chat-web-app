const cors = require('cors');
const cookieParser = require('cookie-parser');
const { sequelize } = require('./common/models');

const express = require('express');
const app = express();

app.use(cookieParser());
app.use(cors({
	origin: '*',
	methods: ['GET', 'POST', 'PUT', 'DELETE'],
	allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());


const authRoutes = require('./authorization/routes');
app.use('/', authRoutes);

const callRoutes = require('./call/routes');
app.use('/call', callRoutes);


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});