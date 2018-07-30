// Copyright 2017 by David A Smith and CEO Vision, Inc. All Rights Reserved.
// davidasmith@gmail.com
// 919-244-4448

/*global THREE*/
import { TDataTable } from "./TDataTable.js";
import { Globals, TObject } from "./TObject.js";
import { TSlider, TCube } from "./TObjects.js";


var TVisiCalc = TDataTable.subclass('users.TVisiCalc',
	'properties', {
		crossTools: null,
		rowTrack: null,
		rowPivot: null,
		trackX: null,
		trackY: null,
		columnTrack: null, 
		columnObject3D: null,
		rowObject3D: null,
		crossToolOffset: 0.5,
		columnOffset: 0.5,
		rowOffset: 0.45,
		A1ColumnTable: null,
		A1RowTable: null,
		initMiniTexture: true // initialize using this mini texture. This make the load faster
	},
	'initialize',{
		initialize: function($super, parent, onComplete, sheet, multiSelect, pixelScale, maxPanelSize){
			$super(parent, onComplete, sheet, multiSelect, pixelScale, maxPanelSize);
			this.setupTools();
		},
		setupTools: function(){
			Globals.executeArray.push(()=>{
			var self = this;
			var extent = this.extent;
			// columnTrack is a horizontal row that helps us track which column we are looking at
			this.columnTrack = new TObject(this,function(tObj){tObj.object3D.position.z=self.columnOffset;});
			this.columnPanels = this.initTracker(this.columnTrack, this.columnPanels);
			var A1Columns = new TA1(this, 20, 0, new THREE.Color(1,1,1));
			this.A1ColumnTable = new TDataTable(this.columnTrack, function(tObj){tObj.object3D.position.y=(extent.y+tObj.extent.y)/2;}, A1Columns);
			A1Columns.myDataTable = this.A1ColumnTable;
			var self = this;
			this.columnObject3D = this.columnPanels.map(
				function(panel){
					panel.getRayTestArray = function(){return self.columnObject3D}; // patch this check into this panel or it gets ignored
					//panel.object3D.position.y = 0;
					return panel.object3D;
				});

			// rowTrack is a vertical column that helps us track which row we are looking at
			this.trackX = 0; 
			this.trackY = 0;
			this.rowPivot = new TObject(this,function(tObj){tObj.object3D.position.z=self.rowOffset;})
			this.rowTrack = new TObject(this.rowPivot);
			var A1Rows = new TA1(this, 0, 64, new THREE.Color(1,1,1));
			this.A1RowTable = new TDataTable(this.rowPivot, function(tObj){tObj.object3D.position.x = -(extent.x+tObj.extent.x)/2}, A1Rows);
			A1Rows.myDataTable = this.A1RowTable;
			this.rowPanels = this.initTracker(this.rowTrack, this.rowPanels);
			this.rowObject3D = this.rowPanels.map(
				function(panel){
					panel.getRayTestArray = function(){return self.rowObject3D}; 
					//panel.object3D.position.x = 0;
					return panel.object3D;
				});

			this.crossTools = new TObject(this.A1RowTable,function(tObj){tObj.object3D.position.y=extent.y/2;});
			new TCube(this.crossTools, null, 0.5,0.5,0.5);
			new TSlider(this.crossTools, 
          function(tObj){tObj.object3D.position.set(-1.1,-5.5,0); tObj.object3D.setRotationFromEuler( new THREE.Euler(0,0,Math.PI/2));}, 
          function(val){self.scaleChart(val);},
          10, 1, 0);   
			//console.log(this)
		});
	},
		// initTracker copies the first row or column of the TDataTable so it can be added to the crosstools
		initTracker: function(parent, panelList){

			return panelList.map(function(panel){
		      	// very evil. The result uses the panel as its prototype. Need to copy all of the parts that can get changed, 
		      	// or you modify the original.
		      	var p = Object.create(panel); 
		      	var material = new THREE.MeshPhongMaterial( {
			        color: 0xffffff, emissive: 0x111111,transparent:false,
			        side: THREE.DoubleSide , vertexColors: THREE.VertexColors
			      } );
			      material.map = panel.dataImage.getTexture();
		        p.setObject3D(new THREE.Mesh(panel.object3D.geometry, material)); // note that we keep the original geometry. This means selections are also mirrored.

		        p.object3D.position.copy(panel.object3D.position);
		        p.parent = null;
		        parent.addChild(p);
		        p.computeCenter();
		        return p;
     	 	});
		},

		// when the TDataTable is "bent" we also need to bend the crosstool objects.
		extraBends: function(radius, offsetZ,rotation){
			var scaleR, scaleC;
			this.A1ColumnTable.bendTable(rotation);
			if(radius>0){
				var theta = this.trackX/radius;
				scaleC = (radius-this.columnOffset)/radius;
				scaleR = (radius-this.rowOffset)/radius;
				this.rowPivot.object3D.position.set(0,0,radius-offsetZ);
				this.rowTrack.object3D.position.set(0,0,offsetZ-radius);
				// The following is a bit tricky, but you should have learned it in first year physics...
				// the A1RowTable is just to the left of the rowTrack, so we need to move it into place
				// we first compute the sin and cos of that transform using the fact that 
				// sin(theta) ~ theta
				// for small angles. We are actually going to use it here in both forms - as the angle sTheta and as the sin sTheta.
				var a1z = radius-offsetZ; // this is z offset of the A1RowTable
				var sTheta = -(this.A1RowTable.extent.x/2)/radius; // compute sin(theta) from small theta (almost the same)
				var cTheta = Math.sqrt(1-sTheta*sTheta); // compute the cos
				var x = -Math.sqrt(radius*radius-a1z*a1z); // compute knowing the radius and the z distance.
				var z = -a1z; // starting z
				this.A1RowTable.object3D.position.set(x*cTheta-z*sTheta, 0, z*cTheta+x*sTheta); // rotate the position into the proper place
				// now rotate the A1RowTable around its own center. Here we use sTheta as the actual angle instead of the sin of the angle
				this.A1RowTable.object3D.setRotationFromEuler( new THREE.Euler(0,sTheta+rotation * Math.PI,0)); 
				//this.crossTools.object3D.position.set(0,0, offsetZ-radius);
				this.rowPivot.object3D.setRotationFromEuler ( new THREE.Euler(0,-theta,0) );		
				this.columnTrack.object3D.position.z = this.columnOffset*(3-offsetZ/radius)- 2*(radius-radius*scaleC); 
	
			}else {
				this.rowPivot.object3D.position.set(this.trackX,0,this.rowOffset);
				this.rowTrack.object3D.position.set(0,0,0);
				this.A1RowTable.object3D.position.set(-(this.extent.x+this.A1RowTable.extent.x)/2, 0, 0); // = -(this.extent.x+tObj.this.A1RowTable.extent.x)/2;
				this.A1RowTable.object3D.setRotationFromEuler( new THREE.Euler(0,0,0));

				//this.crossTools.object3D.position.set(0,this.trackY, 0);
				this.rowPivot.object3D.setRotationFromEuler ( new THREE.Euler(0,0,0) );
				this.columnTrack.object3D.position.z = this.columnOffset;			
				scaleR = scaleC = 1;
			}
			this.columnTrack.object3D.scale.set(scaleC, 1, scaleC);
			this.rowPivot.object3D.scale.set(scaleR, 1, scaleR);
			//this.crossTools.object3D.scale.set(scale, scale, scale);
		}

	},
	'events',{
		doDownCell: function(cellIndex){ // this is a copy of the TDataTable function. Must be a cleaner way to do this...
	      this.doLeaveCell(); // clear the overCell
	      var newCell = this.cellData[cellIndex.r][cellIndex.c];
	      if(newCell.cell && newCell.cell.doIgnore())return true; // ignore this cell
	      this.endCell = this.startCell = cellIndex;
	      var range = {s:this.startCell, e:this.startCell};
	      this.selectionOutline.setRange(range);
	      this.switchCells(range);
	      this.updateTracker(cellIndex);
	      return true;
	    },

    updateTracker: function(cellIndex){
    	if(this.rowPivot === null || this.columnTrack === null || this.crossTools === null)return;
    	if(cellIndex.c>0){
    		var c = Math.max(0, cellIndex.c-2); 
    		this.trackX = this.cumulativeColumns[c];
    		if(this.radius>0){
	    		var theta = this.trackX/this.radius;
					this.rowPivot.goTo(null, new THREE.Quaternion().setFromEuler(new THREE.Euler(0,-theta,0)));		
    		}else
    			this.rowPivot.goTo(new THREE.Vector3(this.trackX, 0, this.rowOffset));
    			//this.rowPivot.goTo(new THREE.Vector3(this.trackX, 0, 0));
    	}
    	if(cellIndex.r>0){
    		var r = Math.max(0, cellIndex.r-4); // our base position is this.extent2.y, so it is this.extent2.y-this.cumulativeRows[r]
    		this.trackY = -this.cumulativeRows[r];
    		this.columnTrack.goTo(new THREE.Vector3(0, this.trackY, this.columnTrack.object3D.position.z));
    		this.crossTools.goTo(new THREE.Vector3(0, this.extent.y/2+this.trackY, 0));
			}
    	}
	}
);

