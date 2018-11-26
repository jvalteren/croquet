// Copyright 2018 by arcos and OS.Vision.
// This software is licensed under the Apache 2 open source license
// davidasmith@gmail.com - david@os.vision
// 919-244-4448

/*global setTimeout, THREE*/
import { TObject, Globals } from "./TObject.js";
import { TDynamicTexture } from "./TDynamicTexture.js";
import { TRectangle } from "./TObjects.js";
import { TButton } from "./TButtons.js";

// TWindow and TPedestal
// These are composite objects made up of smart parts that manipulate the target object - translation, rotation and scale.


// TWindow user manipulable window sytem
export class TWindow extends TObject{
  //'initalizing', {
  constructor(parent, onComplete, title, size, contents, noBacking, hBorder, vBorder){
  	super(parent, onComplete);
    title = title?title:'';
    this.visible = true;
    this.hBorder = hBorder || 0;
    this.vBorder = vBorder || 0;
  	this.size = size;
  	this.contents = contents;
  	this.extent = contents.extent3D();
    if(this.hBorder<0){this.extent.x-=this.hBorder;}
    else this.extent.x+=this.hBorder*2;
    if(this.vBorder<0){this.extent.y-=this.vBorder;}
    else this.extent.y+=this.vBorder*2;
  	this.extent.z = Math.min(1, this.extent.z); // doesn't like 0 when I use this to scale
  	this.originalExtent = new THREE.Vector3();
  	this.originalExtent.copy(this.extent);
  	this.offset = contents.center3D();
  	this.offset.negate();
    if(this.hBorder<0)this.offset.x-=this.hBorder;
    if(this.vBorder<0)this.offset.y+=this.vBorder;

  	contents.object3D.position.copy(this.offset);
  	this.addChild(contents);

      var self = this;

      this.top = new TDragBar(this, function(tObj){tObj.object3D.position.y=(self.extent.y+self.size)/2}, size, this.extent.x, title);
      this.bottom = new TFloorBar(this, function(tObj){tObj.object3D.position.y=-(self.extent.y+self.size)/2}, size, this.extent.x, title);
      this.left = new TSpinBar(this, function(tObj){tObj.object3D.position.x=-(self.extent.x+self.size)/2}, size, this.extent.y, title);
      this.right = new TSpinBar(this, function(tObj){tObj.object3D.position.x=(self.extent.x+self.size)/2}, size, this.extent.y, title);

      this.topLeft = new TCornerScale(this, function(tObj){tObj.object3D.position.set(-(self.extent.x+size)/2, (self.extent.y+size)/2, 0)}, size, new THREE.Vector3(-1,1,1), title);
      this.bottomLeft = new TCornerScale(this, function(tObj){tObj.object3D.position.set(-(self.extent.x+size)/2, -(self.extent.y+size)/2, 0)}, size, new THREE.Vector3(-1,-1,1), title);
      this.topRight = new TCornerScale(this, function(tObj){tObj.object3D.position.set((self.extent.x+size)/2, (self.extent.y+size)/2, 0)}, size, new THREE.Vector3(1,1,1), title);
      this.bottomRight = new TCornerScale(this, function(tObj){tObj.object3D.position.set((self.extent.x+size)/2, -(self.extent.y+size)/2, 0)}, size, new THREE.Vector3(1,-1,1), title);


    	if(!noBacking){
    		var rect      = new THREE.PlaneBufferGeometry(1, 1, 32, 32);
    		var mat      = new THREE.MeshPhongMaterial({color:0xcccccc, emissive: 0x222222, side: THREE.DoubleSide});
      	this.backRect = new THREE.Mesh(rect, mat);
		this.backRect.scale.set(this.extent.x, this.extent.y,1);
		this.backRect.position.set(0,0,-size/2);
		this.object3D.add(this.backRect);
		this.object3D.castShadow = true;
	}
   this.buttons = [];
   this.makeButton(new THREE.Color(0x44ff44), size, function(rval, bttn, pEvt){self.grab(rval, pEvt);}, title+' grab');//green = grab
   this.makeButton(new THREE.Color(0xffff44), size, function(rval, bttn, pEvt){self.shrink(rval, pEvt);}, title +' minimize');//yellow = put away
   this.makeButton(new THREE.Color(0xff4444), size, function(rval, bttn, pEvt){self.remove(rval, pEvt);}, title +' remove');//red = delete

   this.placeButtons();

    this.title = title;
    if(this.title){
      var self = this;
      var scl = (this.extent.x*0.66)/16;
      this.titleRect = new TTextLabel(this,
        function(tObj){
          tObj.object3D.position.set(0, self.extent.y/2+self.size+scl ,0);
          tObj.object3D.scale.x=scl;
          tObj.object3D.scale.y=scl;
        },title);
      this.titleButton = new TButton(this,
        function(tObj){
          tObj.object3D.position.set(0, self.extent.y/2+self.size+scl ,0);
          tObj.object3D.scale.x=scl;
          tObj.object3D.scale.y=scl;
        },
        function(){//button action
          var goHere = new THREE.Vector3();
          goHere.z=Math.max(self.extent.x, self.extent.y)*0.4;
          self.object3D.localToWorld(goHere);
          Globals.tAvatar.goTo(goHere, self.object3D.quaternion, null, 10);
        },
        this.titleRect.object3D
      );

   	   //this.titleRect = new users.TRectangle(this, null, 16,1,8,2);

   	   //this.titleRect.object3D.position.set(0, this.extent.y/2+this.size+scl ,0);
   	   //this.titleRect.object3D.scale.x=scl;
   	   //this.titleRect.object3D.scale.y=scl;
       /*
		   this.titleTexture = new users.TDynamicTexture(null, 1024, 64,'green');
		   this.titleRect.object3D.renderOrder = 5400;
		   this.titleRect.object3D.material.map = this.titleTexture.texture;
		   this.titleRect.object3D.material.transparent = true;
		   this.titleRect.object3D.material.needsUpdate = true;
		   this.titleRect.object3D.material.emissive = 0x000000;
		   this.titleRect.object3D.material.opacity = 0.99;
		   this.titleTexture.clear();
		   this.titleTexture.font = "normal 48px Arial";
       this.titleTexture.fontHeight = 48;
		   this.titleTexture.drawTextCentered(this.title);
       */
   }
  }

