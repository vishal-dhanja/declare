require("rootpath")();
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const errorHandler = require("_middleware/error-handler");
const { createRoom, joinRoom, exitRoom } = require("./room/room.service");
const db = require("_helpers/db");
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
    const res = await createRoom(JSON.parse(room), socket.id);
    socket.join(res.roomId);
    const account = await db.Account.findOne({ socketId : socket.id });
    const obj = {
      "joinedPlayers": account,
      "hostId": res.hostId,
      "roomId": res.roomId,
      "roomType": res.roomType,
      "amount": res.amount
    }
    io.to(res.roomId).emit("roomCreated", JSON.stringify(obj));
    io.to(res.roomId).emit("newMember", JSON.stringify(account));

    socket.on("StartGame", async (obj) => {
      
      console.log(obj);
      const newobj = JSON.parse(obj);
      // console.log(newobj);
      // console.log(newobj.RoomId);
      // console.log(newobj.TurnAllocation);
      // console.log(newobj.TurnAllocation.turnAllocationList.length);
      io.to(newobj.RoomId).emit("GameStarted", JSON.stringify(newobj.TurnAllocation));
    })

    socket.on("SendDeck", async (obj) => {
      const newobj = JSON.parse(obj);
      io.to(newobj.RoomId).emit("ReceiveCard", JSON.stringify(newobj.Payload));
    })

    socket.on("disconnecting", async (reason, res) => {
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          const account = await db.Account.findOne({ socketId : socket.id });
          const room = await db.Room.findOne({ playerIds: account.playerId });
          // console.log(room);
          const res = await exitRoom(socket.id);
          // console.log(res);
          if (account.playerId !== room.hostId){
          io.emit("userLeft", `${account.playerId}`);
        } else{
          io.emit("userLeft", `${account.playerId}?${res.hostId}`);
        }
          socket.leave(room);
        }
      }
    });
  });
  socket.on("roomJoin", async (room) => {
    room = JSON.parse(room);
    const res = await joinRoom(room, socket.id);
    socket.join(res.roomId);
    const account = await db.Account.findOne({ playerId : room.playerId });
    socket.broadcast
      .emit(
        "newMemberJoined",
        `A new player (${account.playerName}) has Joined the Game`
      );
    
    const users = await db.Account.find({'playerId': {$in: res["playerIds"]}});
    
    const obj = {
      "joinedPlayers": users,
      "hostId": res.hostId,
      "roomId": res.roomId,
      "roomType": res.roomType,
      "amount": res.amount
    }
    socket.broadcast.emit("newMember", JSON.stringify(account));
    io.to(socket.id).emit("playerJoined", JSON.stringify(obj));

    socket.on("disconnecting", async (reason, res) => {
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          const account = await db.Account.findOne({ socketId : socket.id });
          const room = await db.Room.findOne({ playerIds: account.playerId });
          // console.log(room);
          const res = await exitRoom(socket.id);
          // console.log(res);
          if (account.playerId !== room.hostId){
          io.emit("userLeft", `${account.playerId}`);
          }else{
          io.emit("userLeft", `${account.playerId}?${res.hostId}`);
          }
          socket.leave(room);
        }
      }
    });
  });
});
