/*global THREE*/
import { TObject, Globals } from "./TObject.js";

// TButton is a generic button object. Add a mesh and it becomes a button
// target. When the pointer is hovering over a TButton, the mesh is scaled by
// some amount to show that it is active.
var TButton = TObject.subclass('users.TButton',
  // a button you can press
  'properties',{
    overColor: null,
    color: null,
    action: null,
    returnVal: null,
    baseScale: null,
  },
  'initialize',{
    initialize: function(parent, onComplete, action, mesh, returnVal){
      this.action = action;
      this.returnVal = returnVal;
      if(mesh)this.setObject3D(mesh);
      this.object3D.name = 'TButton';
      this.baseScale = new THREE.Vector3();
      this.baseScale.copy(mesh.scale);
      if(parent)parent.addChild(this);
      if(onComplete)onComplete(this);      
    }
  },
  'events',{
    onPointerDown:function(pEvt){this.hilite(); return true;},
    onPointerMove:function(pEvt){return true;},
    onPointerUp:function(pEvt){
      if(pEvt.selectedTObject==this){if(this.action)this.action(this.returnVal, this, pEvt); }
      this.object3D.scale.set(1,1,1); 
      return true;
    },
    
    onPointerEnter:function(pEvt){this.hilite(); return true;},
    onPointerOver:function(pEvt){return true;},
    onPointerLeave:function(pEvt){this.unhilite(); return true;}
  },
  'actions',{
    hilite: function(){this.object3D.scale.copy(this.baseScale); this.object3D.scale.multiplyScalar(1.2);},
    unhilite:function(){this.object3D.scale.copy(this.baseScale);}
  }
);

// TExtrudeButton is a TButton that takes a 2D shape and extrudes it into a 3D
// mesh. The object is both scaled and colored when the pointer hovers over it.
var TExtrudeButton = TButton.subclass('users.TExtrudeButton',
  'properties',{
    overColor: null,
    color: null,
  },  'initialize', {
    initialize: function($super, parent, onComplete, action, shape, color, overColor, angle, sz, returnVal){
      var size = sz?sz:0.5;
      var extrudeSettings = {
        steps: 2,
        amount: 0.1,
        bevelEnabled: true,
        bevelThickness: 0.025,
        bevelSize: 0.025,
        bevelSegments: 1
      };

      if(!shape)
      {
        shape = new THREE.Shape();
        shape.moveTo( 0.3*size, size );
        shape.lineTo( 0.6*size, size );
        shape.lineTo( 0.6*size, 0.6*size);
        shape.lineTo( size, 0.6*size);
        shape.lineTo( size, 0.3*size);
        shape.lineTo( 0.6*size, 0.3*size);
        shape.lineTo( 0.6*size, 0);
        shape.lineTo( 0.3*size, 0);
        shape.lineTo( 0.3*size, 0.3*size);
        shape.lineTo( 0 ,0.3*size);
        shape.lineTo( 0, 0.6*size);
        shape.lineTo( 0.3*size, 0.6*size);
        shape.lineTo( 0.3*size, size);
      }
      this.color = color?color:Globals.standardColor;
      this.overColor = overColor||Globals.hiliteColor;
      var geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
      var material = new THREE.MeshStandardMaterial( {
        color: this.color.getHex(), emissive: 0x222222, opacity:0.75, 
       transparent:true, side: THREE.FrontSide} );      
      var mesh = new THREE.Mesh( geometry, material ) ;
      mesh.renderOrder = 1001;
      mesh.rotateZ(angle||0);
      $super(parent, onComplete, action, mesh, returnVal);
      mesh.name = 'TExtrudeButton';
    }
  },
  'actions',{
    hilite: function(){this.object3D.scale.set(this.baseScale.x,this.baseScale.y,this.baseScale.z*1.2); this.object3D.material.color.setHex( this.overColor.getHex());},
    unhilite:function(){this.object3D.scale.copy(this.baseScale); this.object3D.material.color.setHex( this.color.getHex());}
  }
);

// TArrowButton is a TExtrudeButton that provides a standard arrow button.
var TArrowButton = TExtrudeButton.subclass('users.TArrowButton',
  'properties',{
      //outline:[42.359, 25.479, 27.122, 1.250, 23.327, 1.250, 8.095, 25.479, 9.730, 28.011, 15.160, 27.126, 18.691, 30.205, 18.691, 46.888, 22.256, 50.454, 28.191, 50.454, 31.757, 46.888, 31.757, 30.206, 35.288, 27.127, 40.724, 28.012, 42.359, 25.479],
      outline:[97.562, 64.692, 50.490, 17.618, 47.662, 17.618, 0.586, 64.693, 0.000, 66.106, 0.586, 67.520, 13.573, 80.507, 14.987, 81.093, 16.401, 80.507, 49.075, 47.833, 81.750, 80.506, 84.578, 80.506, 97.562, 67.519, 97.562, 64.692],  

  },
  'initialize',{
    initialize: function($super, parent, onComplete, action, sz){
      var size = sz||1;
      var xMin = Infinity,yMin = Infinity, xMax = -Infinity, yMax = -Infinity;

      for(var i=0, outlineLen = this.outline.length; i< outlineLen; i+=2){
        xMin = Math.min(xMin, this.outline[i]);
        xMax = Math.max(xMax, this.outline[i]);
        yMin = Math.min(yMin, this.outline[i+1]);
        yMax = Math.max(yMax, this.outline[i+1]);
      }
      var cx = (xMin+xMax)/2, cy = (yMin+yMax)/2;
      var sc = xMax-xMin>yMax-yMin?size/(xMax-xMin):size/(yMax-yMin);
      this.arrow = new THREE.Shape();
      var sx,sy;
      for(var i=0, outlineLen = this.outline.length; i< outlineLen; i+=2){
        var x = (this.outline[i]-cx)*sc, y= (this.outline[i+1]-cy)*sc;
        if(i==0){this.arrow.moveTo(x,y); sx=x; sy=y;}
        else this.arrow.lineTo(x,y);
      }
      this.arrow.lineTo(sx,sy);
      $super(parent, onComplete, action, this.arrow, null, null, null, sz, null);
    }
  }
);

export {
  TButton,
  TExtrudeButton,
  TArrowButton
}
