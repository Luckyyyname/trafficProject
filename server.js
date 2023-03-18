const express = require("express");
const mongoose = require("mongoose");
const expressWs = require('express-ws');
const cors = require('cors');
const app = express();

expressWs(app);

// 引入index.js
const profiles = require("./routes/api/profiles")

// DB config
const db = require("./config/keys").mongoURL;

app.use(cors());

// Connect to mongodb
mongoose.connect(db)
    .then(() => console.log("Mongodb Connected"))
    .catch(err => console.log(err));

app.get("/", (req, res) => {
    res.send('hello world!');
})

// 使用routes
app.use("/api/profiles", profiles);

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server is running on the port ${port}`);
})