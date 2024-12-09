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
app.use(cors());

const mongoUri = process.env.MONGO_URI;
const dbName = "sample_training";

const connect = async (db, uri) => {
  let client = await mongoClient.connect(uri);
  let _db = client.db(db);
  return _db;
};

const main = async () => {
  let db = await connect(dbName, mongoUri);

  // Show all posts
  app.get("/posts", async (req, res) => {
    try {
      let results = await db
        .collection("posts")
        .find()
        .project({
          _id: 0,
          permalink: 0,
          comments: 0,
        })
        .limit(20)
        .toArray();

      res.json({ results });
    } catch (error) {
      console.error("Error:", error);
      res
        .status(500)
        .json({ "Error retrieving posts": "Internal server error" });
    }
  });
};

main();

app.listen(3000, () => {
  console.log("Server started");
});
