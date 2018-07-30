// Copyright 2017 by David A Smith and CEO Vision, Inc. All Rights Reserved.
// davidasmith@gmail.com
// 919-244-4448


// This is the main 2D data table class. It is a 2D container of cells. To be able to scale to a very large size, we need to break the TDataTable 
// into smaller sections called TDataPanels. These are designed so that the backing texture for rendering text (and other things) is always less 
// than or equal to maxPixelSize x maxPixelSize, usually 1024x1024. This is small enough to be reasonably fast to update, but large enough so that 
// we don't use up too many of our texture references. Two of these textures is about the same amount of data that is on an HD 1024p computer display.
// This does shrink the required texture to the smallest power of 2 that will contain the requested textures for each panel.
// TDataTable is the parent class of the (new) TSpreadsheet, the crossed tracking fields (allows you to track which cells you are looking at), menus
// and other kinds of lists.
//
// The sheet object needs to provide the following:
// sheet.getColWidths()// array of column widths in pixels
// this.sheet.getRowHeights();// array of row heights in pixels
// this.sheet.defaultColWidth // default column width, this is used to specify bending of cells.
// var cell = this.sheet.getCell(rowIndex,cellIndex); // the contents of the sheet, return value may be null
//
// The returned cell object (if it is not null) needs to provide the following:
// doColor = cell.getFillColor() // this method may or may not exist and it may return either null or a THREE.Color object
// cell.drawCell(this.dataImage, rOffsetUV, cOffsetUV, heightUV, widthUV); // this will draw into the cell at the specified location and extent
// The drawCell method may or may not clip. 
// menu cell objects must provide an action() method that is called when there is a pointerUp event
// cell objects may also provide a doIgnore() method, which is equivalent to the pointer being off of the sheet
// 
// The TDataTable is used by the TMenu and the TVisiCalc objects.



/*global THREE,Float32Array*/
import { Globals, TObject } from "./TObject.js";
import { TDynamicTexture } from "./TDynamicTexture.js";
import { TSlider } from "./TObjects.js";


const selectHeight = 0.2;
// recursive search of array for the cell I am pointing at
function findCell(val, a){
  if(val>a[a.length-1])return -1; //error code, not in the range
  if(val<a[0])return -1; // error code, not in the range
  return doFindCell(val, a, 0, a.length);
}

function doFindCell(val, a, start, end){
  if(start==end || (val>=a[start] && val < a[start+1]))return start;
  var index = Math.floor((start+end)/2);
  if(val>=a[index])return doFindCell(val, a, index, end);
  else return doFindCell(val, a, start, index);
}

