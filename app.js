const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbPath = path.join(__dirname, "twitterClone.db");
const app = express();
app.use(express.json());
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
let db = null;
const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Started");
    });
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }
};
initializeDbAndServer();

//POST API 1
app.post("/register/", async (request, response) => {
  try {
    const { username, password, name, gender } = request.body;
    const hashedPassword = await bcrypt.hash(request.body.password, 6);
    const selectUserQuery = `
    SELECT *
    FROM user
    WHERE username='${username}';
    
    
    `;
    const userName = await db.get(selectUserQuery);
    if (userName !== undefined) {
      response.status(400);
      response.send("User already exists");
    } else {
      if (password.length < 6) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const createUserQuery = `
          INSERT INTO user(username,password,name,gender)
          VALUES ('${username}','${hashedPassword}','${name}','${gender}');
          
          `;
        await db.run(createUserQuery);
        response.send("User created successfully");
      }
    }
  } catch (e) {
    console.log(e.message);
  }
});
//LOGIN API 2
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `
    SELECT *
    FROM user
    WHERE username='${username}';
    
    `;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    const payload = { username: username };
    if (isPasswordMatched === true) {
      const jwtToken = jwt.sign(payload, "MY_SECRET");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});
