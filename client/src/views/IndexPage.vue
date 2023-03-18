<template>
  <div ref="mapImgRef" id="mapImg">
    <img v-for="item in carList" :src="item.src" :class="item.class" :alt="item.alt" :key="item.alt" />
    <img v-for="person in personList" :src="person.src" :class="person.class" :key="person.code" :alt="person.code" />
  </div>
</template>

<script lang="ts" setup>
import { ref, onBeforeUnmount, onMounted, reactive } from "vue";
import { h } from 'vue'
import { ElNotification } from 'element-plus'

import { getCarInfo } from "@/api/index";


interface objCar {
  carModel: string;
  carSize: string;
  color: string;
  fromPosition: string;
  lane: number;
  licensePlateNumber: string;
}

const mapImgRef: any = ref(null);
const carList: any = ref([]);
const personList: any = ref([]);

let socket: any = null;
const wsc: any = reactive({
  pingIntervalSeconds: 3000,   // 心跳连接时间
  lockReconnect: false,        // 是否建立重连接
  heartTimer: null,            // 心跳定时器
  serverTimer: null,           // 服务器超时定时器
  reconnectTimer: null,        // 断开重连倒计时
  sendFixHeartTimer: null,     // 20s固定发送心跳定时器
});


// 从服务器收到的数据存到carList中
async function createCar(obj: objCar) {
  let imgSrc = await import(`../assets/${obj.carSize.slice(0, 1)}${obj.color.slice(0, 1)}.png`);

  carList.value.push({
    color: obj.color,
    alt: obj.licensePlateNumber,
    position: obj.fromPosition,
    class: `${obj.fromPosition}-${obj.lane}`,
    src: imgSrc.default,
  });
}


function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min;
}


const positions = ["right", "top", "left", "right"];

// 创建行人并添加进personList
async function createPerson() {
  let imgSrc = await import(`../assets/wp.png`);

  personList.value.push({
    src: imgSrc.default,
    code: rand(1000, 9999),
    class: `${positions[rand(0, positions.length)]}-person${rand(1, 3)}`
  });

  ElNotification({
    title: '提示',
    message: '路口有行人通过，机动车减速让行',
    type: 'warning',
    duration: 10000, // 通知在多久后自动关闭 0为不自动关闭
    position: 'bottom-right',
  })
}
let notice: any;
// 获取车流量信息并显示
function getCarsDetails() {
  getCarInfo().then((res) => {
    if (notice) {
      notice.close();
      notice = null;
    }

    notice = ElNotification({
      title: '当天车流量数据',
      message: h('div', null, [
        h('p', '总车流量：' + res.data.allCarNum),
        h('p', '小型车：' + res.data.smallCarNum),
        h('p', '大型车：' + res.data.largeCarNum),
      ]),
      type: 'info',
      duration: 0, // 通知在多久后自动关闭 0为不自动关闭
      position: 'top-left',
      offset: 100,
      // showClose: false,
      onClick: getCarsDetails
    })

  });
}


function startTest(): void {
  wsc.heartTimer && clearTimeout(wsc.heartTimer);
  wsc.serverTimer && clearTimeout(wsc.serverTimer);

  wsc.heartTimer = setTimeout(() => {
    socket.send(
      JSON.stringify({
        cmd: 1100,
      })
    );

    //超时关闭，超时时间为5s onmessage触发时会取消该定时器
    wsc.serverTimer = setTimeout(() => {
      socket.close();
    }, 5000);
  }, wsc.pingIntervalSeconds);
}

// 20s固定发送心跳
function sendFixHeart() {
  wsc.sendFixHeartTimer && clearInterval(wsc.sendFixHeartTimer);

  wsc.sendFixHeartTimer = setInterval(() => {
    socket.send(
      JSON.stringify({
        cmd: 1100,
      })
    );
  }, 20000);
}

function reset() {
  clearTimeout(wsc.heartTimer);
  clearTimeout(wsc.serverTimer);
  startTest();
}

function reconnect() {
  //避免重复重连接
  if (wsc.lockReconnect) return;

  wsc.lockReconnect = true;
  wsc.reconnectTimer && clearTimeout(wsc.reconnectTimer);
  wsc.reconnectTimer = setTimeout(() => {
    createSocket();
    wsc.lockReconnect = false;
  }, parseInt("" + (Math.random() * 2000 + 3000)));
}

// 创建websocket
function createSocket(): void {
  socket && socket.close();

  socket = new WebSocket("ws://127.0.0.1:3000/api/profiles");

  socket.onopen = () => {
    startTest();
    sendFixHeart();
  };

  socket.onmessage = (res: any) => {
    reset();
    let arr = JSON.parse(res.data);

    if (Array.isArray(arr) && arr.length) {
      arr.forEach((item: objCar) => {
        createCar(item);
        ElNotification({
          type: 'success',
          title: item.licensePlateNumber,
          message: h('div', null, [
            h('p', '车型：' + item.carSize),
            h('p', '车辆颜色：' + item.color),
            h('p', '车辆出现方向：' + item.fromPosition),
          ]),
          duration: 10000, // 通知在多久后自动关闭 0为不自动关闭
          position: 'bottom-right',
        })
      });
    }
  };

  socket.onerror = (e: any) => {
    console.log(e);
    reconnect();
  };

  socket.onclose = () => {
    reconnect();
  };
}

