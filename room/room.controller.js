const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const roomService = require("./room.service");
const statisticService = require("../statistic/statistic.service");
const { findOne } = require("./room.model");
const statisticModel = require("../statistic/statistic.model");
const { io } = require("../io");

// routes
router.post("/createroom", createRoom);
router.post("/joinroom", joinRoom);
router.post("/exitroom", exitRoom);

module.exports = router;

function createRoom(req, res, next) {
  roomService
    .createRoom(req.body, req.get("origin"))
    .then((result) => {
      require("../io")
        .io()
        .on("connection", (socket) => {
          socket.join(result.roomId);
          socket.on("disconnecting", (reason) => {
            console.log("Create");
            console.log(socket.id);
            console.log(socket.rooms);
            for (const room of socket.rooms) {
              if (room !== socket.id) {
                socket.to(room).emit("user has left", socket.id);
                socket.leave(room);
              } else {
                socket.leave(room);
              }
            }
          });
        });
      const obj = {
        roomId: result.roomId,
        playerId: result.playerIds[0],
        roomType: req.body.roomType,
        amount: req.body.amount,
      };
      statisticService.createStatistic(obj, req.get("origin"));

      res.json({
        status: "200",
        message: "Room Allocated successfully",
        data: result,
      });
    })
    .catch(next);
}

function joinRoom(req, res, next) {
  roomService
    .joinRoom(req.body, req.get("origin"))
    .then((result) => {
      if (result.message) {
        res.json({
          status: "403",
          message: result.message,
        });
      } else {
        require("../io")
          .io()
          .on("connection", (socket) => {
            socket.join(result.roomId);
            socket
              .to(result.roomId)
              .emit("message", "${req.body.playerId} has Joined the Game");

            socket.on("disconnecting", (reason) => {
              console.log("Join");
              console.log(socket.id);
              console.log(socket.rooms);
              for (const room of socket.rooms) {
                if (room !== socket.id) {
                  socket.to(room).emit("user has left", socket.id);
                  socket.leave(room);
                } else {
                  socket.leave(room);
                }
              }
            });
          });

        const obj = {
          roomId: req.body.roomId,
          playerId: req.body.playerId,
          roomType: req.body.roomType,
          amount: result.amount,
        };
        statisticService.createStatistic(obj, req.get("origin"));

        res.json({
          status: "200",
          message: "Room Joined successfully",
          data: result,
        });
      }
    })
    .catch(next);
}

function exitRoom(req, res, next) {
  roomService
    .exitRoom(req.body, req.get("origin"))
    .then((result) => {
      require("../io")
        .io()
        .on("connection", (socket) => {
          socket.join(result.roomId, req.body.playerId);
          // socket
          //   .to(result.roomId)
          //   .broadcast("message", `${req.body.playerId} has Joined the Game`);
        });
      res.json({
        status: "200",
        message: "Exit From Room",
        data: result,
      });
    })
    .catch(next);
}