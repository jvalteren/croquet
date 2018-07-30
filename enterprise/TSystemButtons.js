// Copyright 2017 by David A Smith and CEO Vision, Inc. All Rights Reserved.
// davidasmith@gmail.com
// 919-244-4448

/*global THREE,THREEx*/
import { Globals, TObject } from "./TObject.js";
import { TTexturedRectangle } from "./TObjects.js";
import { TTextLabel } from "./TWindow.js";
import { TButton } from "./TButtons.js";


var TSystemButtons = TObject.subclass('TSystemButtons',
	'properties', {
		backing: null
	},
	'initialize',{
		initialize: function(parent, onComplete, size){
			size = size||2;
			var offset = size*1.025;
			this.setObject3D(new THREE.Group());

			this.makeBack(size);

//			this.construct('account_circle.png', function(){Globals.alert('account setup', 5000)}, 'account settings', -4.1, 4.1);
//			this.construct('cloud_upload.png', function(){Globals.alert('cloud upload', 5000)}, 'cloud upload', 4.1, 0);
//			this.construct('file.png', function(){Globals.alert('file', 5000)}, 'local upload', 0, -4.1);
			
			var log;
			var user = "{{ user }}";
			if (user != 'None'){
				log = 'logout';
			  console.log("Logged In");
			}else{
				log = 'login';
			  console.log("No User");
			}
			var walk, stand;

			walk=this.construct('walk.png', function(button){
					walk.object3D.visible = false;
					stand.object3D.visible = true;
					Globals.cameraLocked = !Globals.cameraLocked; 
					Globals.alert('walk mode', 5000)
				}, 'walk', size, -offset, offset, true);
			stand=this.construct('stand.png', function(button){
					stand.object3D.visible = false;
					walk.object3D.visible = true;
					Globals.tAvatar.goTo(Globals.resetVector, Globals.resetQuaternion, null, 10);
					console.log(button); 
					Globals.cameraLocked = !Globals.cameraLocked; 
					Globals.alert('stand mode', 5000)
				}, 'stand', size, -offset, offset);

			this.construct('feedback.png', function(){window.open("mailto:david@ceo.vision");}, 'feedback', size, 0, offset);
			this.construct('collaborate.png', function(){Globals.alert('share', 5000)}, 'share', size, offset, offset);

			this.construct('info.png', function(){Globals.infoWin.display();}, 'CEO.Vision', size, -offset, 0);
			this.construct('disclaimer.png', function(){window.open("./tandc/CEOVisionTermsConditions.htm");}, 'terms & conditions', size, 0, 0);
			this.construct('help.png', function(){Globals.helpWin.display();}, 'help', size, offset, 0);
/*
			this.construct('spreadsheet.png', function(){Globals.alert('demo 1', 5000)}, 'demo 1', size, -offset, -offset);
			this.construct('spreadsheet.png', function(){Globals.alert('demo 2', 5000)}, 'demo 2', size, 0, -offset);
			this.construct('spreadsheet.png', function(){Globals.alert('demo 3', 5000)}, 'demo 3', size, offset, -offset);
*/
			this.construct('fullscreen.png', function(){THREEx.FullScreen.request();}, "full screen", size, -offset, -offset);
      this.construct(
        "circle_menu.png",
        () => Globals.tScene.setDisplay(Globals.world.demoMenu()),
        "demo menu", size, 0, -offset);
      this.construct('home.png', function(){Globals.tAvatar.goTo(new THREE.Vector3(), new THREE.Quaternion(), null, 10);},'home', size,offset, -offset);

			//this.constructBack(offset, -offset); // blank tile to make it pretty

			if(parent)parent.addChild(this);
			if(onComplete)onComplete(this);
		},

		construct: function(iconFName, action, text, size, x, y, hide){
			var s= size/3;
			var sz = size*.75;
			var os = size/16;
			var self = this;
			var back = new TObject(this, function(tObj){tObj.object3D.position.set(x,y,0)}, self.backing.clone());
			back.userData = this;
			var label = new TTextLabel(null, function(tObj){tObj.object3D.position.set(0,-size/2.4, 0.1); tObj.object3D.scale.set(s,s,s);}, text, 4, 1, 24);
			var doAction = function(){
				Globals.tScene.clearDisplay();
				action();
			}
			return new TTexturedRectangle(null, 
	          	function(tRect){ 
	            	var bttn = new TButton(back, function(tObj){
	            		tObj.object3D.position.set(0, os, os*2); 
	            		tObj.addChild(label);
	            		if(hide){tObj.object3D.visible = false;}
	            	}, 
	            doAction , tRect.object3D, tRect)}, 
            Globals.imagePath+'256/'+iconFName, sz, sz, 4, 4);
		},

		constructBack: function(x,y){

			var back = new TObject(this, function(tObj){tObj.object3D.position.set(x,y,0)}, this.backing.clone());
			back.userData = this;
		},

		makeBack: function(size){
			var extrudeSettings = {
		        steps: 2,
		        amount: 0.1,
		        bevelEnabled: true,
		        bevelThickness: 0.025,
		        bevelSize: 0.025,
		        bevelSegments: 1
		      };
			var shape = new THREE.Shape();
			size = size/2;
			shape.moveTo(0,size);
			shape.lineTo(size,size);
			shape.lineTo(size, 0);
			shape.lineTo(size, -size);
			shape.lineTo(0, -size);
			shape.lineTo(-size, -size);
			shape.lineTo(-size, 0);
			shape.lineTo(-size, size);
			shape.lineTo(0, size);

			var geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
	      	var material = new THREE.MeshStandardMaterial( {
	        	color: Globals.standardColor.getHex(), emissive: 0x222222, opacity:0.9, 
	       		transparent:true, side: THREE.FrontSide} );      
	      	this.backing = new THREE.Mesh( geometry, material ) ;
	      	this.backing.renderOrder = 1001;
		},

		visible: function(){return this.object3D.visible;},
		doHide: function(){this.object3D.visible = false; },
		doShow: function(parent, onComplete){
			parent.addChild(this); 
			if(onComplete)onComplete(this); 
			this.object3D.visible = true;
		}
	}
);

export {
  TSystemButtons
}
