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
        <!-- <el-button type="primary" ref="rotateLeft" icon="el-icon-d-arrow-left"
         @click="rotateFn('left')" circle>Turn Left</el-button> -->
        <el-button type="primary" ref="rotateRight" icon="iconfont icon-arrow-right2"
         @click="showRotatePop" circle>Turn Right</el-button>
        <el-button type="primary" ref="save" icon="iconfont icon-reset-all"
         @click="undoFn" circle>undo</el-button>
        <el-button type="primary" ref="save" icon="el-icon-upload"
        @click="savePng" circle>Save</el-button>

      </el-row>
    </div>

</div>
  <div style="display:block;position:absolute;left:0;top:50px;width:150px;background:lightBlue">
      <h3 style="margin: 5px 0px;">缩放控制器</h3>
        <input id="slider" :model="ZOOM" min="1" max="100" step="1"
        @input="zoomFn($event.target.value, true);" type="range">
        <span style="margin-right:10px;" id="slider_value" ref="slider_value">
          {{sliderValue}}</span><br/>

        <br /><br />

    </div>
    <!--旋转控制-->
    <div style="display:block;position:absolute;left:0;top:250px;width:300px;background:pink">
      <h3 style="margin: 5px 0px;">旋转</h3>
        <input id="angleSlider" :model="angle" value="0" min="0" max="360" step="1"
        @input="slideRotate($event.target.value, true);" type="range">
        <span style="margin-right:10px;" id="slider_value" ref="slider_value">
          {{angle}}</span><br/>
        <br /><br />
        <div class="rotate-view">
          <canvas id="pop_post" ref="popPost" style="position:relative;border:1px solid #393939;background-color:#ffffff;" :width="miniW" :height="miniH"></canvas>
        </div>
        <div>
           <el-button type="" ref="rotateRight" @click="cancelRotate" >取消</el-button>
         <el-button type="primary" ref="rotateRight" @click="confirmRotate" >确定</el-button>
        </div>
    </div>
  </div>
</template>

