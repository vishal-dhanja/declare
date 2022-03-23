const config = require("config.json");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
//const sendEmail = require('_helpers/send-email');
const db = require("_helpers/db");
const Role = require("_helpers/role");
const { nextTick } = require("process");

module.exports = {
  createRoom,
  joinRoom,
  exitRoom,
};

async function createRoom(params) {
  if (!params.playerId) {
    return {
      error: "Please provide player Id!",
    };
  }
  // const account = await db.Account.findOne(params.playerId);
  // const chip = account.chips - params.amount;
  // console.log(chip);
  const objParams = params;
  objParams["playerIds"] = [params.playerId];
  delete objParams.playerId;
  const room = new db.Room(objParams);
  const result = await room.save();
  return display(result);
}
function display(room) {
  return {
    
    playerIds: room.playerIds,
    roomId: room.roomId,
    roomType: room.roomType,
    amount: room.amount,
  };
}

async function joinRoom(params) {
  if (!params.roomId) {
    return {
      message: "Please provide valid room Id!",
    };
  }
  const room = await db.Room.findOne({ roomId: params.roomId });
  if (room.roomId !== params.roomId || room.roomType !== params.roomType) {
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

async function getAccount(id) {
  const account = await db.Account.findById(id);
  if (!account) throw "Account not found";
  return account;
}

function basicDetails(account) {
  const {
    playerId,
    loginType,
    fbUserId,
    fbUserToken,
    playerName,
    profilePictureId,
    chips,
    FriendsMatchPlayed,
    FriendsMatchWin,
    MultiplayerMatchPlayed,
    MultiplayerMatchWin,
    OfflineMatchPlayed,
    OfflineMatchWin,
  } = account;
  return {
    playerId,
    loginType,
    fbUserId,
    fbUserToken,
    playerName,
    profilePictureId,
    chips,
    FriendsMatchPlayed,
    FriendsMatchWin,
    MultiplayerMatchPlayed,
    MultiplayerMatchWin,
    OfflineMatchPlayed,
    OfflineMatchWin,
  };
}