var TDataTable = TObject.subclass('users.TDataTable',
  'properties',{
    sheet: null, // this is the contents that we will transfer to the 3D world. 
    pixelScale: null, // conversion between the 3D world and the pixel world
    maxPanelSize: null, // max size of the panel bitmap. Must be a power of 2
    numColumns: null, // computed - this.columns.length
    numRows: null, // computed - this.rows.length
    columns: null, // array of column widths in pixels
    columns3: null, // column widths in 3-space
    rows: null, // array of row heights in pixels
    rows3: null, // row heights in 3-space
    cumulativeColumns: null, // cumulative width of columns in 3-space to ease picking computation
    cumulativeRows: null, // cumulative height of rows in 3-space to ease picking computation
    multiSelect: true, // allow multiple cells to be selected - menus don't do this, spreadsheets do
    cellData: null, // a 2D array of the cell information - includes TDataPanel, from and to 3D vertex data, current offset
    panels: null, // array of the panels that make up the TDataTable - based upon a maximal size offscreen texture
    panelObject3Ds: null, // array of the panel object3Ds for 3D picking
    panelWidths: null, // array of the 3D widths of the panels
    panelHeights: null, // array of the 3D heights of the panels
    pixelWidths: null, // array of the pixel widths of the panels
    pixelHeights: null, // array of the pixel heights of the panels
    panelColumns: null, // array of column indices that are used in a panel
    extent2: null, // 1/2 of this.extent
    overCell: null, // rectangle indicating which cell the cursor is hovering over
    overCellHeight: 0.05, // distance the overcell is above the TDataTable
    startCell: null, // cell we first select
    endCell: null, // last selected cell
    cellRange: null, // ordered range of selected cells
    radius: null, // when the sheet is curved, this is the radius of that curvature
    selected: null, // array of selected cells
    cellOutline: null, // 3D outline of the current cell we are tracking
    selectionOutline: null, // 3D outline of the full selection 
    selectionRisers: null, // array of "risers" side walls of the selected cells
    colorSegments: null, // array of array of color multipliers for cells - 
    columnPanels: null, // number of columns that are in their own panels
    rowPanels: null, // number of rows that are in their own panels
    rotation: null, // the rotation value (0-1)
    minMax: null, // min, max, and scale
    theme: 'black', // visual theme of the sheet
  },
  'initialize',{
    initialize: function(parent, onComplete, sheet, multiSelect, pixelScale, maxPanelSize, theme){
      // pixelScale - maps object size to 3D size
      // maxPanelSize - largest texture size 
      // columns - width in pixels
      // rows - height in pixels
      this.theme = theme || 'black';
      this.sheet = sheet;
      this.columns = this.sheet.getColWidths()// column width in pixels
      this.rows = this.sheet.getRowHeights();// row height in pixels
      this.name = 'TDataTable';
      this.setObject3D(new THREE.Group()); // need to attach the rest of the 3D objects to this
      this.pixelScale = pixelScale || 64; // pixels convert to 3D scale - eg columns[index]/maxPixelSize = width of column in 3-space
      var self = this;
      this.columns3 = this.columns.map(function(x){return x/self.pixelScale});
      this.cumulativeColumns = this.columns3.reduce(function(r,c,i){ r.push((r[i-1] || 0) + c); return r }, [] );// used to track which column I am in
      this.cumulativeColumns.unshift(0);
      this.rows3 = this.rows.map(function(x){return x/self.pixelScale});
      this.cumulativeRows = this.rows3.reduce(function(r,c,i){ r.push((r[i-1] || 0) + c); return r }, [] );//used to track which row I am in
      this.cumulativeRows.unshift(0);
      this.extent = new THREE.Vector3();
      this.extent.x = this.columns.reduce(function(a,b){return a+b})/self.pixelScale;
      this.extent.y = this.rows.reduce(function(a,b){return a+b})/self.pixelScale;
      this.extent.z = 0;
      this.extent2 = new THREE.Vector3();
      this.extent2.copy(this.extent);
      this.extent2.multiplyScalar(0.5); // the center of the table
      this.maxPanelSize = maxPanelSize || 512; 
      this.multiSelect = multiSelect===false? false: true; // default to true unless we explicitly say false.
      this.point = new THREE.Vector3();
      this.numColumns = this.columns.length;
      this.numRows = this.rows.length;

      this.pixelWidths = [];
      this.panelWidths = [];
      this.panelColumns = []; this.panelColumns.push(0);

      this.pixelHeights = [];
      this.panelHeights = [];
      this.panelRows = []; this.panelRows.push(0);

      this.cellOutline = new TCellOutline(this);
      this.cellOutline.setColor(0xffff00); // yellow outline
      this.selectionRisers = [];
      this.selectionOutline = new TCellOutline(this, null, true, 300);
      this.selectionOutline.setColor(0x00ff00); // green outline
      this.colorSegments = [
        [],
        [0, 0, 1, 0, 0, 1],
        [.5, 0, 1,  0, .5, .5,       0, .5, .5, .5, 0, 1],
        [.66, 0, 1,   0, .66, .33,     .33, .33, .66,   .33, .33, .66,      0,  .66, .33, .66,0, 1],
        [.75, 0, 1,  0, .75, .25,       .5, .25, .75,  .25, .5, .5,    .25, .5, .5,   .5, .25, .75,     0, .75, .25,   .75, 0, 1]
      ]
      this.minMax = {min:Infinity, max:-Infinity, scale: 0, delta: 0, deltaScale: 0};

      var size = 0;

      var maxPSize = this.maxPanelSize; // this is to allow some room to grow without having to reconstruct the entire panel system.

      for(var i=0;i<this.numColumns;i++){
        size += this.columns[i];

        if(size > maxPSize  || i===1){
            var w = size-this.columns[i];
            this.pixelWidths.push(w);
            this.panelWidths.push(w/this.pixelScale);
            this.panelColumns.push(i); 
            size = this.columns[i];
          }
      }
      this.pixelWidths.push(size);
      this.panelWidths.push(size/this.pixelScale);
      this.panelColumns.push(this.numColumns);

      var size = 0;

      for(var i=0;i<this.numRows;i++){
        size += this.rows[i];
        if(size > maxPSize  || i===1){
            var h = size-this.rows[i];
            this.pixelHeights.push(h);
            this.panelHeights.push(h/this.pixelScale); 
            this.panelRows.push(i); 
            size = this.rows[i];
          }
      }
      this.pixelHeights.push(size);
      this.panelHeights.push(size/this.pixelScale);
      this.panelRows.push(this.numRows);
      this.panels = [];
      var self = this;
      var cOffset, rOffset;
      // build the cellData object - it is actually filled in by the TDataPanel
      this.cellData = new Array(this.numRows)
      for(var i=0;i<this.numRows;i++)this.cellData[i]=new Array(this.numColumns);
    
      //now build the panels
      rOffset = this.extent2.y;
      this.columnPanels = [];
      this.rowPanels = [];
      var totalPanels = (this.panelRows.length-1)*(this.panelColumns.length-1);
      for(var r= 0; r<this.panelRows.length-1; r++){
        cOffset = -this.extent2.x;
        for(var c=0; c<this.panelColumns.length-1; c++){
          this.buildPanel(sheet, c, r, cOffset, rOffset);
          cOffset += this.panelWidths[c];
        }
        rOffset -= this.panelHeights[r];
      }
      Globals.executeArray.push(()=>{
        this.panelObject3Ds = this.panels.map(function(p){return p.object3D;});
      });
      this.object3D.name = 'TDataTable';
      if(parent)parent.addChild(this);
      if(onComplete)onComplete(this);
    },
    buildPanel: function(sheet, c, r, cOffset, rOffset){
      Globals.executeArray.push(()=>{
        var self = this;
        this.panels.push(new TDataPanel(this,  function(tObj){
            tObj.object3D.position.set(cOffset+self.panelWidths[c]/2, rOffset-self.panelHeights[r]/2,0);
          }, 
          this,
          sheet,
          this.pixelScale, 
          this.maxPanelSize, 
          this.panelColumns[c], this.panelRows[r],
          this.columns.slice(this.panelColumns[c], this.panelColumns[c+1]),
          this.rows.slice(this.panelRows[r], this.panelRows[r+1]), 
          this.pixelWidths[c], 
          this.pixelHeights[r],
          this.cellData,
          this.theme
          ));
        if(r===0){this.columnPanels.push(this.panels[this.panels.length-1]);}
        if(c===0){this.rowPanels.push(this.panels[this.panels.length-1]);}
      });
    },
    addBendSlider: function(){      
      var self = this;
      new TSlider(this, function(tObj){tObj.object3D.position.y = self.extent.y/2 + 1.25}, function(rot){self.bendTable(rot)}, self.extent.x/2, 1, 0);
    },

    bendTable:function(rotation){
      // rotation is a value from 0-1 and determines the angle around which the sheet is rolled. 
      // rotation of 0 means the spreadsheet is flat, rotation of 1 means the spreadsheet is a full cylinder
      //var theta = this.extent2.x/this.radius;
      this.rotation = rotation<0.01? 0: rotation;

      this.selectCells(false); // I can figure out how to not do this later. Just requires more brain cells than I have available right now.
      this.selectionOutline.clear(); 
      this.selectionRisers.forEach(function(val){val.geometry.dispose();}); // these are invalid - dump them.
      this.selectionRisers = []; // this is invalidated
      if(this.rotation === 0)this.flattenTable(); // radius is infinite. 
      else{
        var theta = this.rotation * Math.PI*2;
        var radius = this.extent.x/theta;
        this.radius = radius;
        var s = Math.sin(theta/2);
        var c = Math.cos(theta/2);
        //this.offsetX = s*this.radius;
        var offsetZ = (1-c)*this.radius;
        //this.offsetZ=offsetZ;
        //console.log(this.radius, this.offsetZ)
        //this.extent.x = s * this.radius * 2;
        //this.extent2.x = this.extent.x/2; 

        this.panels.forEach(function(panel){panel.bendPanel(radius, offsetZ)});
        this.extraBends(radius, offsetZ, this.rotation);
      }
    },
    flattenTable: function(){
        this.panels.forEach(function(panel){panel.flattenPanel()});
        this.extraBends(0, 0, 0);
        this.rotation = 0;
        this.radius = 0;
        //this.offsetZ=0;
    },

    scaleChart: function(val){
      this.minMax.scale = val*5;
      if(this.minMax.delta > 0)this.minMax.deltaScale = this.minMax.scale/this.minMax.delta;
      else this.minMax.deltaScale = 0;  
      this.selectCells(true, true);
    },

    extraBends: function(radius, offsetZ, rotation){},
    //constructPanel()
  },

  'accessing',{
    boundingBox: function(){ return {min: new THREE.Vector3(-this.extent2.x, -this.extent2.y,0), max: new THREE.Vector3(this.extent2.x, this.extent2.y, 0)}},
    getRiser: function(column){return this.cellData[0][column].panel.getRiser(column);},
    doHide: function(){if(this.parent.isContainer())this.parent.object3D.visible = false; else this.object3D.visible = false;},
    doShow: function(){if(this.parent.isContainer())this.parent.object3D.visible = true; else this.object3D.visible = true;}
  },
  'events',{

    // this reorders the selection so the s.c<e.c and s.r<e.r
    setRange: function(cell1, cell2){
      var sC,sR,eC,eR;
      if(cell1.c<cell2.c){sC = cell1.c; eC = cell2.c;}else{sC = cell2.c; eC = cell1.c;};
      if(cell1.r<cell2.r){sR = cell1.r; eR = cell2.r;}else{sR = cell2.r; eR = cell1.r;};
      return{s: {c: sC, r: sR}, e: {c: eC, r: eR}};
    },

    // these functions are called from the TDataPanels
    // cellIndex is a simple object {r:r, c:c}
    // doOverCell tracks the cell the pointer is over and hilites it and unhilites the previous one

    doOverCell: function(cellIndex){
      //this.endCell = this.startCell = cellIndex;
      var newCell = this.cellData[cellIndex.r][cellIndex.c];
      if(this.overCell){
        if(this.overCell === newCell)return true; // no change
        this.overCell.hiliteCell(false);
      }
      if(newCell.cell && newCell.cell.doIgnore())return this.doLeaveCell();
      this.overCell = newCell;
      this.overCell.panel.copyCellBox(cellIndex.r, cellIndex.c, this.overCell.index, this.overCell.select, this.cellOutline);
      this.overCell.hiliteCell(true);
      //this.cellOutline.setOwner(this.overCell.panel);
      this.cellOutline.object3D.visible = true;
      this.cellOutline.setCellIndex(cellIndex);
      return true;
    },

    // if the pointer leaves the TDataTable, remove the overCell
    doLeaveCell: function(){
      if(this.overCell){
        this.overCell.hiliteCell(false);
        this.overCell = null; //clear it
        this.cellOutline.object3D.visible = false;

      }
    },

    // if the pointer is down on the TDataTable, this is the beginning of the selection
    doDownCell: function(cellIndex){
      this.doLeaveCell(); // clear the overCell
      var newCell = this.cellData[cellIndex.r][cellIndex.c];
      if(newCell.cell && newCell.cell.doIgnore())return true; // ignore this cell
      this.endCell = this.startCell = cellIndex;
      var range = {s:this.startCell, e:this.startCell};
      this.switchCells(range);
      return true;
    },

    // as the user drags across the TDataTable, select additional cells.
    doMoveCell: function(cellIndex){
      if(cellIndex.r === this.endCell.r && cellIndex.c === this.endCell.c) return true; // same as last cell, nothing to do
      this.endCell = cellIndex;
      if(!this.multiSelect)this.startCell = this.endCell;
      var range = this.setRange(this.startCell, this.endCell);
      var newCell = this.cellData[cellIndex.r][cellIndex.c];

      if(newCell.cell && newCell.cell.doIgnore()){
        this.selectionOutline.object3D.visible = false;
        this.selectCells(false); // this is a no-op, doIgnore this cell
      }else {
        this.switchCells(range);
      }
      return true;
    },

    // execute any script within this cell
    doUpCell: function(cellIndex){
      if(cellIndex){
        var cellData = this.cellData[cellIndex.r][cellIndex.c];
        if(cellData.cell && cellData.cell.doIgnore && cellData.cell.doIgnore())return true; // this is a no-op, doIgnore this cell
        if(cellData.cell && cellData.cell.doAction) cellData.cell.doAction(cellData.cell, true); // if there is an action to be done by this cell, do it here.
        if(!this.multiSelect){
          this.switchCells(null); // clear the selection
        }
      }else{
        if(!this.multiSelect){
          this.selectCells(false);
          this.selectionOutline.object3D.visible = false;
        }
        var cellData = this.cellData[this.endCell.r][this.endCell.c];
        if(cellData.cell && cellData.cell.doAction) cellData.cell.doAction(cellData.cell, false);
      }
      return true;
    },

    // select all cells in the current cell range
    selectCells: function(doSelect, force){
      if(this.cellRange){
        for(var r = this.cellRange.s.r; r <= this.cellRange.e.r; r++)
          for(var c = this.cellRange.s.c; c<= this.cellRange.e.c; c++){
            var cell = this.cellData[r][c];
            cell.selectCell(doSelect, this.minMax, force);
          }
      }
    },

    getMinMax: function(range){
      //if(this.minMax.scale === 0)return; // nothing to compute
      this.minMax.min = Infinity;
      this.minMax.max = -Infinity; 
      if(range){
        for(var r = range.s.r; r <= range.e.r; r++)
          for(var c = range.s.c; c<= range.e.c; c++){
            var cell = this.cellData[r][c];
            var v = cell.getValue();
            if(typeof v === 'number'){
              if(v<this.minMax.min)this.minMax.min = v;
              if(v>this.minMax.max)this.minMax.max = v;
            }
          }
          this.minMax.delta = this.minMax.max-this.minMax.min; 
          if(this.minMax.delta > 0)this.minMax.deltaScale = this.minMax.scale/this.minMax.delta;
          else this.minMax.deltaScale = 0;    
      }
    },
    // don't switch cells if they will still be on
    switchCells: function(newRange){
      if(newRange){
          if(newRange.e.r>=this.numRows)newRange.e.r = this.numRows-1;
          if(newRange.e.c>=this.numColumns)newRange.e.c = this.numColumns-1;
          this.getMinMax(newRange);
          this.selectionOutline.setRange(newRange);
          if(this.cellRange){
          for(var r = this.cellRange.s.r; r <= this.cellRange.e.r; r++){
            for(var c = this.cellRange.s.c; c<= this.cellRange.e.c; c++){
              if(r>=newRange.s.r && r<=newRange.e.r && c>=newRange.s.c && c <=newRange.e.c)continue;
              var cell = this.cellData[r][c];
              cell.selectCell(false);// clear
            }
          }
        }
        this.cellRange = newRange;
        this.selectCells(true,this.minMax.deltaScale>0);     
      }
      else {
        this.selectionOutline.object3D.visible = false;
        this.selectCells(false);
        this.cellRange = newRange;
      }
    }

  });
  