  makeButton(color, radius, action, title){
    var geometry = new THREE.SphereBufferGeometry( radius, 16, 16 );
    var material = new THREE.MeshPhongMaterial({color: color.getHex(), emissive: 0x444444});
    var sphere = new THREE.Mesh( geometry, material );
    sphere.name = title;
    this.buttons.push(new TButton(this, null, action, sphere, 0));
  }

  placeButtons(){
    var top = this.extent.y/2+this.size*2.1;
    var right = this.extent.x/2+this.size/2;
    for(var i=0; i<this.buttons.length; i++)
    	this.buttons[i].object3D.position.set(right-i*this.size*2.2, top, 0);
  }

  setExtent(extent){
  	this.extent = extent;
  	this.top.object3D.position.y = (this.extent.y+this.size)/2;
  	this.top.doScale(this.extent.x);
  	this.bottom.object3D.position.y = -(this.extent.y+this.size)/2;
  	this.bottom.doScale(this.extent.x);
  	this.left.object3D.position.x = (this.extent.x+this.size)/2;
  	this.left.doScale(this.extent.y);
  	this.right.object3D.position.x = -(this.extent.x+this.size)/2;
  	this.right.doScale(this.extent.y);
  	this.topLeft.object3D.position.set(-(this.extent.x+this.size)/2, (this.extent.y+this.size)/2, 0);
  	this.bottomLeft.object3D.position.set(-(this.extent.x+this.size)/2, -(this.extent.y+this.size)/2, 0);
  	this.topRight.object3D.position.set((this.extent.x+this.size)/2, (this.extent.y+this.size)/2, 0);
  	this.bottomRight.object3D.position.set((this.extent.x+this.size)/2, -(this.extent.y+this.size)/2, 0);
  	var scale = Math.min(this.extent.x/this.originalExtent.x, this.extent.y/this.originalExtent.y);
  	this.contents.object3D.scale.set(scale, scale, scale);
  	if(this.backRect)this.backRect.scale.set(this.extent.x, this.extent.y,1);// might not exist
  	this.placeButtons();
  	if(this.title){
  	   var scl = (this.extent.x*0.66)/16;
   	   this.titleRect.object3D.scale.x=scl;
   	   this.titleRect.object3D.scale.y=scl;
   	   this.titleRect.object3D.position.set(0, this.extent.y/2+this.size+scl ,0);
   	}
  }
  addExtent(delta){
  	this.extent.add(delta);
  	this.setExtent(this.extent);
  }
  isContainer(){return true;}

