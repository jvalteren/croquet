/*global THREE*/

/*
  This is the interface to the Smalltalk-78 interpreter.
  We feed it mouse and keyboard events via "this.display",
  and call the VM's "interpret" method which runs for a couple ms,
  while drawing into our display's canvas.
*/

import { TWindow } from "./TWindow.js";
import { TRectangle } from "./TObjects.js";
import { TDynamicTexture } from "./TDynamicTexture.js";
import { St78, NT } from "../thirdparty/smalltalk78-vm.js";

export class TSmalltalk78 extends TRectangle {

  constructor(parent, onComplete, width = 16, height = 12, canvasWidth = 1024, canvasHeight = 768) {
    super(parent, null, width, height);

    this.dataImage = new TDynamicTexture(null, canvasWidth, canvasHeight);
    this.canvas = this.dataImage.canvas;
    this.texture = this.dataImage.getTexture();
    this.object3D.material.map = this.texture;

//    this.loadImage("https://lively-web.org/users/bert/St78/updates/updated.st78", onComplete);
    this.loadImage("thirdparty/TedNelson 280 Mon-4-21 10am.st78", onComplete);
  }

  openInWindow() {
    return new TWindow(null, null, 'Smalltalk-78', 0.5, this).display();
  }

  loadImage(imageUrl, onComplete) {
    console.log(`Fetching ${imageUrl}`);
    var rq = new XMLHttpRequest();
    rq.open("get", imageUrl, true);
    rq.responseType = "arraybuffer";
    rq.onload = (e) => {
      if (rq.status == 200) {
        this.runImage(rq.response, imageUrl, onComplete);
      }
      else rq.onerror(rq.statusText);
    };
    rq.onerror = function(e) {
      alert("Failed to download:\n" + imageUrl);
    }
    rq.send();
  }

  runImage(buffer, imageName, onComplete) {
    console.log(`Running ${imageName}, ${buffer.byteLength} bytes`);
    const image = St78.Image.readFromBuffer(buffer, imageName);
    this.display = this.createDisplay(this.canvas),
    this.vm = new St78.Interpreter(image, this.display);
    this.interpretLoop();
    typeof onComplete === "function" && onComplete(this);
  }

  interpretLoop() {
    try {
      this.vm.interpret(20, (ms) => {
        if (ms > 0) setTimeout(() => this.interpretLoop(), ms);
        else        requestAnimationFrame(() => this.interpretLoop());
      });
      // TODO: check if display actually dirty
      this.texture.needsUpdate = true;
    } catch(error) {
      console.error(error);
      alert(error);
    }
  }

  createDisplay(canvas) {
    return {
      ctx: canvas.getContext("2d"),
      width: canvas.width,
      height: canvas.height,
      timeStamp: Date.now(),
      mouseX: 0,
      mouseY: 0,
      buttons: 0,
      keys: [],
    };
  }

  /************************* MOUSE *************************************/

  positionInCanvas(pEvt) {
    this.makePlane(pEvt);
    const pt3d = this.trackPlane(pEvt);
    this.object3D.worldToLocal(pt3d);
    const {width, height} = this.canvas;
    const pt2d = new THREE.Vector2(
      (pt3d.x / this.width * 2 + 1) * width / 2 |0,
      (1 - pt3d.y / this.height * 2) * height / 2 |0);
    return pt2d.clamp({x: 0, y: 0}, {x: width, y: width});
  }

  mapButtons(pEvt) {
    var buttons = 0;
    if (pEvt.ctrlKey) buttons = NT.Mouse_Yellow;
    else if (pEvt.metaKey) buttons = NT.Mouse_Blue;
    else buttons = NT.Mouse_Red;
    return buttons;
  }

  onPointerDown(pEvt) {
    if(this.display === undefined) return true;
    var pt = this.positionInCanvas(pEvt);
    this.display.mouseX = pt.x;
    this.display.mouseY = pt.y;
    this.display.buttons = this.mapButtons(pEvt);
    return true;
  }

  onPointerMove(pEvt) {
    if(this.display === undefined) return true;
    var pt = this.positionInCanvas(pEvt);
    this.display.mouseX = pt.x;
    this.display.mouseY = pt.y;
    return true;
  }