//----------------------------------------------------------------------------------------------------------------
// The TDataTable is made up of a collection of smaller TDataPanels.
//----------------------------------------------------------------------------------------------------------------
var TDataPanel = TObject.subclass('users.TDataPanel',
  'properties',{
    tDataTable: null, // this is the owning TDataTable defined above
    flatPositions: null, //used to compute the sheet "bend" and restore the sheet to a flat state
    bentPositions: null, //used to restore offset cells
    flatColors: null, // used to replace the original color when we modify it
    sheet: null, // this is the cell data
    rowHeights: null, // array of 3D heights
    pixelHeights: null, // array of pixel heights
    columnWidths: null, // array of 3D column widths
    pixelWidths: null, // array of column pixel widhs
    cIndex: null, // starting column index of this panel
    rIndex: null, // starting row index of this panel
    columns: null, // columns widths in pixels
    rows: null, // rows height in pixels
    columns3D: null, // columns widths in 3D
    rows3D: null,  // rows height in 3D
    pixelScale: null, // conversion between pixels and 3D
    width: null, // pixel width of this panel
    height: null, // pixel height of this panel
    extent2: null, // extent/2 of this panel
    color: null, // test color of this panel - used to show the panels in the TDataTable
    cellPosIndex: null, // vertex position index for the cell
    //cMult: null,
    dataImage: null, // this is the texture where we render the cell data
    vectorCamera: new THREE.Vector3(), // working memory for computations - avoids GC
    vectorMe: new THREE.Vector3(), // working memory for computations - avoids GC
    vectorNorm: new THREE.Vector3(), // working memory
    quat: new THREE.Quaternion(), // working memory
    qWorld: new THREE.Quaternion(), // working memory
    hires: false, // used to test if we need to switch between lo-res and hi-res textures
    trueCenter: null, // this is the center of the bounding sphere used to determine the true distance assuming we bend the sheet
    trueCenterWorld: null, // used to compute the true center in the world
    updateCounter: 0, // don't need to update every time
    theme: null
  },
  'initialize',
  {
    initialize: function(parent, onComplete, dataTable, sheet, pixelScale, maxPanelSize, cIndex, rIndex, columns, rows, width, height, cellData, theme){
      //console.log('parent', parent);
      var self = this;
      this.theme = theme || 'black';
      this.tDataTable = dataTable; // redundent with this.parent, but not always...
      this.sheet = sheet;
      this.pixelScale = pixelScale;
      this.cIndex = cIndex;
      this.rIndex = rIndex;
      this.columns = columns;
      this.rows = rows;
      this.width = width;
      this.rows3D = rows.map(function(y){return y/pixelScale});
      this.columns3D = columns.map(function(x){return x/pixelScale});

      this.height = height; 
      this.extent = new THREE.Vector3();
      this.extent.set(this.width/this.pixelScale, this.height/this.pixelScale, 0);
      this.extent2 = new THREE.Vector3();
      this.extent2.copy(this.extent);
      this.extent2.multiplyScalar(0.5);
      //var w = 4;
      //this.color = sheet.defaultColor || new THREE.Color((Math.random()+w-1)/w, (Math.random()+w-1)/w, (Math.random()+w-1)/w);
      this.color = sheet.defaultColor || new THREE.Color(1,1,1);
      this.cellPosIndex = [0]; // starting index
      // pow2ceil() determines the smallest power of 2 that is larger than the argument.
      // It is used to determine the smallest possible texture to use here.
      function pow2ceil(v){
        v--;
        var p = 2;
        while (v >>= 1) {p <<= 1;}
        return p;
      }
      // smallest power of 2 value for texture
      var dx = pow2ceil(this.width);
      var dy = pow2ceil(this.height);

      // if black, then text is white
      if(this.theme === 'black'){
        this.dataImage = new TDynamicTexture(null, dx, dy,'white');
        this.dataImage.fill('rgba(100, 100, 100, 0.65)');
      }else{
        this.dataImage = new TDynamicTexture(null, dx, dy,'black');
        this.dataImage.fill('rgba(255, 255, 255, 0.65)');
      }

      this.dataImage.setFont("normal 12px Arial"); // default
      //this.dataImage.clear();

      //this.dataImage.fill(['blue', 'red', 'green', 'orange', 'yellow', 'white','cyan', 'magenta'][Math.floor(Math.random()*8)]);
      // build the 3D cells
      var totalCells = this.rows.length*this.columns.length;

      var geometry = new THREE.BufferGeometry();
      var normal = new THREE.Vector3(0,0,1);

      var positions = [];
      var normals = [];
      var colors = [];
      var uvs = [];

      //var widths =  [0, 1, 1, 1, 0, 0]; 
      //var heights = [1, 1, 0, 0, 0, 1];

      //this.cMult = [1, 0.65, 1, 1, .65, 1]; // color highlighting
      var cOffset, rOffset, rOffsetUV=0;
      rOffset = this.extent2.y;
      var height, width;
      var heightUV, widthUV;
      var cntr = 0, cntrUV = 0;

      var cellDefaultWidth = this.sheet.defaultColWidth*1.1; // break the cell into smaller parts
      
      for(var r=0; r<this.rows.length; r++){
        cOffset = -this.extent2.x;
        var cOffsetUV = 0;
        height = this.rows3D[r];
        heightUV = this.rows[r];
        //var rPos = heights.map(function(hval){return rOffset-hval*height});
        //var rPosUV = heights.map(function(hval){return 1-(rOffsetUV+hval*heightUV)/dy});

        var tXY = rOffset - height, bXY = rOffset;
        var tUV = 1-(rOffsetUV+heightUV)/dy, bUV = 1-rOffsetUV/dy;

        for(var c=0; c<this.columns.length; c++){
          width = this.columns3D[c];
          widthUV = this.columns[c];

          //var cPos = widths.map(function(wval){return cOffset+wval*width});
          //var cPosUV = widths.map(function(wval){return (cOffsetUV+wval*widthUV)/dx});
          var doColor = this.color;

          // render the string here
          var cell = this.sheet.getCell(r+rIndex,c+cIndex);
           //var s = this.sheet.getCellString(r+rIndex,c+cIndex);
          if(cell){
            doColor = (cell.getFillColor && cell.getFillColor()) || doColor;
            cell.drawCell(this.dataImage, rOffsetUV, cOffsetUV, heightUV, widthUV);
          }

          var segs = Math.min(4,Math.ceil(widthUV/cellDefaultWidth)); //break the cell into this many parts - max of 4
          cellData[r+rIndex][c+cIndex]=new TCellData(cell, this, this.cellPosIndex.length-1, segs, doColor.clone());
          this.cellPosIndex.push(this.cellPosIndex[this.cellPosIndex.length-1]+segs*2*3); //each seg has two triangles, each triangle 3 positions, so segs*2*3

          var wd = width/segs, wdUV = widthUV/segs;
          var topC = 1;
          var botC = sheet.cornerShading || 0.65;
          var deltaC = (topC-botC)/segs;
          var topC2 = topC-deltaC, botC2 = botC+deltaC;
          var rC = doColor.r, gC = doColor.g, bC = doColor.b;

          for(var cc=0; cc<segs; cc++){
            var lXY =  cOffset+wd*cc, rXY = lXY+wd;
            var lUV = (cOffsetUV+wdUV*cc)/dx, rUV = (cOffsetUV+wdUV*(cc+1))/dx;

            //positions.push(lXY,tXY,0, lXY,bXY,0, rXY,tXY,0, rXY,bXY,0, rXY,tXY,0, lXY,bXY,0);
              positions.push(rXY,tXY,0, lXY,bXY,0, lXY,tXY,0, lXY,bXY,0, rXY,tXY,0, rXY,bXY,0);

            normals.push(0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,1); 

            uvs.push(rUV, tUV, lUV,bUV, lUV,tUV,     lUV,bUV, rUV,tUV, rUV,bUV);

            colors.push(
              rC*topC2,gC*topC2,bC*topC2, 
              rC*botC,gC*botC,bC*botC, 
              rC*topC,gC*topC,bC*topC, 

              rC*botC,gC*botC,bC*botC,
              rC*topC2,gC*topC2,bC*topC2, 
              rC*botC2,gC*botC2,bC*botC2
              );            

            topC = topC2; botC = botC2; topC2 -= deltaC; botC2 += deltaC;
          }

          cOffset +=width;
          cOffsetUV+=widthUV;

        }
        rOffset -= height;
        rOffsetUV += heightUV;
      }
      var flatPos = new Float32Array(positions);
      positions = new Float32Array(positions);
      normals = new Float32Array(normals);
      var flatColors = new Float32Array(colors);
      colors = new Float32Array(colors);
      uvs = new Float32Array(uvs);
      geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
      geometry.addAttribute( 'normal', new THREE.BufferAttribute( normals, 3 ) );
      geometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
      geometry.addAttribute( 'uv', new THREE.BufferAttribute(uvs, 2));
      geometry.computeBoundingSphere();

 
      this.flatPositions = new THREE.BufferAttribute(flatPos, 3);
      this.flatColors = new THREE.BufferAttribute(flatColors, 3);

      var material = new THREE.MeshPhongMaterial( {
        color: 0xffffff, emissive: 0x111111,opacity:0.99, transparent:true,
        side: THREE.DoubleSide , vertexColors: THREE.VertexColors
      } );

      material.map = sheet.initMiniTexture?this.dataImage.getMiniTexture():this.dataImage.getTexture();//1/8 size
      this.hires = !sheet.initMiniTexture;
      var mesh = new THREE.Mesh( geometry, material );
      mesh.receiveShadow = true;
      this.setObject3D(mesh);
      this.object3D.geometry.computeBoundingSphere();
      this.trueCenter = this.object3D.geometry.boundingSphere.center;
      this.trueCenterWorld = new THREE.Vector3();

      for(var i=1;i<this.rows3D.length;i++)this.rows3D[i]+=this.rows3D[i-1];
      this.rows3D.unshift(0); // add a 0 to the beginning of the array
      this.rows3D = this.rows3D.map(function(val){return self.extent2.y - val}); //flip it over
      this.object3D.name = 'TDataPanel';
      if(parent)parent.addChild(this);
      if(onComplete)onComplete(this);
    },

    // curve this panel into the overall TDataTable cylinder
    bendPanel: function(radius, offsetZ){
      var positions = this.object3D.geometry.getAttribute('position');
      var normals = this.object3D.geometry.getAttribute('normal');
      var dx=this.object3D.position.x;
      for(var i=0; i< positions.count; i++){
        var x = this.flatPositions.getX(i);
        var theta = (x+dx)/radius;  
        var s = Math.sin(theta);
        var c = Math.cos(theta);
        normals.setX(i,-s);
        normals.setZ(i,c);
        positions.setX(i, s*radius-dx);
        positions.setZ(i, (radius-c*radius)-offsetZ);
      }
      this.object3D.geometry.computeBoundingSphere();
      this.trueCenter = this.object3D.geometry.boundingSphere.center;
      this.object3D.geometry.attributes.position.needsUpdate = true;
      this.object3D.geometry.attributes.normal.needsUpdate = true;
    },

    computeCenter: function(){
      this.object3D.geometry.computeBoundingSphere();
      this.trueCenter = this.object3D.geometry.boundingSphere.center;
      this.object3D.geometry.attributes.position.needsUpdate = true;
      this.object3D.geometry.attributes.normal.needsUpdate = true;
    },

    flattenPanel: function(){
      var positions = this.object3D.geometry.getAttribute('position');
      var normals = this.object3D.geometry.getAttribute('normal');
      positions.copy(this.flatPositions);
      for(var i=0; i<normals.count; i++)normals.setXYZ(i, 0,0,1);
      this.object3D.geometry.computeBoundingSphere();
      this.trueCenter = this.object3D.geometry.boundingSphere.center;
      this.object3D.geometry.attributes.position.needsUpdate = true;    
      this.object3D.geometry.attributes.normal.needsUpdate = true;
    },

  },


  'events',{
    onPointerDown: function(pEvt){ 
      if(pEvt.selectedTarget === this.object3D){
        if(pEvt.shiftKey)
          this.tDataTable.doMoveCell(this.eventToCellIndex(pEvt)); 
        else{
          this.tDataTable.doDownCell(this.eventToCellIndex(pEvt)); 
        }
      }else if(this.tDataTable.cellOutline.hasTarget(pEvt.selectedTarget)){
        if(pEvt.shiftKey)
          this.tDataTable.doMoveCell(this.tDataTable.cellOutline.cellIndex);
        else
          this.tDataTable.doDownCell(this.tDataTable.cellOutline.cellIndex);
      }
      return true;
    },

    onPointerMove: function(pEvt){ 
      if(this != pEvt.selectedTObject){
        if(!pEvt.selectedTObject)return true; // nothing to pick, nothing to do
        return pEvt.selectedTObject.onPointerMove(pEvt);
      }
      this.tDataTable.doMoveCell(this.eventToCellIndex(pEvt)); 
      return true;
    },

    onPointerUp: function(pEvt){ 
      if(this != pEvt.selectedTObject){
        if(!pEvt.selectedTObject){this.tDataTable.doUpCell(null); return true;} // allow it to do nothing - or dismiss a menu
        return pEvt.selectedTObject.onPointerUp(pEvt);
      }
      this.tDataTable.doUpCell(this.eventToCellIndex(pEvt)); return true;
    },

    onPointerEnter: function(pEvt){ this.onPointerOver(pEvt);  return true;},

    onPointerOver: function(pEvt){ 
      if(pEvt.selectedTarget === this.object3D) // eliminate flicker when over the cell riser
        this.tDataTable.doOverCell(this.eventToCellIndex(pEvt)); 
      return true;
    },

    onPointerLeave: function(pEvt){ this.tDataTable.doLeaveCell(); return true;},

    onDoubleClick: function(pEvt){
      console.log("TSpreadsheet>>onDoubleClick");
      // this is a bit more complex as the TDataTable might be curved, so can't just use the Object3D quaternion.
      this.object3D.getWorldQuaternion(this.qWorld);
      this.getNormal(this.eventToCellIndex(pEvt), this.vectorNorm);
      this.quat.setFromUnitVectors( new THREE.Vector3(0,0,1), this.vectorNorm); // compute quaternion 
      this.quat.multiply(this.qWorld);

      this.vectorNorm.multiplyScalar(8);
      this.vectorMe.copy(pEvt.point);
      this.object3D.worldToLocal(this.vectorMe);
      this.vectorMe.add(this.vectorNorm);
      this.object3D.localToWorld(this.vectorMe);
      pEvt.tAvatar.goTo(this.vectorMe, this.quat, null, 10);
      return true;        
    },

    eventToCellIndex: function(pEvt){
      var index = findCell(pEvt.target.index,this.cellPosIndex); // this computes which cell index we are at
      var r = Math.floor(index/this.columns.length);
      var c = index%this.columns.length;
      var self = this;
      return {r: r+this.rIndex, c: c+this.cIndex};     
    },
  },
  'actions',{

    // get the first normal for the cell
    getNormal: function(cellIndex, nVec){
      nVec = nVec || new THREE.Vector3();
      var cell = this.tDataTable.cellData[cellIndex.r][cellIndex.c];
      var index = this.cellPosIndex[cell.index];
      var normals = this.object3D.geometry.getAttribute('normal');
      nVec.set(normals.getX(index), normals.getY(index), normals.getZ(index));
      return nVec;
    },

    hiliteCell: function(cellIndex, offset, segments, botC, r, g, b){ // move the cell by offset (up is positive)
      var positions = this.object3D.geometry.getAttribute('position');
      var colors = this.object3D.geometry.getAttribute('color');
      var normals = this.object3D.geometry.getAttribute('normal');
      var topC = 1-botC;

      for(var i= this.cellPosIndex[cellIndex], j=0; i<this.cellPosIndex[cellIndex+1];i++, j++){
        colors.setXYZ(i, r*(segments[j]*topC+botC), g*(segments[j]*topC+botC), b*(segments[j]*topC+botC));
        positions.setXYZ(i, positions.getX(i) + normals.getX(i)*offset, 
                            positions.getY(i) + normals.getY(i)*offset,
                            positions.getZ(i) + normals.getZ(i)*offset);
      }
      this.object3D.geometry.attributes.position.needsUpdate = true;    
      this.object3D.geometry.attributes.color.needsUpdate = true;    
    },


    // switch to the smaller texture when we are further away. Larger TDataTables have so many large textures that
    // they spend most of their time paging textures in and out of the GPU. This approach eliminates that overhead.
    update: function(time, tScene){
      this.updateCounter++;
      if(this.updateCounter<30)return;
      this.updateCounter = Math.random()*5;
      this.trueCenterWorld.copy(this.trueCenter);
      this.object3D.localToWorld(this.trueCenterWorld);
      var d=tScene.tAvatar.object3D.getWorldPosition(this.vectorCamera).distanceToSquared( this.trueCenterWorld);
      if(d>1500){
        if(this.hires){
          this.object3D.material.map = this.dataImage.getMiniTexture(); //1/8 size
          this.object3D.material.needsUpdate = true;
          this.hires = false;
        }
      }else if(!this.hires){
        this.object3D.material.map = this.dataImage.getTexture(); //this.dataImage.texture; //full size
        this.object3D.material.needsUpdate = true;
        this.hires = true;   
      }
    }
  },
  'accessing',{
    // this allows us to treat the entire set of panels as if it were a single virtual panel
    getRayTestArray: function(){return this.tDataTable.panelObject3Ds},

    // this returns a reusable "riser" - vertices that can be used to highlight cells
    getRiser: function(column){

      var selectionRisers = this.tDataTable.selectionRisers;
      if(selectionRisers[column])return selectionRisers[column];

      var cellIndex = column-this.cIndex; // any row is good

      var fromPos = this.object3D.geometry.getAttribute('position');
      var fromNorm = this.object3D.geometry.getAttribute('normal');
      var offset = selectHeight;
      var pos = this.object3D.position;
      var tArray = [];
      var nArray = [];

      var ci = this.cellPosIndex[cellIndex];
      var ci2 = ci+2;
      tArray.push(fromPos.getX(ci2)+pos.x + fromNorm.getX(ci2) * offset, 
        0, fromPos.getZ(ci2)+pos.z + fromNorm.getZ(ci2) * offset);

      tArray.push(fromPos.getX(ci2)+pos.x, 
        0, fromPos.getZ(ci2)+pos.z);

      nArray.push(fromNorm.getX(ci2), 
        0, fromNorm.getZ(ci2));

      nArray.push(fromNorm.getX(ci2), 
        0, fromNorm.getZ(ci2));

      for(var i= ci; i<this.cellPosIndex[cellIndex+1];i+=6){

        tArray.push(fromPos.getX(i) + pos.x + fromNorm.getX(i) * offset,
          0, fromPos.getZ(i) + pos.z + fromNorm.getZ(i) * offset);

        tArray.push(fromPos.getX(i) + pos.x, 
          0, fromPos.getZ(i) + pos.z); 

        nArray.push(fromNorm.getX(i),
          0, fromNorm.getZ(i));

        nArray.push(fromNorm.getX(i),
          0, fromNorm.getZ(i));
      }

      // now shuffle them to form the triangles
      var cArray = [], dArray = [];
      for(var i=0; i<tArray.length-6; i+=6){
        cArray = cArray.concat(tArray.slice(i,i+9));
        cArray = cArray.concat(tArray.slice(i+3,i+12));

        dArray = dArray.concat(nArray.slice(i,i+9));
        dArray = dArray.concat(nArray.slice(i+3,i+12));
      }
      var rise = new Float32Array(cArray.length);
      var hirise = new Float32Array(cArray.length);

      for(var i=0; i< cArray.length; i++){
        rise[i] = cArray[i];
        hirise[i] = cArray[i]+dArray[i]*offset; // hirise second story
      }

      var geometry = new THREE.BufferGeometry(); // precomputed geometry
      geometry.addAttribute( 'position', new THREE.BufferAttribute( rise, 3 ) );
      geometry.computeBoundingSphere();

      var riser = {rise: rise, hirise: hirise, normal: dArray, geometry: geometry};
      selectionRisers[column] = riser;
      return riser; 
    },

    copyOutline: function(cellIndex, cellOutline){
      var fromPos = this.object3D.geometry.getAttribute('position');
      var fromNorm = this.object3D.geometry.getAttribute('normal');
      var tArray = [];
      var bArray = [];
      var toPos = cellOutline.object3D.geometry.getAttribute('position');

      var pos = this.object3D.position;
      var ci = this.cellPosIndex[cellIndex];
      var offset = 0.02;

      tArray.push(fromPos.getX(ci)+pos.x + fromNorm.getX(ci) * offset, 
                  fromPos.getY(ci)+pos.y + fromNorm.getY(ci) * offset, 
                  fromPos.getZ(ci)+pos.z + fromNorm.getZ(ci) * offset);
      bArray.push(fromPos.getZ(ci+1)+pos.z + fromNorm.getZ(ci+1) * offset, 
                  fromPos.getY(ci+1)+pos.y + fromNorm.getY(ci+1) * offset, 
                  fromPos.getX(ci+1)+pos.x + fromNorm.getX(ci+1) * offset); // ZYX because we reverse it

      for(var i= this.cellPosIndex[cellIndex]; i<this.cellPosIndex[cellIndex+1];i+=6){
        tArray.push(fromPos.getX(i+2) + pos.x + fromNorm.getX(i+2) * offset, 
                    fromPos.getY(i+2) + pos.y + fromNorm.getY(i+2) * offset, 
                    fromPos.getZ(i+2) + pos.z + fromNorm.getZ(i+2) * offset);
        bArray.push(fromPos.getZ(i+3) + pos.z + fromNorm.getZ(i+3) * offset, 
                    fromPos.getY(i+3) + pos.y + fromNorm.getY(i+3) * offset, 
                    fromPos.getX(i+3) + pos.x + fromNorm.getX(i+3) * offset); // ZYX because we reverse it
      }      
      bArray.reverse();
      tArray = tArray.concat(bArray);
      tArray.push(tArray[0], tArray[1], tArray[2]); // close the loop
      for(var i = 0, j=0; i<tArray.length; i+=3, j++){
        toPos.setXYZ(j,tArray[i], tArray[i+1], tArray[i+2]);
      }

      cellOutline.object3D.geometry.attributes.position.needsUpdate = true;
      cellOutline.object3D.geometry.setDrawRange(0, tArray.length/3);
      cellOutline.object3D.geometry.computeBoundingSphere();
    },

// build the box for a single selected cell
// the reason this is done explicitly, versus just using the riser geometry is that this might have a second story-
// that is, it might be on top of a group of selected cells, so I need to either keep both sets of riser groups or 
// just compute them when I need them.
    copyCellBox: function(row, column, cellIndex, hirise, cellOutline){
      var riser = this.getRiser(column);
      var top = hirise ? riser.hirise : riser.rise;
      var offsetY = this.object3D.position.y;
      var toPos = cellOutline.top.geometry.getAttribute('position');
      var leftPos = cellOutline.left.geometry.getAttribute('position');
      var rightPos = cellOutline.right.geometry.getAttribute('position');
      for(var i=0, j=0; i<top.length; i+=3,j++){
        toPos.setXYZ(j, top[i], 0, top[i+2]);
      }

      var last = top.length-6;

      leftPos.setXYZ(0, top[0], this.rows3D[row-this.rIndex]+offsetY, top[2]);
      leftPos.setXYZ(1, top[3], this.rows3D[row-this.rIndex]+offsetY, top[5]);
      leftPos.setXYZ(2, top[0], this.rows3D[1+row-this.rIndex]+offsetY, top[2]);

      leftPos.setXYZ(3, top[3], this.rows3D[row-this.rIndex]+offsetY, top[5]);
      leftPos.setXYZ(4, top[0], this.rows3D[1+row-this.rIndex]+offsetY, top[2]);
      leftPos.setXYZ(5, top[3], this.rows3D[1+row-this.rIndex]+offsetY, top[5]);

      rightPos.setXYZ(0, top[last+0], this.rows3D[row-this.rIndex]+offsetY, top[last+2]);
      rightPos.setXYZ(1, top[last+3], this.rows3D[row-this.rIndex]+offsetY, top[last+5]);
      rightPos.setXYZ(2, top[last+0], this.rows3D[1+row-this.rIndex]+offsetY, top[last+2]);

      rightPos.setXYZ(3, top[last+3], this.rows3D[row-this.rIndex]+offsetY, top[last+5]);
      rightPos.setXYZ(4, top[last+0], this.rows3D[1+row-this.rIndex]+offsetY, top[last+2]);
      rightPos.setXYZ(5, top[last+3], this.rows3D[1+row-this.rIndex]+offsetY, top[last+5]);

      cellOutline.top.geometry.attributes.position.needsUpdate = true;
      cellOutline.left.geometry.attributes.position.needsUpdate = true;
      cellOutline.right.geometry.attributes.position.needsUpdate = true;
      cellOutline.top.geometry.setDrawRange(0, top.length/3);
      cellOutline.top.geometry.computeBoundingSphere();
      cellOutline.left.geometry.computeBoundingSphere();
      cellOutline.right.geometry.computeBoundingSphere();
      cellOutline.top.position.y=this.rows3D[row-this.rIndex]+offsetY;
      cellOutline.bottom.position.y=this.rows3D[1+row-this.rIndex]+offsetY;
      cellOutline.setOwner(this);
    },

    copyCellPositions: function(cellIndex, cellOutline){ 

      var fromPos = this.object3D.geometry.getAttribute('position');
      var fromNorm = this.object3D.geometry.getAttribute('normal');
      var toPos = cellOutline.object3D.geometry.getAttribute('position');
      var toNorm = cellOutline.object3D.geometry.getAttribute('normal');
      var len = this.cellPosIndex[cellIndex+1]-this.cellPosIndex[cellIndex];
      var pos = this.object3D.position;
      var offset = 0.02;
      for(var i= this.cellPosIndex[cellIndex], j=0; i<this.cellPosIndex[cellIndex+1];i++,j++){
        var nx = fromNorm.getX(i), ny = fromNorm.getY(i), nz = fromNorm.getZ(i);
        toPos.setXYZ(j, fromPos.getX(i) + pos.x + nx * offset, fromPos.getY(i) + pos.y + ny * offset, fromPos.getZ(i) + pos.z + nz * offset);
        toNorm.setXYZ(j, nx, ny, nz);
      }
      cellOutline.object3D.geometry.attributes.position.needsUpdate = true;
      cellOutline.object3D.geometry.attributes.normal.needsUpdate = true;
      cellOutline.object3D.geometry.setDrawRange(0, len);
      cellOutline.object3D.geometry.computeBoundingSphere();
   },
  }
);



