const express = require("express");
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@clustersorav.tqapkj6.mongodb.net/?retryWrites=true&w=majority&appName=ClusterSorav`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const verifyJwt = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).send({ error: true, message: "Unauthorized access" })
  }
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.DB_secret, (error, decoded) => {
    if (error) {
      return res.status(401).send({ error: true, message: "Unauthorized access" })
    }
    req.decoded = decoded;
    next();
  })
}

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();

    const bookCollection = client.db('stride').collection("books");
    const userCollection = client.db('stride').collection("user");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.DB_secret, { expiresIn: '7d' });
      res.send({ token })
    })

    app.get("/", (req, res)=>{
      res.send("server online");
    })

    // Define routes
    app.get("/books", async (req, res) => {
      try {
        const result = await bookCollection.find().toArray();
        res.json(result);
      } catch (err) {
        res.status(500).send(err.message);
      }
    });
    app.get("/authorBooks/:author", verifyJwt, async (req, res) => {


      const author = req.params.author;
      const filter = { author }
      const result = await bookCollection.find(filter).toArray();
      res.send(result);

    });

    app.get("/book/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const result = await bookCollection.findOne(filter);
      res.send(result);
    });

    app.get("/bookName/:name", async (req, res) => {
      try {
        const name = req.params.name;
        console.log(name)
        const filter = { name: name }
        const result = await bookCollection.findOne(filter);
        if (!result) {
          return res.status(404).send ("Book not found");
        }
        res.send(result);
      } catch (err) {
        console.log(err)
        res.status(500).send(err.message);
      }
    });

    app.patch("/book/:id", verifyJwt, async (req, res) => {
      const id = req.params.id;
      const bookData = req.body;
      const filter = { _id: new ObjectId(id) }
      const result = await bookCollection.updateOne(filter, { $set: bookData });
      res.send(result);
    });

    app.delete("/book/:id", verifyJwt, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const result = await bookCollection.deleteOne(filter);
      res.send(result);
    });

    app.post("/book", verifyJwt, async (req, res) => {
      const bookData = req.body;
      const result = await bookCollection.insertOne(bookData);
      res.send(result);
    });

    app.get("/user/:email", verifyJwt, async (req, res) => {
      const userEmail = req.params.email;
      const filter = { email: userEmail };
      const result = await userCollection.findOne(filter);
      res.send(result);

    })
    app.patch("/user/:email", verifyJwt, async (req, res) => {
      const userEmail = req.params.email;
      const updates = req.body;
      const filter = { email: userEmail };
      const result = await userCollection.updateOne(filter, { $set: updates });
      res.send(result);

    })
    app.post("/user", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

  } catch (err) {
    console.error(err);
  }
}

run().catch(console.dir);

// Listen to the port
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