<script>
import HermiteClass from 'hermite-resize';
import demoImg from '@/assets/demo.png';

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
      angle: 0,
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
      undo_level: 0,
      LAYERS_ARCHIVE: [],
      RATIO: 1,
      miniW: 190,
      miniH: 140,
      canvasActive: null,
    };
  },

  mounted() {
    // this.draw();
    this.initHermiteDemo();

    document.onmousedown = this.mouseClick;// mouse click
    document.onmousemove = this.mouseMove;// mouse move
    document.onmouseup = this.mouseRelease;// mouse resease
    window.ondragover = (e) => { e.preventDefault(); };
  },
  methods: {
    saveState() {
      this.undo_level = 0;
      const j = 0;
      // move previous
      this.LAYERS_ARCHIVE[2] = this.LAYERS_ARCHIVE[1];
      this.LAYERS_ARCHIVE[1] = this.LAYERS_ARCHIVE[0];

      // save last state
      this.LAYERS_ARCHIVE[j] = {};
      this.LAYERS_ARCHIVE[j].width = this.WIDTH;
      this.LAYERS_ARCHIVE[j].height = this.HEIGHT;
      this.LAYERS_ARCHIVE[j].data = {};
      // for (const i in LAYERS) {
      this.LAYERS_ARCHIVE[j].data.myCanvas = document.createElement('canvas');
      this.LAYERS_ARCHIVE[j].data.myCanvas.width = this.WIDTH;
      this.LAYERS_ARCHIVE[j].data.myCanvas.height = this.HEIGHT;
      this.LAYERS_ARCHIVE[j].data.myCanvas.getContext('2d').drawImage(this.$refs.myCanvas, 0, 0);
      // }
      console.log(this.LAYERS_ARCHIVE);
      // return true;
    },
    get_mouse_position(event) {
      // get mouse positon
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
      if (event.target.id === 'canvas_preview') {
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
      this.get_mouse_position(event);
      // window resize
      if (this.ZOOM === 100) {
        if (event.target.id === 'resize-w') {
          document.body.style.cursor = 'w-resize';
        } else if (event.target.id === 'resize-h') {
          document.body.style.cursor = 'n-resize';
        } else if (event.target.id === 'resize-wh') {
          document.body.style.cursor = 'nw-resize';
        } else { document.body.style.cursor = 'auto'; }
        if (this.resizeAll !== false && this.isDrag === true) {
          document.body.style.cursor = 'auto';

          event.preventDefault();
          // HELPER.remove_selection();
          return;
        }
      }
      if (this.isDrag === false) return;// only drag now

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

    scratch() {
      this.curStatus = 'edit';
      // this.ctx.translate(0, 0);
      // this.ctx.scale(1, 1);

      this.$refs.myCanvas.onmousedown = (e) => {
        if (this.mouse.valid === false) return;
        this.saveState();
        // const downX = e.offsetX / this.scaleRatio;
        // const downY = e.offsetY / this.scaleRatio;
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

    rotate_resize_doc(angle, w, h) {
      debugger;
      console.log(angle, w, h);

      const o = angle * (Math.PI / 180);
      let new_x = (w * Math.abs(Math.cos(o))) + (h * Math.abs(Math.sin(o)));
      let new_y = (w * Math.abs(Math.sin(o))) + (h * Math.abs(Math.cos(o)));
      new_x = Math.ceil(Math.round(new_x * 1000) / 1000);
      new_y = Math.ceil(Math.round(new_y * 1000) / 1000);

      if (this.WIDTH !== new_x || this.HEIGHT !== new_y) {
        // this.save_state();
        let dx = 0;
        let dy = 0;
        if (new_x > this.WIDTH) {
          dx = Math.ceil(new_x - this.WIDTH) / 2;
          this.WIDTH = new_x;
        }
        if (new_y > this.HEIGHT) {
          dy = Math.ceil(new_y - this.HEIGHT) / 2;
          this.HEIGHT = new_y;
        }
        this.RATIO = this.WIDTH / this.HEIGHT;
        this.resizeSanvas('myCanvas');

        // for (const i in LAYERS) {
        const layer = this.$refs.myCanvas.getContext('2d');
        const tmp = layer.getImageData(0, 0, this.WIDTH, this.HEIGHT);
        console.log(tmp);

        layer.clearRect(0, 0, this.WIDTH, this.HEIGHT);
        layer.fillStyle = '#cdcdcd';
        layer.putImageData(tmp, dx * (this.ZOOM / 100), dy * (this.ZOOM / 100));

        // }
      }
    },
    // rotate layer
    rotate_layer(canvas, w, h) {
      const TO_RADIANS = Math.PI / 180;

      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = w;
      tempCanvas.height = h;

      const imageData = this.$refs.myCanvas.getContext('2d').getImageData(0, 0, w, h);
      tempCtx.putImageData(imageData, 0, 0);
      const canvasActiveCtx = this.$refs.myCanvas.getContext('2d');
      // rotate
      canvasActiveCtx.clearRect(0, 0, w, h);
      canvasActiveCtx.save();
      canvasActiveCtx.fillStyle = '#cdcdcd';
      canvasActiveCtx.translate(Math.round(w / 2), Math.round(h / 2));
      canvasActiveCtx.rotate(this.angle * TO_RADIANS);
      canvasActiveCtx.drawImage(tempCanvas, -Math.round(w / 2), -Math.round(h / 2), w, h);
      canvasActiveCtx.restore();
      if (w === this.WIDTH) {
        // DRAW.zoom();
      }
    },
    resizeSanvas(canvas_name, repaint) {
      console.log('初始化的 设置canvas尺寸');
      const W = Math.round(this.WIDTH);
      const H = Math.round(W / this.RATIO);
      const canvas = this.$refs[canvas_name];
      const ctx = canvas.getContext('2d');

      if (repaint === false) {
        canvas.width = W;
        canvas.height = H;
      } else {
        // save
        const buffer = document.createElement('canvas');
        buffer.width = this.WIDTH;
        buffer.height = this.HEIGHT;
        buffer.getContext('2d').drawImage(canvas, 0, 0);
        canvas.width = W;
        canvas.height = H;
        ctx.fillStyle = '#cdcdcd';
        // restore
        ctx.drawImage(buffer, 0, 0);
      }
    },

    undoFn() {
      console.log('undo');
      if (this.LAYERS_ARCHIVE.length === 0) return false;
      const j = this.undo_level;
      console.log(`undo_level  ${this.undo_level}`);
      this.undo_level++;
      console.log(this.LAYERS_ARCHIVE[j]);
      if (this.LAYERS_ARCHIVE[j] === undefined || this.LAYERS_ARCHIVE[j].width === undefined) {
        return false;
      }
      if (this.WIDTH !== this.LAYERS_ARCHIVE[j].width || this.HEIGHT !== this.LAYERS_ARCHIVE[j].height) {
        this.WIDTH = this.LAYERS_ARCHIVE[j].width;
        this.HEIGHT = this.LAYERS_ARCHIVE[j].height;
        this.RATIO = this.WIDTH / this.HEIGHT;
        // this.LAYER.set_canvas_size(true);
        // return true;// size changed, cant undo
      }

      // undo
      // for(var i in LAYERS){
      if (this.LAYERS_ARCHIVE[j].data.myCanvas !== undefined) {
        this.$refs.myCanvas.getContext('2d').clearRect(0, 0, this.WIDTH, this.HEIGHT);
        this.$refs.myCanvas.getContext('2d').drawImage(this.LAYERS_ARCHIVE[j].data.myCanvas, 0, 0);
      }
      return true;
      // }
      // DRAW.zoom();
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
        this.zoomFn(resizeSize);
        this.setSlider(resizeSize);
      };
      this.img.src = demoImg;
    },
    setSlider(value) {
      this.ZOOM = value;
    },
    zoomFn(percentages, slider) {
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
    slideRotate(value, slider) {
      if (slider === true && this.angle === value) {
        // stop event from firing twice - firefix bug
        return;
      }
      this.angle = value;

      const popPostCtx = this.$refs.popPost.getContext('2d');
      popPostCtx.save();
      popPostCtx.fillStyle = '#cdcdcd';
      popPostCtx.fillRect(0, 0, this.miniW, this.miniH);
      popPostCtx.translate(this.miniW / 2, this.miniH / 2);
      popPostCtx.rotate((this.angle * Math.PI) / 180);
      popPostCtx.drawImage(this.img, -(this.miniW / 2), -(this.miniH / 2), this.miniW, this.miniH);
      popPostCtx.restore();
    },
    showRotatePop() {
      // 预览旋转图片
      console.log(this.$refs.popPost);
      const popPostCtx = this.$refs.popPost.getContext('2d');
      popPostCtx.rect(0, 0, this.miniW, this.miniH);
      popPostCtx.fillStyle = '#ffffff';
      popPostCtx.fill();
      popPostCtx.drawImage(this.$refs.myCanvas, 0, 0, this.miniW, this.miniH);
    },
    cancelRotate() {
      // 取消旋转
    },
    confirmRotate() {
      // 确定旋转 大图
      // 旋转 大小重新计算
      this.rotate_resize_doc(this.angle, this.imgWidth, this.imgHeight);
      // 旋转图层
      this.rotate_layer(this.$refs.myCanvas, this.WIDTH, this.HEIGHT);
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
