/*global THREE*/

import { TWindow } from "./TWindow.js";
import { shadama } from "CEO-Cockpit/shadama/shadama.js";
import { TRectangle } from "./TObjects.js";
import { TDynamicTexture } from "./TDynamicTexture.js";

export class ShadamaDisplay extends TRectangle {


  constructor(parent, onComplete, width = 128, height = 128, canvasWidth = 512, canvasHeight = 512) {
    super(parent, null, width, height, 10, 10);

    this.initShadama();
    
    this.dataImage = new TDynamicTexture(null, canvasWidth, canvasHeight, 'white');
    this.texture = this.dataImage.getTexture();
    this.texture.flipY = false;
    this.canvasCtx = this.dataImage.canvas.getContext("2d");;
    this.object3D.material.map = this.texture;


    typeof onComplete === "function" && onComplete(this);
  }

  initShadama() {
    shadama.initialize();
    shadama.makeTarget();
    shadama.setReadPixelCallback(imageData => this.renderImageData(imageData));
  }

  loadExample() {
    this.loadCode(this.testCode());
  }

  loadCode(code) {
    shadama.loadShadama(null, code);
    shadama.maybeRunner();
  }

  testCode() {
    return shadama.testShadama();
  }

  pause() {
    shadama.pause();
  }

  destroy() {
    shadama.destroy();
  }

  renderImageData(imageData) {
    this.canvasCtx.putImageData(imageData, 0, 0);
    this.texture.needsUpdate = true;
  }

  onPointerDown(pEvt) {
    var scale = 4;  // presumably canvasWidth / width
    this.makePlane(pEvt);
    var pt = this.trackPlane(pEvt);
    this.object3D.worldToLocal(pt);

    var x = pt.x * scale + (this.width * 2);
    var y = pt.y * scale + (this.height * 2);
    shadama.pointerdown(x, y);
  }

  onPointerMove(pEvt) {
    var scale = 4;  // presumably canvasWidth / width
    this.makePlane(pEvt);
    var pt = this.trackPlane(pEvt);
    this.object3D.worldToLocal(pt);

    var x = pt.x * scale + (this.width * 2);
    var y = pt.y * scale + (this.height * 2);
    shadama.pointermove(x, y);
  }

  onPointerUp(pEvt) {
    var scale = 4;  // presumably canvasWidth / width
    this.makePlane(pEvt);
    var pt = this.trackPlane(pEvt);
    this.object3D.worldToLocal(pt);

    var x = pt.x * scale + (this.width * 2);
    var y = pt.y * scale + (this.height * 2);
    shadama.pointerup(x, y);
  }
}

