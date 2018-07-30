// Copyright 2017 by David A Smith and CEO Vision, Inc. All Rights Reserved.
// davidasmith@gmail.com
// 919-244-4448

/*global THREE,THREEx,DaydreamController*/
import { TObject, Globals } from "./TObject.js";

// TPointer is the virtual laser point for the user. It tracks the mouse or the Daydream (or other) controllers.
// It currently uses the Daydream device as the stand-in for all devices.
var TPointer = TObject.subclass('users.TPointer',
  'properties',{
    model: null,
    laserBeam: null,
    lookAtMat: null,
    forwardVector: null,
    rightVector: null,
    upVector: null,//up is up...
    armLength:1
  },
  'initialize',{
    initialize: function(parent, onComplete, model){
      this.setObject3D(new THREE.Group());
      if(model)this.setModel(model);
      this.selectable = false;
      this.lookAtMat = new THREE.Matrix4();
      this.forwardVector = new THREE.Vector3();
      this.rightVector = new THREE.Vector3();
      this.upVector = new THREE.Vector3(0,1,0);
      if(parent)parent.addChild(this);
      if(onComplete)onComplete(this);

    },
    setModel: function(model){
        this.model = model;
        this.model.userData = this;
        this.model.position.z = -this.armLength;
        this.object3D.add(this.model);     
    },
    setLaser:function(){
      var armLength = this.armLength;
      this.laserBeam = new TLaser(this,function(tObj){ tObj.object3D.rotation.y = Math.PI/2; tObj.object3D.position.z = -armLength;});
    },
  },
  'actions',{
    trackMouseEvent: function(pEvt){
      
        this.forwardVector.copy(pEvt.point);
        this.object3D.parent.worldToLocal(this.forwardVector);
        this.lookAtMat.lookAt(this.object3D.position, this.forwardVector, this.upVector);
        this.object3D.quaternion.setFromRotationMatrix( this.lookAtMat );
        this.forwardVector.sub(this.object3D.position);
        var distance = this.forwardVector.length();
        this.laserBeam.object3D.scale.x = (distance-this.armLength)-.05;
        this.laserBeam.ball.scale.x = 1/this.laserBeam.object3D.scale.x;
    },

    update: function(timeStamp){
    }
  }
);

var TLaser = TObject.subclass('users.TLaser',
  'properties',{
    canvas: null,
    texture: null,
    worldTarget: null,
    ball: null
  },
  'initialize', {
    initialize: function(parent, onComplete){
      this.setObject3D(new THREE.Group());
      this.selectable = false;
      this.canvas = this.generateLaserBodyCanvas();
      this.texture = new THREE.Texture(this.canvas);
      this.texture.needsUpdate = true;
      // do the material  
      var material  = new THREE.MeshBasicMaterial({
        map   : this.texture,
        blending  : THREE.AdditiveBlending,
        color   : 0x44aa77,
        side    : THREE.DoubleSide,
        depthWrite  : false,
        transparent : true
      })
      var geometry  = new THREE.PlaneGeometry(1, 0.075,50, 1);
      var nPlanes = 16;
      for(var i = 0; i < nPlanes; i++){
        var mesh  = new THREE.Mesh(geometry, material);
        mesh.renderOrder = 5000;
        mesh.position.x = 1/2;
        mesh.rotation.x = i/nPlanes * Math.PI;
        this.object3D.add(mesh);
      }

      // now add the pretty bits
if(false){
      var textureUrl  = THREEx.LaserCooked.baseURL+'CEO_Cockpit/img/blue_particle.jpg';
      var texture = new THREE.TextureLoader().load(textureUrl)  
      var material  = new THREE.SpriteMaterial({
        map   : texture,
        blending  : THREE.AdditiveBlending,
      })
      var sprite  = new THREE.Sprite(material)
      sprite.scale.x = 0.5
      sprite.scale.y = 2;
      sprite.position.x = 1-0.01
      this.object3D.add(sprite)
}
      // add a point light
      var light = new THREE.PointLight( 0x4444ff);
      light.intensity = 0.5;
      light.distance  = 4;
      light.position.x= 1-0.02;
      this.light  = light;
      this.object3D.add(light);

      var box      = new THREE.SphereGeometry(0.05, 32, 32);

      var mat = new THREE.MeshStandardMaterial( {
      color: 0x88cc88, emissive: 0x222222, opacity:0.75, 
      transparent:true, side: THREE.FrontSide} );    

      this.ball     = new THREE.Mesh(box, mat); 
      this.ball.renderOrder = 4000;
      this.ball.position.x = 1;
      this.object3D.add(this.ball);

      if(parent)parent.addChild(this);
      if(onComplete)onComplete(this);   
    },

    generateLaserBodyCanvas: function (){
      // init canvas
      var canvas  = document.createElement( 'canvas' );
      var context = canvas.getContext( '2d' );
      canvas.width  = 1;
      canvas.height = 64;
      // set gradient
      var gradient  = context.createLinearGradient(0, 0, canvas.width, canvas.height);    
      gradient.addColorStop( 0  , 'rgba(  0,  0,  0, 0.4)' );
      gradient.addColorStop( 0.25, 'rgba(128,180,128,0.6)' );
      gradient.addColorStop( 0.5, 'rgba(180,180,255,0.8)' );
      gradient.addColorStop( 0.75, 'rgba(128,180,128,0.6)' );
      gradient.addColorStop( 1.0, 'rgba(  0,  0,  0, 0.4)' );
      // fill the rectangle
      context.fillStyle = gradient;
      context.fillRect(0,0, canvas.width, canvas.height);
      // return the just built canvas 
      return canvas;  
    },
  },
  'actions',{
    lookat: function(worldTarget){
      this.object3D.lookAt(worldTarget);
    },

    update: function(timeStamp){

    }
  }
);

