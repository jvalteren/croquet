// Copyright 2017 by David A Smith and CEO Vision, Inc. All Rights Reserved.
// davidasmith@gmail.com
// 919-244-4448

// This implements a number of toy objects. 
// A four point compass with a tetrahedron, cube, sphere and torus knot
// A globe of the Eart and Moon (moon is incomplete), a group of planets to provide orientation to the user (deprecated), and a height map of the US as a functional demo

/*global THREE*/
import { Globals, TObject } from "./TObject.js";
import { TSlider, TRectangle, TTrackball } from "./TObjects.js";

export class TCompass extends TObject {

  //'initialize'
  constructor(parent, onComplete, distance, size){
    this.setObject3D(new THREE.Group());
    this.construct(new THREE.TetrahedronGeometry(2*size),    new THREE.Vector3(0,distance/2,distance), 0x111144, true);
    var cube = this.construct(new THREE.BoxGeometry(size*2,size*2,size*2, 4,4,4),        new THREE.Vector3(distance, distance/2, 0), 0x440011, true);
    this.construct(new THREE.SphereBufferGeometry( size, 16, 16 ),   new THREE.Vector3(0, distance/2,-distance), 0x114411, true);
    var torus = this.construct(new THREE.TorusKnotGeometry(size, size/3), new THREE.Vector3(-distance, distance/2,0), 0x333333, false);
    torus.object3D.rotation.y = Math.PI/2;
    cube.object3D.rotation.y = Math.PI/4;
    if(parent)parent.addChild(this);
    if(onComplete)onComplete(this);
  }
  construct(geo, pos, color, doScale){
    var trackBall = new TTrackball(this);
    trackBall.object3D.position.copy(pos);
    var lineMaterial = new THREE.MeshBasicMaterial( { wireframe: true } );
    var phongMaterial = new THREE.MeshPhongMaterial({color : color});
    var mesh = new THREE.Mesh( geo, phongMaterial);
    var line = new THREE.Mesh( geo, lineMaterial ); 
    if(doScale)line.scale.set(1.05, 1.05, 1.05);
    mesh.add(line);
    return new TObject(trackBall, null, mesh);
  }
}


// a spinnable Earth
export class TEarth extends TObject {

  //'initialize'
  constructor(parent, onComplete, radius){
    this.radius = radius ||8;
    var geometry = new THREE.SphereBufferGeometry( this.radius, 32, 32 );
    
				var textureLoader = new THREE.TextureLoader();
				var material = new THREE.MeshPhongMaterial( {
					color: 0xffffff,
					specular: 0x666666,
          emissive: 0x000000,
					shininess: 35,
					map: textureLoader.load( Globals.imagePath+"earth.png" ),
          //map: textureLoader.load( Globals.imagePath+"earth-hot.png" ),
 					specularMap: textureLoader.load( Globals.imagePath+"LitSphere_test_05.jpg" ),
					normalMap: textureLoader.load( Globals.imagePath+"earth_normalmap.png" ),
					normalScale: new THREE.Vector2( 0.8, -0.8 )
				} );
    var sphere = new THREE.Mesh( geometry, material ); 
    sphere.castShadow = true;   
    this.setObject3D(sphere);
    this.object3D.name = 'TEarth';
    if(parent)parent.addChild(this);
    if(onComplete)onComplete(this);
  }
}

export class TMoon extends TObject {

  //'initialize'
  constructor(parent, onComplete, radius){
    this.radius = radius ||8;
    var geometry = new THREE.SphereBufferGeometry( this.radius, 32, 32 );
    
        var textureLoader = new THREE.TextureLoader();
        var material = new THREE.MeshPhongMaterial( {
          color: 0xeeeeee,
          specular: 0x222222,
          emissive: 0x222222,
          shininess: 35,
          map: textureLoader.load( Globals.imagePath+"Moon2.jpg" ),
          //map: textureLoader.load( Globals.imagePath+"earth-hot.png" ),
          specularMap: textureLoader.load( Globals.imagePath+"LitSphere_test_05.jpg" ),
          bumpMap: textureLoader.load( Globals.imagePath+"Moon2-Bump.jpg" ),
          normalScale: new THREE.Vector2( 0.8, 0.8 )
        } );
    var sphere = new THREE.Mesh( geometry, material ); 
    sphere.castShadow = true;   
    this.setObject3D(sphere);
    this.object3D.name = 'TMoon';
    if(parent)parent.addChild(this);
    if(onComplete)onComplete(this);
  }
}

