// Copyright 2018 by arcos and OS.Vision.
// This software is licensed under the Apache 2 open source license
// davidasmith@gmail.com - david@os.vision
// 919-244-4448

/*global THREE, Float32Array*/

import { TObject, Cylinder, Globals } from "./TObject.js";
import { TButton, TExtrudeButton } from "./TButtons.js";


// TCube is a demonstration object.
export class TCube extends TObject {
// TCube is a demo object to illustrate the user of TObject
  constructor(parent, onComplete, w, h, d, dw, dh, dd){
    this.extent = new THREE.Vector3(w,h,d);
    dw = dw || 5;
    dh = dh || 5;
    dd = dd || 5;

    var box      = new THREE.BoxGeometry(w||10, h||10, d||10, dw, dh, dd );
    var mat      = new THREE.MeshStandardMaterial();
    var cube     = new THREE.Mesh(box, mat);
    cube.name = "TCube";
    this.setObject3D(cube);
    if(parent)parent.addChild(this);
    if(onComplete)onComplete(this);
  }
}

// TTeapot is a demonstration object
export class TTeapot extends TObject{
// TTeapot is a demo object to illustrate the user of TObject
  constructor(parent, onComplete, size){
    var tess = 15;  // force initialization
    // effectController is from the THREE.JS example code
    var  effectController = {
        shininess: 40.0,
        ka: 0.17,
        kd: 0.51,
        ks: 0.2,
        metallic: true,
        hue:    0.121,
        saturation: 0.73,
        lightness:  0.66,
        lhue:    0.04,
        lsaturation: 0.01,  // non-zero so that fractions will be shown
        llightness:  1.0,
        // bizarrely, if you initialize these with negative numbers, the sliders
        // will not show any decimal places.
        lx: 0.32,
        ly: 0.39,
        lz: 0.7,
        newTess: 15,
        bottom: true,
        lid: true,
        body: true,
        fitLid: false,
        nonblinn: false,
        newShading: "glossy"
      };
    var txtrLoader = new THREE.TextureLoader();
    var self = this;
    var materialColor = new THREE.Color();
      materialColor.setRGB( 1.0, 1.0, 1.0 );
    txtrLoader.load(Globals.imagePath+'teapot.jpg',
      function(texture) {
        var teapotGeometry = new THREE.TeapotBufferGeometry( size,
          tess,
          effectController.bottom,
          effectController.lid,
          effectController.body,
          effectController.fitLid,
          ! effectController.nonblinn );
        var texturedMaterial = new THREE.MeshPhongMaterial( { color: materialColor, map: texture, shading: THREE.SmoothShading, side: THREE.DoubleSide} );
        var teapot     = new THREE.Mesh(teapotGeometry, texturedMaterial);
        teapot.name = "TTeapot";
        teapot.castShadow = true;
        self.setObject3D(teapot);
        if(parent)parent.addChild(self);
        if(onComplete)onComplete(self);
       },
     // Function called when download progresses
      function ( xhr ) {
        console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
      },
      // Function called when download errors
      function ( xhr ) {
        console.log( 'An error happened' );
      }
    );
  }
}

// TRectangle is a base class for a number of different objects
export class TRectangle extends TObject {
// users.TCube is a demo object to illustrate the user of TObject
  constructor(parent, onComplete, w, h, wsegs, hsegs){
    this.width = w ||8;
    this.height = h || 8;
    this.extent = new THREE.Vector3(w,h,0);
    var rect      = new THREE.PlaneBufferGeometry(this.width, this.height, wsegs||8, hsegs||8);
    var mat      = new THREE.MeshStandardMaterial({color:0xffffff, emissive: 0x222222});
    this.setObject3D(new THREE.Mesh(rect, mat));
    this.object3D.name = 'TRectangle';
    if(parent)parent.addChild(this);
    if(onComplete)onComplete(this);
  }
}


