// Copyright 2018 by arcos and OS.Vision.
// This software is licensed under the Apache 2 open source license
// davidasmith@gmail.com - david@os.vision
// 919-244-4448
// These are the foundational classes for the system.


/*global THREE*/

var Globals = window.Globals || (window.Globals = {
  imagePath: 'img/',
  videoPath: 'video/',
  isReady: true,
  executeArray: [],
  standardColor: new THREE.Color(0x3388cc),
  secondaryColor: new THREE.Color(0xdd9944),
  hiliteColor: new THREE.Color(0xe8e8a0),
  resetVector: new THREE.Vector3(),
  resetQuaternion: new THREE.Quaternion(),
  cameraLocked: false, // camera starts in walk position - locked===can look around but can't move
  keyVelocity: 0.5, // speed at which the camera moves up and down
});

var isSafari = navigator.vendor && navigator.vendor.indexOf('Apple') > -1 &&
               navigator.userAgent && !navigator.userAgent.match('CriOS');

export { Globals}

function setResolution(res){
  if(res>1)res=1;
  let vrd = Globals.renderer.vr.getDevice(); // won't let me resize if vrDevice is set.
  if(vrd)Globals.renderer.vr.setDevice(null);
  Globals.effect.setSize( window.innerWidth * res, window.innerHeight * res );
  Globals.renderer.domElement.style.width = window.innerWidth + 'px';
  Globals.renderer.domElement.style.height = window.innerHeight + 'px';
  Globals.camera.aspect = window.innerWidth / window.innerHeight;
  if(vrd)Globals.renderer.vr.setDevice(vrd);
}

//------------------------------------------------------------------------
// TObject is the base class for all of the objects inside of the system.
// We use the Lively Kernel class system. This isn't better or worse than any
// others - I started building this system with Lively and just kept this
// architecture. It is convenient.
// The T notation defining the user interface classes comes from Croquet which
// was originally called Tea. At this point it is a meaningless historical
// footnote. Also, the "users." notation comes from Lively, as that was their
// naming convention for users vs system parts of the Lively. The new version of
// Lively will eliminate that distinction, but until it is ready for prime-time
// I will keep this because I may need to utilize Lively again.
export class TObject extends Object{

  constructor(parent, onComplete, object3D){
    // construct a 3D object - call onComplete after object is constructed
    this.selectable = true;
    this.setObject3D(object3D || new THREE.Group());
    this.object3D.name = 'TObject';
    this.extent = new THREE.Vector3();
    if(parent)parent.addChild(this);
        if(onComplete)onComplete(this);
   }


  getTScene(){
    // fix for when not in scene
    return Globals.tScene;
  }

  world(){
    // for now just an alias, TScene seems to take over most roles of a
    // Morphic World
    return this.getTScene();
  }

  setObject3D(o3D, selectable){
    o3D.userData = this;
    this.object3D = o3D;
    this.selectable = selectable !== undefined ? selectable : true;
  }

  getObject3D(){return this.object3D}

  getRayTestArray(){return [this.object3D]; } // returns an array. If you override this, you need to manage the result in the events

  addChild(child){
    if(child.parent){child.parent.removeChild(child);};
    this.object3D.add(child.object3D);
    child.parent = this;
    child.onAdoption();
    return child;
  }

  removeChild(child){
    if(Globals.tScene.selectedTObject===child)Globals.tScene.selectedTObject = null;
    if(Globals.tScene.overTObject===child)Globals.tScene.overTObject = null;
    if(Globals.tScene.keyboardTObject===child)Globals.tScene.keyboardTObject = null;
    this.object3D.remove(child.object3D);
    child.parent = null;
    child.onOrphan();
    return child;
  }

  removeSelf(){
    if(this.parent)this.parent.removeChild(this);
  }

  destroySelf(){
    // this should reclaim all memory for the TObject - each is different
  }

  getChildren() {
    return this.object3D.children
      .map(ea => ea.userData !== this && ea.userData instanceof TObject ?
                  ea.userData : null)
      .filter(Boolean);
  }

  withAllChildrenDo(doFn, depth) {
    if (!depth) depth = 0;
    let result = [], children = this.getChildren();
    for (let i = 0; i < children.length; i++) {
      let child = children[i];
      result.push(doFn(child, depth));
      result.push.apply(result, child.withAllChildrenDo(doFn, depth + 1));
    }
    return result;
  }

  find(matchFn, depth) {
    if (!depth) depth = 0;
    if (matchFn(this)) return this;
    let children = this.getChildren();
    for (let i = 0; i < children.length; i++) {
      let found = children[i].find(matchFn, depth + 1);
      if (found) return found;
    }
    return null;
  }

  onAdoption(){} // if we are added to a parent

  onOrphan(){} // if we are removed from a parent

  onContentsChanged(){} // if our content changes in some way, usually in size, then do something

  contentsChanged(){if(this.parent){this.parent.onContentsChanged(); this.parent.contentsChanged();}} //let parent know contents have changed

  boundingBox(){ // this needs to recursively merge the bounding box of all of the objects it contains
    return new THREE.Box3().setFromObject(this.object3D);
  }
  // XYZZY - this is a naive implementation. It really needs to include the full graph of the objects that this object is the root of - TBD
  extent3D(vec3){
    var rVec = vec3 || new THREE.Vector3();
    var bb = this.boundingBox();
    rVec.copy(bb.max);
    rVec.sub(bb.min);
    return rVec;
  }

  center3D(vec3){
    var rVec = vec3 || new THREE.Vector3();
    var bb = this.boundingBox();
    if(bb){
      rVec.copy(bb.max);
      rVec.add(bb.min);
      rVec.multiplyScalar(0.5);
     }
    return rVec;
  }

  isContainer(){return false;}

  position3D() { return this.object3D.position; }

// events
  update(time, tScene){}


