<template>
  <div class="hello">
    <div class="ggk">

    <canvas id="canvas" ref="myCanvas">
        你的浏览器版本太低, 请升级浏览器.
    </canvas>

    <canvas id="realCanvas" ref="realCanvas" style="display:none" ></canvas>
    <div>
      <el-row class="bg_btn_ctrl">
        <el-button type="primary" ref="edit" :class="{cur:curStatus==='edit'}" icon="el-icon-edit" @click="curStatus === 'edit' ? stopScratch() : scratch()" circle></el-button>
        <el-button type="primary" ref="rotateLeft" icon="el-icon-d-arrow-left" @click="rotateFn('left')" circle>Turn Left</el-button>
        <el-button type="primary" ref="rotateRight" icon="iconfont icon-arrow-right2" @click="rotateFn('right')" circle>Turn Right</el-button>
        <el-button type="primary" ref="save" icon="iconfont icon-reset-all" @click="undoFn" circle>undo</el-button>
        <el-button type="primary" ref="save" icon="el-icon-upload" @click="savePng" circle>Save</el-button>

      </el-row>
    </div>
</div>
  </div>
</template>

<script>
import demoImg from '@/assets/demo.png';

export default {
  name: 'editImage',
  data() {
    return {
      msg: 'Welcome to Your Vue.js App',
      demoImg,
      scaleRatio: 0.5,
      curStatus: '',
      ctx: null,
      realCanvas: null, // 真实尺寸的canvas
      imgWidth: 1664, // 原图尺寸
      imgHeight: 1660,
      realCtx: null, // 源图canvas的context
      cacheMap: [],
      angle: 10,
    };
  },
  mounted() {
    this.draw();
  },
  methods: {

    draw() {
      if (!this.$refs.myCanvas.getContext) return;
      this.$refs.myCanvas.width = 800;
      this.$refs.myCanvas.height = 800;
      this.ctx = this.$refs.myCanvas.getContext('2d');
      this.ctx.fillStyle = '#cdcdcd';
      this.ctx.fillRect(0, 0, 800, 800);
      this.initImg();
      this.syncInitDraw();

      // this.scratch(ctx);
    },
    initImg() {
      this.img = new Image();
      this.img.src = this.demoImg;
      this.img.onload = () => {
        this.ctx.scale(this.scaleRatio, this.scaleRatio);
        // this.ctx.translate(0, 0);
        // // this.ctx.rotate(-Math.PI / 10);
        this.ctx.drawImage(this.img, 0, 0, 1664, 1660);
        console.log(-this.img.width / 2, -this.img.width / 2);
        this.savePng();
      };
    },
    scratch() {
      this.curStatus = 'edit';
      // this.ctx.translate(0, 0);
      // this.ctx.scale(1, 1);

      this.$refs.myCanvas.onmousedown = (e) => {
        const downX = e.offsetX / this.scaleRatio;
        const downY = e.offsetY / this.scaleRatio;
        console.log(downX, downY);
        this.ctx.beginPath();
        // this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.lineWidth = 30;
        this.ctx.lineCap = 'round';
        this.ctx.moveTo(downX, downY);

        this.syncMousedown(downX, downY, 30);
        this.$refs.myCanvas.onmousemove = (ev) => {
          const x = ev.offsetX / this.scaleRatio;
          const y = ev.offsetY / this.scaleRatio;
          this.ctx.strokeStyle = 'white';
          this.ctx.lineTo(x, y);
          this.ctx.stroke();
          this.syncMousemove(x, y, 'white');
        };
        this.$refs.myCanvas.onmouseup = () => {
          this.savePng();
          this.$refs.myCanvas.onmousemove = null;
          this.$refs.realCanvas.onmousemove = null;
        };
      };
    },
    stopScratch() {
      this.curStatus = '';
      this.$refs.myCanvas.onmousedown = null;
      this.$refs.myCanvas.onmousemove = null;
    },
    rotateFn(direction) {
      const cacheLen = this.cacheMap.length;
      if (cacheLen > 0) {
        this.img = this.cacheMap[cacheLen - 1];
      }
      this.ctx.clearRect(0, 0, 1664, 1660);
      this.realCtx.clearRect(0, 0, 1664, 1660);
      if (direction === 'right') {
        this.angle = 10;
      } else {
        this.angle = -10;
      }

      this.ctx.save();
      this.ctx.fillStyle = '#cdcdcd';
      this.ctx.fillRect(0, 0, this.imgWidth, this.imgHeight);
      this.ctx.translate(this.img.width / 2, this.img.width / 2);
      this.ctx.rotate(this.angle * Math.PI / 180);
      this.ctx.drawImage(this.img, -this.img.width / 2, -this.img.width / 2);
      this.ctx.restore();
      this.realCtx.save();
      this.realCtx.fillStyle = '#cdcdcd';
      this.realCtx.fillRect(0, 0, this.imgWidth, this.imgHeight);
      this.realCtx.translate(this.img.width / 2, this.img.width / 2);
      this.realCtx.rotate(this.angle * Math.PI / 180);
      this.realCtx.drawImage(this.img, -this.img.width / 2, -this.img.width / 2);
      this.realCtx.restore();
      this.savePng();
    },
    undoFn() {
      const cacheLen = this.cacheMap.length;
      console.log(cacheLen);
      if (cacheLen > 1) {
        this.img = this.cacheMap[cacheLen - 2];
        this.cacheMap.splice(cacheLen - 1, 1);
        console.log(this.cacheMap);
      } else if (cacheLen > 0) {
        this.img = this.cacheMap[cacheLen - 1];
      }
      this.ctx.clearRect(0, 0, 1664, 1660);
      this.realCtx.clearRect(0, 0, 1664, 1660);

      this.ctx.fillStyle = '#cdcdcd';
      this.ctx.fillRect(0, 0, this.imgWidth, this.imgHeight);
      this.ctx.drawImage(this.img, 0, 0);


      this.realCtx.fillStyle = '#cdcdcd';
      this.realCtx.fillRect(0, 0, this.imgWidth, this.imgHeight);
      this.realCtx.drawImage(this.img, 0, 0);
    },
    savePng() {
      const originCanvas = this.$refs.realCanvas;
      const newImg = new Image();
      newImg.src = originCanvas.toDataURL('image/png', 1.0);
      this.cacheMap.push(newImg);
      if (this.cacheMap.length > 10) {
        this.cacheMap.splice(0, 1);
      }
      console.log(this.cacheMap);
      // console.log(originCanvas.toDataURL('image/png'));
    },
    scaleCanvas(canvas, width, height) {
      const w = width || canvas.width;
      const h = height || canvas.height;
      const retCanvas = document.createElement('canvas');
      const retCtx = retCanvas.getContext('2d');
      retCanvas.width = w;
      retCanvas.height = h;
      retCtx.scale(2, 2);
      retCtx.drawImage(canvas, 0, 0, w, h, 0, 0, w, h);
      return retCanvas;
    },
    syncInitDraw() {
      if (!this.$refs.realCanvas.getContext) return;
      this.$refs.realCanvas.width = this.imgWidth;
      this.$refs.realCanvas.height = this.imgHeight;
      this.realCtx = this.$refs.realCanvas.getContext('2d');
      this.realCtx.fillStyle = '#cdcdcd';
      this.realCtx.fillRect(0, 0, this.imgWidth, this.imgHeight);
      this.syncInitImg();
    },
    syncInitImg() {
      const img = new Image();
      img.src = this.demoImg;
      img.onload = () => {
        this.realCtx.translate(0, 0);
        this.realCtx.drawImage(img, 0, 0, 1664, 1660);
      };
    },
    syncMousedown(X, Y, lineWidth) {
      this.realCtx.beginPath();
      // this.ctx.globalCompositeOperation = 'destination-out';
      this.realCtx.lineWidth = lineWidth || 30;
      this.realCtx.lineCap = 'round';
      this.realCtx.moveTo(X, Y);
    },
    syncMousemove(X, Y, strokeStyle) {
      // console.log(X, Y);
      this.realCtx.strokeStyle = strokeStyle || 'white';
      this.realCtx.lineTo(X, Y);
      this.realCtx.stroke();
    },
    syncEdit() {
      // 同步修改 大图
    },

  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h1, h2 {
  font-weight: normal;
}

.ggk {
    width: 100%;
    height:99vh;

    margin: 0 auto;
    color: red;
    position: relative;

}

.ggk span {
    position: absolute;
    width: 100%;
    height: 100%;
    text-align: center;
    line-height: 100px;
    font-size: 50px;
    user-select: none;
    left: 0;
}

canvas {
    /* position: absolute;
    left: 0;
    top: 0; */
    background: transparent;
}
.bg_btn_ctrl{
   position: absolute;
   left: 0;
    top: 0;
}
.bg_btn_ctrl .cur{

  background: #f00;
  border: 1px solid #f00;
}
</style>