// Nothing more than a textured TRectangle
export class TTexturedRectangle extends TObject {
// users.TCube is a demo object to illustrate the user of TObject
  //'initalizing'
  constructor(parent, onComplete, textureName, w, h, wsegs, hsegs){
    var txtrLoader = new THREE.TextureLoader();
    var self = this;
    txtrLoader.load(textureName || Globals.imagePath+'UV_Grid_Sm.jpg',
      function(texture) {
        var box      = new THREE.PlaneBufferGeometry( w||10, h||10, wsegs||5, hsegs||5 );
        var mat      = new THREE.MeshBasicMaterial( { map: texture, transparent: true} );
        var cube     = new THREE.Mesh(box, mat);

        cube.renderOrder = 1500;
        cube.name = "TTexturedRectangle";
        self.setObject3D(cube);
        if(parent)parent.addChild(self);
        if(onComplete)onComplete(self);
       },
     // Function called when download progresses
      function ( xhr ) {
        console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
      },
      // Function called when download errors
      function ( xhr ) {
        console.log( 'An error happened' );
      }
    );
  }
}

export class TVideoRectangle extends TTexturedRectangle {

  //'initialize'
  constructor(parent, onComplete, tVideo, height, segs){
    this.is3D = false; // need to set this somehow
    this.height = height || 10;
    this.tVideo = tVideo;
    var w = this.height * tVideo.width/tVideo.height;
    var h = this.height;

    var p     = new THREE.PlaneBufferGeometry( w||10, h||10, segs||5, segs||5 );
    var mat      = new THREE.MeshBasicMaterial( { map: tVideo.texture} );
    var rect     = new THREE.Mesh(p, mat);

    rect.name = "tVideo.fileName";
    this.setObject3D(rect);
    if(parent)parent.addChild(this);
    if(onComplete)onComplete(this);
  }
  //'events',{
    onPointerDown(pEvt){this.tVideo.startStop(); return true;}
    onPointerUp(pEvt){return true;}
    onPointerMove(pEvt){return true;}
    update(tm){if(this.tVideo.isPlaying)this.tVideo.texture.needsUpdate = true;}
}

// TTrackball is a user interface object that allows its contained object to be manipulated as a virtual trackball.
// Note that it depends on the contained object to ignore pointer events, as otherwise they will never reach the TTrackball
export class TTrackball extends TObject {
  //'initialize',{
  constructor(parent, onComplete){
    this.dragVector = new THREE.Vector3();
    this.fromVector = new THREE.Vector3();
    this.toVector = new THREE.Vector3();
    this.vec = new THREE.Vector3();
    this.qSpin = new THREE.Quaternion();
    this.setObject3D(new THREE.Group());
    this.object3D.name = 'TTrackBall';
    if(parent)parent.addChild(this);
    if(onComplete)onComplete(this);
  }
  isContainer(){return true;}
  // 'events'
  onPointerDown(pEvt){
    // convert global to local
    Globals.console.log("in the virtual track ball")
    this.dragVector.copy(pEvt.point);
    this.fromVector.copy(pEvt.point);
    this.qSpin.set(0,0,0,1); // stop spinning
    this.object3D.worldToLocal(this.fromVector);
    this.sphere = new THREE.Sphere(this.object3D.getWorldPosition(), this.fromVector.length());
    pEvt.ray3D.ray.intersectSphere(this.sphere, this.fromVector); // everything is in global coordinates now
    this.object3D.worldToLocal(this.fromVector);
    this.fromVector.normalize();
    return true;
  }
  onPointerMove(pEvt){
    if(pEvt.shiftKey){
      this.vec.copy(this.dragVector);
      this.vec.normalize();
      var cos = pEvt.cameraNorm.dot(this.vec);
      this.vec.copy(pEvt.cameraNorm);
      this.plane = new THREE.Plane(this.vec, -cos*this.dragVector.length());
      pEvt.ray3D.ray.intersectPlane(this.plane, this.toVector);
      this.vec.copy(this.toVector);
      this.vec.sub(this.dragVector);
      this.object3D.position.add(this.vec);
      this.dragVector.copy(this.toVector);
    }
    else if(pEvt.ray3D.ray.intersectSphere(this.sphere, this.toVector))
    {
      this.object3D.worldToLocal(this.toVector);
      this.toVector.normalize();
      this.vec.copy(this.fromVector);
      this.vec.add(this.toVector);
      this.vec.normalize();
      this.vec.add(this.toVector);
      this.vec.normalize();
      this.qSpin.setFromUnitVectors(this.vec, this.toVector);
      this.object3D.quaternion.multiply(this.qSpin);
      }

    return true;
  }
  onPointerUp(pEvt){return true;}
  onPointerEnter(pEvt){return true;}
  onPointerOver(pEvt){return true;}
  onPointerLeave(pEvt){return true;}
  //'behavior',
  update(time, tScene){
    if(this.qSpin.w <0.9999)
          this.object3D.quaternion.multiply(this.qSpin);
  }
}

