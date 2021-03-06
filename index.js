require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const configureMiddleware = require("./config/middleware");
const db = require("./data/dbConfig");

const secret =
  process.env.JWT_SECRET || "Add your own secret to the .env file.";

// Create server
const server = express();
const PORT = process.env.PORT || 3000;

// Middlware
configureMiddleware(server);

function restricted(req, res, next) {
  // Read the token string from the authorization header
  const token = req.headers.authorization;

  // Check if token exists
  if (token) {
    // Verify the token
    jwt.verify(token, secret, (err, decodedToken) => {
      if (err) {
        // Token is invalid
        res.status(401).json({ message: "Invalid token." });
      } else {
        // Token is invalid
        next();
      }
    });
  } else {
    res.status(401).json({ message: "No token provided." });
  }
}

function generateToken(user) {
  const payload = {
    username: user.username
  };

  const options = {
    expiresIn: "1h",
    jwtid: "023948"
  };

  return jwt.sign(payload, secret, options);
}

// Register endpoint
// Creates a user using the information sent inside the body of the request.
// Hash the password before saving the user to the database.
server.post("/api/register", (req, res) => {
  // Save login credentials from body
  const credentials = req.body;

  // Hash password
  const hash = bcrypt.hashSync(credentials.password, 14);
  credentials.password = hash;

  db("users")
    .insert(credentials)
    .then(ids => {
      const id = ids[0];

      db("users")
        .where({ id })
        .first()
        .then(user => {
          const token = generateToken(user);
          res.status(201).json({ id: user.id, token });
        });
    })
    .catch(err => {
      res.status(500).json(err);
    });
});

// Login endpoint
// Use the credentials sent inside the body to authenticate the user. On successful
// login, create a new JWT with the user id as the subject and send it back to the
// client. If login fails, respond with the correct status code and the message:
// 'You shall not pass!'
server.post("/api/login", (req, res) => {
  const credentials = req.body;

  db("users")
    .where({ username: credentials.username })
    .first()
    .then(user => {
      if (user && bcrypt.compareSync(credentials.password, user.password)) {
        const token = generateToken(user);
        res.status(200).json({ message: "Logged in", token });
      } else {
        res.status(401).json({ message: "You shall not pass!" });
      }
    })
    .catch(err => {
      res.status(500).json({ err });
    });
});

// Get users endpoint
// If the user is logged in, respond with an array of all the users contained in the
// database. If the user is not logged in repond with the correct status code and the
// message: 'You shall not pass!'. Use this endpoint to verify that the password is
// hashed before it is saved.
server.get("/api/users", restricted, (req, res) => {
  db("users")
    .select("id", "username")
    .then(users => {
      res.json(users);
    })
    .catch(err => {
      res.send(err);
    });
});

// Log out endpoint
server.post("api/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      res.status(500).json({ message: "Could not log out." });
    } else {
      res.json({ message: "Succesfully logged out." });
    }
  });
});

// Listen
let date = Date();
server.listen(PORT, () => {
  console.log(`\n=== API Listening on http://localhost:${PORT} ===\n`);
  console.log(`===== Updated on ${date} =====\n`);
});
