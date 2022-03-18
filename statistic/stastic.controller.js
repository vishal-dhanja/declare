const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const roomService = require("./room.service");
const { findOne } = require("./room.model");

// routes
router.post("/createroom", authorize(), createRoom);
router.post("/joinroom", authorize(), joinRoom);
router.post("/exitroom", authorize(), exitRoom);
// router.post('/verify-email', verifyEmailSchema, verifyEmail);
// router.post('/forgot-password', forgotPasswordSchema, forgotPassword);
// router.post('/validate-reset-token', validateResetTokenSchema, validateResetToken);
// router.post('/reset-password', resetPasswordSchema, resetPassword);
// router.get('/', authorize(Role.Admin), getAll);
router.get("/", authorize(), getPlayerDetail);
router.get("/:id", authorize(), getById);
router.post("/", authorize(Role.Admin), createSchema, create);
router.put("/:id", authorize(), updateSchema, update);
router.delete("/:id", authorize(), _delete);

module.exports = router;

function authenticateSchema(req, res, next) {
  const schema = Joi.object({
    email: Joi.string().required(),
    password: Joi.string().required(),
  });
  validateRequest(req, next, schema);
}

function authenticate(req, res, next) {
  const { email, password } = req.body;
  const ipAddress = req.ip;
  accountService
    .authenticate({ email, password, ipAddress })
    .then(({ refreshToken, ...account }) => {
      setTokenCookie(res, refreshToken);
      res.json(account);
    })
    .catch(next);
}

function refreshToken(req, res, next) {
  const token = req.cookies.refreshToken;
  const ipAddress = req.ip;
  accountService
    .refreshToken({ token, ipAddress })
    .then(({ refreshToken, ...account }) => {
      setTokenCookie(res, refreshToken);
      res.json(account);
    })
    .catch(next);
}

function revokeTokenSchema(req, res, next) {
  const schema = Joi.object({
    token: Joi.string().empty(""),
  });
  validateRequest(req, next, schema);
}

function revokeToken(req, res, next) {
  // accept token from request body or cookie
  const token = req.body.token || req.cookies.refreshToken;
  const ipAddress = req.ip;

  if (!token) return res.status(400).json({ message: "Token is required" });

  // users can revoke their own tokens and admins can revoke any tokens
  if (!req.user.ownsToken(token) && req.user.role !== Role.Admin) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  accountService
    .revokeToken({ token, ipAddress })
    .then(() => res.json({ message: "Token revoked" }))
    .catch(next);
}

function registerSchema(req, res, next) {
  const schema = Joi.object({
    isNew: Joi.alternatives().conditional("loginType", {
      is: "0",
      then: Joi.boolean().required(),
    }),
    fbUserId: Joi.alternatives().conditional("loginType", {
      is: "1",
      then: Joi.string().required(),
    }),
    fbToken: Joi.alternatives().conditional("loginType", {
      is: "1",
      then: Joi.string().required(),
    }),
    loginType: Joi.string().required(),
  });

  validateRequest(req, next, schema);
  console.log(req.body);
}

function register(req, res, next) {
  accountService
    .register(req.body, req.get("origin"))
    .then((result) => {
      res.json({
        status: "200",
        message: "Registration successful",
        data: result,
      });
    })
    .catch(next);
}

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
// function verifyEmailSchema(req, res, next) {
//     const schema = Joi.object({
//         token: Joi.string().required()
//     });
//     validateRequest(req, next, schema);
// }

// function verifyEmail(req, res, next) {
//     accountService.verifyEmail(req.body)
//         .then(() => res.json({ message: 'Verification successful, you can now login' }))
//         .catch(next);
// }

// function forgotPasswordSchema(req, res, next) {
//     const schema = Joi.object({
//         email: Joi.string().email().required()
//     });
//     validateRequest(req, next, schema);
// }

// function forgotPassword(req, res, next) {
//     accountService.forgotPassword(req.body, req.get('origin'))
//         .then(() => res.json({ message: 'Please check your email for password reset instructions' }))
//         .catch(next);
// }

// function validateResetTokenSchema(req, res, next) {
//     const schema = Joi.object({
//         token: Joi.string().required()
//     });
//     validateRequest(req, next, schema);
// }

// function validateResetToken(req, res, next) {
//     accountService.validateResetToken(req.body)
//         .then(() => res.json({ message: 'Token is valid' }))
//         .catch(next);
// }

// function resetPasswordSchema(req, res, next) {
//     const schema = Joi.object({
//         token: Joi.string().required(),
//         password: Joi.string().min(6).required(),
//         confirmPassword: Joi.string().valid(Joi.ref('password')).required()
//     });
//     validateRequest(req, next, schema);
// }

// function resetPassword(req, res, next) {
//     accountService.resetPassword(req.body)
//         .then(() => res.json({ message: 'Password reset successful, you can now login' }))
//         .catch(next);
// }

function getAll(req, res, next) {
  accountService
    .getAll()
    .then((accounts) => res.json(accounts))
    .catch(next);
}

function getById(req, res, next) {
  // users can get their own account and admins can get any account
  if (req.params.id !== req.user.id && req.user.role !== Role.Admin) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  accountService
    .getById(req.params.id)
    .then((account) => (account ? res.json(account) : res.sendStatus(404)))
    .catch(next);
}

function getPlayerDetail(req, res, next) {
  // users can get their own account and admins can get any account
  // const account = findOne(req.user.playerId);
  // res.json(account);
  console.log(req.user);
  accountService
    .getById(req.user.id)
    .then((account) => (account ? res.json(account) : res.sendStatus(404)))
    .catch(next);
}

function createSchema(req, res, next) {
  const schema = Joi.object({
    title: Joi.string().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref("password")).required(),
    role: Joi.string().valid(Role.Admin, Role.User).required(),
  });
  validateRequest(req, next, schema);
}

function create(req, res, next) {
  accountService
    .create(req.body)
    .then((account) => res.json(account))
    .catch(next);
}

function updateSchema(req, res, next) {
  const schemaRules = {
    title: Joi.string().empty(""),
    firstName: Joi.string().empty(""),
    lastName: Joi.string().empty(""),
    email: Joi.string().email().empty(""),
    password: Joi.string().min(6).empty(""),
    confirmPassword: Joi.string().valid(Joi.ref("password")).empty(""),
  };

  // only admins can update role
  if (req.user.role === Role.Admin) {
    schemaRules.role = Joi.string().valid(Role.Admin, Role.User).empty("");
  }

  const schema = Joi.object(schemaRules).with("password", "confirmPassword");
  validateRequest(req, next, schema);
}

function update(req, res, next) {
  // users can update their own account and admins can update any account
  //   if (req.params.id !== req.user.id) {
  //     return res.status(401).json({ message: "Unauthorized" });
  //   }

  accountService
    .update(req.params.id, req.body)
    .then((account) => res.json(account))
    .catch(next);
}

function _delete(req, res, next) {
  // users can delete their own account and admins can delete any account
  if (req.params.id !== req.user.id && req.user.role !== Role.Admin) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  accountService
    .delete(req.params.id)
    .then(() => res.json({ message: "Account deleted successfully" }))
    .catch(next);
}

// helper functions

function setTokenCookie(res, token) {
  // create cookie with refresh token that expires in 7 days
  const cookieOptions = {
    httpOnly: true,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
  res.cookie("refreshToken", token, cookieOptions);
}