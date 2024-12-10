const express = require("express");
const cors = require("cors");
require("dotenv").config();
const mongoClient = require("mongodb").MongoClient;
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

app.use(express.json());
app.use(cors());

const mongoUri = process.env.MONGO_URI;
const dbName = "sample_training";
const { ObjectId } = require("mongodb");

const connect = async (db, uri) => {
  let client = await mongoClient.connect(uri);
  let _db = client.db(db);
  return _db;
};

const generateToken = (id, email) => {
  return jwt.sign(
    {
      user_id: id,
      email: email,
    },
    process.env.SECRET_KEY,
    {
      expiresIn: "1h",
    }
  );
};

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.sendStatus(403);
  }
  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const main = async () => {
  let db = await connect(dbName, mongoUri);

  // Show all posts
  app.get("/posts", verifyToken, async (req, res) => {
    try {
      let results = await db
        .collection("posts")
        .find()
        .project({
          _id: 0,
          body: 0,
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

  // Find post
  app.get("/posts/:postId", async (req, res) => {
    try {
      const id = req.params.postId;

      if (!id) {
        return res.status(404).json({ Status: "Post not found" });
      }

      let result = await db.collection("posts").findOne(
        {
          _id: new ObjectId(id),
        },
        {
          projection: { permalink: 0 },
        }
      );

      res.json({ result });
    } catch (error) {
      console.error("Error:", error);
      res
        .status(500)
        .json({ "error retrieving post": "Internal server error" });
    }
  });

  // Search across posts
  app.get("/search", async (req, res) => {
    try {
      const { body, author, permalink, title, tags } = req.query;

      if (!body && !author && !permalink && !title && !tags) {
        return res
          .status(400)
          .json({ error: "Please search for at least one parameter." });
      }

      const query = {};

      if (body) {
        query["body"] = { $regex: body, $options: "i" };
      }

      if (author) {
        query["author"] = { $regex: author, $options: "i" };
      }

      if (permalink) {
        query["permalink"] = { $regex: permalink, $options: "i" };
      }

      if (title) {
        query["title"] = { $regex: title, $options: "i" };
      }

      if (tags) {
        query["tags"] = {
          $all: tags.split(",").map((i) => new RegExp(i, "i")),
        };
      }

      console.log("Query", query);

      let result = await db
        .collection("posts")
        .find(query)
        .project({ _id: 0, body: 0, comments: 0 })
        .limit(20)
        .toArray();

      if (result.length == 0) {
        return res.json({ error: "Your search didn't yield any results" });
      }

      res.json({ result });
    } catch (error) {
      console.error("error retrieving search results", error);
      res.status(500).json({ error: "Internal server error." });
    }
  });

  // Create post
  app.post("/add", async (req, res) => {
    try {
      const { body, permalink, author, title, tags } = req.body;

      if (!body || !permalink || !author || !title || !tags) {
        return res
          .status(400)
          .json({ error: "Please provide all required fields" });
      }

      const newPost = {
        body,
        permalink,
        author,
        title,
        tags,
        date: new Date(),
      };

      let result = await db.collection("posts").insertOne(newPost);

      res
        .status(201)
        .json({ message: "Post added succesfully.", _id: result.insertedId });
    } catch (error) {
      console.error("error", e);
      res.status(500).json({ "error adding post": "Internal server error" });
    }
  });

  // Update post
  app.put("/posts/:postId", async (req, res) => {
    try {
      const id = req.params.postId;
      const { body, permalink, author, title, tags } = req.body;

      if (!body || !permalink || !author || !title || !tags) {
        return res
          .status(400)
          .json({ error: "Please provide all required fields" });
      }

      const updatedPost = {
        body,
        permalink,
        author,
        title,
        tags,
        date: new Date(),
      };

      let result = await db
        .collection("posts")
        .updateOne({ _id: new ObjectId(id) }, { $set: updatedPost });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Post not found" });
      }

      res.json({ status: "Update successful" });
    } catch (error) {
      console.error("Error updating post:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete post
  app.delete("/posts/:postId", async (req, res) => {
    try {
      const id = req.params.postId;

      let result = await db
        .collection("posts")
        .deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "Post not found" });
      }

      res.json({ status: "Post deleted successfully" });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ "error deleting post": "Internal server error" });
    }
  });

  // Create comment
  app.post("/posts/:postId/comments", async (req, res) => {
    try {
      const id = req.params.postId;
      const { body, email, author } = req.body;

      const newComment = { comment_id: new ObjectId(), body, email, author };

      if (!body || !email || !author) {
        return res
          .status(400)
          .json({ error: "Please provide all required fields" });
      }

      let result = await db
        .collection("posts")
        .updateOne(
          { _id: new ObjectId(id) },
          { $push: { comments: newComment } }
        );

      if (result.matchedCount === 0) {
        return res.status(400).json({ error: "Post not found" });
      }

      res.status(201).json({ status: "Comment added successfully" });
    } catch (error) {
      console.error("error:", error);
      res.status(500).json({ "error adding comment": "Internal server error" });
    }
  });

  // Update comment
  app.put("/posts/:postId/comments/:commentId", async (req, res) => {
    try {
      const { postId, commentId } = req.params;

      const { body, email, author } = req.body;

      if (!body || !email || !author) {
        return res
          .status(400)
          .json({ error: "Please provide all required fields" });
      }

      const updatedComment = {
        comment_id: new ObjectId(commentId),
        body,
        email,
        author,
      };

      let result = await db.collection("posts").updateOne(
        {
          _id: new ObjectId(postId),
          "comments.comment_id": new ObjectId(commentId),
        },
        { $set: { "comments.$": updatedComment } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "post or comment not found" });
      }

      res.json({ status: "Comment successfully updated" });
    } catch (error) {
      console.error("error:", error);
      res
        .status(500)
        .json({ "error updating comment": "Internal server error" });
    }
  });

  // Delete comment
  app.delete("/posts/:postId/comments/:commentId", async (req, res) => {
    try {
      const { postId, commentId } = req.params;

      let result = await db.collection("posts").updateOne(
        {
          _id: new ObjectId(postId),
        },
        { $pull: { comments: { comment_id: new ObjectId(commentId) } } }
      );

      if (result.matchedCount == 0) {
        res.status(400).json({ error: "Post not found" });
      }

      if (result.modifiedCount == 0) {
        res.status(400).json({ error: "Comment not found" });
      }

      res.json({ status: "Comment successfully deleted" });
    } catch (error) {
      console.error("error:", error);
      res
        .status(500)
        .json({ "error deleting comment": "Internal server error" });
    }
  });

  // Add user
  app.post("/users", async (req, res) => {
    try {
      console.log(req.body);
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ Error: "Please provide required fields" });
      }

      const newUser = {
        email,
        password: await bcrypt.hash(req.body.password, 12),
      };

      let result = await db.collection("users").insertOne(newUser);

      res.json({
        Message: "User successfully added",
        result: result,
      });
    } catch (error) {
      console.error("Error", error);
      res.status(500).json({ "Error adding user": "Internal server error" });
    }
  });

  // Log in
  app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ Error: "Please provide required credentials" });
    }

    let user = await db.collection("users").findOne({ email: email });

    if (!user) {
      return res.status(400).json({ Error: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ Error: "Invalid email or password" });
    }

    const token = generateToken(user._id, user.email);

    res.json({ status: "Log in successful", token: token });
  });
};

main();

app.listen(3000, () => {
  console.log("Server started");
});
