require('rootpath')();
const express = require('express');
const app = express();
const http = require('http')
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const errorHandler = require('_middleware/error-handler');
const socketio = require('socket.io');

const server = http.createServer(app);
const io = socketio(server);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// allow cors requests from any origin and with credentials
app.use(cors({ origin: (origin, callback) => callback(null, true), credentials: true }));

// api routes
app.use('/accounts', require('./accounts/accounts.controller'));
app.use('/room', require('./room/room.controller'));

// swagger docs route
app.use('/api-docs', require('_helpers/swagger'));

// global error handler
app.use(errorHandler);

io.on('connection', (socket) => {
    console.log('Connection Established');

    socket.on('join', ({ playerId, room }) => {
        socket.join(room);
        io.to(room).emit('message', message);
    })
})

// start server
const port = process.env.NODE_ENV === 'production' ? (process.env.PORT || 80) : 4000;
server.listen(port, () => {
    console.log('Server listening on port ' + port);
});