  //'actions'
	grab(returnVal, pEvt){
		if(this.carrying){
			this.object3D.setMatrix(this.object3D.matrixWorld);
			pEvt.tScene.addChild(this);
		}else{
  		var mat = new THREE.Matrix4();
  		mat.getInverse(pEvt.tAvatar.object3D.matrixWorld); // mat gets the inverse of the camera transform
  		this.object3D.setMatrix(mat.multiply(this.object3D.matrixWorld));
  		pEvt.tAvatar.addChild(this);
		}
		this.carrying = !this.carrying;
	}
  release(){
    this.carrying = false;
    this.object3D.updateMatrixWorld(true);
    this.object3D.setMatrix(this.object3D.matrixWorld);
    console.log(new THREE.Vector3().copy(this.object3D.position));
    Globals.tScene.addChild(this);
    console.log(new THREE.Vector3().copy(this.object3D.position));
  }
	shrink(){
		var v = this.visible = !this.visible;
		this.bottom.visible(v);
		this.left.visible(v);
		this.right.visible(v);
		//this.topLeft.visible(v);
		this.bottomLeft.visible(v);
		//this.topRight.visible(v);
		this.bottomRight.visible(v);
		this.contents.visible(v);
		if(this.backRect)this.backRect.visible = v;
	}
  display(){
    Globals.tAvatar.addChild(this);
    this.object3D.visible = true;
    this.object3D.position.set(0, 0, -this.extent.y);
    this.object3D.quaternion.set(0,0,0,1);
    this.release();
    return this;
  }
	remove(){ this.parent.removeChild(this); return this; }
  setMatrix(matrix){this.object3D.setMatrix(matrix);} // used to position the window
  //'events',{ //these are here to keep objects like the help screen from sending messages to the tScene.
  onPointerDown(pEvt)  { return true; }
  onPointerMove(pEvt)  { return true; }
  onPointerUp(pEvt)    { return true; }
  onPointerEnter(pEvt) { return true; }
  onPointerOver(pEvt)  { return true; }
  onPointerLeave(pEvt) { return true; }
  onDoubleClick(pEvt)  { return true; }
}

