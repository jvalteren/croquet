// Copyright 2017 by David A Smith and CEO Vision, Inc. All Rights Reserved.
// davidasmith@gmail.com
// 919-244-4448


// The TMenu object is a kind of spreadsheet. It can have any number of columns and rows
// It generates an array of TMenuItems where each has a name, an action method, an ignore flag, and a cell draw method

// sheet.getColWidths()// array of column widths in pixels
// this.sheet.getRowHeights();// array of row heights in pixels
// this.sheet.defaultColWidth // default column width, this is used to specify bending of cells.
// var cell = this.sheet.getCell(rowIndex,colIndex); // the contents of the sheet, return value may be null
//
// The returned cell object (if it is not null) needs to provide the following:
// doColor = cell.getFillColor() // this method may or may not exist and it may return either null or a THREE.Color object
// cell.drawCell(this.dataImage, rOffsetUV, cOffsetUV, heightUV, widthUV); // this will draw into the cell at the specified location and extent
// The drawCell method may or may not clip. 
// menu cell objects must provide an action() method that is called when there is a pointerUp event
// cell objects may also provide an ignore() method, which is equivalent to the pointer being off of the sheet

/*global THREE*/
import { Globals } from "./TObject.js";
import { TDataTable } from "./TDataTable.js";

var TMenu = Object.subclass('users.TMenu',
	'properties',{
		menuTitle: null,
		menuItems: null, // an array of TMenuItems
		width: null, // the default width of the menu column
		height: null, // the default height of the menu row
		dataTable: null, // the 3D table holding the menu
		defaultColWidth: null, // whatever the default column width might be in pixels
		defaultColor: null,
		hide: null,
		rowHeights: null,
		colWidths: null,
		cornerShading: .85, // this is the value used by the TDataTable for computing the cell corner shading
		//userData: null // the argument passed to the action 
		initMiniTexture: false, // initialize using this main texture. TMenus are small and usually close to the user
		dirty: true
	},
	'initialize',{
		// menuTitle is the first cell
		// hide after selection if hide is true
		// height is the menu item height in pixels
		// width is the menu item width in pixels
		initialize: function(menuTitle, hide, height, width){
			this.menuTitle = menuTitle;
			this.height = height || 32;
			this.width = width || 256; // has to be something...
			this.hide = !(hide === false); // we only don't hide if this is explicitly false
			this.menuItems = []; // actually an array of arrays - this is the rows
			this.menuItems[0] = [new TMenuItem(menuTitle, null, true, this.height, this.width)]; // this is a column in the zeroth row
			this.menuItems[0][0].header = true;
			this.defaultColWidth = this.width/2; // why not...
			this.rowHeights = [this.menuItems[0][0].height];
			this.colWidths = [this.menuItems[0][0].width];
			this.defaultColor = new THREE.Color(0xffffff);
		},
	},
	'accessing',{
		getCell: function(row, column){var r=this.menuItems[row]; return r && r[column]; }, // the row might not exist and the column in that row might not
		addMenuItem: function(menuItem, row, column){
			console.log('addMenuItem', menuItem, row, column)
			// are we replacing a menu item?
			for(let i=1; i< this.menuItems.length; i++){
				let r= this.menuItems[i];
				for(let j = 0; j< r.length; j++){
					if(r[j].isItem(menuItem)){
						row = i;
						column = j;
						console.log("HERE I AM ", row,column)
					}
				}
			}
			row = row!==undefined ? row : this.menuItems.length;
			if(!this.menuItems[row])this.menuItems[row]=[];
			column = column!==undefined ? column : this.menuItems[row].length;
			console.log("PUT ME HERE", row, column)

			this.menuItems[row][column]=menuItem;
			if(this.rowHeights[row]){if(menuItem.height>this.rowHeights[row])this.rowHeights[row] = menuItem.height;}
			else this.rowHeights[row] = menuItem.height;
			if(this.colWidths[column]){if(menuItem.width>this.colWidths[column])this.colWidths[column] = menuItem.width;}
			else this.colWidths[column] = menuItem.width;
			menuItem.menu = this;
			this.dirty = true; // need to rebuild the TDataTable
			return 
		},
		// add a generic menu item. action is a function that is executed when the item is selected.
		addItem: function(title, action, ignore, height, width, color){
			var item = new TMenuItem(title, action, ignore, height, width, color);
			this.addMenuItem(item);
			return item;
		},
		// add a window or a pedestal object to the menu. It could use the window title I suppose...
		// The action method will place the window in front of the user when this is selected.
		addWindow: function(title, tWindow){
			var item = this.addItem(title, 
				function(cell){
					var win = cell.userData;
					Globals.tAvatar.addChild(win); 
					win.object3D.visible = true;
		          	win.object3D.position.set(0, 0, -win.extent.y);
		          	win.object3D.quaternion.set(0,0,0,1);
		          	win.release();
			});
			item.userData = tWindow;
		},
		getColWidths: function(){return this.colWidths;},
		getRowHeights: function(){return this.rowHeights;},
		//doHide: function(dataTable){if(this.hide)dataTable.doHide(); },
		//doShow: function(dataTable){if(this.hide)dataTable.doShow(); },
		visible: function(){return this.dataTable && this.dataTable.object3D.visible;},
		doHide: function(){if(this.dataTable)this.dataTable.object3D.visible = false; },
		doShow: function(parent, onComplete){

			if(this.dirty){this.removeSelf();}
			if(!this.dataTable){this.dataTable = new TDataTable(parent, onComplete, this, false); this.dataTable.object3D.name = 'TMenu';}
			else { parent.addChild(this.dataTable); if(onComplete)onComplete(this.dataTable); this.dataTable.object3D.visible = true;}
			this.dirty = false;
      		return this.dataTable;
		},
		removeSelf: function(){
			if(this.dataTable!==null){
				this.dataTable.removeSelf();
				this.dataTable.destroySelf(); 
				this.dataTable = null;
			}

		},
		testMenu: function(parent, onComplete){
			var menu = new TMenu('Demonstration Menu');
			menu.addItem('First Menu Item', function(){console.log('First Menu Item selected')});
			menu.addItem('Second Menu Item', function(){console.log('Second Menu Item selected')});
			menu.addItem('Third Menu Item', function(){console.log('Third Menu Item selected')});
			menu.addItem(null, function(){console.log('Should never get here')});
			menu.addItem('Fourth Menu Item', function(){console.log('Fourth Menu Item selected')});
			menu.addItem('Fifth Menu Item', function(){console.log('Fifth Menu Item selected')}, true); // ignore this menu item
			menu.addItem('Sixth Menu Item', function(){console.log('Sixth Menu Item selected')});

			var dataTable= new TDataTable(parent, onComplete, menu, false);
			console.log(dataTable);
			return dataTable;
		}
	}
);

