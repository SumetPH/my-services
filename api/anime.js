const router = require("express").Router();
const rp = require("request-promise");
const cheerio = require("cheerio");
const monk = require("monk");
const myDB = monk(process.env.MONGO_URI);
const animeDB = myDB.get("anime");

router.get("/test", (req, res) => {
  res.json(process.env.LINE_TOKEN);
});

router.get("/check", (req, res) => {
  initialDB(req, res);
  sendNotify(req, res);
});

module.exports = router;

/**
 * initialDB
 */
const initialDB = async (req, res) => {
  // initial db
  animeDB.findOne({ web: "anime" }).then(async (data) => {
    if (data === null) {
      rp({
        uri: "https://animekimi.com/",
        transform: (body) => cheerio.load(body),
      }).then(($) => {
        let arr = [];
        // get anime list from web
        $("#contenedor > div.module > div.content > div.items > article").each(
          (_, el) => {
            const title = $(el).find("div.movie-title").text();
            const ep = $(el).find("span.features-status").text();
            const img = $(el).find("img.img-thumbnail").attr("src");
            arr.push({ title: title, ep: ep, img: img });
          }
        );

        animeDB.insert({ web: "anime", list: arr });
        console.log("initial db", new Date().toLocaleString());
      });
    }
  });
};

/**
 * sendNotify
 */
const sendNotify = async (req, res) => {
  // get anime in db
  const animeList = await animeDB.findOne({ web: "anime" });

  // get anime in web
  rp({
    uri: "https://animekimi.com/",
    transform: (body) => cheerio.load(body),
  }).then(($) => {
    let arr = [];
    $("#contenedor > div.module > div.content > div.items > article").each(
      (i, el) => {
        const title = $(el).find("div.movie-title").text();
        const ep = $(el).find("span.features-status").text();
        const img = $(el).find("img.img-thumbnail").attr("src");
        arr.push({ title: title, ep: ep, img: img });
      }
    );

    // filter anime from web and db
    const items = arr.filter(
      (a) => !animeList.list.find((d) => d.title === a.title)
    );

    // check new anime ep
    if (items.length > 0) {
      // update anime in db
      animeDB.findOneAndUpdate({ web: "anime" }, { $set: { list: arr } });

      // send to line api
      for (let i in items) {
        rp({
          method: "POST",
          uri: "https://notify-api.line.me/api/notify",
          auth: {
            bearer: process.env.LINE_TOKEN,
          },
          form: {
            message: `${items[i].title} \n ${items[i].ep}`,
            imageFullsize: items[i].img,
            imageThumbnail: items[i].img,
          },
        }).catch((err) => {
          console.log(err.error);
        });
      }

      console.log("send notify", new Date().toLocaleString());
      return res.json({ msg: "send notify" });
    } else {
      console.log("no update", new Date().toLocaleString());
      return res.json({ msg: "no update" });
    }
  });
};