export class TCubeX extends TObject {
  //'initialize',{
  constructor(parent, onComplete, w, h, d, dw, dh, dd){
    dw = dw || 5;
    dh = dh || 5;
    dd = dd || 5;
    var geometry      = new THREE.BoxGeometry(w||10, h||10, d||10, dw, dh, dd );    
		var textureLoader = new THREE.TextureLoader();
		var material = new THREE.MeshPhongMaterial( {
			color: 0xdddddd,
			specular: 0x222222,
			shininess: 35,
			//map: textureLoader.load( Globals.imagePath+"crossColor.jpg" ),
			specularMap: textureLoader.load( Globals.imagePath+"LitSphere_test_05.jpg" ),
			normalMap: textureLoader.load( Globals.imagePath+"wrinkle-normal.jpg" ),
 			//normalMap: textureLoader.load( Globals.imagePath+"sci_fi_normal.jpg" ),
			  normalScale: new THREE.Vector2( 0.8, -0.8 )
		} );
    var cube = new THREE.Mesh( geometry, material );  
    cube.castShadow = true;   
    this.setObject3D(cube);
    this.object3D.name = 'TCubeX';
    if(parent)parent.addChild(this);
    if(onComplete)onComplete(this);
  }
}

export class TPlanets extends TObject {

  //'initialize'
  constructor(parent, onComplete, radius){
    super(parent, onComplete);
    this.moon = this.makePlanet("Moon.png", 0.5);
    this.moon.name = 'Moon';
    this.saturn = this.makePlanet("Saturn.png", 0.5);
    this.saturn.name = 'Saturn';
    this.jupiter = this.makePlanet("Jupiter.png", 0.5);
    this.jupiter.name = 'Jupiter';
    this.object3D.add(this.moon);
    this.object3D.add(this.saturn);
    this.object3D.add(this.jupiter);
    this.moon.rotateY(Math.PI/2);
    this.saturn.rotateY(Math.PI);
    this.jupiter.rotateY(-Math.PI/2);
    this.moon.position.set(-radius,radius/2,0);
    this.jupiter.position.set(radius,radius/2,0);
    this.saturn.position.set(0,radius/2,radius);
    this.object3D.name = 'TPlanets';
  }

  makePlanet(planet, opacity){
    var textureLoader = new THREE.TextureLoader();
    var geometry      = new THREE.PlaneBufferGeometry(250, 250, 10, 10);
    var material      = new THREE.MeshBasicMaterial( {
          map: textureLoader.load( Globals.imagePath+planet ),
          opacity:opacity, 
          transparent:true, side: THREE.FrontSide} );  
    return new THREE.Mesh(geometry, material);
  }
}

export class TUSA extends TRectangle {
  //'initialize',{
  constructor(parent, onComplete){
    super(parent, onComplete, 100, 50, 100, 50);
    this.displacementScale = 0;
    this.normalScale = 1.0;
    var textureLoader = new THREE.TextureLoader();
    var material = new THREE.MeshStandardMaterial( {
        color: 0x888888,
        //roughness: this.roughness,
        //metalness: this.metalness,
        //specularMap: textureLoader.load( Globals.imagePath+"LitSphere_test_05.jpg" ),

        //aoMap: aoMap,
        //aoMapIntensity: 1,
        displacementMap: textureLoader.load( Globals.imagePath+'USADepth.jpg'),
        displacementScale: this.displacementScale,
        //bumpMap: textureLoader.load( Globals.imagePath+"USADepth.jpg" ),
        //displacementBias: - 0.428408, // from original model
        //envMap: reflectionCube,
        //envMapIntensity: settings.envMapIntensity,
        side: THREE.DoubleSide
      } );    
    this.bumpMap = textureLoader.load( Globals.imagePath+"USADepth.jpg" );
    this.object3D.material = material;
    this.object3D.raycast = function(){}; // suppress ray test
    this.water = new TRectangle(this, null, 100,50, 20, 10);
    this.water.object3D.position.z=-0.02;
    var mat = new THREE.MeshStandardMaterial({color:0x7777ee, transparent:true, opacity:0.75});
    this.water.object3D.material = mat;
    var self = this;
    this.displacementSlider = new TSlider(this, function(tObj){tObj.object3D.position.y = -self.extent.y/2 - 3}, function(val){self.setDisplacement(val)}, 40, 2, 0);     
    this.waterSlider = new TSlider(this, function(tObj){tObj.object3D.position.y = -self.extent.y/2 - 6}, function(val){self.risingWater(val)}, 40, 2, 0);
  }
  //'action'

  risingWater(val){
    this.water.object3D.position.z = -0.02 + val/2;
  }

  setDisplacement(val){
    if(val==0)
    {
      this.object3D.material.bumpMap = null;
    }else{
      this.object3D.material.bumpMap = this.bumpMap;
    }
    this.object3D.material.bumpScale = val;
    this.object3D.material.displacementScale = val*5;
    this.object3D.material.needsUpdate = true;
  }
}
