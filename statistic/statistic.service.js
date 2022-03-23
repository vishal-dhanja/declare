const config = require("config.json");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
//const sendEmail = require('_helpers/send-email');
const db = require("_helpers/db");
const Role = require("_helpers/role");
const { nextTick } = require("process");

module.exports = {
  createStatistic,
  joinStatistic,
  joinRoom,
  exitRoom,
};


async function createStatistic(params, origin) {
  const statistic = new db.Statistic(params);
  await statistic.save();
}

async function joinStatistic(params, origin) {
  const statistic = new db.Statistic(params);
  console.log(statistic);
  //   const result = await statistic.save();
  //   return display(result);
}

function display(state) {
  return {
    RoomID: state.roomId,
    PlayerIDs: state.playerIds,
    Amount: state.amount,
    MatchType: state.matchType,
  };
}

async function joinRoom(params, origin) {
  if (!params.roomId) {
    return {
      message: "Please provide valid room Id!",
    };
  }
  const room = await db.Room.findOne({ roomId: params.roomId });
  if (room.roomId !== params.roomId || room.matchType !== params.matchType) {
    return {
      message: "Room or Match type is not matching..!",
    };
  }

  if (room["playerIds"].length < 4) {
    room["playerIds"].push(params.playerId);

    Object.assign(room, params);
    room.updated = Date.now();
    await room.save();
    return display(room);
  } else {
    return {
      message: "Maximum 4 players played the game!",
    };
  }
}

async function exitRoom(params, origin) {
  const room = await db.Room.findOne({ roomId: params.roomId });

  const index = room.playerIds.findIndex((c) => c === params.playerId);

  if (index !== -1) {
    room.playerIds.splice(index, 1);
  }
  Object.assign(room, room.playerIds);
  room.updated = Date.now();
  await room.save();
  return display(room);
}