// users.TA1Rows and users.TA1Columns are used to generate the A1 type rows and columns for the TVisiCalc spreadsheets
var TA1 = Object.subclass('users.TA1',
	'properties',{
		dataTable: null, // the source dataTable
		defaultColWidth: null, // in pixels
		defaultRowHeight: null,
		defaultColor: null,
		rowHeights: null,
		colWidths: null,
		cornerShading: .85,
		fontString: "normal 12px Arial",
		fontSize: 12,
		isA: null
	},
	'initializaton',{
		initialize: function(dataTable, rowHeight, colWidth, color){
			this.dataTable = dataTable;
			this.defaultColWidth = colWidth; // means you track the rows
			this.defaultRowHeight = rowHeight; // means you track the columns
			this.defaultColor = color;
			this.isA = rowHeight>0?true:false; // for now, this means we are doing the horizontal bar 
		},
		getColWidths: function(){return this.defaultColWidth?[this.defaultColWidth]:this.dataTable.sheet.getColWidths();}, 
		getRowHeights: function(){return this.defaultRowHeight?[this.defaultRowHeight]:this.dataTable.sheet.getRowHeights()},
		getCell: function(rowIndex, colIndex){return new TA1Cell(this, this.dataTable, rowIndex, colIndex, this.isA);},
	}
);