//----------------------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------------------

var hotColor = new THREE.Color(0xffcccc);
var coolColor = new THREE.Color(0xccffcc);
var TCellData = TObject.subclass('users.TCellData',
  'properties',{
    cell: null, // cell data (values, strings, etc)
    panel: null, // panel that this cell lives in
    index: null, // index into the position offset array
    value: null, // cell value
    select: false, // is it selected
    hilite: false, // is it hilited
    segments: null, // 1-4 left/right segments
    color: null, // the color of this cell - THREE.Color
    selectColor: null, // the color of the selected cell
    height: null // height of selected cell
  },

  'initialize',{
    initialize: function(cell, panel, index, segments, color){
        this.cell = cell;
        this.panel = panel;
        this.index = index;
        this.segments = segments;
        this.color = color; 
        this.height = 0;
        this.selectColor = new THREE.Color();
        if(this.cell)this.value = this.cell.value;
      }
    },
    'accessing',{
      getColor: function(){return this.color},
      getOutline: function(){
        return this.panel.getOutline(this.index);
      },
      getValue: function(){return this.cell&&this.cell.getValue();},
    },
    'actions',{
      selectCell: function(bool, minMax, force){
        if(this.select === bool && !force)return; // already set (unless we are forcing)
        if(this.cell)this.cell.selectCell(bool);
        var color = this.getColor();
        var val, ht;
        if(bool){
          if(minMax.deltaScale){  
            val = this.getValue(); 
            if(val && typeof val === 'number'){
              ht = selectHeight + (val-minMax.min)* minMax.deltaScale;
              if(val<0){
                val = 1-(minMax.min-val)/minMax.min;
                this.selectColor.setRGB(1,1-val,(1-val)/2); 
              } else if(val === 0){
                this.selectColor.setRGB(1,1,1);
              }
              else {
                val = 1-(minMax.max-val)/minMax.max;
                this.selectColor.setRGB((1-val)/2,1,1-val);                
              }
            } else {
              ht = selectHeight;            
              this.selectColor.copy(hotColor);
            }
          } else {
            ht = selectHeight;
            this.selectColor.copy(coolColor);
          } 

          //this.panel.hiliteCell(this.index, val-this.height, this.panel.tDataTable.colorSegments[this.segments], 0.8, color.r*.7, color.g*0.85, color.b*.7);
          this.panel.hiliteCell(this.index, ht-this.height, this.panel.tDataTable.colorSegments[this.segments], 0.8, this.selectColor.r, this.selectColor.g, this.selectColor.b);
          this.height = ht;
          //this.offset+=selectHeight;
        }else{
          var cornerShading = this.panel.tDataTable.sheet.cornerShading || 0.65;
          this.panel.hiliteCell(this.index, -this.height, this.panel.tDataTable.colorSegments[this.segments], cornerShading, color.r, color.g, color.b);
          this.height =0;
          //this.offset-=selectHeight;
        }
        this.select = bool;
      },

      hiliteCell: function(bool){
        if(this.hilite === bool)return;
        var color = this.getColor();
        if(bool){
          this.panel.hiliteCell(this.index, selectHeight, this.panel.tDataTable.colorSegments[this.segments], 0.6, color.r, color.g, color.b*.65);
          //this.offset+=selectHeight;
        }else{
          if(this.select)
            //this.panel.hiliteCell(this.index, -selectHeight, this.panel.tDataTable.colorSegments[this.segments], 0.8, color.r*.7, color.g*0.85, color.b*.7);
            this.panel.hiliteCell(this.index, -selectHeight, this.panel.tDataTable.colorSegments[this.segments], 0.8, this.selectColor.r, this.selectColor.g, this.selectColor.b);
          else{
            var cornerShading = this.panel.tDataTable.sheet.cornerShading || 0.65;
            this.panel.hiliteCell(this.index, -selectHeight, this.panel.tDataTable.colorSegments[this.segments], cornerShading, color.r, color.g, color.b);
          }
          //this.offset-=selectHeight;
        }
        this.hilite = bool;
      },
    });

