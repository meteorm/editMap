<template>
  <div class="hello">
    <div class="ggk">

    <canvas id="myCanvas" class="myCanvas" ref="myCanvas" :style="canvasStyle" > -->
        你的浏览器版本太低, 请升级浏览器.
    </canvas>

    <canvas id="realCanvas" ref="realCanvas"></canvas>
    <div>
      <el-row class="bg_btn_ctrl">
        <el-button type="primary" ref="edit" :class="{cur:curStatus==='edit'}"
         icon="el-icon-edit" @click="curStatus === 'edit' ? stopScratch() : scratch()"
          circle></el-button>
        <el-button type="primary" ref="rotateLeft" icon="el-icon-d-arrow-left"
         @click="rotateFn('left')" circle>Turn Left</el-button>
        <el-button type="primary" ref="rotateRight" icon="iconfont icon-arrow-right2"
         @click="rotateFn('right')" circle>Turn Right</el-button>
        <el-button type="primary" ref="save" icon="iconfont icon-reset-all"
         @click="undoFn" circle>undo</el-button>
        <el-button type="primary" ref="save" icon="el-icon-upload"
        @click="savePng" circle>Save</el-button>

      </el-row>
    </div>

</div>
<!-- <div id="preview">
  <canvas id="canvas_preview" width="148" height="100"></canvas>
  <div style="margin-top:105px;padding-left:5px;">
    <input onclick="DRAW.zoom(-1);" style="width:30px;" class="layer_add" type="button" value="-" />
    <input onclick="DRAW.zoom(+1);" style="width:30px;" class="layer_add" type="button" value="+" />
    <b>Zoom: </b><span id="zoom_nr">100</span>%
    <br />
    <input style="width:95%;" id="zoom_range" type="range" value="100" min="50" max="1000" step="50" oninput="DRAW.zoom(this.value);" />
  </div>
</div> -->
<div style="display:block;position:absolute;left:0;top:50px;width:150px;background:lightBlue">
      <h3 style="margin: 5px 0px;">缩放控制器</h3>
        <input id="slider" :v-model="ZOOM" min="1" max="100" step="1"
        @input="resize($event.target.value, true);" type="range">
        <span style="margin-right:10px;" id="slider_value" ref="slider_value">
          {{sliderValue}}</span><br/>

        <label><input type="checkbox" id="workers" ref="workers" value="1">
         Use <span id="cores"></span> {{workers}}</label>

        <br />Resized in: <span id="timer" style="font-weight:bold;" ref="timer">
          {{ccTimer}}</span> s

        <br /><br />
        <!-- <canvas id="cc" ref="cc"></canvas> -->

    </div>
  </div>
</template>

<script>
import HermiteClass from 'hermite-resize';
import demoImg from '@/assets/demo.png';
import zoom from './model/zoom'
  ;