var TMenuItem = Object.subclass('users.TMenuItem',
	'properties',{
		menu: null, // the owning TMenu
		title: null, // the title string of the menu item - if null, then it is a break
		header: null, // is this the header item? Set by the owning TMenu
		action: null, // what happens if you select an item
		ignore: null, // is this item ignored?
		width: null, // the width of this item
		height: null, // the hight of this item
		color: null, // the canvas render color-default is "white" - clear if no title, can also us #000000 where #RRGGBB
		fillColor: null, // the THREE.Color 3D mesh fill color - black if no title
		fontString: null, // string for text format (size, font, etc)
		userData: null // this is passed to the action items
	},
	'initialize',{
		initialize: function(title, action, ignore, height, width, color){
			this.title = title;
			this.action = action;
			this.ignore = ignore===true; // it must be explicitly set to be true, otherwise we ignore the ignore
			this.width = width || 128;
			this.height = height || (title?32:4); // if no title, then just a break
			this.color = color || (title?'white':null); // if no title, then no color
			this.fillColor = title?new THREE.Color(0xffffff):new THREE.Color(0x000000);
			this.setFont('Helvetica', 20);
		},

		setFont: function(fontFamily, fontSize, bold, italic){
			this.fontString = bold?'bold ':'';
			this.fontString = this.fontString + (italic?'italic ':'');
			this.fontString = this.fontString + fontSize+'px '+ fontFamily;
		},
		// not that this is row/column in keeping with the TDataTable model
		// the actual fillRect is x,y so flip these
		drawCell: function(dataImage, rowLoc, columnLoc, cellHeight, cellWidth){

			if(this.title){
				if(this.header){
					dataImage.setFont(this.fontString);
					dataImage.setFillStyle(Globals.standardColor.getStyle());
					//dataImage.setFillStyle('rgb(255, 0, 0)');
					dataImage.fillRect(columnLoc, rowLoc, cellWidth, cellHeight);
					dataImage.setFillStyle('white');
					dataImage.drawText(this.title, columnLoc + 10, rowLoc + cellHeight - 8);					
				}else{
					dataImage.setFont(this.fontString);
					dataImage.setFillStyle(this.color);
					dataImage.fillRect(columnLoc, rowLoc, cellWidth, cellHeight);
					dataImage.setFillStyle(this.ignore?'gray': Globals.standardColor.getStyle());
					dataImage.drawText(this.title, columnLoc + 10, rowLoc + cellHeight - 8);
				}
			}
			else dataImage.clearRect(columnLoc, rowLoc, cellWidth, cellHeight);
		},
	},
	'accessing',{
		getValue: function(){return null;},
		doIgnore: function(){return this.ignore;},
		getFillColor: function(){return this.fillColor;},
		isItem: function(item){return this.title!==null && this.title === item.title}
	},
	'action',{
		selectCell: function(bool){}, // nothing to do
		doAction: function(item, bool){if(this.action && bool) this.action(item); this.menu.doHide(); }
	}
)

export {
  TMenu
}