createSocket();

setInterval(() => {
  createPerson();
}, 60000)

onMounted(() => {
  getCarsDetails();

  // 事件代理
  document
    .getElementById("mapImg")!
    .addEventListener("animationend", (event: any) => {
      let parent = event.target.parentElement;
      parent.removeChild(event.target);
    });


  window.addEventListener("online", startTest);
});

onBeforeUnmount(() => {
  if (socket) {
    socket.close();
  }
  window.removeEventListener("online", startTest);
});
</script>

<style lang="less">
body {
  overflow: hidden;
  background-image: url("@/assets/bg.jpeg");
  background-size: cover;
  background-repeat: no-repeat;
  background-attachment: fixed;
}

.top-person1 {
  height: 10px;
  transform: rotate(45deg);
  animation: move-all 17000ms 1 alternate linear;
  animation-fill-mode: forwards;
  offset-path: path("M 800 190 L 780 190 L 750 290 L 550 390 L 450 340 L 435 360"
    );
}

.top-person2 {
  height: 10px;
  transform: rotate(45deg);
  animation: move-all 17000ms 1 alternate linear;
  animation-fill-mode: forwards;
  offset-path: path("M 435 360 L 450 340 L 550 390 L 750 290 L 780 190 L 800 190"
    );
}

.right-person1 {
  height: 10px;
  transform: rotate(45deg);
  animation: move-all 18000ms 1 alternate linear;
  animation-fill-mode: forwards;
  offset-path: path("M 800 190 L 780 190 L 750 290 L 850 500 L 940 530 L 935 560"
    );
}

.right-person2 {
  height: 10px;
  transform: rotate(45deg);
  animation: move-all 17000ms 1 alternate linear;
  animation-fill-mode: forwards;
  offset-path: path("M 1480 170 L 1050 420 L 960 520 L 940 530 L 850 500 L 750 290 L 780 190 L 800 190"
    );
}

.bottom-person1 {
  height: 10px;
  transform: rotate(45deg);
  animation: move-all 19000ms 1 alternate linear;
  animation-fill-mode: forwards;
  offset-path: path("M 1480 170 L 1050 420 L 960 520 L 940 530 L 850 500 L 665 600 L 640 700 L 660 710"
    );
}

.bottom-person2 {
  height: 10px;
  transform: rotate(45deg);
  animation: move-all 17000ms 1 alternate linear;
  animation-fill-mode: forwards;
  offset-path: path("M 660 710 L 640 700 L 665 600 L 850 500 L 940 530 L 960 520 L 1050 420 L 1480 170"
    );
}

.left-person1 {
  height: 10px;
  transform: rotate(45deg);
  animation: move-all 16000ms 1 alternate linear;
  animation-fill-mode: forwards;
  offset-path: path("M 660 710 L 640 700 L 665 600 L 550 390 L 450 340 L 435 360"
    );
}

.left-person2 {
  height: 10px;
  transform: rotate(45deg);
  animation: move-all 15000ms 1 alternate linear;
  animation-fill-mode: forwards;
  offset-path: path("M 435 360 L 450 340 L 550 390 L 665 600 L 640 700 L 660 710"
    );
}

.right-1 {
  height: 40px;
  transform: rotate(90deg);
  animation: move-all 13000ms 1 alternate linear;
  animation-fill-mode: forwards;
  offset-path: path("M 1460 0 L 820 350 C 742 389, 711 487, 755 570 L 925 880");
}

.right-2 {
  position: absolute;
  left: 1440px;
  top: -40px;
  height: 40px;
  transform: rotate(-122deg);
  animation-name: right-2;
  animation-duration: 9s;
  animation-timing-function: linear;
  animation-iteration-count: 1;
  animation-direction: normal;
}

@keyframes right-2 {
  0% {
    left: 1440px;
    top: -40;
  }

  50% {
    left: 750px;
    top: 340px;
  }

  100% {
    left: -40px;
    top: 765px;
  }
}

.right-3 {
  position: absolute;
  left: 1395px;
  top: -40px;
  height: 40px;
  transform: rotate(-122deg);
  animation-name: right-3;
  animation-duration: 11s;
  animation-timing-function: linear;
  animation-iteration-count: 1;
  animation-direction: normal;
}

@keyframes right-3 {
  0% {
    left: 1395px;
    top: -40;
  }

  50% {
    left: 750px;
    top: 310px;
  }

  100% {
    left: -40px;
    top: 735px;
  }
}

.right-4 {
  height: 40px;
  transform: rotate(90deg);
  animation: move-all 14000ms 1 alternate linear;
  animation-fill-mode: forwards;
  offset-path: path("M 1310 0 L 900 225 C 795 280, 648 221, 600 135 L 525 0");
}