// TCellOutline tracks the current cell as well as the selected range of cells. 
var TCellOutline = TObject.subclass('users.TCellOutline',
  'properties',{
    maxSize: null,
    tops: null,
    bottoms: null,
    top: null,
    bottom: null,
    left: null,
    right: null,
    multiCell: null,
    material: null, 
    cellIndex: null
  },
  'initialize',{
    initialize: function(parent, onComplete, multiCell, maxSize){

      this.maxSize = maxSize || 48;
      if(multiCell === undefined)this.multiCell = false;
      else this.multiCell = multiCell;

      this.setObject3D( new THREE.Group());

      this.material = new THREE.MeshStandardMaterial( 
          {color: 0xffff00, emissive: 0x444444, side: THREE.DoubleSide, opacity: 0.75, transparent: false} );

      if(this.multiCell){
        this.tops = [];
        this.bottoms = [];
        this.top = new THREE.Group();
        this.bottom = new THREE.Group();

        // sides are 20 segments long and each segment has 6 vertices, hence 6*3*20
        var positionsL = new Float32Array(6*3*20);
        var positionsR = new Float32Array(6*3*20);

        for(var i=0, j=0; i<360; i+=18,j++){
          var t=j*-0.05, b=(j+1)*-0.05;

          positionsR[i+1] = positionsL[i+1] = t; // set the y values 
          positionsR[i+4] = positionsL[i+4] = t;
          positionsR[i+7] = positionsL[i+7] = b;
          positionsR[i+10] = positionsL[i+10] = t;
          positionsR[i+13] = positionsL[i+13] = b;
          positionsR[i+16] = positionsL[i+16] = b;

        }

        var geometry = new THREE.BufferGeometry();
        geometry.addAttribute( 'position', new THREE.BufferAttribute( positionsL, 3 ) );
        this.left = new THREE.Mesh(geometry,  this.material);

        var geometry = new THREE.BufferGeometry();
        geometry.addAttribute( 'position', new THREE.BufferAttribute( positionsR, 3 ) );
        this.right = new THREE.Mesh(geometry,  this.material);

        this.object3D.add(this.top);
        this.object3D.add(this.bottom);
        this.top.add(this.left);
        this.top.add(this.right);
      }else{

        var geometry = new THREE.BufferGeometry();

        var positions = new Float32Array(Array(this.maxSize*3).fill(0));
        //var normals = new Float32Array(Array(300*3).fill(0));

        geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
        //geometry.addAttribute( 'normal', new THREE.BufferAttribute( normals, 3 ) );
        this.top = new THREE.Mesh( geometry, this.material );
        this.bottom = new THREE.Mesh(geometry,  this.material);

        geometry = new THREE.BufferGeometry();
        var positions = new Float32Array(18).fill(0);
        geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
        this.left = new THREE.Mesh(geometry,  this.material);

        geometry = new THREE.BufferGeometry();
        var positions = new Float32Array(18).fill(0);
        geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
        this.right = new THREE.Mesh(geometry,  this.material);

        this.object3D.add(this.top);
        this.object3D.add(this.bottom);
        this.object3D.add(this.left);
        this.object3D.add(this.right);
      }

      //this.object3D.renderOrder = 1000;
      this.object3D.name = 'TCellOutline';
      this.object3D.visible = false;
      //this.selectable = false;
      if(parent)parent.addChild(this);
      if(onComplete)onComplete(this);
    },

    setColor: function(color){this.material.color.setHex(color); }, 

    setRange: function(range){
      for(var i=0; i<range.s.c;i++)
      {
        if(this.tops[i]){
          this.tops[i].visible = false;
          this.bottoms[i].visible = false;
        }
      }
      var leftRise, rightRise;
      for(var i=range.s.c; i<=range.e.c; i++){
        var riser = this.parent.getRiser(i);
        if(i===range.s.c)leftRise = riser.rise;
        if(i===range.e.c)rightRise = riser.rise;
        if(this.tops[i]){
          if(this.tops[i].geometry!=riser.geometry){
            this.tops[i].setGeometry(riser.geometry);
            this.bottoms[i].setGeometry(riser.geometry);
          }
          this.tops[i].visible = true;
          this.bottoms[i].visible = true;
        }else{
          this.tops[i]=new THREE.Mesh(riser.geometry,  this.material);
          this.top.add(this.tops[i]);
          this.bottoms[i]=new THREE.Mesh(riser.geometry,  this.material);
          this.bottom.add(this.bottoms[i]);
        }
      }
      for(var i=range.e.c+1; i<this.tops.length; i++){
        if(this.tops[i]){
          this.tops[i].visible = false;
          this.bottoms[i].visible = false;
        }
      }
      this.top.position.y=this.parent.extent2.y-this.parent.cumulativeRows[range.s.r]; 
      this.bottom.position.y = this.parent.extent2.y-this.parent.cumulativeRows[range.e.r+1];
      this.object3D.visible = true;

      var leftPos = this.left.geometry.getAttribute('position');
      var rightPos = this.right.geometry.getAttribute('position');
      var last = rightRise.length-6;
      for(var i=0; i<120; i+=6){ // 20 segments, 6 vertices each

        leftPos.setXYZ(0+i, leftRise[0], leftPos.getY(0+i), leftRise[2]);
        leftPos.setXYZ(1+i, leftRise[3], leftPos.getY(1+i), leftRise[5]);
        leftPos.setXYZ(2+i, leftRise[0], leftPos.getY(2+i), leftRise[2]);

        leftPos.setXYZ(3+i, leftRise[3], leftPos.getY(3+i), leftRise[5]);
        leftPos.setXYZ(4+i, leftRise[0], leftPos.getY(4+i), leftRise[2]);
        leftPos.setXYZ(5+i, leftRise[3], leftPos.getY(5+i), leftRise[5]);

        rightPos.setXYZ(0+i, rightRise[last+0], rightPos.getY(0+i), rightRise[last+2]);
        rightPos.setXYZ(1+i, rightRise[last+3], rightPos.getY(1+i), rightRise[last+5]);
        rightPos.setXYZ(2+i, rightRise[last+0], rightPos.getY(2+i), rightRise[last+2]);

        rightPos.setXYZ(3+i, rightRise[last+3], rightPos.getY(3+i), rightRise[last+5]);
        rightPos.setXYZ(4+i, rightRise[last+0], rightPos.getY(4+i), rightRise[last+2]);
        rightPos.setXYZ(5+i, rightRise[last+3], rightPos.getY(5+i), rightRise[last+5]);
      }
      this.left.geometry.attributes.position.needsUpdate = true;
      this.right.geometry.attributes.position.needsUpdate = true;
      this.left.geometry.computeBoundingSphere();
      this.right.geometry.computeBoundingSphere();
      this.right.scale.y = this.left.scale.y = this.top.position.y-this.bottom.position.y;
      this.object3D.visible = true;
    },

    setCellIndex: function(cellIndex){
      this.cellIndex=cellIndex;

    },

    // this is used to have the system not generate a pointerLeave event
    setOwner: function(owner){
      this.top.userData = owner;
      this.bottom.userData = owner;
      this.left.userData = owner;
      this.right.userData = owner;      
    },

    hasTarget: function(target){
      return(this.top === target ||
        this.bottom === target ||
        this.left === target ||
        this.right === target);
    },

    clear: function(){ // clear all of the object3D
      if(this.multiCell){
        for(var i=0; i < this.tops.length; i++ ){
          if(this.tops[i]){
            this.top.remove(this.tops[i]);
            this.bottom.remove(this.bottoms[i]);
          }
        }
        this.tops = [];
        this.bottoms = [];
      }
      this.object3D.visible = false;
    }

  },
  'events',{
    onPointerEnter: function(pEvt){return true;},
    onPointerOver: function(pEvt){console.log('onPointerOver'); this.visible = true; return true;},// force to stay visible
    onPointerLeave: function(pEvt){return true;},    
    onPointerDown: function(pEvt){console.log('here i am'); if(!this.multiCell)this.parent.doDownCell(this.cellIndex); return true;},
    onPointerMove: function(pEvt){return true;},    
    onPointerUp: function(pEvt){return true;},  
  }
);

export {
  TDataTable
}
