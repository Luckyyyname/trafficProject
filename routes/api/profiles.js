const express = require("express");
const expressWs = require("express-ws");

const router = express.Router();
// @ts-ignore
expressWs(router);

const Profiles = require("../../models/Profiles");

const fromPositionOptions = ["top", "bottom", "left", "right"];
const carSizeOptions = ["small", "large"];
const carModelOptions = ["大众", "别克", "丰田", "宝马", "比亚迪", "雪佛兰", "奔驰"];
// 车颜色
const colorOptions = ["red", "white", "black", "yellow"];

// 随机生成车牌号
function getRandomByStr(l = 3, s) {
  if (typeof s !== "string") {
    return;
  }
  var len = +l;
  var chars = "";

  while (len--) {
    chars += s[parseInt(Math.random() * s.length + "", 10)];
  }
  return chars;
}
function getPlate() {
  var en = "QWERTYUIOPASDFGHJKLZXCVBNM";
  var num = "1234567890";
  return `川A·${getRandomByStr(2, en) + getRandomByStr(3, num)}`;
}

function getNextDate() {
  let today = new Date();
  today.setTime(today.getTime());
  let yy = today.getFullYear();
  let mm = today.getMonth();
  let dd = today.getDate();

  return {
    yy,
    mm,
    dd,
  };
}

// $route   GET api/profiles/
// @desc    获取车辆信息接口
// @access  public
router
  .get("/", (req, res) => {
    res.json("hello");
  })
  .ws("/", function (ws, req) {
    console.log("connect success");
    let heartTimer = setTimeout(() => {
      ws.close();
    }, 25000);

    ws.on("message", function (msg) {
      console.log(`receive message ${JSON.parse(msg).cmd}`);

      heartTimer && clearTimeout(heartTimer);
      heartTimer = setTimeout(() => {
        ws.close();
      }, 25000);

      if (JSON.parse(msg).cmd === 1100) {
        ws.send(
          JSON.stringify({
            cmd: 0011,
          })
        );
      }
    });

    // 设置定时发送消息
    const resArray = [];
    let timer = setInterval(() => {
      let createNum = Math.floor(Math.random() * 2);

      // 随机生成0-3个车辆信息存在res里
      for (let i = 0; i < createNum; i++) {
        let profileFields = {};
        // 获取车起始位置
        profileFields.fromPosition =
          fromPositionOptions[
            Math.floor(Math.random() * fromPositionOptions.length)
          ];
        profileFields.lane = Math.floor(Math.random() * 4) + 1;

        // 获取车大小
        profileFields.carSize =
          carSizeOptions[Math.floor(Math.random() * carSizeOptions.length)];

        // 获取车品牌
        if (profileFields.carSize === "small") {
          profileFields.carModel =
            carModelOptions[Math.floor(Math.random() * carModelOptions.length)];
        } else {
          profileFields.carModel = "normal";
        }

        // 获取车颜色
        profileFields.color =
          colorOptions[Math.floor(Math.random() * colorOptions.length)];

        // 获取车牌号
        profileFields.licensePlateNumber = getPlate();

        // 存进res里并清空profileFields
        resArray.push(profileFields);
      }

      // 数据发送给前端
      if (resArray.length !== 0) {
        let set = new Set();
        for (let i = 0; i < resArray.length; i++) {
          let length = set.size;

          if (resArray[i].lane === 4) {
            set.add(`${resArray[i].fromPosition}-3`);
          } else {
            set.add(`${resArray[i].fromPosition}-${resArray[i].lane}`);
          }

          if (length === set.size) {
            resArray.splice(i, 1);
            i--;
          }
        }

        ws.send(JSON.stringify(resArray));
        set.size = 0;
      }

      // 把res存进数据库
      for (let i = 0; i < resArray.length; i++) {
          new Profiles(resArray[i]).save()
      }

      // 清空res
      resArray.length = 0;
    }, 5000);

    // 客户端断开连接时关闭定时器
    ws.on("close", function (e) {
      console.log("close connection");
      clearInterval(timer);
      timer = undefined;
    });
  });

// $route   GET api/profile/info
// @desc    获取指定日期内通行车辆数据
// @access  public
router.get("/info/", (req, res) => {
  const params = getNextDate();
  Profiles.find({
    date: { $gte: new Date(params.yy, params.mm, params.dd), $lt: new Date() },
  })
    .then((profile) => {
      if (!profile) {
        return res.status(404).json("没有任何信息");
      }
      let smallCarNum = 0;
      profile.forEach((item) => {
        if (item.carSize === "small") smallCarNum++;
      });
      res.json({
        allCarNum: profile.length,
        smallCarNum: smallCarNum,
        largeCarNum: profile.length - smallCarNum,
      });
    })
    .catch((err) => res.status(404).json(err));
});

module.exports = router;