  // this will not always work if the object is more complex.
  ignoreEvents(){ this.object3D.raycast = function(){};}
  // if the onPointer event returns false, then go up the tree until we get to the root
  doPointerDown(pEvt){
    if(!this.onPointerDown(pEvt) && this.parent) // this TObject does not handle the event. Check his parent.
      return this.parent.doPointerDown(pEvt); // recurse up the tree
  }
  doPointerMove(pEvt){
    if(!this.onPointerMove(pEvt) && this.parent) // this TObject does not handle the event. Check his parent.
      return this.parent.doPointerMove(pEvt); // recurse up the tree
  }
  doPointerUp(pEvt){
    if(!this.onPointerUp(pEvt) && this.parent) // this TObject does not handle the event. Check his parent.
      return this.parent.doPointerUp(pEvt); // recurse up the tree
  }
  doPointerEnter(pEvt){
    if(!this.onPointerEnter(pEvt && this.parent)) // this TObject does not handle the event. Check his parent.
      return this.parent.doPointerEnter(pEvt); // recurse up the tree
  }
  doPointerOver(pEvt){
    if(!this.onPointerOver(pEvt) && this.parent) // this TObject does not handle the event. Check his parent.
      return this.parent.doPointerOver(pEvt); // recurse up the tree
  }
  doPointerLeave(pEvt){
    if(!this.onPointerLeave(pEvt) && this.parent) // this TObject does not handle the event. Check his parent.
      return this.parent.doPointerLeave(pEvt); // recurse up the tree
  }
  doDoubleClick(pEvt){
    //console.log('TObject>>doDoubleClick');
    if(!this.onDoubleClick(pEvt) && this.parent) // this TObject does not handle the event. Check his parent.
      return this.parent.doDoubleClick(pEvt); // recurse up the tree
  }

  onPointerDown(pEvt)  { return false; }
  onPointerMove(pEvt)  { return false; }
  onPointerUp(pEvt)    { return false; }
  onPointerEnter(pEvt) { return false; }
  onPointerOver(pEvt)  { return false; }
  onPointerLeave(pEvt) { return false; }
  onDoubleClick(pEvt)  { return false; }
  onKeyDown(pEvt)      { return false; }
  onKeyUp(pEvt)        { return false; }
  onTextInput(pEvt)    { return false; }
  onCopy(pEvt)         { return false; }
  onPaste(pEvt)        { return false; }
  onCut(pEvt)          { return false; }

  visible(v){if(this.object3D)this.object3D.visible = v;}

  goTo(pos, quat, scale, count) {
    if (!this.goToHere)
      this.goToHere = new GoTo(this.object3D);
    return this.goToHere.goTo(pos, quat, scale, count);
  }

  update(time, tScene){
    // nothing to do here
  }

  doUpdate(time, tScene){
    if(this.goToHere && this.goToHere.slerpTotal){this.goToHere.update(time, tScene);}
    this.update(time, tScene);
    if(this.object3D.children)
      this.object3D.children.forEach(
        function(s){ if(s.userData && s.userData.object3D == s)s.userData.doUpdate(time, tScene);});
  }

  makePlane(pEvt, worldDirection){
    // worldDirection is an optional direction vector if you don't want to use the objects world direction
    var vec0 = new THREE.Vector3(), vec1 = new THREE.Vector3(), vec2 = new THREE.Vector3();
    vec0.copy(pEvt.point);
    this.object3D.worldToLocal(vec0);
    var offset = vec0.z;
    if(worldDirection)vec1.copy(worldDirection);
    else this.object3D.getWorldDirection(vec1);
    vec2.copy(vec1);
    vec2.multiplyScalar(offset);
    // compute the plane
    this.object3D.getWorldPosition(vec0);
    vec0.add(vec2);
    var len = vec0.length();
    vec0.normalize();
    this.plane = new THREE.Plane(vec1, -vec0.dot(vec1)*len);
  }

  trackPlane(pEvt){
    if(this.plane){
      var vec0 = new THREE.Vector3();
      pEvt.ray3D.ray.intersectPlane(this.plane, vec0);
      return vec0;
    }
    else return null;
  }

  // release is usually used to drop an object from the TAvatar to the TScene. TWindow has its own version.
  // It maintains the current world orientation
  release(){
    this.object3D.updateMatrixWorld(true);
    this.object3D.setMatrix(this.object3D.matrixWorld);
    this.getTScene().addChild(this);
  }

  //  'transformations'
  spinToQuaternion(fromV, toV){
    fromV.normalize();
    toV.normalize();
    fromV.add(toV); fromV.normalize();
    fromV.add(toV); fromV.normalize();
    return new THREE.Quaternion(
      (fromV.y * toV.z) - (fromV.z * toV.y),
      (fromV.z * toV.x) - (fromV.x * toV.z),
      (fromV.x * toV.y) - (fromV.y * toV.x),
      (fromV.x * toV.x) + (fromV.y * toV.y) + (fromV.z * toV.z ))
  }

    // "status messages"

  setStatusMessage(msg, color, delay, opts) {
    this.world().setStatusMessage(msg, color, delay, opts);
  }

  showError(err) {
    this.world().logError(err);
  }
}

  lively.lang.klass.addMethods(TObject,
    lively.keyboard.CommandTrait,
    lively.keyboard.KeyBindingsTrait);

  //------------------------------------------------------------------------
  // TScene is the root and also manages user input
export class TScene extends TObject{

  // 'initialize',
  constructor(scene, camera, renderer, doSetup){
    this.isMoving = false;
    this.raycaster = new THREE.Raycaster();
    this.pointerDirection = new THREE.Vector3();
    this.forward = new THREE.Vector3();
    this.pitchVelocity = 0;
    this.yawVelocity = 0;
    //this.velocity = new THREE.Vector3();
    this.anaglyph = false;
    this.resolutionScale = 1;
    this.frameRateSum = 0;
    this.frameCount = 0;
    this.lastTime = 0;
    this.cVector = new THREE.Vector3();

    this.scene = scene;
    this.setObject3D(scene);
    this.object3D.name = 'TScene';
    this.camera = camera;
    this.renderer = renderer;
    this.pointerEvent = new PointerEvent();
    this.pointerEvent.tScene = this;
  }