// TLazySusan - similar to the TTrackball, allows the user to manipulate an object by spinning around the Y-axis.
export class TLazySusan extends TObject {
// spin around the axix of cylinder
  //'initialize',{
  constructor(parent, onComplete){
    this.dragVector = new THREE.Vector3();
    this.fromVector = new THREE.Vector3();
    this.toVector = new THREE.Vector3();
    this.vec = new THREE.Vector3();
    this.setObject3D(new THREE.Group());
    this.object3D.name = 'TLazySusan';
    this.isPointerDown = false;
    if(parent)parent.addChild(this);
    if(onComplete)onComplete(this);
  }
  isContainer(){return true;}
  //'events'
  onPointerDown(pEvt){
    // convert global to local
    this.dragVector.copy(pEvt.point);
    this.fromVector.copy(pEvt.point);
    this.rotation = 0; // stop spinning
    var p1 = new THREE.Vector3(0,1000,0);
    this.object3D.localToWorld(p1);
    var p2 = new THREE.Vector3(0,-1000,0);
    this.object3D.localToWorld(p2);
    this.object3D.worldToLocal(this.fromVector); // used to set cylinder radius
    this.fromVector.y = 0; // assumes we are rotating around y-axis
    this.cylinder = new Cylinder(p1,p2, this.fromVector.length());
    this.intersectCylinder(pEvt.ray3D.ray, this.cylinder, this.fromVector);

    this.object3D.worldToLocal(this.fromVector);
    this.fromVector.setY(0); // only care about normal from center of cylinder
    this.fromVector.normalize();
    this.isPointerDown = true;
    return true;
  }
  onPointerMove(pEvt){
    if(pEvt.shiftKey){
      this.vec.copy(this.dragVector);
      this.vec.normalize();
      var cos = pEvt.cameraNorm.dot(this.vec);
      this.vec.copy(pEvt.cameraNorm);
      this.plane = new THREE.Plane(this.vec, -cos*this.dragVector.length());
      pEvt.ray3D.ray.intersectPlane(this.plane, this.toVector);
      this.vec.copy(this.toVector);
      this.vec.sub(this.dragVector);
      this.object3D.position.add(this.vec);
      this.dragVector.copy(this.toVector);
    }
    else if(this.intersectCylinder(pEvt.ray3D.ray,this.cylinder, this.toVector)){
      this.object3D.worldToLocal(this.toVector);
      this.toVector.setY(0); // only care about normal from center of cylinder
      this.toVector.normalize();
      this.rotation = Math.atan2(this.fromVector.x,this.fromVector.z)-Math.atan2(this.toVector.x,this.toVector.z);
      this.object3D.rotateOnAxis(this.cylinder.axis, -this.rotation/2.0);
    }

    return true;
  }
  onPointerUp(pEvt){this.isPointerDown = false; return true;}
  onPointerEnter(pEvt){console.log('TLazySusan>>onPointerEnter'); return true;}
  onPointerOver(pEvt){console.log('TLazySusan>>onPointerOver'); return true;}
  onPointerLeave(pEvt){console.log('TLazySusan>>onPointerLeave'); return true;}
  //'compute',{
  intersectCylinder(ray, cylinder, toVec){
    // determine closest points on ray/cylinder axis
    // naive approach - just give me the perpenidicular from the center
    var pointOnRay = new THREE.Vector3();
    var pointOnCyl = new THREE.Vector3();
    var distanceSq = ray.distanceSqToSegment(cylinder.point1, cylinder.point2, pointOnRay, pointOnCyl);
    //console.log(distanceSq);
    //console.log(cylinder.radiusSq);
    if(distanceSq > cylinder.radiusSq)return false; // no collision
    var opposite = Math.sqrt(cylinder.radiusSq-distanceSq); //compute opposite triangle length
    var cos = ray.direction.dot(cylinder.axis);
    var sin = Math.sqrt(1-cos*cos);
    var hyp = opposite/sin;
    toVec.copy(ray.direction);
    toVec.multiplyScalar(hyp); // needs to point back to the ray origin
    toVec.subVectors(pointOnRay, toVec);
    return true;
  }