export class TPedestal extends TObject{
  //'initalizing', {
  constructor(parent, onComplete, size, contents, noBacking){
  	super(parent, onComplete);
    this.visible = true;
    var title = 'TPedestal';
    this.object3D.setMatrix = function ( matrix ) {
      this.matrix = matrix;
      this.matrix.decompose( this.position, this.quaternion, this.scale );
    };
  	this.size = size;
  	this.contents = contents;
  	this.extent = contents.extent3D();
  	this.extent2 = new THREE.Vector3();
  	this.extent2.copy(this.extent);
  	this.extent2.multiplyScalar(0.5);
  	//this.extent.y = Math.min(1, this.extent.z); // doesn't like 0 when I use this to scale
  	this.originalExtent = new THREE.Vector3();
  	this.originalExtent.copy(this.extent);
  	this.offset = contents.center3D();
  	this.offset.negate();
  	this.offset.y+=this.extent2.y;
  	contents.object3D.position.copy(this.offset);
  	this.addChild(contents);

    var self = this;
    this.sides = [];
    this.sides.push(new TDragBar(this, function(tObj){tObj.object3D.position.z=(self.extent.z+self.size)/2; }, size, this.extent.x, title));
    this.sides.push(new TDragBar(this, function(tObj){tObj.object3D.position.z=-(self.extent.z+self.size)/2; }, size, this.extent.x, title));
    this.sides.push(new TDragBar(this, function(tObj){tObj.object3D.position.x=(self.extent.x+self.size)/2; tObj.object3D.rotateY(Math.PI/2)}, size, this.extent.z, title));
    this.sides.push(new TDragBar(this, function(tObj){tObj.object3D.position.x=-(self.extent.x+self.size)/2; tObj.object3D.rotateY(Math.PI/2)}, size, this.extent.z, title));

    this.corners = [];
    this.corners.push(new TSpinBar(this, function(tObj){tObj.object3D.position.set((self.extent.x+self.size)/2, 0, (self.extent.z+self.size)/2);}, size, size, title));
    this.corners.push(new TSpinBar(this, function(tObj){tObj.object3D.position.set(-(self.extent.x+self.size)/2, 0, (self.extent.z+self.size)/2);}, size, size, title));
    this.corners.push(new TSpinBar(this, function(tObj){tObj.object3D.position.set(-(self.extent.x+self.size)/2, 0, -(self.extent.z+self.size)/2);}, size, size, title));
    this.corners.push(new TSpinBar(this, function(tObj){tObj.object3D.position.set((self.extent.x+self.size)/2, 0, -(self.extent.z+self.size)/2);}, size, size, title));

    //this.topLeft = new users.TCornerScale(this, function(tObj){tObj.object3D.position.set(-(self.extent.x+size)/2, (self.extent.y+size)/2, 0)}, size, new THREE.Vector3(-1,1,1));
    //this.bottomLeft = new users.TCornerScale(this, function(tObj){tObj.object3D.position.set(-(self.extent.x+size)/2, -(self.extent.y+size)/2, 0)}, size, new THREE.Vector3(-1,-1,1));
    //this.topRight = new users.TCornerScale(this, function(tObj){tObj.object3D.position.set((self.extent.x+size)/2, (self.extent.y+size)/2, 0)}, size, new THREE.Vector3(1,1,1));
    //this.bottomRight = new users.TCornerScale(this, function(tObj){tObj.object3D.position.set((self.extent.x+size)/2, -(self.extent.y+size)/2, 0)}, size, new THREE.Vector3(1,-1,1));

    var rect      = new THREE.PlaneBufferGeometry(1, 1, 32, 32);
  	var mat      = new THREE.MeshPhongMaterial({color:0xcccccc, emissive: 0x222222, side: THREE.DoubleSide});
  	if(!noBacking){
    	this.floorRect = new THREE.Mesh(rect, mat);
      this.floorRect.name = 'floorRect '+ title;
			this.floorRect.scale.set(this.extent.x, this.extent.z,1);
			this.floorRect.position.set(0,size/2,0);
			this.floorRect.rotateX(Math.PI/2)
			this.object3D.add(this.floorRect);
		}
    this.buttons = [];
    this.makeButton(new THREE.Color(0x44ff44), size/2, function(rval, bttn, pEvt){self.grab(rval, pEvt);}, title);//green = full size
    this.makeButton(new THREE.Color(0xffff44), size/2, function(rval, bttn, pEvt){self.shrink(rval, pEvt);}, title);//yellow = put away
    this.makeButton(new THREE.Color(0xff4444), size/2, function(rval, bttn, pEvt){self.remove(rval, pEvt);}, title);//red = delete

    this.placeButtons();
  }
  setExtent(extent){

  }
  addExtent(delta){

  }
  placeButtons(){
    var top = this.size/2+this.size*0.666;
    var right = this.extent.x/2+this.size/2;
    var z = this.extent.z/2+this.size/2;

    for(var i=0; i<this.buttons.length; i++)
    	this.buttons[i].object3D.position.set(right-i*this.size*2.2, top, z);
  }
  makeButton(color, radius, action){
    var geometry = new THREE.SphereBufferGeometry( radius, 16, 16 );
    var material = new THREE.MeshPhongMaterial({color: color.getHex(), emissive: 0x444444});
    var sphere = new THREE.Mesh( geometry, material );
    this.buttons.push(new TButton(this, null, action, sphere, 0));
  }
  isContainer(){return true;}
  //'actions',{
	grab(returnVal, pEvt){
		// this is a missing function in THREE.Object3d
	this.object3D.setMatrix = function ( matrix ) {
		this.matrix = matrix;
		this.matrix.decompose( this.position, this.quaternion, this.scale );
	};
		if(this.carrying){
			this.object3D.setMatrix(this.object3D.matrixWorld);
			pEvt.tScene.addChild(this);
		}else{
  		var mat = new THREE.Matrix4();
  		mat.getInverse(pEvt.tAvatar.object3D.matrixWorld); // mat gets the inverse of the camera transform
  		this.object3D.setMatrix(mat.multiply(this.object3D.matrixWorld));
  		pEvt.tAvatar.addChild(this);
		}
		this.carrying = !this.carrying;
	}
	shrink(){
		var v = this.visible = !this.visible;
		this.contents.visible(v);
	}
  remove(){ this.parent.removeChild(this); }
  setMatrix(matrix){this.object3D.setMatrix(matrix);} // used to position the window
}


