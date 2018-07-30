// Copyright 2017 by David A Smith and CEO Vision, Inc. All Rights Reserved.
// davidasmith@gmail.com
// 919-244-4448

/*global THREE*/
import { TObject } from "./TObject.js";


var TProgressBar = TObject.subclass('TProgressBar',
	'properties',{
	barIncomplete: null,
	colorIncomplete: null,
	barComplete: null,
	colorComplete: null,
	barLength: 1,
	value: 0
	},
	'initialize',{
		initialize: function(parent, onComplete, radius, length, colorComplete, colorIncomplete, initVal){
			this.setObject3D(new THREE.Group());
			this.object3D.name = 'TProgressBar';
			this.colorComplete = colorComplete || 0x00FF00;
			this.colorIncomplete  = colorIncomplete || 0xFF0000;
			this.barLength = length;

			var geometry = new THREE.CylinderBufferGeometry( radius, radius, 1, 32, 20 );
			var mat = new THREE.MeshStandardMaterial( {
          color: this.colorComplete, emissive: 0x222222, opacity:0.95, 
          transparent:true, side: THREE.FrontSide} );
			this.barComplete = new THREE.Mesh( geometry, mat);
			this.object3D.add(this.barComplete);
			var mat = new THREE.MeshStandardMaterial( {
          color: this.colorIncomplete, emissive: 0x222222, opacity:0.85, 
          transparent:true} );	
      this.barIncomplete = new THREE.Mesh( geometry, mat);		
      this.object3D.add(this.barIncomplete);
      if(initVal === undefined)initVal = 0;
      this.setValue(initVal);
      if(parent)parent.addChild(this);
      if(onComplete)onComplete(this);
		}
	},
	'action',{

		setPercent: function(percent){
			this.setValue(percent/100);
		},

		getValue: function(){return this.value},

		setValue: function(val){
			val = Math.max(val,0.001);
			val = Math.min(val, 0.999);
			this.barComplete.scale.set(1,this.barLength*val, 1);
			this.barComplete.position.set(0,(-this.barLength*(1-val))/2, 0);
			this.barIncomplete.scale.set(1,this.barLength*(1-val), 1);
			this.barIncomplete.position.set(0,this.barLength*val/2, 0);
			this.value = val;
		}
	}
);

export {
  TProgressBar
}