  //'behavior',
  update(time, tScene){
    if(Math.abs(this.rotation)>1.0e-6 && !this.isPointerDown){
      this.object3D.rotateOnAxis(this.cylinder.axis, -this.rotation/2.0);
    }
  }
}

// TSlider allows the user to set a value between 0-1 using a slide object.
export class TSlider extends TObject {

// slider with value of 0-1. When value changes, it calls the action method

//'initialize'
  constructor(parent, onComplete, action, length, size, initVal){
    this.point = new THREE.Vector3();
    this.vec = new THREE.Vector3();
    this.vec2 = new THREE.Vector3();
    this.testCube = new THREE.Vector3();
    this.color = new THREE.Color(0.7,0.7,0.95);
    this.overColor = new THREE.Color(0.95,0.95,0.65);
    this.value = initVal||0;
    this.length = length||4;
    var wl = size || this.length/10;
    this.action = action;
    var txtrLoader = new THREE.TextureLoader();
    var self = this;
    //txtrLoader.load(Globals.imagePath+'slider-1.png',
    //  function(texture) {
      var normalMap = txtrLoader.load( Globals.imagePath+"tile_normal.jpeg" );
      normalMap.wrapS = THREE.RepeatWrapping;
      normalMap.repeat.set( 10, 1 );
        var geo = new THREE.BoxGeometry( self.length, wl, wl, 10, 1, 1 );
        var mat = new THREE.MeshPhongMaterial( {
          color: 0x88888cc, emissive: 0x111111,
          specular: 0x333333,
          shininess: 35,
          normalMap: normalMap,
          normalScale: new THREE.Vector2( 0.8, -0.8 ),
          side: THREE.FrontSide
        });
        self.base     = new THREE.Mesh(geo, mat);
        self.base.name = "Ruler";
        self.setObject3D(self.base);
        geo = new THREE.BoxGeometry( wl, wl*1.25, wl*1.25, 2, 2, 2 );
        var mat = new THREE.MeshStandardMaterial( {
          color: this.color.getHex(), emissive: 0x222222, opacity:0.75,
        transparent:true, side: THREE.FrontSide} );
        self.slider = new THREE.Mesh(geo, mat);
        self.slider.name = "Slider";
        self.slider.userData= self;
        self.base.add(self.slider);
        self.slider.position.x = (self.value-0.5)*self.length;
        if(!action){
          self.testCube = new TCube(self, function(tObj){tObj.object3D.position.y=1.5}, 1, 1, 1 );
          self.action = function(val){self.testCube.object3D.rotationY(val*3)};
        }
        if(parent)parent.addChild(self);
        if(onComplete)onComplete(self);
       //},
     // Function called when download progresses
     // function ( xhr ) {
      //  console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
      //},
      // Function called when download errors
     // function ( xhr ) {
     //   console.log( 'An error happened' );
     // }
    //);
  }
  //'events'
  onPointerDown(pEvt){
    this.plane = null;

    if(pEvt.selectedTarget == this.base){
      // jumpt to the position
      this.point.copy(pEvt.point);
      this.object3D.worldToLocal(this.point);
      this.slider.position.x = this.point.x;
      this.value = this.point.x/this.length +0.5;
      if(this.action)this.action(this.value);
    }else if(pEvt.selectedTarget == this.slider){
      this.vec2.copy(pEvt.point);
      this.object3D.worldToLocal(this.vec2);
      var offset = this.vec2.z;
      this.isSliding = true;
      this.object3D.getWorldDirection(this.vec);
      this.vec2.copy(this.vec);
      this.vec2.multiplyScalar(offset);
      // compute the plane
      this.object3D.getWorldPosition(this.point);
      this.point.add(this.vec2);
      var len = this.point.length();
      this.point.normalize();
      this.plane = new THREE.Plane(this.vec, -this.point.dot(this.vec)*len);
    }
    return true;
  }

  onPointerMove(pEvt){
    if(this.plane){
      pEvt.ray3D.ray.intersectPlane(this.plane, this.point);
      //console.log(this.point);
      this.object3D.worldToLocal(this.point);
      //console.log(this.point);
      this.value = this.point.x/this.length + 0.5;
      this.value = this.value>=0?this.value:0;
      this.value = this.value<=1?this.value:1;
      this.slider.position.x = (this.value-0.5)*this.length;
      if(this.action)this.action(this.value);
    }
    return true;
  }

