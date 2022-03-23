const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const roomService = require("./room.service");
const { findOne } = require("./room.model");


module.exports = router;

function createRoom(req, res, next) {
  roomService
    .createRoom(req.body, req.get("origin"))
    .then((result) => {
      require("../io")
        .io()
        .on("connection", (socket) => {
          socket.join(result.roomId);
        });

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
            socket.join(result.roomId, req.body.playerId);
            socket
              .to(result.roomId)
              .broadcast("message", `${req.body.playerId} has Joined the Game`);
          });
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
          socket
            .to(result.roomId)
            .broadcast("message", `${req.body.playerId} has Joined the Game`);
        });
      res.json({
        status: "200",
        message: "Exit From Room",
        data: result,
      });
    })
    .catch(next);
}
