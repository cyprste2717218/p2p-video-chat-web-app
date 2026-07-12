import http from 'node:http';
import process from 'node:process';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import {sequelize} from './common/models/index.js';
import authRoutes from './authorization/routes.js';
import callRoutes from './call/routes.js';
import {handleUpgrade} from './call/utils/ws-server.js';

const app = express();
const server = http.createServer(app);

app.use(cookieParser());

const ALLOWED_DEV_ORIGINS =
	process.env.LOCAL === 'true'
		? ['http://localhost:4321']
		: [`https://${process.env.NGROK_HOST}`];
const ALLOWED_PROD_ORIGINS = [``]; // To-do: to be assigned based on deployment through pullumi

const ALLOWED_ORIGINS =
	process.env.NODE_ENV === 'dev' ? ALLOWED_DEV_ORIGINS : ALLOWED_PROD_ORIGINS;

app.use(
	cors(
		process.env.NODE_ENV === 'dev'
			? {
					origin: (origin, cb) =>
						cb(null, ALLOWED_ORIGINS.includes(origin) || !origin),
					methods: ['GET', 'POST', 'PUT', 'DELETE'],
					allowedHeaders: ['Content-Type', 'Authorization'],
					credentials: true,
				}
			: {
					origin: '*',
					methods: ['GET', 'POST', 'PUT', 'DELETE'],
					allowedHeaders: ['Content-Type', 'Authorization'],
				},
	),
);
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/call', callRoutes);

server.on('upgrade', (request, socket, head) =>
	handleUpgrade(request, socket, head),
);

const HOST = '0.0.0.0';

server.listen(3000, HOST, () => {
	console.log(`Server running on http://${HOST}:3000`);
});

process.on('SIGTERM', () => {
	server.close(() => {
		sequelize.close().catch((error) => {
			console.error('Error closing database connection:', error);
		});
	});
});