  // this is called by setupController in buildWorld.js
  setPointer(tPointer){
    //console.log("TScene.setPointer "+tPointer);
    this.tPointer = tPointer;
    tPointer.tScene = this;
  }

  // 'accessing'
  getTScene(){return this}

  addSystemButtons(buttons){
    this.systemButtons = buttons;
  }

  // 'updating'
  update(timeStamp, tScene){
    this.frameCount++;
    this.frameRateSum += timeStamp-this.lastTime;
    this.lastTime = timeStamp;
    if(this.frameCount>15)
    {
      this.frameCount = 0;
      if (!(Globals.urlOptions.adaptiveresolution===true)) {
          this.resolutionScale *= 333/this.frameRateSum; // stay faster than 30 HZ.
          if(this.resolutionScale>1)this.resolutionScale=1;
          if(this.resolutionScale<0.5)this.resolutionScale=0.5;
          setResolution(this.resolutionScale);
      }
      this.frameRateSum = 0;
    }
    if(this.isMoving)this.drive();
  }

  //  'pointer events' // return of true terminates search for handler
    onPointerDown(pEvt){return true;}
    onPointerMove(pEvt){return true;}
    onPointerUp(pEvt){
      // remove displayed if we clicked anywhere else (up)
      if(this.displayed){
        if(this.selectedTObject === this.displayed)this.selectedTObject = null;
        this.displayed.doHide();
        this.displayed = null;
      }else this.setDisplay(this.systemButtons);
      return true;
    }
    onPointerEnter(pEvt){return true;}
    onPointerOver(pEvt){return true;}
    onPointerLeave(pEvt){return true;}
    onDoubleClick(pEvt){return true;}
    setDisplay(display){
      if(this.displayed){this.displayed.removeSelf();}
      this.displayed = display;
      return this.displayed.doShow(Globals.tAvatar, function(tObj){tObj.object3D.position.set(0,0,-12); tObj.object3D.quaternion.set(0,0,0,1); });
    }
    clearDisplay(){
      if(this.display){this.display.removeSelf(); this.display = null}
    }


    // "key events"

    setKeyboardFocus(tObject) {
      this.keyboardTObject = tObject;
      if (!tObject) return;
      let inputCapture = this.domInputCapture;
      if (tObject.isText) {
        inputCapture.keepTextNodeFocused = true;
        inputCapture.focusTextareaNode();
      } else {
        inputCapture.keepTextNodeFocused = false;
        inputCapture.focusRootNode();
      }
    }

    onKeyUp(pEvt) { this.isMoving = false; return true; }
    onKeyDown(pEvt) {
      // console.log("TScene>>onKeyDown: " + lively.keyboard.Keys.canonicalizeEvent(pEvt.event2D).key);
      if (lively.keyboard.KeyHandler.invokeKeyHandlers(
        this, pEvt.event2D, false/*allow input evts*/))
          pEvt.event2D.preventDefault();
      return true;
    }

    get keybindings() {
      return [
        {keys: "Space", command: "reset avatar"},
        //{keys: "=|Shift-=|+", command: "increase resolution"},
        //{keys: "-|Shift--", command: "decrease resolution"},
        {keys: "N", command: "toggle stereo rendering"},
        {keys: "A", command: "rotate left"},
        {keys: "Shift-A", command: "strafe left"},
        {keys: "D", command: "rotate right"},
        {keys: "Shift-D", command: "strafe right"},
        {keys: "W", command: "move forward"},
        {keys: "Shift-W", command: "move up"},
        {keys: "S", command: "move backward"},
        {keys: "Shift-S", command: "move down"},
        {keys: "arrowleft", command: "rotate left"},
        {keys: "arrowright", command: "rotate right"},
        {keys: "arrowup", command: "move forward"},
        {keys: "arrowdown", command: "move backward"},
        {keys: "Shift-arrowleft", command: "strafe left"},
        {keys: "Shift-arrowright", command: "strafe right"},
        {keys: "Shift-arrowup", command: "move up"},
        {keys: "Shift-arrowdown", command: "move down"},
        {keys: "G", command: "toggle grid" }, // ael

      ]
    }

