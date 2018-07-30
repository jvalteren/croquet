// Copyright 2017 by David A Smith and CEO Vision, Inc. All Rights Reserved.
// davidasmith@gmail.com
// 919-244-4448


/*global THREE*/
import { TObject } from "./TObject.js";
import { TTextLabel } from "./TWindow.js";
import { TSlider } from "./TObjects.js";
import { TDynamicTexture } from "./TDynamicTexture.js";


// this needs to be generalized and restructured.

export class TBottleLine extends TObject {
	//'initalize'
	constructor(parent, onComplete, bottleMesh, min, max){
			this.min = min;
			this.max = max;
			this.setObject3D(bottleMesh);
			this.object3D.name = 'TBottleLine';

      if(parent)parent.addChild(this);
      if(onComplete)return onComplete(this);
	}
}

export class TBottleChart extends TObject {
	//'initialize'
	constructor(parent, onComplete, bottles, tStart, tEnd, xLabel, yLabel){
		super(parent, onComplete);
		//this.object3D.rotation.x = Math.PI/2;
		//this.object3D.rotation.y = Math.PI/2;
		this.object3D.name = 'TBottleChart';
		this.tStart = tStart;
		this.tEnd = tEnd;
		var self = this;


		this.clipPlanes = [
			//new THREE.Plane( new THREE.Vector3( 1,  0,  0 ), -20),
			new THREE.Plane( new THREE.Vector3( 0, -1,  0 ), 0),
			//new THREE.Plane( new THREE.Vector3( 0, 1,  0 ), -4),
			//new THREE.Plane( new THREE.Vector3( 0,  0, -1 ), 0)
		];

		this.transformedPlanes = [];
		this.clipPlanes.forEach(function(plane){
			self.transformedPlanes.push(plane.clone());
		});

		this.min = new THREE.Vector3(Infinity, Infinity, Infinity);
		this.max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

		bottles.forEach(function(b){
			b.object3D.material.clippingPlanes= self.transformedPlanes;
			b.object3D.material.clipIntersection = false;
			self.addChild(b);
			if(self.min.x>b.min.x)self.min.x=b.min.x;
			if(self.min.y>b.min.y)self.min.y=b.min.y;
			if(self.min.z>b.min.z)self.min.z=b.min.z;
			if(self.max.x<b.max.x)self.max.x=b.max.x;
			if(self.max.y<b.max.y)self.max.y=b.max.y;
			if(self.max.z<b.max.z)self.max.z=b.max.z;
		});

		var ext = this.extent3D();
		var bb = this.boundingBox();
		var center = this.center3D();

		//console.log('bottlechart', ext);
		this.graphTexture = new TDynamicTexture(null, 128, 128*ext.z/ext.x, 'black', 'white');
		this.graphTexture.fill('white');
		this.graphTexture.drawText(''+tStart, 48, this.graphTexture.height-10);
		this.graphTexture.drawRect(0,0,this.graphTexture.width, this.graphTexture.height, 'green', 2);
		this.graphPaper = new TGraphPaper(this, 
			function(tObj){
				tObj.object3D.rotation.x = -Math.PI/2; 
				tObj.object3D.position.set(center.x, -0.04, center.z);
			},
			ext, this.graphTexture.getTexture())
	this.scaleY = ext.y;
	
		this.makeClipSlider();

		this.xLabel = new TTextLabel(this.graphPaper,
      function(tObj){
      	tObj.object3D.rotation.x = Math.PI/2;
      	tObj.object3D.position.set(0,ext.z/2,1.2); //rotated around x so y and z are interchanged
      },xLabel);

		this.yLabel = new TTextLabel(this.graphPaper,
      function(tObj){
      	tObj.object3D.rotation.x = Math.PI/2;
      	tObj.object3D.rotation.y = -Math.PI/2;
      	tObj.object3D.position.set(ext.x/2,0,1.2); //rotated around x so y and z are interchanged
      },yLabel);
		//console.log(this.min, this.max);
	}

	onAdoption(){
		// need to do this because the container (window or pedestal) resizes based upon total transformed size of objects. labels are much wider than they appears
		this.xLabel.object3D.scale.set(2,2,2);
		this.yLabel.object3D.scale.set(2,2,2);
	}

	updatePlanes(){
		// we need to set a dirty flag if we move the object or drag the slider, otherwise, this is a bit expensive
		this.object3D.updateMatrix();
		for ( var i = 0, n = this.clipPlanes.length; i !== n; ++ i )
			this.transformedPlanes[ i ].copy( this.clipPlanes[ i ] ).applyMatrix4( this.object3D.matrixWorld);
	}

	makeClipSlider(){
		var self = this;
		var bb = this.boundingBox();
		new TSlider(this, 
			function(tObj){tObj.object3D.position.set( .75+bb.min.x, (bb.max.y+bb.min.y)/2, -.75); tObj.object3D.rotation.z=Math.PI/2;	},  
			function(val){self.slideClip(val)}, bb.max.y-bb.min.y, 1.5, 0);
	}

	slideClip(val){
		//console.log(val*this.extent3D().y)
		this.graphTexture.fill('white');
		this.graphTexture.drawText(''+Math.floor((this.tStart+val*(this.tEnd-this.tStart))), 48, this.graphTexture.height-10);
		this.graphTexture.drawRect(0,0,this.graphTexture.width, this.graphTexture.height, 'green', 1);
		this.clipPlanes[0].constant = val*this.scaleY;
		this.graphPaper.object3D.position.y = val*this.scaleY-0.04;
	}

	update(time){
		//this.object3D.rotation.x = time * 0.005;
		//this.object3D.rotation.y = time * 0.002;
		this.updatePlanes();
	}
}

export class TGraphPaper extends TObject {
	//'initialize'
	constructor(parent, onComplete, ext, texture){
		this.texture = texture;
		var rect     = new THREE.PlaneBufferGeometry(ext.x+0.25, ext.z+0.25, 32, 32);
	var mat      = new THREE.MeshPhongMaterial({color:0xcccccc, emissive: 0x222222, map: texture, opacity:0.75, 
      transparent:true, side: THREE.DoubleSide});
	this.setObject3D(new THREE.Mesh(rect, mat));
	this.object3D.name = 'TGraphPaper';

	if(parent)parent.addChild(this);
	if(onComplete)onComplete(this);
	}
}