  onPointerUp(pEvt){this.plane=null; return true;}

  onPointerEnter(pEvt){
    if(pEvt.selectedTarget === this.slider){
      this.slider.material.color.setHex( this.overColor.getHex());
    }
  }

  onPointerOver(pEvt){
    if(pEvt.selectedTarget === this.slider){
      this.slider.material.color.setHex( this.overColor.getHex());
    } else this.slider.material.color.setHex(this.color.getHex());
  }

  onPointerLeave(pEvt){
    this.slider.material.color.setHex( this.color.getHex());
  }
}

// TColorSphere is a color picker object. It includes a main sphere that holds the last selected color and a number of satellite spheres that in turn have other colors associated with them.
export class TColorSphere extends TObject {
//'initialize',{
  constructor(parent, onComplete, action, radius){
    super(parent, onComplete); // do this first because it creates the Object3D
    this.action = action;
    this.object3D.name = 'TColorSphere';
    this.color = new THREE.Color(1,1,1);
    this.lastColor = new THREE.Color(1,1,1);
    this.colors = [];
    this.fields = [],
    this.colors.push(this.color);
    this.fields.push(0);
    this.colorButtons = [];
    this.radius = radius?radius: 1;
    this.eColor = new THREE.Color(color);
    this.eColor.multiplyScalar(0.5);
    var geometry = new THREE.SphereBufferGeometry( this.radius, 32, 32 );
    var material = new THREE.MeshPhongMaterial({color: this.color.getHex(), emissive: this.eColor.getHex()});
    var sphere = new THREE.Mesh( geometry, material );
    var self = this;
    this.colorButtons.push(new TButton(this, null, function(rval){self.doAction(rval)}, sphere, 0));
    var color;
    var eColor;
    var sNum = 7;

    for(var i = 0; i<sNum; i++){
      var val = i/(sNum-1);
      var cval = 2*(val-.5);
      color = new THREE.Color((1-cval)/2, 1-cval*cval, (1+cval)/2);
      color.r=(color.r+1)/2;
      color.g=(color.g+1)/2;
      color.b=(color.b+1)/2;
      this.colors.push(color);
      this.fields.push(7-i);
      eColor = new THREE.Color(color);
      eColor.multiplyScalar(0.5);
      geometry = new THREE.SphereBufferGeometry( this.radius/3, 32, 32 );
      material = new THREE.MeshPhongMaterial({color: color.getHex(), emissive: eColor.getHex()});
      sphere = new THREE.Mesh( geometry, material );
      var s = Math.sin(val*Math.PI);
      var c = Math.cos(val*Math.PI);
      var x = 1.5;
      var y = 0;
      var r = this.radius*1.3;
      sphere.position.set(x*c-y*s, x*s+y*c, 0);
      this.colorButtons.push(new TButton(this, null, function(rval){self.doAction(rval)}, sphere,i+1));
    }

    color = new THREE.Color(0.95, 0.95, 1);
    this.colors.push(color);
    this.fields.push(0);
    eColor = new THREE.Color(color);
    eColor.multiplyScalar(0.5);
    geometry = new THREE.SphereBufferGeometry( this.radius/3, 32, 32 );
    material = new THREE.MeshPhongMaterial({color: color.getHex(), emissive: eColor.getHex()});
    sphere = new THREE.Mesh( geometry, material );
    sphere.position.set(-r*1, -r*0.6, 0);
    this.colorButtons.push(new TButton(this, null, function(rval){self.doAction(rval)}, sphere,8));

    new TTexturedRectangle(null,
        function(tObj){
          new TButton(self,
            function(ttObj){ttObj.object3D.position.set(r, -r*0.6,0);},
            function(){self.launchColorPicker(self.selectedColor)}, tObj.object3D)},
          Globals.imagePath+'colorwheel.png',r*2/4,r*2/4,4,4);
    if(parent)parent.addChild(this);
    if(onComplete)onComplete(this);
  }