    get commands() {
      return [
        {
          name: "toggle grid",
          exec: () => {
            if(Globals.tGrid.parent)Globals.tGrid.removeSelf();
            else Globals.tScene.addChild(Globals.tGrid);
            return true;
          }
        },
        {
          name: "toggle stereo rendering",
          exec: () => {
            // Apply VR stereo rendering to renderer.
            var effect;
            this.anaglyph = !this.anaglyph;
            if (this.anaglyph) {
              Globals.effect = this.effect = new THREE.AnaglyphEffect(Globals.renderer);
              console.log("Anaglyph is on");
            } else {
              Globals.effect = this.effect = new THREE.VREffect(Globals.renderer);
              console.log("Anaglyph is off");
            }
            this.effect.setSize(window.innerWidth, window.innerHeight);
            return true;
          }
        },

        {
          name: "reset avatar",
          exec: () => {
            Globals.tAvatar.goTo(Globals.resetVector, Globals.resetQuaternion, null, 10);
            return true;
          }
        },

        {
          name: 'move forward',
          exec: () => {
            if(Globals.cameraLocked)
              this.velocity = new THREE.Vector3(0,Globals.keyVelocity,0);
            else
              this.velocity = Globals.tAvatar.camera.getWorldDirection();
            this.yawVelocity = 0;
            this.isMoving = true;
          }
        },

       {
          name: 'move up',
          exec: () => {
            this.velocity = new THREE.Vector3(0,Globals.keyVelocity,0);
            this.yawVelocity = 0;
            this.isMoving = true;
          }
        },

        {
          name: 'move backward',
          exec: () => {
            if(Globals.cameraLocked)
              this.velocity = new THREE.Vector3(0,Globals.keyVelocity,0);
            else
              this.velocity = Globals.tAvatar.camera.getWorldDirection();
            this.velocity.negate();
            this.yawVelocity = 0;
            this.isMoving = true;
          }
        },
       {
          name: 'move down',
          exec: () => {
            this.velocity = new THREE.Vector3(0,-Globals.keyVelocity,0);
            this.yawVelocity = 0;
            this.isMoving = true;
          }
        },
        {
          name: 'rotate left',
          exec: () => {
            this.velocity = Globals.tAvatar.camera.getWorldDirection();
            this.velocity.set(0,0,0);
            this.yawVelocity = 0.05;
            this.isMoving = true;
          }
        },
        {
          name: 'strafe left',
          exec: () => {
            var forward = Globals.tAvatar.camera.getWorldDirection();
            var deltaX = Globals.keyVelocity;
            forward.set(deltaX*forward.z,0,-deltaX*forward.x)
            this.velocity=forward;
            this.yawVelocity = 0;
            this.isMoving = true;
          }
        },
        {
        name: 'rotate right',
          exec: () => {
            this.velocity = Globals.tAvatar.camera.getWorldDirection();
            this.velocity.set(0,0,0);
            this.yawVelocity = -0.05;
            this.isMoving = true;
          }
        },
        {
        name: 'strafe right',
          exec: () => {
            var forward = Globals.tAvatar.camera.getWorldDirection();
            var deltaX = -Globals.keyVelocity;
            forward.set(deltaX*forward.z,0,-deltaX*forward.x)
            this.velocity=forward;
            this.yawVelocity = 0;
            this.isMoving = true;
          }
        },
      ];

    }

  //   'raw events'

    setupEvents(domElement) {
      let tScene = this;

      // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
      // pointer events
      domElement.addEventListener("click",      evt => tScene.enterClick(evt),      false);
      domElement.addEventListener("dblclick",   evt => tScene.enterDblClick(evt),   false);
      domElement.addEventListener("mousemove",  evt => tScene.enterMouseMove(evt),  false);
      domElement.addEventListener("touchmove",  evt => tScene.enterMouseMove(evt),  false);
      domElement.addEventListener("mousedown",  evt => tScene.enterMouseDown(evt),  false);
      domElement.addEventListener("mouseup",    evt => tScene.enterMouseUp(evt),    false);
      domElement.addEventListener("wheel",      evt => tScene.enterMouseWheel(evt), false);
      domElement.addEventListener("touchmove",  evt => tScene.enterTouchMove(evt),  false);
      domElement.addEventListener("touchstart", evt => tScene.enterTouchStart(evt), false);
      domElement.addEventListener("touchend",   evt => tScene.enterTouchEnd(evt),   false);


      // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
      // key events
      // this replaces the various enter methods for key events:
      let methodMap = {
        keydown: "onKeyDown",
        keyup: "onKeyUp",
        input: "onTextInput",
        copy: "onCopy",
        cut: "onCut",
        paste: "onPaste",
      }

      let eventDispatcher = {
        dispatchDOMEvent: evt => {
          tScene.pointerEvent.event2D = evt;

          let target = Globals.tScene.keyboardTObject || Globals.tScene,
              method = methodMap[evt.type];

          // invokes onXXX handler method of target tObject.
          // if the return value is truthy than stop event dispatch
          // otherwise, bubble up the parent chain
          while (target) {
            if (typeof target[method] !== "function") {
              tScene.logError(`${target} does not have method ${method}!`);
            }
            try {
              let result = target[method](tScene.pointerEvent);
              if (result) { evt.stopPropagation(); return; }
              target = target.parent;
            } catch (err) {
              console.error(`Error in event handler ${target}.${method}:`, err);
              return;
            }
          }
          console.warn(`Unhandled event: ${evt.type}`);
        }
      };

      tScene.domInputCapture = new lively.keyboard.DOMInputCapture(eventDispatcher);
      tScene.domInputCapture.install(document.body);


      // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
      // native drag/drop events

      var lastTarget;

      function isFile(evt) {
        var dt = evt.dataTransfer;
        for (var i = 0; i < dt.types.length; i++) {
            if (dt.types[i] === "Files") {
                return true;
            }
        }
        return false;
      };
      window.addEventListener("dragenter", function (e) {
          if (isFile(e)) {
              lastTarget = e.target;
              document.querySelector("#dropzone").style.visibility = "";
              document.querySelector("#dropzone").style.opacity = 1;
              document.querySelector("#textnode").style.fontSize = "48px";
          }
      });
      window.addEventListener("dragleave", function (e) {
          e.preventDefault();
          if (e.target === lastTarget) {
              document.querySelector("#dropzone").style.visibility = "hidden";
              document.querySelector("#dropzone").style.opacity = 0;
              document.querySelector("#textnode").style.fontSize = "42px";
          }
      });
      window.addEventListener("dragover", function (e) {
          e.preventDefault();
      });
      window.addEventListener("drop", function (e) {
          e.preventDefault();
          console.log("Dropped", e.dataTransfer.files);
          document.querySelector("#dropzone").style.visibility = "hidden";
          document.querySelector("#dropzone").style.opacity = 0;
          document.querySelector("#textnode").style.fontSize = "42px";
          new users.TImporter(tScene, e.dataTransfer.files);
          //var files = e.dataTransfer.files; // Array of all files
          //for (var i=0, file; file=files[i]; i++) {
            //console.log(file);
            //TImporter(self, file);

              //document.querySelector("#text").innerHTML =
              //   "<b>File selected:</b><br>" + e.dataTransfer.files[0].name;
          //}
      });
      // document.addEventListener("contextmenu", function(evt){ evt.preventDefault(); self.onMouseDown(evt)}, false);
      //this.domElement.addEventListener( 'contextmenu', function(evt){self.onContextmenu(evt)}  , false );
    }

