// Copyright 2017 by David A Smith and CEO Vision, Inc. All Rights Reserved.
// davidasmith@gmail.com
// 919-244-4448

/*global THREE, Float32Array*/
import { TObject } from "./TObject.js";


// TGrid generates a grid - mostly to look cool...
var TGrid = TObject.subclass('users.TGrid',
  'initalizing', {
    initialize: function($super, parent, onComplete, size, divisions, color1, color2, subdivisions){

      this.extent = new THREE.Vector3(size,0,size);
      this.selectable = false;
      size = size || 10;
      divisions = divisions || 10;
      color1 = new THREE.Color( color1 !== undefined ? color1 : 0x444444 );
      color2 = new THREE.Color( color2 !== undefined ? color2 : 0x888888 );
      subdivisions = subdivisions || 2;
      var vertices=[], colors=[];
      var center = divisions / 2;
      var step = size / divisions;
      var subStep = step/subdivisions;

      var halfSize = size / 2;
      var cCount = 0;

      for(var i=0; i<= divisions; i++){
        for(var j=0; j< divisions; j++){
          for(var k=0; k<subdivisions; k++){
            var basej = -halfSize+j*step+k*subStep;
            var basei = -halfSize+i*step;
            vertices.push(basej, 0, basei, basej+subStep, 0, basei);
            vertices.push(basei, 0, basej, basei, 0, basej+subStep);
            var color = i===center ? color1 : color2;
            color.toArray(colors, cCount); cCount+=3;
            color.toArray(colors, cCount); cCount+=3;
            color.toArray(colors, cCount); cCount+=3;
            color.toArray(colors, cCount); cCount+=3;
          }
        }
      }
      var geometry = new THREE.BufferGeometry();
      var vArray = new Float32Array(vertices.length); for(var i=0; i<vertices.length; i++)vArray[i]=vertices[i];
      var cArray = new Float32Array(colors.length); for(var i=0; i<colors.length; i++)cArray[i]=colors[i];

      geometry.addAttribute( 'position', new THREE.BufferAttribute( vArray, 3 ) );
      geometry.addAttribute( 'color', new THREE.BufferAttribute( cArray, 3 ) );

      var material = new THREE.LineBasicMaterial( { vertexColors: THREE.VertexColors } );
      //material.map = new THREE.TextureLoader().load( imagePath+'teapot.jpg');

      this.setObject3D(new THREE.LineSegments(geometry, material ));
      this.object3D.name = 'TGrid';
      this.object3D.raycast = function(){}; // don't allow picking of the grid
      if(parent)parent.addChild(this);
      if(onComplete)onComplete(this);
    }
  },
  'behavior', {
    action: function(time){
     // if(this.object3D)this.object3D.rotation.y -= 0.1;
    }
  }
); // end of subClass function

var TFloor = TObject.subclass('users.TFloor',
  'initalizing', {
    initialize: function($super, parent, onComplete, size, divisions, color1, color2){

      this.extent = new THREE.Vector3(size,0,size);
      this.selectable = false;
      size = size || 10;
      divisions = divisions || 10;
      color1 = new THREE.Color( color1 !== undefined ? color1 : 0x444444 );
      color2 = new THREE.Color( color2 !== undefined ? color2 : 0x888888 );

      var vertices=[], colors=[];
      var center = divisions / 2;
      var step = size / divisions;

      var halfSize = size / 2;
      var cCount = 0;

      var sprite = new THREE.TextureLoader().load('img/ball.png');
      var geometry = new THREE.Geometry();
      var colors = [];

      for(var i=0; i<= divisions; i++){
        for(var j=0; j< divisions; j++){
          var vertex = new THREE.Vector3();

          vertex.x = -halfSize+j*step;
          vertex.y = 0;
          vertex.z = -halfSize+i*step;
          geometry.vertices.push( vertex);

          colors.push(i===center || j=== center? color1 : color2);
        }
      }
      geometry.colors = colors;
      var material = new THREE.PointsMaterial( { size: 5, map: sprite, vertexColors: THREE.VertexColors, alphaTest: 0.5, transparent: true } );
      material.color.setHSL( 1.0, 0.2, 0.7 );
      var particles = new THREE.Points( geometry, material );

      this.setObject3D(particles);
      this.object3D.name = 'TFloor';
      if(parent)parent.addChild(this);
      if(onComplete)onComplete(this);
    }
  },
  'behavior', {
    action: function(time){
     // if(this.object3D)this.object3D.rotation.y -= 0.1;
    }
  }
);

export {
  TGrid
}