var TA1Cell = Object.subclass('users.TA1Cell',
	'properties',{
		dataTable: null, // send action events here
		sheet: null, // this is the TA1Rows object
		row: null, // which row am I?
		column: null, // column
		isA: null // is this a numeric or alpha field - isA means alpha
	},
	'initialize',{
		initialize: function(sheet, dataTable, row, column, isA){
			this.sheet = sheet;
			this.dataTable = dataTable;
			this.row = row;
			this.column = column;
			this.isA = isA;
		},
		//render the row number
		drawCell: function(image, rOffsetUV, cOffsetUV, heightUV, widthUV){
  		image.setFont(this.sheet.fontString);
			image.setFillStyle('white');
			image.fillRect(cOffsetUV, rOffsetUV, widthUV, heightUV);
			image.setAlign("center");
			var h = cOffsetUV+widthUV/2;
			var v = rOffsetUV+heightUV/2+this.sheet.fontSize/2 - 2;
			image.setFillStyle('green');
			function encode_col(col) { var s=""; for(++col; col; col=Math.floor((col-1)/26)) s = String.fromCharCode(((col-1)%26) + 65) + s; return s; }
			var str = this.isA? encode_col(this.column):""+(this.row+1)
			image.drawText(str, h, v);					
		}
	},
	'actions',{
		doIgnore: function(){return false;},
		getValue: function(){return null;},
		selectCell: function(bool){
			var range = this.sheet.myDataTable.cellRange; 
			if(this.isA)range = {s:{r:0, c:range.s.c}, e:{r:Infinity, c:range.e.c}};
			else range = {s:{r:range.s.r, c:0}, e:{r:range.e.r, c:Infinity}};
			this.dataTable.switchCells(range);
			this.dataTable.selectionOutline.setRange(range);
		},
		doAction: function(theCell, bool){this.sheet.myDataTable.selectCells(false); this.sheet.myDataTable.selectionOutline.clear(); }
	}
);

export {
  TVisiCalc
}
