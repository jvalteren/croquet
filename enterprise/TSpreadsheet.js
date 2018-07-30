// Copyright 2017 by David A Smith and CEO Vision, Inc. All Rights Reserved.
// davidasmith@gmail.com
// 919-244-4448

/*global Float32Array, THREE, Set, Image, ClassicalNoise*/
import { TObject, Globals } from "./TObject.js";
import { TWindow, TPedestal } from "./TWindow.js";
import { TSlider, TColorSphere, TRectangle } from "./TObjects.js";
import { TDynamicTexture } from "./TDynamicTexture.js";
import { TBarChart } from "./TBarChart.js";
import { TExtrudeButton } from "./TButtons.js";

// this totally needs to be refactored into a simple cell system, a spreadsheet, and the tracking bars. See TDataTable.js for the new version.


var TSpreadsheet = TObject.subclass('users.TSpreadsheet',
  'properties',{
    isTrack: false,
    trackRows: null,
    trackColumns: null,
    colorSphere: null,
    crossTools: null,
    colorWheel: null,
    action: null,
    columns: 100,
    width: 1.0,
    rows:100,
    height: 0.25,
    values: null,
    selected: null,
    startSelect: null,
    lastSelect: null,
    overCell: null,
    overCellHeight: 0.015,
    point: null, 
    lastC: null,
    lastR: null,
    fields: null,
    colors: null,
    cellColors: null,
    geometry: null,
    doColor: new THREE.Color(),
    targetPosition: null,
    targetDelta: null,
    targetCount: 0,
    baseColor: new THREE.Color(0.95, 0.95, 1),
    doChart: false,
    chartScale: 0,
    selectedGray: 0.45,
    selectedColor: null,
    textEntry: null,
    lastEventTime:0,
    showFields: false,
    spreadsheetText:null,
    selectionRange: null,
    plane: null,
    perlin: new ClassicalNoise() 
  },
  
  'initialize',{
    initialize: function(parent, onComplete, action, columns, rows, width, height, isTrack, initData){
    //  console.log(columns, rows, width, height, isTrack, initData)
      this.action = action;
      this.selected = new Set();
      this.isTrack = isTrack;
      this.targetPosition = new THREE.Vector3();
      this.targetDelta = new THREE.Vector3();
      this.point = new THREE.Vector3();
      if(rows)this.rows = rows;
      if(columns)this.columns = columns;
      if(height)this.height = height;
      if(width)this.width = width;
      this.extent = new THREE.Vector3(this.width*this.columns, this.height*this.rows, 0);
      var totalCells = rows*columns;
      var normal = new THREE.Vector3(0,0,1);
      var c2=this.columns/2;
      var r2=this.rows/2;
      var geometry = new THREE.BufferGeometry();
      var positions = new Float32Array( totalCells * 3 * 3 * 2 );
      var normals = new Float32Array( totalCells * 3 * 3 * 2);
      this.colors = new Float32Array( totalCells * 3 * 3 * 2);
      this.cellColors = new Float32Array( totalCells * 3);
      this.values = new Float32Array(totalCells);
      this.fields = new Float32Array(totalCells);
      var widths = [0, 0, this.width,    this.width,this.width, 0];
      var heights = [this.height, 0, 0,  0, this.height, this.height];

      var counter = 0;
      var vCounter = 0;
      //this.cMult = [0.65, 1, 0.65, 0.65, 1, 0.65];
      this.cMult = [1, 0.5, 1, 1, 0.5, 1];
      for( var i = 0; i < this.rows; i++)
        for(var j = 0; j < this.columns; j++){
          var x = (j-c2)*this.width;
          var y = (r2-i)*this.height;
          
          vCounter ++;
          var z = ((i^j)%2)*0.01;
  
          this.doColor.copy(this.baseColor);
          if(!isTrack) {
            this.values[vCounter]=Math.sin(j/3)*Math.cos(i/12);
            var pn = 0;
            if(!initData)
              {
                for(var k=0; k<4;k++)pn+=this.perlin.noise((j*4+k)/10,i/10,0.5);
                pn/=2;
                pn=Math.max(-1, Math.min(pn,1));
                this.values[vCounter]=pn;
              }
            else this.values[vCounter]= initData[vCounter];
            this.fields[vCounter]=0;
          }else this.values[vCounter]=vCounter;
          this.cellColors[vCounter*3] = this.doColor.r;
          this.cellColors[vCounter*3+1] = this.doColor.g;
          this.cellColors[vCounter*3+2] = this.doColor.b;
          
          //set the color slightly darker here
          //this.doColor.multiplyScalar(1-z*20);
          for(var k=0; k < 6; k++){
            positions[counter]=x+widths[k];
            this.colors[counter]=this.doColor.r*this.cMult[k];
            normals[counter]=normal.x;
            counter++;
            positions[counter]=y+heights[k];
            this.colors[counter]=this.doColor.g*this.cMult[k];
            normals[counter]=normal.y;
            counter++;
            positions[counter]=0; //-z;
            this.colors[counter]=this.doColor.b*this.cMult[k];
            normals[counter]=normal.z;
            counter++;    
          }
       }
      geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
      geometry.addAttribute( 'normal', new THREE.BufferAttribute( normals, 3 ) );
      geometry.addAttribute( 'color', new THREE.BufferAttribute( this.colors, 3 ) );
      geometry.computeBoundingSphere();
      var material = new THREE.MeshStandardMaterial( {
        color: 0xffffff, emissive: 0x444444, shininess: 50,opacity:0.4, transparent:true,
        side: THREE.DoubleSide, vertexColors: THREE.VertexColors
      } );

      if(isTrack)
        material.transparent = false;
      //else       
      //  material.depthWrite = false;
      var mesh = new THREE.Mesh( geometry, material );
      this.geometry = geometry;
      this.setObject3D(mesh); 
      if(!isTrack){
        var self = this;
        this.object3D.name = 'TSpreadsheet';
        mesh.raycast = function(){}; // suppress picking of the big array. WAY too slow.
        mesh.receiveShadow = true;
        mesh.renderOrder = 400;
        if(!initData)this.addPicture(Globals.imagePath+'alan-kay.jpg', function(){self.initCellText(rows, columns, height, width);});
        else this.initCellText(rows, columns, height, width);
        this.initCrossTools(rows, columns, height, width);
      }else{
        this.object3D.name = 'TSpreadsheetTrack';
        //mesh.castShadow = true;
        mesh.renderOrder = 401;
        this.initCellText(rows, columns, height, width);
      }
``
      if(parent)parent.addChild(this);
      this.overCell = new THiliteCell(this, null, this.width, this.height, this.overCellHeight);
      if(onComplete)onComplete(this);    
    },
    
      boundingBox: function(){ // this needs to recursively merge the bounding box of all of the objects it contains

 //       return new THREE.Box3().setFromObject(this.object3D);

        if(this.object3D && this.object3D.geometry){
            if(!this.object3D.geometry.boundingBox)
              this.object3D.geometry.computeBoundingBox();
          return this.object3D.geometry.boundingBox;
        }
        return null;

      },
      
    addPicture: function(fileName, onComplete){
      var img = new Image();
      img.src = fileName; 
      //var canvas = document.createElement('canvas');
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      var self = this;
      img.onload = function() {
        var width = img.width;
        var height =img.height;
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0);
        img.style.display = 'none';

        var pixel = ctx.getImageData(0,0,width, height);
        var data = pixel.data;
        // console.log(pixel.data.length+' '+width*height);
        var counter = 0;
        for(var i=0; i<height; i++)
          for(var j=0; j<width; j++){
            self.values[i*self.columns+j]=1.01+data[counter*4];
            counter++;
          }
        if(onComplete)onComplete();
      };
    },

    initCrossTools: function(rows, columns, height, width){
      // console.log("i am here", rows, columns)
        var self = this;
        this.trackRows = new TSpreadsheet(this, function(tObj){tObj.object3D.position.z = 1;}, 
          function(selections, onOff){self.selectRows(selections,onOff);}, 
          1, rows, width, height,true);
        this.trackColumns = new TSpreadsheet(this, function(tObj){tObj.object3D.position.z = 1;}, 
          function(selections, onOff){self.selectColumns(selections, onOff);}, 
          columns, 1, width, height, true);
        this.crossTools = new TObject(this,function(tObj){tObj.object3D.position.z = 1;});
        var radius = 1;
        this.colorSphere = new TColorSphere(this.crossTools, 
          function(tObj){
            tObj.object3D.position.x = radius * 2.4;
            tObj.object3D.position.y = radius * 1.7;
            //tObj.object3D.position.z = 1;
          }, function(color, field, save){self.setCellColors(color, field, save);}, radius);
        var shape = new THREE.Shape();
        var offset = -2;
        shape.moveTo(offset+0, offset+0);
        shape.lineTo(offset+1, offset+0);
        shape.lineTo(offset+2, offset+0);
        shape.lineTo(offset+3, offset+0);
        shape.lineTo(offset+3.9, offset+0);
        shape.lineTo(offset+3.9, offset+2.5);
        shape.lineTo(offset+3, offset+2.5);
        shape.lineTo(offset+3, offset+0.25);
        shape.lineTo(offset+2.9, offset+0.25);
        shape.lineTo(offset+2.9, offset+1.7);
        shape.lineTo(offset+2, offset+1.7);
        shape.lineTo(offset+2, offset+0.25);
        shape.lineTo(offset+1.9, offset+0.25);
        shape.lineTo(offset+1.9, offset+4);
        shape.lineTo(offset+1, offset+4);
        shape.lineTo(offset+1, offset+0.25);
        shape.lineTo(offset+0.9, offset+0.25);
        shape.lineTo(offset+0.9, offset+2.5);
        shape.lineTo(offset+0, offset+2.5);
        shape.lineTo(offset+0, offset+0);

        new TExtrudeButton(this.crossTools, 
          function(tObj){tObj.object3D.position.set(-2.7,-3,0);}, 
          function(){self.makeBarGraph();}, shape);

        var shape = new THREE.Shape();
        shape.moveTo(offset+2,offset);
        shape.lineTo(offset+3,offset);
        shape.lineTo(offset+4,offset);
        shape.lineTo(offset+4,offset+1);
        shape.lineTo(offset+4,offset+2);
        shape.lineTo(offset+4,offset+3);
        shape.lineTo(offset+4,offset+4);
        shape.lineTo(offset+3,offset+4);
        shape.lineTo(offset+2,offset+4);
        shape.lineTo(offset+1,offset+4);
        shape.lineTo(offset,offset+4);
        shape.lineTo(offset,offset+3);
        shape.lineTo(offset,offset+2);
        shape.lineTo(offset,offset+1);
        shape.lineTo(offset,offset);
        shape.lineTo(offset+1,offset);
        shape.lineTo(offset+2,offset);

        shape.lineTo(offset+2,offset+.5);

        shape.lineTo(offset+1,offset+.5);
        shape.lineTo(offset+.5,offset+.5);
        shape.lineTo(offset+.5,offset+1);
        shape.lineTo(offset+.5,offset+2);
        shape.lineTo(offset+.5,offset+3);
        shape.lineTo(offset+.5,offset+3.5);
        shape.lineTo(offset+1,offset+3.5);
        shape.lineTo(offset+1.95,offset+3.5);
        shape.lineTo(offset+1.95,offset+3.4);
        shape.lineTo(offset+1,offset+3.4);
        shape.lineTo(offset+.6,offset+3.4);
        shape.lineTo(offset+.6,offset+3);
        shape.lineTo(offset+.6,offset+2);
        shape.lineTo(offset+.6,offset+1);
        shape.lineTo(offset+.6,offset+.6);
        shape.lineTo(offset+1,offset+.6);
        shape.lineTo(offset+2,offset+.6);
        shape.lineTo(offset+3,offset+.6);
        shape.lineTo(offset+3.4,offset+.6);
        shape.lineTo(offset+3.4,offset+1);
        shape.lineTo(offset+3.4,offset+2);
        shape.lineTo(offset+3.4,offset+3);
        shape.lineTo(offset+3.4,offset+3.4);
        shape.lineTo(offset+3,offset+3.4);
        shape.lineTo(offset+2,offset+3.4);
        shape.lineTo(offset+2,offset+3.5);
        shape.lineTo(offset+3,offset+3.5);
        shape.lineTo(offset+3.5,offset+3.5);
        shape.lineTo(offset+3.5,offset+3);
        shape.lineTo(offset+3.5,offset+2);
        shape.lineTo(offset+3.5,offset+1);
        shape.lineTo(offset+3.5,offset+.5);
        shape.lineTo(offset+3,offset+.5);
        shape.lineTo(offset+2,offset+.5);
        shape.lineTo(offset+2,offset);

        new TExtrudeButton(this.crossTools, 
          function(tObj){tObj.object3D.position.set(-2.7,-8,0);}, 
          function(){self.makeSpreadsheet();}, shape);

        new TSlider(this.crossTools, 
          function(tObj){tObj.object3D.position.set(-5.5,1.1,0);}, 
          function(val){self.scaleChart(val);},
          10, 1, 0);   

 /*       new users.TTexturedRectangle(null, 
          function(tRect){ console.log(tRect);
            new users.TButton(self.crossTools, function(tObj){tObj.object3D.position.set(-7.5,2.25,0)}, function(){self.showFields = !self.showFields; self.doShowFields();} , tRect.object3D)}, 
            Globals.imagePath+'mondrian.jpg', 4, 4*570/800, 4, 3);
*/
        this.initTextEntry();
    },
    initTextEntry:function(){
        var rect = new TRectangle(this.crossTools, function(tObj){tObj.object3D.position.set(4.6,-.2,0)}, 8,0.5,4,2);
        this.textEntry = new TDynamicTexture(null, 1024,64,'green', 'white');
        rect.object3D.material.map = this.textEntry.texture;
        rect.object3D.material.needsUpdate = true;
        this.textEntry.clear();
        this.textEntry.drawText('CEO Cockpit', 16, 32+16);      
    },
    
    initCellText: function(rows, columns, height, width){
        // we will use 64 rows by one column width, hence our base size of texture will be 1024*64
        if(this.isTrack){
          if(this.columns==1)return this.initCellTextRows(rows, columns, height, width);
          if(this.rows == 1)return this.initCellTextColumns(rows, columns, height, width);
        }
      this.spreadsheetText = [];
      var rTextNum = Math.ceil(rows/32);
      var cTextNum = Math.ceil(columns/8); // columns are 4x wider
      var panelHeight = 32*height;
      var panelWidth = 8*width;
      var top = height+rows*height/2 - panelHeight/2;
      var left = panelWidth/2+width-columns*width/2;
      var counter = 0;
     // console.log('rows:columns:',rTextNum, cTextNum)
      for(var i=0;i<rTextNum;i++)
        for(var j=0;j<cTextNum;j++){ 

          var rect = new TRectangle(this, function(tObj){tObj.object3D.position.set(left+j*panelWidth-width,top-i*panelHeight, -0.01)}, width*8, height*32,8,32);
          rect.object3D.material.opacity = 0.99;
          //rect.object3D.material.emissive = 0x111111;
          rect.object3D.material.transparent = true;
          rect.object3D.material.depthWrite = false;
          rect.object3D.renderOrder = 399;

          //rect.object3D.material= new THREE.MeshPhongMaterial({color:0xffffff, emissive: 0x111111,transparent: true});

          //rect.selectable = false;
          var spreadsheetText = new TDynamicTexture(null, 16*8*4,16*32,'white');
          spreadsheetText.font = "normal 12px Arial"
          rect.object3D.material.map = spreadsheetText.texture;
          rect.object3D.material.needsUpdate = true;
          spreadsheetText.clear();

          //spreadsheetText.fill(['blue', 'red', 'green', 'orange', 'yellow', 'white','cyan', 'magenta'][Math.floor(Math.random()*8)]);
          var rMax = Math.min(this.rows-i*32, 32); 
          var cMax = Math.min(this.columns-j*8,8);
          for(var m = 0; m< rMax;m++) // rows
            for(var n = 0; n<cMax;n++){ // columns
              var r = 32*i+m;
              var c = 8*j+n;
              var index = r*this.columns+c;
              spreadsheetText.drawText(''+this.values[index].toPrecision(4), 2+64*n, 16*m+13);
              //spreadsheetText.drawText(''+this.values[index], 2+64*n, 16*m+13);
          }
          this.spreadsheetText.push(spreadsheetText);
        }
    },
    
    initCellTextRows: function(rows, columns, height, width){
      this.spreadsheetText = [];
      var textNum = Math.ceil(rows/64);
      var counter = 0;
      var panelHeight = 64*height;
      var top = height+rows*height/2 - panelHeight/2;

      
      for(var i=0;i<textNum;i++){

        var rect = new TRectangle(this, function(tObj){tObj.object3D.position.set(0,top-i*panelHeight, 0.01)}, width, height*64,1,64);
        rect.object3D.material.opacity = 0.99;
        rect.object3D.material.emissive = 0x444444;
        rect.object3D.material.transparent = true;
        rect.object3D.material.depthWrite = false;
        rect.object3D.renderOrder = 500;
        rect.selectable = false;
        var spreadsheetText = new TDynamicTexture(null, 16*4,16*64,'black');
        spreadsheetText.font = "normal 12px Arial"
        rect.object3D.material.map = spreadsheetText.texture;
        rect.object3D.material.needsUpdate = true;
        spreadsheetText.clear();
        var rMax = Math.min(this.rows-i*64, 64);      
        for(var j = 0; j< rMax;j++){
          spreadsheetText.drawText(''+counter++, 16*4/3, 16*j+13);
        }
        this.spreadsheetText.push(spreadsheetText);
      }
     },
    
    initCellTextColumns: function(rows, columns, height, width){
      this.spreadsheetText = [];
      var textNum = Math.ceil(columns/64);
      var counter = 0;
      var panelHeight = height;
      var panelWidth = 64 * width;
      var left = panelWidth/2+width-columns*width/2;



      for(var i=0;i<textNum;i++){

        var rect = new TRectangle(this, function(tObj){tObj.object3D.position.set(left+i*panelWidth-width, height, 0.01)}, width*64, height,64,1);
        rect.object3D.material.opacity = 0.99;
        rect.object3D.material.emissive = 0x444444  ;
        rect.object3D.material.transparent = true;
        rect.object3D.renderOrder = 501;
        rect.object3D.material.depthWrite = false;
        rect.selectable = false;
        var spreadsheetText = new TDynamicTexture(null, 16*4*64,16,'black');
        spreadsheetText.font = "normal 12px Arial"
        rect.object3D.material.map = spreadsheetText.texture;
        rect.object3D.material.needsUpdate = true;
        spreadsheetText.clear();
        var cMax = Math.min(this.columns-i*64,64);
        function encode_col(col) { var s=""; for(++col; col; col=Math.floor((col-1)/26)) s = String.fromCharCode(((col-1)%26) + 65) + s; return s; }
        for(var j = 0; j< cMax;j++){
          spreadsheetText.drawText(encode_col(counter++), 16*4/3+64*j, 13);
        }
        this.spreadsheetText.push(spreadsheetText); 
      }
    },
  },
  
    'events',{
      onDoubleClick: function(pEvt){
        console.log("TSpreadsheet>>onDoubleClick")
        var quat = this.object3D.getWorldQuaternion();
        this.point.copy(pEvt.point);
        this.object3D.worldToLocal(this.point);
        this.point.z+=8; 
        this.object3D.localToWorld(this.point);
        Globals.tAvatar.goTo(this.point, this.object3D.quaternion, null, 10);
        return true;        
      },

      onPointerDown: function(pEvt){
        this.overCell.object3D.visible = false;
        this.startSelect = null;
        this.point.copy(pEvt.point);
        this.object3D.worldToLocal(this.point);
        var cell = this.pointToCell(this.point);
        this.selectedColor = cell.color; // for use by color picker
        if(this.textEntry)this.drawValue(this.values[cell.index].toPrecision(8));
        this.makePlane(pEvt);

        var trackx, tracky;
        if(this.trackRows){
          this.targetPosition.copy(this.trackRows.object3D.position);
          this.targetPosition.x = trackx = (Math.max(0,cell.column-2)-this.columns/2)*this.width+this.width/2;
          this.trackRows.goTo(this.targetPosition);
        }
        if(this.trackColumns){
          this.targetPosition.copy(this.trackColumns.object3D.position);
          this.targetPosition.y = tracky = (this.rows/2-Math.max(0,cell.row-7))*this.height+this.height/2;
          this.trackColumns.goTo(this.targetPosition);
        }
        if(this.crossTools){
          this.targetPosition.copy(this.trackColumns.object3D.position);
          this.targetPosition.x = trackx;
          this.targetPosition.y = tracky;
          this.crossTools.goTo(this.targetPosition);
        }
        /*
        if(pEvt.event2D.isAltDown())
          {
            var quat = this.object3D.getWorldQuaternion();
            this.point.copy(pEvt.point);
            this.object3D.worldToLocal(this.point);
            this.point.z+=8; 
            this.object3D.localToWorld(this.point);
            pEvt.tAvatar.goTo(this.point, quat, 10);
            return true;
          }*/
        if(!pEvt.shiftKey){
          this.doSelect(false);
          this.selected.clear();
        }
        this.startSelect = cell;
        this.lastSelect = this.startSelect;
        this.selected.add(this.startSelect);
        this.doSelect(true);
        return true;
      },
      
      onPointerMove: function(pEvt){

        if(!this.startSelect)return true;
        this.point.copy(this.trackPlane(pEvt));
        this.object3D.worldToLocal(this.point);
        var moveSelect = this.pointToCell(this.point);
        if(moveSelect.row == this.lastSelect.row && moveSelect.column == this.lastSelect.column)return true;
        this.lastSelect = moveSelect;
        if(!pEvt.shiftKey){
          this.doSelect(false);
          this.selected.clear();
        }
        var startC, endC, startR, endR;
        if(moveSelect.column<this.startSelect.column)
          {startC = moveSelect.column; endC = this.startSelect.column}else
          {startC = this.startSelect.column; endC = moveSelect.column}
        if(moveSelect.row<this.startSelect.row)
          {startR = moveSelect.row; endR = this.startSelect.row}else
          {startR = this.startSelect.row; endR = moveSelect.row}
        for(var i = startR; i<= endR; i++)
          for(var j = startC; j<= endC; j++)
            {
              var index = i*this.columns+j;
              var color = new THREE.Color(
                this.cellColors[index*3], this.cellColors[index*3+1], this.cellColors[index*3+2]);
              this.selected.add( {'column':j, 'row': i, 'index': index, 'color': color});
            }
        this.selectionRange = {startC: startC, startR: startR, endC: endC, endR: endR};
        // console.log(this.selectionRange);
        this.doSelect(true);   
        return true;
      },
      
      onPointerUp: function(pEvt){
        this.overCell.object3D.visible = true;
        if(this.isTrack){
          var action = this.action;
          this.action = null;
          this.doSelect(false);
          this.selected.clear();
          this.action = action;
          }
        return true;
      },
      
      onPointerEnter: function(pEvt){this.overCell.object3D.visible = true; return true;},
      
      onPointerOver: function(pEvt){
        //if(pEvt.event2D.isAltDown())return false;
        if(pEvt.selectedTarget != this.overCell.object3D){
          // for now, just do it simple
          this.point.copy(pEvt.point);
          this.object3D.worldToLocal(this.point);
          var cell = this.pointToCell(this.point);
          this.overCell.object3D.position.set((cell.column-this.columns/2)*this.width+this.width/2, (this.rows/2-cell.row)*this.height+this.height/2 ,this.overCellHeight);
        }
        return true;
      },
      
      onPointerLeave: function(pEvt){this.overCell.object3D.visible = false;  return true;},
      
      pointToCell: function(pnt){
        var c = Math.floor((this.columns)/2 + pnt.x/this.width);
        var r = 1+Math.floor((this.rows)/2 - pnt.y/this.height);
        c = Math.max(0, Math.min(c,this.columns-1));
        r = Math.max(0, Math.min(r, this.rows-1));
        var index = r*this.columns+c;
        var color = new THREE.Color(
          this.cellColors[index*3], this.cellColors[index*3+1], this.cellColors[index*3+2]);
        return {'column':c, 'row': r, 'index': index, 'color': color};
      },
      
      selectColumns: function(selections, onOff){
        var startC=Infinity, endC=-1;
        this.doSelect(false);
        this.selected.clear();
        for(let item of selections){
          for(var i=0; i< this.rows;i++){
            if(item.column<startC)startC=item.column;
            if(item.column>endC)endC=item.column;
              var index = i*this.columns+item.column;
              var color = new THREE.Color(
              this.cellColors[index*3], this.cellColors[index*3+1], this.cellColors[index*3+2]);
              this.selected.add( {'column':item.column, 'row': i, 'index': index, 'color': color});
          }
        }
        this.selectionRange = {startC: startC, startR: 0, endC: endC, endR: this.rows-1};
        this.doSelect(onOff);
      },
      
      selectRows: function(selections, onOff){
        var startR=Infinity, endR=-1;
        this.doSelect(false);
        this.selected.clear();
        for(let item of selections){
          for(var i=0; i< this.columns;i++){
              if(item.row<startR)startR=item.row;
              if(item.row>endR)endR=item.row;
              var index = item.row*this.columns+i;
              var color = new THREE.Color(
              this.cellColors[index*3], this.cellColors[index*3+1], this.cellColors[index*3+2]);
              this.selected.add( {'column':i, 'row': item.row, 'index': index, 'color': color});
          }
        }
        this.selectionRange = {startC: 0, startR: startR, endC: this.columns-1, endR: endR};
        this.doSelect(onOff);
      },

      setCellColors: function(color, field, save){
        var colors = this.geometry.getAttribute('color'); 
        var positions = this.geometry.getAttribute('position');
        var fmult = 0; //this.showFields?1:0;

        for (let item of this.selected){
          if(!color)this.doColor.copy(item.color);
          else this.doColor.copy(color);
          var val = ((item.column^item.row)%2)*.01;
          this.doColor.multiplyScalar(this.selectedGray*(1-val*20));
          this.fields[item.index]=field;
          var index = item.index*6;
          for(var i=0;i<6;i++){
            colors.setXYZ(index+i, this.doColor.r*this.cMult[i], this.doColor.g*this.cMult[i], this.doColor.b*this.cMult[i]);
          }
          if(save && color){
            item.color.copy(color);
            item.field = field;
            this.cellColors[item.index*3]=color.r;
            this.cellColors[item.index*3+1]=color.g;
            this.cellColors[item.index*3+2]=color.b;
            this.colorSphere.setColor(color);
          }
        }
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;      
      },
      
      scaleChart: function(val){
        this.chartScale=val;
        this.doSelect(true);
      },

      doShowFields: function(){
        var fmult = this.showFields?1:0;
        var positions = this.geometry.getAttribute('position');
        //console.log('doShowFields '+ fmult);
        var nonzero = false;
        for(var i = 0, flen = this.fields.length; i< flen;i++){
          for(var j=0;j<6;j++){
            positions.setZ(i*6+j, this.fields[i]*fmult);
            if(this.fields[i]>0) nonzero = true;
          }
        }
        this.geometry.attributes.position.needsUpdate = true;
      },
      
      doSelect: function(onOff){
        // selections is an array - convert to set
        var selections = this.selected;
        if(this.action){this.action(selections, onOff);}
        var positions = this.geometry.getAttribute('position');
        var colors = this.geometry.getAttribute('color');
        var val;
        var field; // number from 0 to 8
        var fmult = 0; //this.showFields?1:0;

        for (let item of selections){
          field = this.fields[item.index];
          if(onOff){
            if(this.chartScale>0){
              val = this.values[item.index];
              if(val>1){
                val=(val-1)/256; 
                this.doColor.setRGB(val, val, val); 
                val = 0.9;
              }
              else this.doColor.setRGB((1-val)/2, 1-val*val, (1+val)/2);
              val += 2;
              val*= -this.chartScale*4;
              //val += field*fmult;
            }else{
              // val = ((item.column^item.row)%2)*.01;
              val = 0;
              this.doColor.copy(item.color);
              this.doColor.multiplyScalar(this.selectedGray*(1-val*20));
              //val = field*fmult;
            }
          }else{
            //val = ((item.column^item.row)%2)*.01;
            val = 0;
            this.doColor.copy(item.color);
            //this.doColor.multiplyScalar(1-val*20);
            //val = field*fmult;
          }
          var index = item.index*6;
          for(var i=0;i<6;i++){
            positions.setZ(index+i, -val);
            colors.setXYZ(index+i, this.doColor.r*this.cMult[i], this.doColor.g*this.cMult[i], this.doColor.b*this.cMult[i]);
          }
        }
       this.geometry.attributes.position.needsUpdate = true;
       this.geometry.attributes.color.needsUpdate = true;      
      },

      drawValue: function(value){
        this.textEntry.clear();
        this.textEntry.drawText(""+value, 16, 32+16);
      },

    },

  'actions',{
    selectionToArray: function(){
      var length = (1+this.selectionRange.endR-this.selectionRange.startR)*(1+this.selectionRange.endC-this.selectionRange.startC);
      var rval = new Float32Array(length);
      var count = 0;
      for(var r=this.selectionRange.startR; r<=this.selectionRange.endR;r++)
        for(var c=this.selectionRange.startC; c<=this.selectionRange.endC;c++){
          rval[count] = this.values[r*this.columns+c];
          count++;
        }
      return rval;
    },

    makeSpreadsheet: function(){
      if(this.selectionRange){
        var c = 1+this.selectionRange.endC-this.selectionRange.startC;
        var r = 1+this.selectionRange.endR-this.selectionRange.startR;
        var posX = this.width*(this.selectionRange.startC+this.selectionRange.endC)/2 - this.extent.x/2;
        var posY = this.extent.y/2-this.height*(this.selectionRange.startR+this.selectionRange.endR)/2;
        var posZ = 2;

        var v = this.selectionToArray();
        var sheet = new TSpreadsheet(null, null, null, c,r, 1, .25, false,this.selectionToArray());
        //console.log(sheet)
        var win = new TWindow(this, function(tObj){tObj.object3D.position.set(posX,posY,posZ);}, 'Sub Spreadsheet', 1, sheet, true);
        win.object3D.updateMatrixWorld(); // need to force an update of the world matrix
        var matrix = new THREE.Matrix4().copy(win.object3D.matrixWorld);
        win.setMatrix(matrix);
        this.getTScene().addChild(win);

        //console.log(window);
      }
    },

    makeBarGraph: function(){
      if(this.selectionRange){
        var c = 1+this.selectionRange.endC-this.selectionRange.startC;
        var r = 1+this.selectionRange.endR-this.selectionRange.startR;
        var posX = this.width*(this.selectionRange.startC+this.selectionRange.endC)/2 - this.extent.x/2;
        var posY = this.extent.y/2-this.height*this.selectionRange.endR;
        var posZ = r/2+2;
        var bar = new TBarChart(null, null, c, r, 1, this.selectionToArray());
        var pedestal = new TPedestal(this, function(tObj){tObj.object3D.position.set(posX,posY,posZ);},1, bar, true);
        //bar.object3D.updateMatrixWorld();
        //var matrix = new THREE.Matrix4().copy(bar.object3D.matrixWorld);
        //bar.setMatrix(matrix);
        //this.getTScene().addChild(bar);
        }      
    },

  });

  var THiliteCell = TObject.subclass('users.THiliteCell',
    'properties',{
      column: null,
      row: null
    },
  'initialize',{
    initialize: function(parent, onComplete, width, height, overHeight){
      this.extent= new THREE.Vector3(width, height, 0);
      var rect = new THREE.PlaneGeometry( 1, 1 );
      var paramsOpacity = { opacity: 0.25 };
      var mat = new THREE.MeshStandardMaterial( 
        {color: 0xffff00, emissive: 0xffff00, side: THREE.DoubleSide, opacity: 0.25, transparent: true} );
      var hiliteCell = new THREE.Mesh( rect, mat );
      hiliteCell.scale.x=width;
      hiliteCell.scale.y=height;
      hiliteCell.name = 'THiliteCell';
      hiliteCell.userData = this;
      hiliteCell.translateZ(overHeight);
      hiliteCell.renderOrder = 1000;
      this.selectable = false;
      hiliteCell.visible = false;
      this.setObject3D(hiliteCell);
      if(parent)parent.addChild(this);
      if(onComplete)onComplete(this);    
      },
    resize: function(width, height){
      this.object3D.scale(width, height, 1);
      this.extent.set(width, height, 0);
    }    
});


export {
  TSpreadsheet
}