  onPointerUp(pEvt) {
    if(this.display === undefined) return true;
    var pt = this.positionInCanvas(pEvt);
    this.display.mouseX = pt.x;
    this.display.mouseY = pt.y;
    this.display.buttons = 0;
    this.plane = null;
    return true;
  }

  //onPointerEnter(pEvt){
  //  this.onPointerMove(pEvt);
  //}

  onPointerOver(pEvt){
    this.onPointerMove(pEvt);
  }

  //onPointerLeaver(pEvt){
  //  this.onPointerMove(pEvt);
  //}
  /************************* KEYBOARD *************************************/

  recordKeyboardEvent(charCode, repeatOK) {
    // charCode is the code used in the image, which is
    // ASCII from 32-126 but custom outside that range
    // we do a reverse lookup in the keyboard map to find
    var key = NT.kbMap.indexOf(charCode) + 1;

    if (key) {
      var q = this.display.keys,
          repeat = 0;
      // limit how many repetitions of a key to queue in advance
      if (!repeatOK)
        while (repeat < q.length && key == q[q.length - (++repeat)]);
      if (repeat < 3)
        q.push(key);
    }
  }

  onKeyDown(pEvt) {
    this.display.timeStamp = Date.now();
    var evt = pEvt.event2D;
    var code, modifier;
    switch (evt.keyCode) {
      case 8:  code = 'bs'; break;
      case 9:  code = 'tab'; break;
      case 13: code = 'cr'; break;
      case 16: modifier = NT.Key_Shift; break;
      case 17: modifier = NT.Key_Ctrl; break;
      case 18: modifier = NT.Key_Meta; break;
      case 27: code = 'esc'; break;
      case 33: code = 'pageUp'; break;
      case 34: code = 'pageDown'; break;
      case 35: code = 'end'; break;
      case 36: code = 'home'; break;
      case 37: code = 'left'; break;
      case 38: code = 'up'; break;
      case 39: code = 'right'; break;
      case 40: code = 'down'; break;
      case 224: modifier = NT.Key_Meta; break;
    }
    if (code) { // special key pressed
      this.recordKeyboardEvent(NT.kbSymbolic[code]);
      evt.preventDefault();
      return true;
    }
    if (modifier) { // modifier pressed
      this.display.buttons |= modifier;
      return false;
    }
    if (evt.ctrlKey || evt.metaKey || evt.altKey) { // clipboard requires special handling
      var c = String.fromCharCode(evt.which);
      switch(c && c.toLowerCase()) {
        // return false to let default handler do its magic
        case 'c': this.doKeyCopy(evt); return false;
        case 'v': this.doKeyPaste(evt); return false;
      }
    }
    // regular cmd keys. TODO: Windows/Linux?
    if ((evt.metaKey || evt.altKey) && evt.which) {
      code = evt.keyCode;
      if (code >= 65 && code <= 90) {
        if (!evt.shiftKey) code += 32; // make lowercase
      } else {
        if (evt.keyIdentifier && evt.keyIdentifier.slice(0,2) == 'U+')
          code = parseInt(evt.keyIdentifier.slice(2), 16)
      }
      var command = NT.kbCommands[String.fromCharCode(code)];
      if (command === "interrupt") {
        this.display.interrupt = true;
      } else this.recordKeyboardEvent(NT.kbSymbolic[command]);
      evt.preventDefault();
      return true;
    }
    // regular keys
    if (typeof evt.key !== "string") return false;
    code = evt.key.charCodeAt(0);
    if (evt.ctrlKey) code &= ~96;
    // check for special
    if (code in NT.kbSpecial) {
      var char = NT.kbSpecial[code];
      code = NT.kbSymbolic[char] || char.charCodeAt(0);
    }
    // convert back from unicode if needed
    for (var ntcode in NT.toUnicode) {
      var unicode = NT.toUnicode[ntcode].charCodeAt(0);
      if (code == unicode) {
        code = ntcode.charCodeAt(0);
        break;
      }
    }
    this.recordKeyboardEvent(code);
    evt.preventDefault();
    return true;
  }

  onKeyUp(pEvt) {
    var evt = pEvt.event2D;
    var modifier;
    switch (evt.keyCode) {
      case 16: modifier = NT.Key_Shift; break;
      case 17: modifier = NT.Key_Ctrl; break;
      case 18:
      case 224: modifier = NT.Key_Meta; break;
    }
    if (modifier) {
      this.display.buttons &= ~modifier;
    }
    return false;
  }

}