  launchColorPicker(color){
    var self = this;
    if(!this.colorWheel)
      this.colorWheel = new TColorWheel(this,
        function(tObj){tObj.object3D.position.set(3.5,0,0)},
        function(col, save){self.action(col, 8, save); self.setColor(col, save)}, color||new THREE.Color(1,1,1), 1);
    else {
      this.colorWheel.object3D.visible = !this.colorWheel.object3D.visible;
      this.colorWheel.setColor(color);
    }
  }
  //'actions',{
 setColor(color, save){
    if(color){
      this.color.copy(color);
      this.eColor.copy(color);
      this.eColor.multiplyScalar(0.5);
      this.colorButtons[0].object3D.material.color.setHex(this.color.getHex());
      this.colorButtons[0].object3D.material.emissive.setHex(this.eColor.getHex());
      if(save)this.lastColor.copy(color);
    }else{
      this.color.copy(this.lastColor);
      this.eColor.copy(this.color);
      this.eColor.multiplyScalar(0.5);
      this.colorButtons[0].object3D.material.color.setHex(this.color.getHex());
      this.colorButtons[0].object3D.material.emissive.setHex(this.eColor.getHex());
    }
  }

  doAction(index){
    if(this.action)this.action(this.colors[index], this.fields[index], true);
  }

  //'tracking'
  setTargetPosition(targetPosition){
    this.targetPosition.copy(targetPosition);
    this.targetCount = 10;
    this.targetDelta.copy(this.object3D.position);
    this.targetDelta.sub(targetPosition);
    this.targetDelta.multiplyScalar(0.1);
  }

  update(time, tScene){
    if(this.targetCount){
      this.targetCount--;
      this.object3D.position.sub(this.targetDelta);
    }
  }
}

// TColorWheel is a full color picker object for precise color selection.
export class TColorWheel extends TObject {
// color wheel sets a color

  //'initalize'
  constructor(parent, onComplete, action, color, radius){
    this.action = action;
    this.radius = radius?radius:2;
    this.segments = 30; // divisible by 3 for r,g,b
    var cSegs = this.segments/3;
    var geo = new THREE.CircleBufferGeometry( this.radius, this.segments );

    var mat = new THREE.MeshBasicMaterial( {
      color: 0xffffff,
      side: THREE.DoubleSide, vertexColors: THREE.VertexColors
    } );
    this.color = new THREE.Color();
    this.fullColor = new THREE.Color();
    this.intensity = 1;
    this.point = new THREE.Vector3();
    var colors = new Float32Array( this.segments * 3 + 6);
    colors[0] = 1;
    colors[1] = 1;
    colors[2] = 1;
    ringColors = [ // too tired to do this procedurally
      1, 0, 0, // 0
      1, .2, 0,
      1, .4, 0,
      1, .6, 0,
      1, .8, 0,
      1, 1, 0, //5
      .8, 1, 0,
      .6, 1, 0,
      .4, 1, 0,
      .2, 1, 0,
      0, 1, 0, //10
      0, 1, .2,
      0, 1, .4,
      0, 1, .6,
      0, 1, .8,
      0, 1, 1, //15
      0, .8, 1,
      0, .6, 1,
      0, .4, 1,
      0, .2, 1,
      0, 0, 1, //20
      0.2, 0, 1,
      0.4, 0, 1,
      0.6, 0, 1,
      0.8, 0, 1,
      1, 0, 1, //25
      1, 0, .8,
      1, 0, .6,
      1, 0, .4,
      1, 0, .2,
      1, 0, 0] //30
    for(var i = 0; i< (this.segments+1)*3;i++)
      colors[i+3]=ringColors[i];

    //colors[(this.segments+2)*3-3] = 1;
    this.colors = new Float32Array( this.segments * 3 + 6);
    this.colors.set(colors);
    geo.removeAttribute('uv');
    geo.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );

    var pos = geo.getAttribute('position');
    pos.setZ(0, this.radius/2);
    geo.attributes.position.needsUpdate = true;
    mesh = new THREE.Mesh( geo, mat );
    this.geometry = geo;
    // add the slider
    var self = this;
    this.slider = new TSlider(this, function(tObj){tObj.object3D.position.y=self.radius*-1.15;},
      function(val){self.setIntensity(val);}, self.radius*2, self.radius/5, 1.0);
    this.setObject3D(mesh);
    this.object3D.name = 'TColorWheel';
    // add OK button
    this.ok = new TExtrudeButton(this, function(tObj){tObj.object3D.position.set(self.radius*0.75, self.radius*0.75, 0)},
       function(){self.okButton()}, null, new THREE.Color(0x00aaaee), new THREE.Color(0xeeee88), 0, this.radius/4);