.top-1 {
  position: absolute;
  left: 200px;
  top: -40px;
  height: 40px;
  transform: rotate(90deg);
  animation: move-all 14000ms 1 alternate linear;
  animation-fill-mode: forwards;
  offset-path: path("M 200 -40 L 405 330 C 469 470, 604 480, 700 415 L 1480 -10"
    );
}

@keyframes move-all {
  0% {
    offset-distance: 0%;
  }

  100% {
    offset-distance: 100%;
  }
}

.top-2 {
  position: absolute;
  left: 400px;
  top: -40px;
  height: 40px;
  transform: rotate(150deg);
  animation-name: top-2;
  animation-duration: 9s;
  animation-timing-function: linear;
  animation-iteration-count: 1;
  animation-direction: normal;
}

@keyframes top-2 {
  0% {
    left: 400px;
    top: -40px;
  }

  50% {
    left: 635px;
    top: 390px;
  }

  100% {
    left: 895px;
    top: 869px;
  }
}

.top-3 {
  position: absolute;
  left: 375px;
  top: -40px;
  height: 40px;
  transform: rotate(150deg);
  animation-name: top-3;
  animation-duration: 10s;
  animation-timing-function: linear;
  animation-iteration-count: 1;
  animation-direction: normal;
}

@keyframes top-3 {
  0% {
    left: 375px;
    top: -40px;
  }

  50% {
    left: 605px;
    top: 390px;
  }

  100% {
    left: 867px;
    top: 869px;
  }
}

.top-4 {
  position: absolute;
  left: 175px;
  top: -40px;
  height: 40px;
  transform: rotate(90deg);
  animation: move-all 13000ms 1 alternate linear;
  animation-fill-mode: forwards;
  offset-path: path("M 175 -40 L 340 265 C 393 390, 301 501, 175 563 L -200 770"
    );
}

.bottom-1 {
  height: 40px;
  transform: rotate(90deg);
  animation: move-all 12000ms 1 alternate linear;
  animation-fill-mode: forwards;
  offset-path: path("M 955 880 L 785 570 C 754 496, 619 467, 520 517 L 0 800");
}

.bottom-2 {
  position: absolute;
  left: 963px;
  top: 869px;
  height: 40px;
  transform: rotate(-32deg);
  animation-name: bottom-2;

  animation-duration: 9s;

  animation-timing-function: linear;

  animation-iteration-count: 1;

  animation-direction: normal;

}

@keyframes bottom-2 {
  0% {
    left: 975px;
    top: 869px;
  }

  50% {
    left: 710px;
    top: 390px;
  }

  100% {
    left: 505px;
    top: 0px;
  }
}

.bottom-3 {
  position: absolute;
  left: 1000px;
  top: 869px;
  height: 40px;
  transform: rotate(-32deg);
  animation-name: bottom-3;
  animation-duration: 10s;
  animation-timing-function: linear;
  animation-iteration-count: 1;
  animation-direction: normal;
}

@keyframes bottom-3 {
  0% {
    left: 1000px;
    top: 869px;
  }

  50% {
    left: 740px;
    top: 390px;
  }

  100% {
    left: 525px;
    top: 0px;
  }
}

.bottom-4 {
  height: 40px;
  transform: rotate(90deg);
  animation: move-all 13000ms 1 alternate linear;
  animation-fill-mode: forwards;
  offset-path: path("M 1005 880 L 900 680 C 853 588, 879 479, 980 412 L 1500 127"
    );
}

.left-1 {
  position: absolute;
  left: -40px;
  top: 360px;
  height: 40px;
  transform: rotate(90deg);
  animation: move-all 11000ms 1 alternate linear;
  animation-fill-mode: forwards;
  offset-path: path("M 0 525 L 670 160 C 748 84, 736 31 ,680 -50 L 498 -400");
}

.left-2 {
  position: absolute;
  left: 22px;
  top: 860px;
  height: 40px;
  transform: rotate(58deg);
  animation-name: left-2;
  animation-duration: 9s;
  animation-timing-function: linear;
  animation-iteration-count: 1;
  animation-direction: normal;
}

@keyframes left-2 {
  0% {
    left: 22px;
    top: 860px;
  }

  50% {
    left: 750px;
    top: 455px;
  }

  100% {
    left: 1460px;
    top: 70px;
  }
}

.left-3 {
  position: absolute;
  left: 70px;
  top: 860px;
  height: 40px;
  transform: rotate(58deg);
  animation-name: left-3;
  animation-duration: 10s;
  animation-timing-function: linear;
  animation-iteration-count: 1;
  animation-direction: normal;
}

@keyframes left-3 {
  0% {
    left: 70px;
    top: 860px;
  }

  50% {
    left: 666px;
    top: 531px;
  }

  100% {
    left: 1480px;
    top: 91px;
  }
}

.left-4 {
  height: 40px;
  transform: rotate(90deg);
  animation: move-all 12000ms 1 alternate linear;
  animation-fill-mode: forwards;
  offset-path: path("M 125 880 L 520 665 C 682 569, 772 729, 830 800 L 880 880"
    );
}
</style>
