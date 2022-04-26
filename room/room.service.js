const config = require("config.json");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
//const sendEmail = require('_helpers/send-email');
const db = require("_helpers/db");
const Role = require("_helpers/role");
const { nextTick } = require("process");
const { stringify } = require("querystring");

module.exports = {
  createRoom,
  joinRoom,
  exitRoom,
};

async function createRoom(params, socketId) {
  if (!params.playerId) {
    return {
      error: "Please provide player Id!",
    };
  }
  // const account = await db.Account.findOne(params.playerId);
  // const chip = account.chips - params.amount;
  // console.log(chip);
  const account = await db.Account.findOne({ playerId: params.playerId });
  account.socketId = socketId;
  await account.save();

  const objParams = params;
  objParams["playerIds"] = [params.playerId];
  delete objParams.playerId;
  const room = new db.Room(objParams);
  room.hostId = room.playerIds[0];
  const result = await room.save();
  return display(result);
}
function display(room) {
  return {
    
    playerIds: room.playerIds,
    hostId: room.hostId,
    roomId: room.roomId,
    roomType: room.roomType,
    amount: room.amount,
  };
}

async function joinRoom(params, socketId) {
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
    const account = await db.Account.findOne({ playerId: params.playerId });
    account.socketId = socketId;
    await account.save();

    room["playerIds"].push(params.playerId);

    Object.assign(room, params);
    room.updated = Date.now();
    await room.save();

    // const users = await db.Account.find({'playerId': {$in: room["playerIds"]}});
    
    // const obj = {
    //   "joinedPlayers": users,
    //   "hostId": room.hostId,
    //   "roomId": room.roomId,
    //   "roomType": room.roomType,
    //   "amount": room.amount
    // }
    // console.log(obj);

    // const users = await db.Account.find({'playerId': {$in: room["playerIds"]}}, '-_id playerId playerName profilePictureId');
    // // Object.assign(...users); 
    // console.log(users);
    // console.log(JSON.stringify(Object.assign({}, users)));

    return display(room);
  } else {
    return {
      message: "Maximum 4 players played the game!",
    };
  }
}

async function exitRoom(params, origin) {
  const account = await db.Account.findOne({ socketId: params });
  const room = await db.Room.findOne({ playerIds: account.playerId });
  const index = room.playerIds.findIndex((c) => c === account.playerId);

  if (index !== -1) {
    room.playerIds.splice(index, 1);
  }

  Object.assign(room, room.playerIds);
  room.updated = Date.now();
  room.hostId = room.playerIds[0];
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