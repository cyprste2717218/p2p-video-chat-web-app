const cors=require('cors');
const cookieParser=require('cookie-parser');
const {sequelize}=require('./common/models');

const express=require('express');
const http=require('http');
const app=express();
const server=http.createServer(app);

app.use(cookieParser());
const ALLOWED_ORIGINS=[
	'http://localhost:4321',
	'https://distill-goldmine-cheddar.ngrok-free.dev'
];
app.use(cors(
	process.env.NODE_ENV==='dev'
		? {origin: (origin,cb) => cb(null,ALLOWED_ORIGINS.includes(origin)||!origin),methods: ['GET','POST','PUT','DELETE'],allowedHeaders: ['Content-Type','Authorization'],credentials: true}
		:{origin: '*',methods: ['GET','POST','PUT','DELETE'],allowedHeaders: ['Content-Type','Authorization']}
));
app.use(express.json());


const authRoutes=require('./authorization/routes');
app.use('/auth',authRoutes);

const callRoutes=require('./call/routes');
app.use('/call',callRoutes);


const {handleUpgrade}=require('./call/utils/ws-server');
server.on('upgrade',(req,socket,head) => handleUpgrade(req,socket,head));

const HOST='0.0.0.0';

server.listen(3000,HOST,() => {
	console.log(`Server running on http://${HOST}:3000`);
});