    enterClick(evt){}
    enterTouchMove(evt){console.log('onTouchMove'); console.log(evt);}
    enterTouchStart(evt){console.log('onTouchStart'); console.log(evt);}
    enterTouchEnd(evt){console.log('onTouchEnd'); console.log(evt);}
    isButtonDown(evt, buttonNum){
      if ('buttons' in evt) {
          return evt.buttons === buttonNum;
      } else if ('which' in evt) {
          return evt.which === buttonNum;
      } else {
          return evt.button === buttonNum;
      }
    }

    isLeftMouseButtonDown(evt) {return this.isButtonDown(evt,1)}
    isMiddleMouseButtonDown(evt) { return this.isButtonDown(evt,2)}
    isRightMouseButtonDown(evt) { if(isSafari)return evt.which===3; else return this.isButtonDown(evt,2); }
    // convert controller event into pointerEvent
    enterControllerEvent(cEvt){
      //console.log('enterControllerEvent')
      if(cEvt.touchButton.touch){
        if(cEvt.touchButton.isDown){
          var deltaX = cEvt.touchButton.x, deltaY=cEvt.touchButton.y;
          var aX = Math.abs(deltaX), aY = Math.abs(deltaY);
          if(aX < 0.25 && aY<0.25){
            this.controllerRayTest();
            if(this.pointerEvent.selectedTObject) // make sure this is a TObject
              return this.pointerEvent.selectedTObject.doDoubleClick(this.pointerEvent);
            else{
              Globals.tAvatar.camera.getWorldDirection(this.forward); // this is the direction you are looking
              this.forward.normalize();
              this.forward.multiplyScalar(-5);
              Globals.tAvatar.object3D.position.sub(this.forward);
            }
          }else {
            if(aX>aY)deltaY = 0;
            else deltaX = 0;
            deltaX *= 5;
            deltaY *= 5;
            Globals.tAvatar.object3D.getWorldDirection(this.forward);
            this.forward.set(deltaX*this.forward.z,-deltaY,-deltaX*this.forward.x);
            Globals.tAvatar.object3D.position.add( this.forward);
          }
          this.isMoving = false;
        }else{
          //console.log(cEvt.touchButton, 'touch')
          this.yawVelocity = -cEvt.touchButton.x*0.1;
          this.velocity = Globals.tAvatar.camera.getWorldDirection();
          if(Math.abs(this.velocity.y)<0.99){ // not looking straight up
            this.velocity.setY(0);
            this.velocity.normalize();
            this.velocity.multiplyScalar(-cEvt.touchButton.y*2);
          }
          this.isMoving = true;
          return; // can't move and track at the same time comfortably
        }
      }else{
        this.yawVelocity = 0;
        this.velocity=null;
        this.isMoving = false;
      }
      // these are in priority order

      if(cEvt.appButton){
        if(!cEvt.lastAppButton){
          // pointerDown event
          //console.log('pointerDown event');
          this.controllerRayTest();
          cEvt.lastAppButton = true;
          if(this.overTObject){this.overTObject.doPointerLeave(this.pointerEvent); this.overTObject = null;}
          this.selectedTObject = this.pointerEvent.selectedTObject;
          // remove displayed if we clicked anywhere else
          if(this.displayed && this.selectedTObject && this.selectedTObject!=this.displayed){
            this.displayed.removeSelf();
            this.displayed = null;
            //console.log('hide the system menu');
          }
          if(this.selectedTObject){ // make sure this is a TObject
            this.setKeyboardFocus(this.selectedTObject);
            return this.selectedTObject.doPointerDown(this.pointerEvent);
          }
        }else{
          //console.log('pointerMove event')
          // pointerMove event
          if(this.selectedTObject){
            this.controllerRayTest(this.selectedTObject);
            return this.selectedTObject.doPointerMove(this.pointerEvent);
          }
        }
      }
      else if(cEvt.lastAppButton){
        // pointerUp event
        //console.log('pointerUp event')
        cEvt.lastAppButton = false;
        if(this.selectedTObject){
          this.controllerRayTest(this.selectedTObject);
          this.selectedTObject.doPointerUp(this.pointerEvent);
          this.selectedTObject = null;
        }else this.doPointerUp(this.pointerEvent);
      }
      else if(cEvt.homeButton){Globals.tAvatar.goTo(new THREE.Vector3(), new THREE.Quaternion(), null, 10);}
      else{
        this.controllerRayTest();
        //console.log('pointerOver event');
        this.overHilite();
      }
    }

    enterControllerTouch(x,y){
      if(Math.abs(x)>0.25 || Math.abs(y)>0.25){
        this.yawVelocity = -x*0.025;
        this.velocity=Globals.tAvatar.camera.getWorldDirection();
        if(Math.abs(this.velocity.y)<0.99){ // not looking straight up
          this.velocity.setY(0);
          this.velocity.normalize();
          this.velocity.multiplyScalar(-y);
        }
        this.isMoving = true;
      }
      else this.isMoving = false;
    }
    enterControllerDown(){
      this.pointerEvent.point = null;
      this.isMoving = false;
      this.controllerRayTest();
      if (this.overTObject) {
        this.overTObject.doPointerLeave(this.pointerEvent);
        this.overTObject = null;
       }
      this.pointerEvent.controllerDown = true;
      if(this.pointerEvent.selectedTObject){ // make sure this is a TObject
        this.selectedTObject = this.pointerEvent.selectedTObject;
        this.setKeyboardFocus(this.selectedTObject);
        this.selectedTObject.doPointerDown(this.pointerEvent);
      }
      if (this.selectedTObject) {
        // make sure this is a TObject
        this.setKeyboardFocus(this.selectedTObject);
        return this.selectedTObject.doPointerDown(this.pointerEvent);
      } else {
        this.setKeyboardFocus(null);
      }
    }
    enterControllerMove(){
      if(this.pointerEvent.controllerDown && this.selectedTObject){
        this.controllerRayTest(this.selectedTObject);
        if(this.selectedTObject)
          this.selectedTObject.doPointerMove(this.pointerEvent);
        else return this.doPointerMove(this.pointerEvent);
      } else {
        this.controllerRayTest();
        return this.overHilite();
      }

    }
    enterControllerUp(controller){
      this.pointerEvent.controllerDown = false;
      if(this.selectedTObject){
        this.controllerRayTest(this.selectedTObject);
        var rval = this.selectedTObject.doPointerUp(this.pointerEvent);
        this.selectedTObject = null;
        return rval;
      }else return this.doPointerUp(this.pointerEvent);
    }
    enterControllerSlide(controller){}
    enterControllerDblClick(controller){}