// horizontal bar
var THBar = TObject.subclass('users.THBar',
	'properties',{
		size: null,
		scale: null,
		color: null,
		overColor: null,
		wireframe: null
	},
	'initialize',{
		initialize: function(parent, onComplete, size, scale, title, doWire){
      doWire = doWire!==undefined ? doWire: false;
		  this.size = size;
		  this.overColor = new THREE.Color(0.9,0.9,0.65);

		  if(true){
		  	 this.color = new THREE.Color(0x3E3E4E);
			  var texture = new THREE.TextureLoader().load( Globals.imagePath+"metal.png");
			  texture.mapping= 300;
			  texture.wrap=[1001,1001];
			  texture.minFilter= 1008;
			  texture.magFilter= 1006;
			  texture.anisotropy= 1;
			  texture.flipY= true;
			  var mat = new THREE.MeshStandardMaterial({
			  	color: 4079166,
				roughness: 1,
				metalness: 0.5,
				emissive: 0,
				roughnessMap: texture,
				depthFunc: 3
			  });
		  }
		  else {
		  	this.color = new THREE.Color(0.7,0.7,0.95);

		    var mat  = new THREE.MeshStandardMaterial( {
	        	color: this.color.getHex(), emissive: 0x222222, opacity:0.75,
	       		transparent:true, side: THREE.FrontSide} );
			}

      var box  = new THREE.BoxGeometry(1, size, size, 32, 2, 2 );
      var bar = new THREE.Mesh(box, mat);
      if(doWire){
        this.wireframe = new THREE.LineSegments(
  			 new THREE.EdgesGeometry( bar.geometry ),
  			 new THREE.LineBasicMaterial()
		    );
		    this.wireframe.material.color.setHSL( 0.5, 0.75, 0.6 );
		    bar.add( this.wireframe );
      }

      bar.name = 'THBar '+title;
        this.setObject3D(bar);
        this.object3D.castShadow = true;
        if(scale)this.doScale(scale);
        if(parent)parent.addChild(this);
        if(onComplete)onComplete(this);
    	},
    	doScale: function(scale){
    		this.scale = scale;
    		this.object3D.scale.x = scale;
    	}

	},
	'events',{
	    onPointerEnter:function(pEvt){this.hilite(); return true;},
	    onPointerOver:function(pEvt){return true;},
	    onPointerLeave:function(pEvt){this.unhilite(); return true;}
	},
	'actions',{
	    hilite: function(){this.object3D.scale.set(this.scale,1.1,1.1); this.object3D.material.color.setHex( this.overColor.getHex());},
	    unhilite:function(){this.object3D.scale.set(this.scale,1,1); this.object3D.material.color.setHex( this.color.getHex());}
	 }
);