var TDaydreamController = TObject.subclass('users.TDaydreamController',
  'properties',{
    tScene: null, // the TScene to send controller events to
    appButton: null, // selection button
    homeButton: null, // go home... possibly more
    touchButton: null, // display where your touch is on the controller
    moveButton: null, // big button is down
    controller: null, // Daydream controller
    qHome: null, // home orientation for controller
    q: null, // tracked orientation for controller
    qComposite: null, // composite of qHome and q
    resetTime: 0, // when this gets to 10000, reset home orientation to be inverse of q
    model: null, 
    laserBeam: null,
    lookAtMat: null,
    forwardVector: null,
    rightVector: null,
    upVector: null,//up is up...
    armLength:1,
    controllerEvent: null,
    initialized: false,
    timeout: null
  },

  'initialize',{
    initialize: function(parent, onComplete){
      //user controller object
      this.q = new THREE.Quaternion();
      this.qHome = new THREE.Quaternion();
      this.qComposite = new THREE.Quaternion();

      this.controllerEvent = new ControllerEvent();
      this.selectable = false;
      this.lookAtMat = new THREE.Matrix4();
      this.forwardVector = new THREE.Vector3();
      this.rightVector = new THREE.Vector3();
      this.upVector = new THREE.Vector3(0,1,0);
      var loader = new THREE.ColladaLoader();
      this.setObject3D(new THREE.Group());
      var self = this;
      loader.options.convertUpAxis = true;
      loader.load( Globals.imagePath+'daydream_vr_controller/daydream.dae', 
        function(object){ 
          var obj = object.scene;
          //obj.scale.set(0.1,0.1,0.1); 
          //obj.rotation.x = Math.PI/2; 
          //obj.position.set(0,-2,-2); 
          //obj.position.z = -1;

          self.object3D.add(obj);
          var material = new THREE.MeshPhongMaterial( { color: 0x88ff99, shininess: 15, side: THREE.SingleSide, opacity:0.5, transparent:true } );
          var geometry = new THREE.CircleBufferGeometry( 0.7, 32 );
          self.appButton = new THREE.Mesh( geometry, material.clone() );
          self.appButton.rotation.x = Math.PI;
          self.appButton.position.z = -1;
          self.appButton.position.y = -0.75;
          self.appButton.visible = false;
          obj.add(self.appButton);

          var geometry = new THREE.CircleBufferGeometry( 0.7, 32 );
          self.homeButton = new THREE.Mesh( geometry, material.clone() );
          self.homeButton.rotation.x = Math.PI;
          self.homeButton.position.z = -1;
          self.homeButton.position.y = 0.95;
          self.homeButton.visible = false;
          obj.add(self.homeButton);


          var geometry = new THREE.CircleBufferGeometry( 1.65, 32 );
          self.moveButton = new THREE.Mesh( geometry, material.clone() );
          self.moveButton.rotation.x = Math.PI;
          self.moveButton.position.z = -1;
          self.moveButton.position.y = -3.45;
          self.moveButton.visible = false;
          obj.add(self.moveButton);

          var material = new THREE.MeshPhongMaterial( { color: 0xffff88, shininess: 15, side: THREE.SingleSide, opacity:0.5, transparent:true } );
          var geometry = new THREE.CircleBufferGeometry( 0.4, 32 );
          self.touchButton = new THREE.Mesh( geometry, material );
          self.touchButton.rotation.x = Math.PI;
          self.touchButton.position.z = -1.1;
          self.touchButton.position.y = -3.45;
          obj.add(self.touchButton);
          self.model = obj;
          self.model.position.z = -self.armLength;

          if(parent)parent.addChild(self);
          if(onComplete)onComplete(self);  
        });
    },

    setLaser:function(){
      var armLength = this.armLength;
      this.laserBeam = new TLaser(this,function(tObj){ tObj.object3D.rotation.y = Math.PI/2; tObj.object3D.position.z = -armLength;});
    },    
  },
  'actions',{
    trackMouseEvent: function(pEvt){
      this.forwardVector.copy(pEvt.point);
      this.object3D.parent.worldToLocal(this.forwardVector);
      this.lookAtMat.lookAt(this.object3D.position, this.forwardVector, this.upVector);
      this.object3D.quaternion.setFromRotationMatrix( this.lookAtMat );
      this.forwardVector.sub(this.object3D.position);
      var distance = this.forwardVector.length();
      this.laserBeam.object3D.scale.x = (distance-this.armLength)-.05;
      this.laserBeam.ball.scale.x = 1/this.laserBeam.object3D.scale.x;
    },

    trackLaser: function(pEvt){
      this.forwardVector.copy(pEvt.point);
      this.object3D.parent.worldToLocal(this.forwardVector);
      this.forwardVector.sub(this.object3D.position);
      var distance = this.forwardVector.length();
      this.laserBeam.object3D.scale.x = (distance-this.armLength)-.05;
      this.laserBeam.ball.scale.x = 1/this.laserBeam.object3D.scale.x;    
    },

    trackControllerEvent: function(state){
      var angle = Math.sqrt(state.xOri*state.xOri + state.yOri*state.yOri + state.zOri*state.zOri); 

      if(angle>0.0){
        var scale = 1/angle;
        this.q.setFromAxisAngle(new THREE.Vector3(state.xOri*scale, state.yOri*scale, state.zOri*scale), angle);
      }else
        this.q.set(0,0,0,1);

      if(this.initialized === false){
        this.qHome.copy( this.q );
        this.qHome.inverse();
        this.initialized = true;        
      }

      if ( state.isHomeDown ) {
        if ( this.timeout === null ) {
          var self=this;
          this.timeout = setTimeout( function () {
            self.qHome.copy( self.q );
            self.qHome.inverse();
          }, 1000 );
        }
      } else {
        if ( this.timeout !== null ) {
          clearTimeout( this.timeout );
          this.timeout = null;
        }
      }
      this.object3D.quaternion.copy(this.qHome);
      this.object3D.quaternion.multiply(this.q);

      this.homeButton.visible = this.controllerEvent.homeButton = state.isHomeDown;
      this.moveButton.visible = this.controllerEvent.touchButton.state = state.isClickDown;
      this.appButton.visible = this.controllerEvent.appButton = state.isAppDown;

      this.controllerEvent.touchButton.x = state.xTouch-0.5;
      this.controllerEvent.touchButton.y = state.yTouch-0.5;

      this.touchButton.position.x = ( state.xTouch * 2 - 1 )*1.25;
      this.touchButton.position.y = ( state.yTouch * 2 - 1 )*1.25 - 3.45;

      this.touchButton.visible = this.controllerEvent.touchButton.touch = state.xTouch > 0 || state.yTouch > 0;
      this.controllerEvent.touchButton.isDown = state.isClickDown;

      this.tScene.enterControllerEvent(this.controllerEvent);
    },

    buttonDown:function(){
      this.moveButton.visible = true;
    },
    buttonUp:function(){
      this.moveButton.visible = false;
    },
    touchDown: function(){
      this.touchButton.visible=true;
    },
    touchUp: function(){
      this.touchButton.visible=false;
    },
    trackAxis:function(x,y){      
      this.touchButton.position.x = x*2;
      this.touchButton.position.y = y*2 - 3.45;
    },
   installController: function(){
      var self = this;    
      this.controller = new DaydreamController();
      this.controller.onStateChange( function(state){self.trackControllerEvent(state);} );
      return this.controller.connect();
    }
});

var ControllerEvent = Object.subclass('ControllerEvent',
  'properties',{
  quaternion: null,
  homeButton: false,
  lastHomeButton: false,
  appButton: false,
  lastAppButton: false,
  touchButton: null
},
'initialize',
{
  initialize: function(){
    this.homeButtom = false;
    this.appButton = false;
    this.touchButton = {x:0, y:0, touch: false, quaternion: null, isDown: false};
  }
});

export {
  TDaydreamController
  // ControllerEvent,
  // TLaser,
  // TPointer
}