    enterMouseDown(evt) {
      this.pointerEvent.point = null;
      this.isMoving = false;
      this.mouseRayTest(evt);
      if (this.overTObject) {
        this.overTObject.doPointerLeave(this.pointerEvent);
        this.overTObject = null;
      }
      if (this.isRightMouseButtonDown(evt)) {
        return this.moveCamera(evt);
      } else if (this.isLeftMouseButtonDown(evt)) {
        this.selectedTObject = this.pointerEvent.selectedTObject;
        // remove displayed if we click on anything else
        if (
          this.displayed &&
          this.selectedTObject &&
          this.selectedTObject != this.displayed
        ) {
          this.displayed.removeSelf();
          this.displayed = null;
          //console.log("hide the system menu");
        }
        if (this.selectedTObject) {
          // make sure this is a TObject
          this.setKeyboardFocus(this.selectedTObject);
          return this.selectedTObject.doPointerDown(this.pointerEvent);
        } else {
          this.setKeyboardFocus(null);
        }
      }
    }

    enterMouseMove(evt){
      // left or right mouse button is down
      if(this.isRightMouseButtonDown(evt)){
        this.mouseRayTest(evt, null, true);
        return this.moveCamera(evt);
      }else if(this.isLeftMouseButtonDown(evt)){
        if(this.selectedTObject){
          this.mouseRayTest(evt, this.selectedTObject);
          return this.selectedTObject.doPointerMove(this.pointerEvent);
        }
      }else{ // no buttons are down
        this.mouseRayTest(evt); // check for objects we are hovering over
        this.overHilite();
      }
    }

    overHilite(){
      //console.log(this.pointerEvent.selectedTObject )
      if(this.pointerEvent.selectedTObject){ // we are over an object
        var newOver = this.pointerEvent.selectedTObject;
        if(newOver != this.overTObject){ // we are over a different object
          if(this.overTObject)this.overTObject.doPointerLeave(this.pointerEvent); // leave the old object
          this.overTObject = newOver;
          this.overTObject.doPointerEnter(this.pointerEvent); // enter the new object
        }else this.overTObject.doPointerOver(this.pointerEvent);// we are over the same object
      }else { // we are not over anything
        if(this.overTObject){
          this.overTObject.doPointerLeave(this.pointerEvent);
          this.overTObject = null;
        }
      }
    }

    enterMouseUp(evt){
      if(this.isMoving){
         this.isMoving = false;
        this.driveMatrix=null;
        return true;
      }else if(this.selectedTObject){
        this.mouseRayTest(evt, this.selectedTObject);
        this.selectedTObject.doPointerUp(this.pointerEvent);
        this.selectedTObject = null;
      }else this.doPointerUp(this.pointerEvent);
    }

    enterMouseWheel(evt){
      // move the user up/down and dolly left/right
      var forward = Globals.tAvatar.object3D.getWorldDirection();
      if(Math.abs(forward.y)<0.99){ // not looking straight up or down
        forward.setY(0);
        forward.normalize();
      }
      var deltaX = evt.deltaX, deltaY=evt.deltaY;
      if(Math.abs(deltaX)>Math.abs(deltaY))deltaY = 0;
      else deltaX = 0;
      if(deltaX && Globals.cameraLocked){ // rotate instead of strafe left/right
        Globals.tAvatar.object3D.rotateY(deltaX*0.0025);
      }
      else
        Globals.tAvatar.object3D.position.add( new THREE.Vector3(deltaX*forward.z*0.01,-deltaY*0.01,-deltaX*forward.x*0.01));
      //evt.stop();
    }

    enterDblClick(evt){
    this.pointerEvent.event2D = evt;
      if(this.pointerEvent.lastSelectedTObject) // make sure this is a TObject
        return this.pointerEvent.lastSelectedTObject.doDoubleClick(this.pointerEvent);
    }

    moveCamera(evt){
      var pos = this.getRelativeMouseXY(evt);
      if(!this.isMoving){this.isMoving = true; this.homeBase = pos;}
      this.isMoving = true;
      this.yawVelocity = (this.homeBase.x-pos.x)*0.1;
      this.pitchVelocity = 0;
      if(evt.shiftKey){
        this.pitchVelocity = (this.homeBase.y-pos.y)*-0.05;
        this.velocity = null;
      }
      else{
        if(Globals.cameraLocked){
          this.velocity = new THREE.Vector3(0,(this.homeBase.y-pos.y)*-2,0);
        }
        else{
          this.velocity = Globals.tAvatar.camera.getWorldDirection();
          if(Math.abs(this.velocity.y)<0.99){ // not looking straight up
            this.velocity.setY(0);
            this.velocity.normalize();
            this.velocity.multiplyScalar((this.homeBase.y-pos.y)*-2);
          }
        }
      }
    }