    // add Cancel button
    this.cancel = new TExtrudeButton(this, function(tObj){tObj.object3D.position.set(self.radius*-0.75, self.radius*0.75, 0)},
       function(){self.cancelButton()}, null, new THREE.Color(0x00aaaee), new THREE.Color(0xeeee88), Math.PI/4, this.radius/4);

    // color display rect
    /*
    var rect = new THREE.PlaneGeometry( self.radius*2, self.radius/2.5 );

    var mat = new THREE.MeshBasicMaterial(
      {color: 0xffffff, side: THREE.DoubleSide} );

    this.colorRect = new THREE.Mesh( rect, mat );
    this.colorRect.name = 'colorRect';
    this.object3D.add( this.colorRect );
    //this.colorRect.userData = this;
    this.colorRect.position.y = this.radius*-1.5;
    this.colorRect.material.color.setHex(0xffffff);*/
    this.setColor(color);
    if(parent)parent.addChild(this);
    if(onComplete)onComplete(this);
  }
  //'actions'
  setIntensity(val){
    this.intensity = 1-(1-val)*(1-val);// don't want to ramp the colors down too fast - otherwise most of the range is too dark
    var positions = this.geometry.getAttribute('position');
    var colors = this.geometry.getAttribute('color');
    var count = colors.count;
    for(var i=0; i<count;i++){
     colors.setXYZ(i,this.colors[i*3]*this.intensity, this.colors[i*3+1]*this.intensity, this.colors[i*3+2]*this.intensity);
     this.geometry.attributes.color.needsUpdate = true;
    }
    positions.setZ(0, this.intensity*this.radius/2);
    this.geometry.attributes.position.needsUpdate = true;
    this.updateColor();
  }
  cancelButton(){ this.object3D.visible = false; if(this.action)this.action(null, true);}
  okButton(){ this.object3D.visible = false; if(this.action)this.action(this.color, true);}
  updateColor(){
    this.color.copy(this.fullColor);
    this.color.multiplyScalar(this.intensity);
    //this.colorRect.material.color.setHex(this.color.getHex());
    if(this.action)this.action(this.color, false);
    }
  setColor(col){console.log(col);}
 // setActions:function(action, actionCancel){this.action = action; this.actionCancel = actionCancel; }

  //'events'
  onPointerDown(pEvt){
    this.point.copy(pEvt.point);
    this.object3D.worldToLocal(this.point);
    this.point.z=0;
    var len = this.point.length()/this.radius;
    if(len == 0){this.chooseColor(); return true;}
    this.point.normalize();
    var ang = Math.atan2(this.point.y, this.point.x);
    if(ang<0)ang+=Math.PI*2;
    ang/=(Math.PI*2);
    ang*=this.segments;
    var colorIndex = Math.floor(ang);
    var fracIndex = ang-colorIndex;
    colorIndex+=1;
    colorIndex*=3;
    var c = new THREE.Vector3();

    c.x = this.colors[colorIndex]*(1-fracIndex) + this.colors[colorIndex+3]*fracIndex;
    c.y = this.colors[colorIndex+1]*(1-fracIndex) + this.colors[colorIndex+4]*fracIndex;
    c.z = this.colors[colorIndex+2]*(1-fracIndex) + this.colors[colorIndex+5]*fracIndex;
    c.x = (len *c.x + 1-len);
    c.y = (len *c.y + 1-len);
    c.z = (len *c.z + 1-len);
    this.fullColor.setRGB(c.x,c.y, c.z);
    this.updateColor();

    return true;
    }
  onPointerMove(pEvt){ if(pEvt.selectedTObject == this) return this.onPointerDown(pEvt); return true}
  onPointerUp(pEvt){ return true}
}

// starting with Collada, but will generalize this later.
export class TLoader extends TObject {
  //'initialize',{
  constructor(parent, onComplete, fileName){
    var loader = new THREE.ColladaLoader();
    this.setObject3D(new THREE.Group());
    var self = this;
    loader.options.convertUpAxis = true;
    loader.load( Globals.imagePath+fileName,
      function(object){
        var obj = object.scene;
        self.object3D.add(obj);
      });
  }
}