// vertical bar
var TVBar = TObject.subclass('users.TVBar',
	'properties',{
		size: null,
		scale: null,
		color: null,
		overColor: null,
		wireframe: null
	},
	'initialize',{
		initialize: function(parent, onComplete, size, scale, title, doWire){
      doWire = doWire!==undefined ? doWire: false;
		  this.size = size;
		  this.overColor = new THREE.Color(0.9,0.9,0.65);
		  if(true){
		  	  this.color = new THREE.Color(0x3E3E4E);
			  var texture = new THREE.TextureLoader().load( Globals.imagePath+"metal.png");
			  texture.mapping= 300;
			  texture.wrap=[1001,1001];
			  texture.minFilter= 1008;
			  texture.magFilter= 1006;
			  texture.anisotropy= 1;
			  texture.flipY= true;
			  var mat = new THREE.MeshStandardMaterial({
			  	color: 4079166,
				roughness: 1,
				metalness: 0.5,
				emissive: 0,
				roughnessMap: texture,
				depthFunc: 3
			  });
		  } else {
		  	this.color = new THREE.Color(0.7,0.7,0.95);

	      	var mat  = new THREE.MeshStandardMaterial( {
	        	color: this.color.getHex(), emissive: 0x222222, opacity:0.75,
	       		transparent:true, side: THREE.FrontSide} );
	    };
      var box  = new THREE.BoxGeometry(size, 1, size, 2, 32, 2 );
      var bar = new THREE.Mesh(box, mat);
      bar.name = 'TVBar '+title;
      if(doWire){
	      this.wireframe = new THREE.LineSegments(
			     new THREE.EdgesGeometry( bar.geometry ),
			     new THREE.LineBasicMaterial()
		    );
		    this.wireframe.material.color.setHSL( 0.5, 0.75, 0.6 );
        bar.add( this.wireframe );
      }
      this.setObject3D(bar);
      this.object3D.castShadow = true;
      if(scale)this.doScale(scale);
      if(parent)parent.addChild(this);
      if(onComplete)onComplete(this);
    },
  	doScale: function(scale){
  		this.scale = scale;
  		this.object3D.scale.y = scale;
  	}

	},
	'events',{
	    onPointerEnter:function(pEvt){this.hilite(); return true;},
	    onPointerOver:function(pEvt){return true;},
	    onPointerLeave:function(pEvt){this.unhilite(); return true;}
	},
	'actions',{
	    hilite: function(){this.object3D.scale.set(1.1,this.scale,1.1); this.object3D.material.color.setHex( this.overColor.getHex());},
	    unhilite:function(){this.object3D.scale.set(1, this.scale,1); this.object3D.material.color.setHex( this.color.getHex());}
	 }
);

// vertical bar
var TCorner = TObject.subclass('users.TCorner',
	'properties',{
		size: null,
		scale: null,
		color: null,
		overColor: null,
		inversion: null
	},
	'initialize',{
		initialize: function(parent, onComplete, size, inversion, title, doWire){
      doWire = doWire!==undefined ? doWire: false;
		  this.inversion = inversion;
		  this.size = size;
		  this.color = new THREE.Color(0x4E5E3E);
      	  this.overColor = new THREE.Color(0.9,0.9,0.65);
      	  if(true){
		  	  //this.color = new THREE.Color(4079166);
			  var texture = new THREE.TextureLoader().load( Globals.imagePath+"metal.png");
			  texture.mapping= 300;
			  texture.wrap=[1001,1001];
			  texture.minFilter= 1008;
			  texture.magFilter= 1006;
			  texture.anisotropy= 1;
			  texture.flipY= true;
			  var mat = new THREE.MeshStandardMaterial({
			  	color: this.color.getHex(),
				roughness: 1,
				metalness: 0.5,
				emissive: 0,
				roughnessMap: texture,
				depthFunc: 3
			  });
		  }
		  else {
	      var mat  = new THREE.MeshStandardMaterial( {
	        	color: this.color.getHex(), emissive: 0x222222, opacity:0.75,
	       		transparent:true, side: THREE.FrontSide} );
	  	};
      var box  = new THREE.BoxGeometry(size, size, size, 2, 2, 2 );
      var bar = new THREE.Mesh(box, mat);
      if(doWire){
	      this.wireframe = new THREE.LineSegments(
			     new THREE.EdgesGeometry( bar.geometry ),
			     new THREE.LineBasicMaterial()
		    );
		    this.wireframe.material.color.setHSL( 0.5, 0.75, 0.6 );
        bar.add( this.wireframe );
      }
      bar.name = 'TCorner '+title;

      this.setObject3D(bar);
      this.object3D.castShadow = true;
      if(parent)parent.addChild(this);
      if(onComplete)onComplete(this);
    },
	},
	'events',{
	    onPointerEnter:function(pEvt){this.hilite(); return true;},
	    onPointerOver:function(pEvt){return true;},
	    onPointerLeave:function(pEvt){this.unhilite(); return true;}
	},
	'actions',{
	    hilite: function(){this.object3D.scale.set(1.1, 1.1, 1.1); this.object3D.material.color.setHex( this.overColor.getHex());},
	    unhilite:function(){this.object3D.scale.set(1, 1 ,1); this.object3D.material.color.setHex( this.color.getHex());}
	 }
);