    mouseRayTest(evt, tObject, suppress){

      var ext = this.renderer.getSize();
      var mouse = this.getRelativeMouseXY(evt);
      //var mouse = evt.getPositionIn(this);
      //var mouse = new THREE.Vector2(( pos.x / ext.x ) * 2 - 1, -( pos.y / ext.y ) * 2 + 1);
      // https://threejs.org/docs/index.html?q=ray#Reference/Core/Raycaster

      this.pointerEvent.shiftKey = evt.shiftKey;
      this.pointerEvent.ctrlKey = evt.ctrlKey;
      this.pointerEvent.altKey = evt.altKey;
      this.pointerEvent.metaKey = evt.metaKey;
      this.raycaster.setFromCamera( mouse, this.camera );
      this.rayTest(tObject, suppress);
      if(this.tPointer)this.tPointer.trackMouseEvent(this.pointerEvent);

    }

    controllerRayTest(tObject, suppress){
      if(this.tPointer){
        this.cVector.copy(this.tPointer.object3D.getWorldDirection());
        this.cVector.multiplyScalar(-1);
        this.raycaster.set(this.tPointer.object3D.getWorldPosition(), this.cVector);
        this.rayTest(tObject, suppress);
        this.tPointer.trackLaser(this.pointerEvent);
      }
    }

    rayTest(tObject, suppress){
      var targets, target;

      if(!suppress){
        if(tObject){
          // console.log(tObject.getRayTestArray())
          targets = this.raycaster.intersectObjects(tObject.getRayTestArray());
        }else
          targets = this.raycaster.intersectObjects( this.scene.children, true );
          target = targets.find(function(element){return element.object.userData && element.object.userData.selectable});
      }

      if(target){
        this.pointerEvent.lastPoint = this.pointerEvent.point;
        this.pointerEvent.lastSelectedTObject = this.pointerEvent.selectedTObject;
        this.pointerEvent.target = target;
        this.pointerEvent.selectedTarget = target.object;
        this.pointerEvent.selectedTObject = target.object.userData;
        this.pointerEvent.distance =  target.distance;
        this.pointerEvent.face = target.face;
        this.pointerEvent.faceIndex = target.faceIndex;
        this.pointerEvent.point = target.point;
        this.pointerEvent.uv = target.uv;
      }
      else{
        if(this.pointerEvent.selectedTarget){
          this.pointerEvent.lastPoint = this.pointerEvent.point;
          this.pointerEvent.lastSelectedTarget = this.pointerEvent.selectedTarget;

        }
        // didn't find anything - set arbitrary point
        this.pointerDirection.copy(this.raycaster.ray.direction);
        this.pointerDirection.multiplyScalar(10000);
        this.pointerDirection.add(this.raycaster.ray.origin);

        this.pointerEvent.point = this.pointerDirection;
        //if(this.tPointer)this.pointerEvent.point.add(this.tPointer.object3D.position);
        this.pointerEvent.selectedTObject = null;
      }
      this.pointerEvent.tAvatar = Globals.tAvatar;
      this.pointerEvent.cameraNorm = this.camera.getWorldDirection();
      //this.pointerEvent.event2D = evt;
      this.pointerEvent.ray3D = this.raycaster;
      return this.pointerEvent;
    }

    drive(){
        //this.camera.matrix.multiply(this.driveMatrix);
        //this.camera.matrixAutoUpdate = false;
        if(this.velocity)Globals.tAvatar.object3D.position.add(this.velocity);
        Globals.tAvatar.camera.rotateX(this.pitchVelocity);
        //this.yaw += this.yawVelocity;
        Globals.tAvatar.object3D.rotateY(this.yawVelocity);
         //this.tPointer.object3D.rotateY(this.angVelocity); // pointer should follow the camera y - but not the others
    }

    getRelativeMouseXY(evt){
      var element = evt.target || evt.srcElement;
      if (element.nodeType === 3) {
        element = element.parentNode; // Safari fix -- see http://www.quirksmode.org/js/events_properties.html
      }

      //get the real position of an element relative to the page starting point (0, 0)
      //credits go to brainjam on answering http://stackoverflow.com/questions/5755312/getting-mouse-position-relative-to-content-area-of-an-element
      var elPosition  = { x : 0 , y : 0};
      var tmpElement  = element;
      //store padding
      var style = window.getComputedStyle(tmpElement, null);
      elPosition.y += parseInt(style.getPropertyValue("padding-top"), 10);
      elPosition.x += parseInt(style.getPropertyValue("padding-left"), 10);
      //add positions
      do {
        elPosition.x  += tmpElement.offsetLeft;
        elPosition.y  += tmpElement.offsetTop;
        style   = window.getComputedStyle(tmpElement, null);

        elPosition.x  += parseInt(style.getPropertyValue("border-left-width"), 10);
        elPosition.y  += parseInt(style.getPropertyValue("border-top-width"), 10);
      } while(tmpElement = tmpElement.offsetParent);

      var elDimension = {
        width : (element === window) ? window.innerWidth  : element.offsetWidth,
        height  : (element === window) ? window.innerHeight : element.offsetHeight
      };

      return {
        x : +((evt.pageX - elPosition.x) / elDimension.width ) * 2 - 1,
        y : -((evt.pageY - elPosition.y) / elDimension.height) * 2 + 1
      };
    }


  // "status messages"

    setStatusMessage(msg, color, delay, opts) {
      // for now
      console.log(msg);
    }

    logError(err) {
      console.error(err);
    }
  }


  //------------------------------------------------------------------------
  // TAvatar contains the camera object. It separates the "head" which is the camera from the "body" which also contains the
  // pointer device. This means that the user can look around with the camera - tracking the head, but the body will move
  // based upon the user specifically moving himself in the space.
export class TAvatar extends TObject{
 // in order to keep the user upright - move the object3D and orient the camera.

