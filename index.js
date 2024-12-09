/*
- get hold of cors, dotenv, express and mongodb
- create "app"
- create app.listen at the end
- Connect to database; incl. storing credentials in env file
- Create routes
- Create jwt authentication
-- user route
-- log in route
-- get hold of jwt packages
-- token creation
-- token verification
*/

const express = require("express");
const cors = require("cors");
require("dotenv").config();
const mongoClient = require("mongodb").MongoClient;

const app = express();
app.use(express.json());

const mongoUri = process.env.MONGO_URI;

const main = () => {
  app.get("/", (req, res) => {
    res.json({ Message: "Hello world" });
  });
};

main();

app.listen(3000, () => {
  console.log("Server started");
});