var TCornerScale = TCorner.subclass('users.TCornerScale',
	'properties',{
		scale:null,
		dragVector:null,
		vec: null,
		toVector: null,
		plane: null
	},
	'events',{
		onPointerDown: function(pEvt){
			if(!this.dragVector) this.dragVector = new THREE.Vector3();
			if(!this.vec)this.vec = new THREE.Vector3();
			if(!this.toVector)this.toVector = new THREE.Vector3();
			this.dragVector.copy(pEvt.point);
			return true;
		},
		onPointerMove: function(pEvt){
			this.parent.object3D.getWorldDirection(this.toVector)

			this.vec.copy(this.dragVector);
      this.vec.normalize();
      var cos = this.toVector.dot(this.vec);

      this.vec.copy(pEvt.cameraNorm);
      this.plane = new THREE.Plane(this.toVector, -cos*this.dragVector.length());
      pEvt.ray3D.ray.intersectPlane(this.plane, this.toVector);
      // first translate the center
      this.vec.copy(this.toVector);
      this.vec.sub(this.dragVector);
      this.vec.multiplyScalar(0.5);
      //this.vec.multiply(this.inversion);
      this.parent.object3D.position.add(this.vec);
      //now resize the window
      this.vec.copy(this.dragVector);
      this.dragVector.copy(this.toVector);
      this.parent.object3D.worldToLocal(this.vec);
      this.parent.object3D.worldToLocal(this.toVector);
      this.toVector.sub(this.vec);
      this.toVector.multiply(this.inversion);
      this.parent.addExtent(this.toVector);
      return true;
		},
		onPointerUp: function(pEvt){return true;}
	}
);

var TDragBar = THBar.subclass('users.TDragBar',
	'properties',{
		dragVector:null,
		vec: null,
		toVector: null,
		plane: null
	},
	'events',{
		onPointerDown: function(pEvt){
			if(!this.dragVector) this.dragVector = new THREE.Vector3();
			if(!this.vec)this.vec = new THREE.Vector3();
			if(!this.toVector)this.toVector = new THREE.Vector3();
			this.dragVector.copy(pEvt.point);
			return true;
		},
		onPointerMove: function(pEvt){
			this.vec.copy(this.dragVector);
	        this.vec.normalize();
	        var cos = pEvt.cameraNorm.dot(this.vec);
	        this.vec.copy(pEvt.cameraNorm);
	        this.plane = new THREE.Plane(this.vec, -cos*this.dragVector.length());
	        pEvt.ray3D.ray.intersectPlane(this.plane, this.toVector);
	        this.vec.copy(this.toVector);
	        this.vec.sub(this.dragVector);
	        this.parent.object3D.position.add(this.vec);
	        this.dragVector.copy(this.toVector);
	        return true;
		},
		onPointerUp: function(pEvt){return true;}
	}
);

var TFloorBar = THBar.subclass('users.TFloorBar',
	'properties',{
		dragVector:null,
		vec: null,
		toVector: null,
		plane: null
	},
	'events',{
		onPointerDown: function(pEvt){
			if(!this.dragVector) this.dragVector = new THREE.Vector3();
			if(!this.vec)this.vec = new THREE.Vector3();
			if(!this.toVector)this.toVector = new THREE.Vector3();
			this.dragVector.copy(pEvt.point);
			return true;
		},
		onPointerMove: function(pEvt){
			this.vec.set(0,1,0);
			this.plane = new THREE.Plane(this.vec, -this.dragVector.y);
	        pEvt.ray3D.ray.intersectPlane(this.plane, this.toVector);
	        this.vec.copy(this.toVector);
	        this.vec.sub(this.dragVector);
	        this.parent.object3D.position.add(this.vec);
	        this.dragVector.copy(this.toVector);
	        return true;
		},
		onPointerUp: function(pEvt){return true;}
	}
);

