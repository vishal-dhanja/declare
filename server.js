﻿require("rootpath")();
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const errorHandler = require("_middleware/error-handler");
const { createRoom, joinRoom, exitRoom } = require("./room/room.service");
var server = require("http").createServer(app);
var io = require("./io").initialize(server);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// allow cors requests from any origin and with credentials
app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  })
);

// api routes
app.use("/accounts", require("./accounts/accounts.controller"));
app.use("/room", require("./room/room.controller"));

// swagger docs route
app.use("/api-docs", require("_helpers/swagger"));

// global error handler
app.use(errorHandler);

// require('./room/room.controller.js');

// start server
const port =
  process.env.NODE_ENV === "production" ? process.env.PORT || 80 : 4000;
server.listen(port, () => {
  console.log("Server listening on port " + port);
});

io.on("connection", async (socket) => {
  socket.on("roomCreate", async (room) => {
    console.log(room);
    const res = await createRoom(JSON.parse(room), socket.id);
    socket.join(res.roomId);
    // const account = await db.Account.findOne({ socketId });
    socket.emit("roomCreated", JSON.stringify(res), JSON.stringify(account));
    socket.on("disconnecting", (reason, res) => {
      console.log("Create");
      console.log(res);
      console.log(socket.id);
      console.log(socket.rooms);
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          exitRoom(socket.id);
          socket.to(room).emit("user has left", socket.id);
          socket.leave(room);
        }
      }
    });
  });
  socket.on("roomJoin", async (room) => {
    room = JSON.parse(room);
    const res = await joinRoom(room, socket.id);
    socket.join(res.roomId);
    console.log(socket.id);
    socket
      .to(res.roomId)
      .emit(
        "newMemberJoined",
        `A new player (${room.playerId}) has Joined the Game`
      );
    socket.emit("playerJoined", JSON.stringify(res));
    socket.on("disconnecting", (reason, res) => {
      console.log("Jion");
      console.log(res);
      console.log(socket.id);
      console.log(socket.rooms);
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          const res = exitRoom(socket.id);
          socket.to(room).emit("user has left", socket.id);
          socket.leave(room);
        }
      }
    });
  });
});
