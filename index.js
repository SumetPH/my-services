require("dotenv").config();

const express = require("express");
const app = express();

app.get("/", (req, res) => res.json("SumetPH API"));

const anime = require("./api/anime");
app.use("/anime", anime);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