export default {
  name: 'editImage',
  data() {
    return {
      msg: 'Welcome to Your Vue.js App',
      demoImg,
      scaleRatio: 1,
      curStatus: '',
      ctx: null,
      realCanvas: null, // 真实尺寸的canvas
      imgWidth: 1664, // 原图尺寸
      imgHeight: 1660,
      realCtx: null, // 源图canvas的context
      cacheMap: [],
      angle: 10,
      HERMITE: new HermiteClass(),

      canvas: null,
      img_w: 0,
      img_h: 0,
      current_size: false,
      img: null,
      ccTimer: 0,
      sliderValue: 0,
      workers: 0,
      slider: 100,
      ZOOM: 100,
      WIDTH: 800,
      HEIGHT: 800,
      canvasStyle: {
        width: '100px',
        height: '300px',
      },

      mouse: null, // mouse obj
      mouseClickValid: true,
      mouseClickX: '',
      mouseClickY: '',
      mouseXMoveLast: '',
      mouseYMveLast: '',
      isDrag: false,
      new_w: 0,
      new_h: 0,
    };
  },
  mixins: { zoom },
  mounted() {
    // this.draw();
    this.initHermiteDemo();

    document.onmousedown = this.mouseClick;// mouse click
    document.onmousemove = this.mouseMove;// mouse move
    document.onmouseup = this.mouseRelease;// mouse resease
    window.ondragover = (e) => { e.preventDefault(); };
  },
  methods: {
    get_mouse_position(event) {
      // console.log(event.offsetX, event.offsetY);
      let valid = true;
      let mouse_rel_x = '';
      let mouse_rel_y = '';
      let mouse_x = '';
      let mouse_y = '';
      if (event.offsetX) {
        mouse_rel_x = event.offsetX;
        mouse_rel_y = event.offsetY;
      } else if (event.layerX) {
        mouse_rel_x = event.layerX;
        mouse_rel_y = event.layerY;
      } else {
        return;
      }

      mouse_x = event.pageX;
      mouse_y = event.pageY;
      const abs_x = event.pageX;
      const abs_y = event.pageY;
      if (event.target.id === 'myCanvas') {
        // in canvas area - relative pos
        mouse_x = mouse_rel_x;
        mouse_y = mouse_rel_y;

        // console.log('event id is myCanvas', mouse_x, mouse_x);
        if (this.ZOOM !== 100) {
          mouse_x = Math.floor((mouse_x / this.ZOOM) * 100);
          mouse_y = Math.floor((mouse_y / this.ZOOM) * 100);
        }
      } else {
        // outside canvas - absolute pos - canvas offset
        mouse_x -= 0;
        mouse_y -= 0;
        valid = false;
      }
      if (event.target.id == 'canvas_preview') {
        // in preview area - relative pos
        mouse_x = mouse_rel_x;
        mouse_y = mouse_rel_y;
      }

      // save - other place will use it too
      this.mouse = {
        x: mouse_x,
        y: mouse_y,
        click_x: this.mouseClickX,
        click_y: this.mouseClickY,
        last_x: this.mouseXMoveLast,
        last_y: this.mouseYMoveLast,
        valid,
        click_valid: this.mouseClickValid,
        abs_x,
        abs_y,
      };
      // console.log(this.mouse);
    },
    mouseClick(event) {
      console.log('mouse click');
      this.isDrag = true;

      if (event.which === 3) return;
      this.get_mouse_position(event);
      this.mouseClickX = this.mouse.x;
      this.mouseClickY = this.mouse.y;
      if (this.mouse.valid === false) {
        this.mouseClickValid = false;
      } else {
        this.mouseClickValid = true;
      }
      // if (event.target.id == 'canvas_preview') { this.calc_preview_by_mouse(CON.mouse.x, this.mouse.y); }
      // main window resize
      this.resizeAll = false;
      // if (this.ZOOM == 100) {
      //   if (event.target.id === 'resize-w') {
      //     this.resizeAll = 'w';
      //   } else if (event.target.id === 'resize-h') {
      //     this.resizeAll = 'h';
      //   } else if (event.target.id === 'resize-wh') {
      //     this.resizeAll = 'wh';
      //   }
      // }
    },
    mouseMove(event) {
      // if (POP != undefined && POP.active == true) {
      //   // drag popup
      //   if (CON.isDrag == true && popup_dragable == true) {
      //     this.get_mouse_position(event);
      //     popup = document.getElementById('popup');
      //     popup.style.top = `${popup_pos_top + this.mouse.abs_y - last_pop_click[1]}px`;
      //     popup.style.left = `${popup_pos_left + this.mouse.abs_x - last_pop_click[0]}px`;
      //   }
      //   return true;
      // }
      this.get_mouse_position(event);
      // console.log(event);
      // if (event.target.id == 'myCanvas' && this.isDrag === true) {
      //   this.calc_preview_by_mouse(this.mouse.x, this.mouse.y);
      //   }
      // LAYER.update_info_block();
      // console.log(this.mouse.x, this.mouse.y);
      // main window resize
      if (this.ZOOM === 100) {
        if (event.target.id == 'resize-w') {
          document.body.style.cursor = 'w-resize';
        } else if (event.target.id == 'resize-h') {
          document.body.style.cursor = 'n-resize';
        } else if (event.target.id == 'resize-wh') {
          document.body.style.cursor = 'nw-resize';
        } else { document.body.style.cursor = 'auto'; }
        if (this.resizeAll !== false && this.isDrag === true) {
          document.body.style.cursor = 'auto';
          // if (this.resizeAll === 'w') {
          //   this.new_w = this.mouse.x;
          //   this.new_h = this.HEIGHT;
          // } else if (this.resizeAll === 'h') {
          //   this.new_w = this.WIDTH;
          //   this.new_h = this.mouse.y;
          // } else if (this.resizeAll === 'wh') {
          //   this.new_w = this.mouse.x;
          //   this.new_h = this.mouse.y;
          // }
          // canvas_front.clearRect(0, 0, this.WIDTH, this.HEIGHT);
          // canvas_front.lineWidth = 1;
          // canvas_front.fillStyle = '#ff0000';
          // HELPER.dashedRect(canvas_front, 0, 0, new_w - 1, new_h - 1);
          event.preventDefault();
          // HELPER.remove_selection();
          return;
        }
      }
      // check tools functions
      // if (CON.isDrag === false) {
      //   for (i in TOOLS) {
      //     if (i == ACTION) {
      //       TOOLS[i]('move', this.mouse, event);
      //       break;
      //     }
      //   }
      // }


      if (this.isDrag === false) return;// only drag now

      // check tools functions
      // for (i in TOOLS) {
      //   if (i == ACTION) {
      //     TOOLS[i]('drag', this.mouse, event);
      //     break;
      //   }
      // }

      // if (ACTION != 'select_square'){
      //   TOOLS.select_square_action = '';
      //   }

      this.mouseXMoveLast = this.mouse.x;
      this.mouseYMoveLast = this.mouse.y;
    },
    mouseRelease(event) {
      // console.log(event);
      this.isDrag = false;
      // if (POP != undefined && POP.active == true) return true;
      this.mouse = this.get_mouse_position(event);
      this.mouseXMoveLast = false;
      this.mouseYMoveLast = false;
      // if(TOOLS.select_square_action == '' && CON.mouse.valid == true)
      // TOOLS.select_data = false;

      // check tools functions
      // if(CON.clear_front_on_release == true)
      // canvas_front.clearRect(0, 0, WIDTH, HEIGHT);
      // TOOLS.draw_selected_area();
      // for (i in TOOLS){
      // if(i == ACTION){
      // TOOLS[i]('release', CON.mouse, event);
      // break;
      // }
      // }

      // main window resize
      // if(resize_all != false && ZOOM == 100 && CON.mouse.x > 0 && CON.mouse.y > 0){
      // CON.autosize = false;
      // document.body.style.cursor = "auto";
      // if(resize_all == "w")
      // WIDTH = CON.mouse.x;
      // else if(resize_all == "h")
      // HEIGHT = CON.mouse.y;
      // else if(resize_all == "wh"){
      // WIDTH = mouse_x;
      // HEIGHT = CON.mouse.y;
      // }
      // RATIO = WIDTH/HEIGHT;
      // LAYER.set_canvas_size();
      // DRAW.zoom();
      // }
      this.resizeAll = false;
      // DRAW.zoom();
    },

    draw() {
      if (!this.$refs.myCanvas.getContext) return;
      this.img_w = this.img.width;
      this.img_h = this.img.height;

      // prepare canvas
      this.$refs.myCanvas.width = this.img_w;
      this.$refs.myCanvas.height = this.img_h;
      this.ctx = this.$refs.myCanvas.getContext('2d');
      this.ctx.clearRect(0, 0, this.img_w, this.img_h);
      this.ctx.fillStyle = '#cdcdcd';
      this.ctx.fillRect(0, 0, 800, 800);
      this.ctx.drawImage(this.img, 0, 0);
    },
    initImg() {
      this.img = new Image();
      this.img.src = this.demoImg;
      this.img.onload = () => {
        // this.ctx.scale(this.scaleRatio, this.scaleRatio);
        // this.ctx.translate(0, 0);
        // // this.ctx.rotate(-Math.PI / 10);
        this.ctx.drawImage(this.img, 0, 0, 1664, 1660);
        // console.log(-this.img.width / 2, -this.img.width / 2);
        // this.savePng();
      };
    },
    scratch() {
      this.curStatus = 'edit';
      // this.ctx.translate(0, 0);
      // this.ctx.scale(1, 1);

      this.$refs.myCanvas.onmousedown = (e) => {
        const downX = e.offsetX / this.scaleRatio;
        const downY = e.offsetY / this.scaleRatio;

        this.ctx.beginPath();
        this.ctx.lineWidth = 30;
        this.ctx.lineCap = 'round';
        this.ctx.moveTo(this.mouse.x, this.mouse.y);

        this.$refs.myCanvas.onmousemove = (ev) => {
          // const x = ev.offsetX / this.scaleRatio;
          // const y = ev.offsetY / this.scaleRatio;
          this.ctx.strokeStyle = 'white';
          this.ctx.lineTo(this.mouse.x, this.mouse.y);
          this.ctx.stroke();
        };
        this.$refs.myCanvas.onmouseup = () => {
          // this.savePng();
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
      // this.realCtx.clearRect(0, 0, 1664, 1660);
      if (direction === 'right') {
        this.angle = 10;
      } else {
        this.angle = -10;
      }

      this.ctx.save();
      this.ctx.fillStyle = '#cdcdcd';
      this.ctx.fillRect(0, 0, this.imgWidth, this.imgHeight);
      this.ctx.translate(this.img.width / 2, this.img.width / 2);
      this.ctx.rotate((this.angle * Math.PI) / 180);
      this.ctx.drawImage(this.img, -this.img.width / 2, -this.img.width / 2);
      this.ctx.restore();
      // this.realCtx.save();
      // this.realCtx.fillStyle = '#cdcdcd';
      // this.realCtx.fillRect(0, 0, this.imgWidth, this.imgHeight);
      // this.realCtx.translate(this.img.width / 2, this.img.width / 2);
      // this.realCtx.rotate((this.angle * Math.PI) / 180);
      // this.realCtx.drawImage(this.img, -this.img.width / 2, -this.img.width / 2);
      // this.realCtx.restore();
      // this.savePng();
    },
    undoFn() {
      const cacheLen = this.cacheMap.length;
      // console.log(cacheLen);
      if (cacheLen > 1) {
        this.img = this.cacheMap[cacheLen - 2];
        this.cacheMap.splice(cacheLen - 1, 1);
        // console.log(this.cacheMap);
      } else if (cacheLen > 0) {
        this.img = this.cacheMap[cacheLen - 1];
      }
      this.ctx.clearRect(0, 0, 1664, 1660);
      // this.realCtx.clearRect(0, 0, 1664, 1660);

      this.ctx.fillStyle = '#cdcdcd';
      this.ctx.fillRect(0, 0, this.imgWidth, this.imgHeight);
      this.ctx.drawImage(this.img, 0, 0);


      // this.realCtx.fillStyle = '#cdcdcd';
      // this.realCtx.fillRect(0, 0, this.imgWidth, this.imgHeight);
      // this.realCtx.drawImage(this.img, 0, 0);
    },
    savePng() {
      const originCanvas = this.$refs.realCanvas;
      const newImg = new Image();
      newImg.src = originCanvas.toDataURL('image/png', 1.0);
      this.cacheMap.push(newImg);
      if (this.cacheMap.length > 10) {
        this.cacheMap.splice(0, 1);
      }
      // console.log(this.cacheMap);
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

    initHermiteDemo() {
      // hermite demo

      this.img = new Image();
      this.img.crossOrigin = 'Anonymous'; // cors support
      this.img.onload = () => {
        this.draw();
        const resizeSize = 50; // 1-100
        this.resize(resizeSize);
        this.setSlider(resizeSize);
      };
      this.img.src = demoImg;
    },
    setSlider(value) {
      this.ZOOM = value;
    },
    resize(percentages, slider) {
      if (slider === true && this.current_size === percentages) {
        // stop event from firing twice - firefix bug
        return;
      }
      this.current_size = percentages;
      this.sliderValue = `${percentages}%`;
      const w = Math.round((this.img_w * percentages) / 100);
      const h = Math.round((this.img_h * percentages) / 100);
      this.canvasStyle.width = `${w}px`;
      this.canvasStyle.height = `${h}px`;
      console.log(this.canvasStyle);
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

canvas.cc{
border:1px solid #cccccc;
image-rendering: optimizeSpeed;
image-rendering: -moz-crisp-edges;
image-rendering: -webkit-optimize-contrast;
image-rendering: -o-crisp-edges;
image-rendering: pixelated;
-ms-interpolation-mode: nearest-neighbor;
}
.myCanvas{
margin-top: 100px;
}

/*预览 */
#preview{
width:150px;
height:150px;
background-color:#989898;
border:1px solid #393939;
margin:0px;
padding:0px;
position:fixed;
right:10px;
top:10px;
z-index:10;
font-size: 12px;
}
#preview canvas{
cursor: pointer;
position: absolute;
left: 0;
top:0;
}

</style>