var TSpinBar = TVBar.subclass('users.TSpinBar',
	'properties',{
		toVector: null,
		centerVector: null,
		farVector: null,
		normVector: null,
		plane: null,
		dx:0,
		tx:0
	},
	'events',{
		onPointerDown: function(pEvt){
			this.centerVector = new THREE.Vector3();
			this.toVector = new THREE.Vector3();
			this.normVector = new THREE.Vector3();
			this.farVector = new THREE.Vector3();

			this.parent.object3D.getWorldPosition(this.centerVector);
			this.normVector.copy(this.centerVector);
			this.normVector.y = 0;
        	this.normVector.normalize();
        	//this.normVector.negate();
        	var cos = pEvt.cameraNorm.dot(this.normVector);
        	this.normVector.copy(pEvt.cameraNorm);

        	this.plane = new THREE.Plane(this.normVector, -cos*this.centerVector.length());
        	pEvt.ray3D.ray.intersectPlane(this.plane, this.toVector);
        	this.toVector.y = 0;
        	// place a far away vector to where we are working so that we are always rotating in the same direction - show always be to the left of everything
        	var mat = pEvt.tAvatar.object3D.matrixWorld.elements;
        	this.farVector.set(mat[0], mat[1], mat[2]); // figure out which way is right
        	this.farVector.y = 0;
        	this.farVector.normalize();
        	this.farVector.negate(); // point to the left
        	this.farVector.multiplyScalar(5000); //put it way out there
        	this.toVector.sub(this.farVector);

        	this.dx = this.toVector.length();
        	return true;
		},
		onPointerMove: function(pEvt){
        	pEvt.ray3D.ray.intersectPlane(this.plane, this.toVector);
        	this.toVector.sub(this.farVector);
        	this.toVector.y = 0;
        	this.tx = this.toVector.length();
        	var rotate = Math.PI * (this.tx-this.dx)/this.parent.extent.x; // cancelling powers of 2

			this.dx = this.tx;

        	this.parent.object3D.rotateY(rotate);

        	return true;
		},
		onPointerUp: function(pEvt){
			return true;
		}
	}
	);


export class TTextLabel extends TRectangle{

  //'initialize',{
  constructor(parent, onComplete, title, xDim, yDim, fontHeight){
    xDim = xDim || 16;
    yDim = yDim || 1;
    fontHeight = fontHeight || 48;
    super(parent, onComplete, xDim, yDim ,8,2);
    this.point = new THREE.Vector3();
    //var scl = (parent.extent.x*0.66)/16;
    this.title = title||null;
    //this.object3D.scale.x=scale;
    //this.object3D.scale.y=scale;
    this.titleTexture = new TDynamicTexture(null, xDim*64, yDim*64,'white');
    this.object3D.renderOrder = 5400;
    this.object3D.material.map = this.titleTexture.texture;
    this.object3D.material.side = THREE.DoubleSide;
    this.object3D.material.transparent = true;
    this.object3D.material.needsUpdate = true;
    this.object3D.name = 'Title '+title;
    //this.object3D.material.emissive = 0x222222;
    this.object3D.material.opacity = 0.99;
    this.titleTexture.clear();
    this.titleTexture.font = "normal "+fontHeight+"px Arial";
    this.titleTexture.fontHeight = fontHeight;
    this.titleTexture.drawTextCentered(this.title);
  }

  // convenience function to replace text (assuming it fits on the pre-allocated texture)
  replaceText(text, x, y, fillStyle) {
    var texture = this.titleTexture;
    texture.clear();
    if (x===undefined) texture.drawTextCentered(text, undefined, fillStyle); // see drawTextCentered arg list
    else texture.drawText(text, x, y, fillStyle);
  }
}


export class TAlertMessage extends TTextLabel{
  //'initialize'
  constructor(parent, onComplete){
    super(parent, onComplete, 'alert', 16, 16);
    this.object3D.position.z = -6;
    this.ignoreEvents();
  }

  alert(message, time, startTime){
    var self = this;
    if(startTime === undefined)startTime = 0;
    if(startTime)setTimeout(function(){self.doAlert(message, time)}, startTime);
    else this.doAlert(message, time);
  }

  doAlert(message, time){
    this.title = message;
    this.titleTexture.clear();
    this.titleTexture.font = "normal 48px Arial";
    this.titleTexture.fontHeight = 48;
    this.titleTexture.drawTextCentered(this.title);
    var self = this;
    if(time)setTimeout(function(){self.removeSelf();},time);
    this.object3D.position.z = -10;
    this.goTo(new THREE.Vector3(0,0,-5));
    Globals.tAvatar.addChild(this);
  }

  //'events',{
  onPointerDown(pEvt){this.removeSelf(); return true;}
}

Globals.alert = function(){
  var am = new TAlertMessage();
  return function(message, time){
    console.log('alert ', message, time);
    am.alert(message,time);
  }
}();