  //'initialize'
    constructor(parent, onComplete, camera, height){
      this.setObject3D(new THREE.Group());
      //this.setObject3D(camera);
      this.camera = camera;
      camera.userData = this;
      this.object3D.add(camera);
      //this.camera.position.y=height||0;
      this.object3D.name = 'TAvatar';
      if(parent)parent.addChild(this);
      if(onComplete)onComplete(this);
    }
  //'events'
    onPointerDown(pEvt){ return true;}
    onPointerMove(pEvt){ return true;}
    onPointerUp(pEvt){ return true;}
    onPointerEnter(pEvt){ return true;}
    onPointerOver(pEvt){ return true;}
    onPointerLeave(pEvt){ return true;}
    onKeyDown(pEvt){ return true;}
    onKeyStroke(pEvt){ return true;}
    onKeyUp(pEvt){ return true;}
  }

  //------------------------------------------------------------------------
  // Just a TObject that contains a light
export class TLight extends TObject{
  //'initialize',{
    constructor(parent, onComplete, light){
      this.setObject3D(light);
      this.object3D.name = 'TLight';
      if(parent)parent.addChild(this);
      if(onComplete)onComplete(this);
    }
  }

  //------------------------------------------------------------------------
  // This is the overall pointer event object. It includes both 2D and 3D input information. This object is passed to
  // the pointer event methods of the TObjects.
export class PointerEvent extends Object{
  // Good enough for now, but this won't work for TeaTime
    constructor(){
      this.controllerDown = false;
      this.distance = null;
      this.face = null;
      this.faceIndex = null;
      this.point = null;
      this.lastPoint = null;
      this.uv = null;
      this.target = null;
      this.selectedTarget = null;
      this.selectedTObject = null;
      this.keyboardTObject = null;
      this.tScene = null;
      this.ray3d = null;
      this.shiftKey = false;
      this.ctrlKey = false;
      this.altKey = false;
      this.metaKey = false;
      //event2D: null,
    }
}

  //------------------------------------------------------------------------
  // This object moves the any TObject from its current location/orientation
  // to the specified one.
export class GoTo extends Object{

// "initialize"
  constructor(o3D) {
    this.object3D = o3D;

    this.endQuaternion = new THREE.Quaternion();
    this.startQuaternion = new THREE.Quaternion();

    this.startPosition = new THREE.Vector3();
    this.endPosition = new THREE.Vector3();
    this.deltaPosition = new THREE.Vector3();

    this.startScale = new THREE.Vector3();
    this.endScale = new THREE.Vector3();
    this.deltaScale = new THREE.Vector3();

    this.doPos = false;
    this.doQuat = false;
    this.doScale = false;
  }

// "actions"

  goTo(pos, quat, scale, count) {
    this.slerpTotal = count ? count : 10;
    if (quat) {
      this.doQuat = true;
      this.endQuaternion.copy(quat);
      this.startQuaternion.copy(this.object3D.quaternion);
    } else this.doQuat = false;
    if (pos) {
      this.doPos = true;
      this.startPosition.copy(this.object3D.position);
      this.endPosition.copy(pos);
      this.deltaPosition.copy(this.endPosition);
      this.deltaPosition.sub(this.startPosition);
      this.deltaPosition.multiplyScalar(1 / this.slerpTotal);
    } else this.doPos = false;
    if (scale) {
      this.doScale = true;
      this.startScale.copy(this.object3D.scale);
      this.endScale.copy(scale);
      this.deltaScale.copy(this.endScale);
      this.deltaScale.sub(this.startScale);
      this.deltaScale.multiplyScalar(1 / this.slerpTotal);
    } else this.dScale = false;
    this.slerpCount = 0;
    if (!count) return Promise.resolve();
    this.deferred = lively.lang.promise.deferred();
    return this.deferred.promise;
  }

  update(time, tScene) {
    if (!this.slerpTotal) return

    this.slerpCount++;
    if (this.doQuat)
      THREE.Quaternion.slerp(
        this.startQuaternion,
        this.endQuaternion,
        this.object3D.quaternion,
        this.slerpCount / this.slerpTotal);
    if (this.doPos) this.object3D.position.add(this.deltaPosition);
    if (this.doScale) this.object3D.scale.add(this.deltaScale);
    if (this.slerpCount == this.slerpTotal) {
      this.slerpTotal = 0;
      if (this.deferred) this.deferred.resolve();
    }

  }

}

  //------------------------------------------------------------------------
  // The Cylinder object is used as a picking target. This is used primarily for interacting with objects that rotate around a particular axis.

export class Cylinder extends Object{
 //   'initialize"
  constructor(pt1, pt2, r){
    this.point1 = pt1;
    this.point2 = pt2;
    this.radius = r;
    this.radiusSq = r*r;
    this.axis = new THREE.Vector3();
    this.axis.subVectors(pt1, pt2);
    this.axis.normalize();
    this.pointOnRay = new THREE.Vector3();
    this.pointOnCyl = new THREE.Vector3();
}
//    'compute'
  intersect(ray, toVec){
    // determine closest points on ray/cylinder axis
    // naive approach - just give me the perpenidicular from the center
    var distanceSq = ray.distanceSqToSegment(this.point1, this.point2, this.pointOnRay, this.pointOnCyl);
    //console.log(distanceSq);
    //console.log(cylinder.radiusSq);
    if(distanceSq > this.radiusSq)return null; // no collision
    var opposite = Math.sqrt(this.radiusSq-distanceSq); //compute opposite triangle length
    var cos = ray.direction.dot(this.axis);
    var sin = Math.sqrt(1-cos*cos);
    var hyp = opposite/sin;
    if(!toVec)toVec= new THREE.Vector3();
    toVec.copy(ray.direction);
    toVec.multiplyScalar(hyp); // needs to point back to the ray origin
    toVec.subVectors(this.pointOnRay, toVec);
    return toVec;
  }
}
