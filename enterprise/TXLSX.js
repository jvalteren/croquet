// Copyright 2018 by arcos and OS.Vision.
// This software is licensed under the Apache 2 open source license
// davidasmith@gmail.com - david@os.vision
// 919-244-4448

/*global XMLHttpRequest, File, FileReader, THREE, JSZip, SSF, DOMParser*/

import { Globals } from "./TObject.js";
import { TWindow } from "./TWindow.js";
import { TVisiCalc } from "./TVisiCalc.js";

// format rules were compiled from the document ECMA-376 , Second Edition, Part 1 and actual XLSX examples
// page numbers refer to the pages in the ECMA-376 document
export function loadXLSXDemo(filePath, onComplete){
	//var file = new File("", filePath);
	var xobj = new XMLHttpRequest();
	  xobj.open("GET", filePath, true);
	  xobj.responseType = "blob";
	  xobj.onload = function(oEvent) {
		var blob = xobj.response;
		var fileOfBlob = new File([blob], filePath);
		console.log(fileOfBlob)
		new TXLSX(Globals.tScene, onComplete, fileOfBlob, -1);
	};

	xobj.send();
}


export var TXLSX = Object.subclass('users.TXLSX',
 	'properties',
 	{
 		fileName: null,
 		xlsx: null, // the original xlsx data set
 		sheets: null, // sheet data used to build and render spreadsheet
 		cellStyles: null, // sheet style values
 		stringData: null, // shared string data used across all sheets
 		test: false, // switch on/off to view process in detail

 	},
 	'initialize',{
	 	initialize: function(tScene, onComplete, file, counter){
	 		console.log(file)
	 		this.fileName = file.name;
		  	var self = this;
		  	this.loadXLSX(file).then(function(result){self.buildXLSX(tScene, onComplete, file.name, result, counter)});
	 	},

		buildXLSX: function(tScene, onComplete, fileName, xlsx, counter){

			this.xlsx  = xlsx;
			if(this.test)console.log('buildXLSX', xlsx, counter);

		  	// grab the shared strings array - these strings are referenced by the cells
		  	this.stringData = [];
		  	var sd = xlsx['xl/sharedStrings.xml'];
		  	if(sd){
		  		sd = sd.getElementsByTagName('si');

		  		console.log('xl/sharedStrings.xml', sd);
			  	if(sd){
			  		for(var i=0, sdlen = sd.length; i< sdlen;i++){
			  			var cNodes = sd[i].getElementsByTagName('t')[0].childNodes;
			  			if(cNodes.length>0)
			  				this.stringData[i]=cNodes[0].nodeValue;
			  		}
			  	}
			}
		  	// grab the styles from the workbook - the format style data will be in the array: this.cellStyles.cellStyles
		  	this.cellStyles = new XLSXStyles(xlsx['xl/styles.xml']);
		  	// grab the sheetNames from the workbook
		 	//console.log('xl/workbook.xml', xlsx['xl/workbook.xml'])
		  	var sheetData = xlsx['xl/workbook.xml'].getElementsByTagName('sheets')[0];
		 	//console.log('sheetData', sheetData);
		  	var sheetNames = sheetData.getElementsByTagName('sheet');
		 	//console.log('sheetNames', sheetNames);

		  	//xlsx['xl/workbook.xml] -> definedNames -> definedName (names of cells and sections of sheets)
		  	//xlsx['xl/workbook.xml] -> workbookPr -> date1904 true means use 1904 base also see dateCompatability
		  	this.sheets = [];
		  	for(var i=0, sheetNamesLen = sheetNames.length; i<sheetNamesLen; i++){
		  		var sheet = xlsx['xl/worksheets/sheet'+(i+1)+'.xml'];
		  		if(sheet)
		  			this.sheets.push(new XLSXSheet(this, fileName, sheetNames[i].getAttribute('name'), sheet));
		  	}

		  	for(var i=0; i<this.sheets.length;i++){
		  		var cols = this.sheets[i].getColWidths(), rows = this.sheets[i].getRowHeights();
		  		if(cols.length>0){
		  			if(this.test)console.log('cols, rows', cols, rows, this.sheets[i]);
  					var ss = new TVisiCalc(null, null, this.sheets[i], true);
  					ss.addBendSlider();
						this.window = new TWindow(Globals.tAvatar, function(tObj){tObj.object3D.position.set(0,(8-i*4)-ss.extent.y/2,-15-i*1.5); },

							fileName+(this.sheets.length>1?'['+i+']':''), 1.5, ss, true ,.75, 1.25);
						//win.shrink();
						this.window.release();
						if(onComplete)onComplete(this);
					}
				}

		  },

		loadXLSX: function (file ) {

			console.log(file)
		   return new Promise( function( resolve, reject ) {

		      var reader = new FileReader();

		      reader.onload = function( e ) {
		        var data = e.target.result;
		        JSZip.loadAsync( data ).then( function( zip ) {
		          var promiseBook = [];
		          zip.forEach( function( relativePath, zipEntry ) {
		          	promiseBook.push( zipEntry.name);
		            promiseBook.push( zipEntry.async( "string" ) );  // [1]
		          } );
		          return Promise.all( promiseBook );
		        } )

		        .then( function( values ) {
		          var parser = new DOMParser();
		          var myBook = [];
		          for(var i=0, valLen = values.length; i<valLen; i+=2){
		          	myBook[values[i]]=parser.parseFromString( values[i+1], "text/xml" );
		          }
		          resolve( myBook );

		        } )

		        .catch( function(e){
		          	console.log( "Error reading " + f.name + " : " + e.message );  // f?
		         })
		      };

		      reader.onerror = function( e ) {
		        reject( new Error( "message" ) );
		      }

		      reader.readAsBinaryString( file );

		    } );
		}
	}
 );

var XLSXStyles = Object.subclass('users.XLSXStyles',
	'properties',{
		cellFormats: null,
		cellFonts: null,
		cellFills: null,
		cellBorders: null,
		numFmt: null,
		test: false
	},
	'initialize',{
		initialize: function(styles){
			if(this.test)console.log('XLSXStyles', styles);
			// default format strings from page 1946
			this.numFmt = [];
			this.numFmt[0 ]= 'General';
			this.numFmt[1 ]= '0';
			this.numFmt[2 ]= '0.00';
			this.numFmt[3 ]= '#,##0';
			this.numFmt[4 ]= '#,##0.00';
			this.numFmt[9 ]= '0%';
			this.numFmt[10]= '0.00%';
			this.numFmt[11]= '0.00E+00';
			this.numFmt[12]= '# ?/?';
			this.numFmt[13]= '# ??/??';
			this.numFmt[14]= 'mm-dd-yy';
			this.numFmt[15]= 'd-mmm-yy';
			this.numFmt[16]= 'd-mmm';
			this.numFmt[17]= 'mmm-yy';
			this.numFmt[18]= 'h:mm AM/PM';
			this.numFmt[19]= 'h:mm:ss AM/PM';
			this.numFmt[20]= 'h:mm';
			this.numFmt[21]= 'h:mm:ss';
			this.numFmt[22]= 'm/d/yy h:mm';
			this.numFmt[37]= '#,##0 ;(#,##0)';
			this.numFmt[38]= '#,##0 ;[Red](#,##0)';
			this.numFmt[39]= '#,##0.00;(#,##0.00)';
			this.numFmt[40]= '#,##0.00;[Red](#,##0.00)';
			this.numFmt[45]= 'mm:ss';
			this.numFmt[46]= '[h]:mm:ss';
			this.numFmt[47]= 'mmss.0';
			this.numFmt[48]= '##0.0E+0';
			this.numFmt[49]= '@';
			// page 1954

			// page 1971 explains the formatting rules for number formats numFmts
			var numFmts = styles.getElementsByTagName('numFmts');
			if(numFmts.length>0){
				numFmts = numFmts[0].getElementsByTagName('numFmt');
				for(var i=0; i< numFmts.length;i++){
					var numFmtId = numFmts[i].getAttribute('numFmtId');
					var formatCode = numFmts[i].getAttribute('formatCode');
					if(formatCode !== null){
						this.numFmt[+numFmtId]=formatCode;
						SSF.load(formatCode, +numFmtId); // add to the parser
					}
				}
			}

			//
			this.cellFonts = [];
			var fonts = styles.getElementsByTagName('fonts')[0].getElementsByTagName('font');
			for(var i=0; i< fonts.length;i++){
				var cellFont = {};
				if(fonts[i].getElementsByTagName('i').length)cellFont.italic=true; // italic
				if(fonts[i].getElementsByTagName('b').length)cellFont.bold=true; // bold
				if(fonts[i].getElementsByTagName('u').length)cellFont.underline=true; // underline
				if(fonts[i].getElementsByTagName('strike').length)cellFont.strike=true; // strike

				var family = fonts[i].getElementsByTagName('family'); // The font family this font belongs to. (pg 1950)
				if(family.length)cellFont.family = family[0].getAttribute('val');
				var familyName = fonts[i].getElementsByTagName('name'); // The font name overrides when there are conflicting values.(pg 1950)
				if(familyName.length)cellFont.familyName = familyName[0].getAttribute('val');
				var color = fonts[i].getElementsByTagName('color'); //
				if(color.length) {
					color = color[0].getAttribute('rgb') // color also has 'theme' attribute.
					if(color)cellFont.color = color.substring(2); // first two characters are alpha
				}
				var size = fonts[i].getElementsByTagName('sz'); // font size
				if(size.length)cellFont.fontSize = size[0].getAttribute('val');
				//var vertAlign = fonts[i].getElementsByTagName('vertAlign'); //
				//vertAlign = vertAlign.length?vertAlign[0].getAttribute('val'):null;
				this.cellFonts.push(cellFont);
				if(this.test)console.log('cellFont', cellFont);
			}

			this.cellFills = [];
			var fills = styles.getElementsByTagName('fills')[0].getElementsByTagName('fill');
			for(var i=0; i<fills.length;i++){
				if(this.test)console.log('fills['+i+']',fills[i])
				var cellFill = {};
				var pattern = fills[i].getElementsByTagName('patternFill')[0];
				if(pattern.getAttribute('patternType') === "solid"){
					var c = pattern.getElementsByTagName('fgColor')[0];
					if(c) c = c.getAttribute('rgb')
					if(c) {
						cellFill.fgColor = c.substring(2); // first two characters are alpha
						cellFill.cellColor = new THREE.Color(+('0x'+cellFill.fgColor));
					}
				}
				if(cellFill.fgColor)this.cellFills[i]=cellFill;
				if(this.test)console.log('cellFill', cellFill);
			}

			this.cellBorders = [];
			var borders = styles.getElementsByTagName('borders')[0].getElementsByTagName('border');
			for(var i=0; i< borders.length; i++){
				var hasBorder = false;
				if(this.test)console.log('borders['+i+']', borders[i]);
				var cellBorder = {};
				var t = borders[i].getElementsByTagName('top')[0]; //.getAttribute('style') .getElementsByTagName('color')
				if(t) t = t.getAttribute('style');
				if(t){cellBorder.top=t; hasBorder = true;}
				var b = borders[i].getElementsByTagName('bottom')[0];
				if(b) b = b.getAttribute('style');
				if(b){cellBorder.bottom=b; hasBorder = true;}
				var l = borders[i].getElementsByTagName('left')[0];
				if(l) l = l.getAttribute('style');
				if(l){cellBorder.left=l; hasBorder = true;}
				var r = borders[i].getElementsByTagName('right')[0];
				if(r) r = r.getAttribute('style');
				if(r){cellBorder.right=r; hasBorder = true;}
				var d = borders[i].getElementsByTagName('diagonal')[0];
				if(d)d = d.getAttribute('style');
				if(d){if(borders[i].getAttribute('diagonalUp')) cellBorder.diagonalUp=d;
				else cellBorder.diagonalDown = d; hasBorder = true;}
				if(hasBorder)this.cellBorders[i] = cellBorder;
				if(this.test)console.log('cellBorder', cellBorder);
			}

			// This element contains the named cell styles, consisting of a sequence of named style records.
			var cellStyles = styles.getElementsByTagName('cellStyles')[0].getElementsByTagName('cellStyle');
			// INCOMPLETE
			for(var i=0; i< cellStyles.length; i++){
				cellStyles[i].getAttribute('name');
				cellStyles[i].getAttribute('builtinId'); //The index of a built-in cell style:
				cellStyles[i].getAttribute('xfId'); // Zero-based index referencing an xf record in the cellStyleXfs collection.
			}

			// This element contains the master formatting records (xf's) which define the formatting for all named cell styles in this workbook.
			var cellStyleXfs = styles.getElementsByTagName('cellStyleXfs')[0].getElementsByTagName('xf');
			// INCOMPLETE
			for(var i=0; i<cellStyles.length; i++){

			}

			// This element contains the master formatting records (xf) which define the formatting applied to cells in this workbook.
			// This appears to be the one to start with
			this.cellFormats = [];
			var cellXfs = styles.getElementsByTagName('cellXfs')[0].getElementsByTagName('xf');
			for(var i=0;i<cellXfs.length; i++){
				var cellFormat = {};

				var xfId = cellXfs[i].getAttribute('xfId');


				//if(cellXfs[i].getAttribute('applyNumberFormat')){ // this only means the value is assigned above. Ignore.
					var numFmtId = cellXfs[i].getAttribute('numFmtId');
					if(this.test)if(numFmtId)console.log('formatString', this.numFmt[+numFmtId]);
					cellFormat.numFormatIndex = +numFmtId;
					cellFormat.numFormat = this.numFmt[+numFmtId];
				//}

				//if(cellXfs[i].getAttribute('applyFont')){  // always store the font info - otherwise, need to look it up
					var fontId = cellXfs[i].getAttribute('fontId');
					cellFormat.font = this.cellFonts[+fontId];
					if(this.test)console.log('cellFont', this.cellFonts[+fontId]);

				//}

				if(cellXfs[i].getAttribute('applyFill')){
					var fillId = cellXfs[i].getAttribute('fillId');
					cellFormat.fill = this.cellFills[+fillId];
					if(this.test)console.log('cellFill', this.cellFills[+fillId]);
				}

				if(cellXfs[i].getAttribute('applyBorder')){
					var borderId = cellXfs[i].getAttribute('borderId');
					var cb = this.cellBorders[+borderId];
					if(cb)cellFormat.border = cb;
					if(this.test)console.log('cellBorder', this.cellBorders[+borderId]);
				}

				if(cellXfs[i].getAttribute('applyAlignment')){
					if(this.test)console.log(cellXfs[i])
					var align = cellXfs[i].getElementsByTagName('alignment')[0];
					if(align){// format lies - just because 'applyAlignment' is true does not mean it is
						var horz = align.getAttribute('horizontal');
						var indent = align.getAttribute('indent');
						var vert = align.getAttribute('vertical');
						var wrap = align.getAttribute('wrapText');
						align = {};
						if(horz)align.horizontal = horz;
						if(vert)align.vertical = vert;
						if(indent)align.indent = indent;
						if(wrap)align.wrapText = wrap;
						cellFormat.align = align;
					}
				}
				this.cellFormats.push(cellFormat);

				if(this.test)console.log('cellFormat', cellFormat);
				if(this.test)console.log('cellXfs', cellXfs[i]);
			};
		},
	}
);

var XLSXSheet = Object.subclass('users.XLSXSheet',
	'properties',{
		fileName: null, // the Excel XLSX file name
		sheetName: null, // the name of the sheet within the XLSX file
		sheet: null, // raw sheet data
		dimension: null, // the default dimension range A1:B2 (probably not accurate)
		range: null, // computed dimension range in {s:{c:, r:}, e:{c:, r:}} form
		defaultRowHeight: null, // default pixel height of row
		defaultColWidth: null, // default character width of column
		rows: null,
		columns: null,
		cellData: null,
		test: false
	},
	'initialize',{
		initialize: function(tXLSX, fileName, sheetName, sheet){
			this.rows = [];
			this.columns = [];
			this.fileName = fileName;
			this.sheetName = sheetName;
			this.sheet = sheet;
			if(this.test)console.log('sheet', sheet);
			this.dimension = sheet.getElementsByTagName('dimension')[0].getAttribute('ref');
			if(this.test)console.log('dimension', this.dimension);
			// note that this is the suggested range for the sheet. This is the range that we need to check, but
			// actual range can be (much) smaller.
			this.range = this.convertA1B2ToRange(this.dimension);
			this.defaultColWidth =  +(sheet.getElementsByTagName('sheetFormatPr')[0].getAttribute('baseColWidth') ||
				sheet.getElementsByTagName('sheetFormatPr')[0].getAttribute('defaultColWidth'))||15;
			this.defaultColWidth *= 6.4;
			this.defaultRowHeight = +sheet.getElementsByTagName('sheetFormatPr')[0].getAttribute('defaultRowHeight');
			// this is the array of column widths. Uses min-max with the width defined. Only applies to non-standard width columns
			var cols = sheet.getElementsByTagName('cols')[0];
			var maxRow = -1;
			var maxCol = -2;
			if(cols){
				cols = cols.getElementsByTagName('col');
				for(var i=0, colLen = cols.length; i< colLen; i++)
				{
					var min = cols[i].getAttribute('min');
					var max = cols[i].getAttribute('max');
					var width = +cols[i].getAttribute('width');
					for(var j = min; j<=max; j++){this.columns[j-1]=7.2*width;} // stupid way to measure width = # of characters. Convert to something reasonable
				}
			}
			// sheet.getElementsByTagName('mergeCells')[0] -> mergeCell
			var sheetData = sheet.getElementsByTagName('sheetData')[0];
			if(this.test)console.log('sheetData', sheetData);

			var rows = sheetData.getElementsByTagName('row');
			for(var i=0, rowLen = rows.length; i<rowLen; i++){
				var r = (+rows[i].getAttribute('r'))-1; // this is the row number
				if(maxRow<r)maxRow = r;
				var spans = rows[i].getAttribute('spans'); // the span across columns startRow:endRow

				var ht = rows[i].getAttribute('ht'); // the height of the row if non-standard
				if(ht)ht = +ht;
				var rowData = {rowNum: r, spans: spans, height: ht, columns: []};
			    // read the cells in the row
				var c =rows[i].getElementsByTagName('c');
				if(this.test)console.log('c', c);
				for(var j=0, cLen = c.length; j<cLen; j++){
					var a1 = c[j].getAttribute('r'); // cell A1 form
					if(this.test)console.log('a1', a1);
					if(!a1)continue; // some files are broken
					var ind = this.a1ToIndex(a1);
					if(maxRow<ind.r)maxRow = ind.r;
					if(maxCol<ind.c)maxCol = ind.c;
					var dataType = c[j].getAttribute('t'); // cell type: b Boolean, n Number, e error, s String, d Date
					if(dataType === 'inlineStr') v = c[j].getElementsByTagName('is'); // rich text inline
					if(dataType === null)dataType = 'n';
					var s = c[j].getAttribute('s'); // the style/theme of the cell
					if(s===null)s=0;
					// there are some bad files out there
					var value = c[j].getElementsByTagName('v');
					if(value.length == 0)continue;
					if(!value[0].childNodes || !value[0].childNodes[0] )continue;
					value = value[0].childNodes[0].nodeValue; // raw value
					var formula = c[j].getElementsByTagName('f')[0]; // cell formula
					var w;

					if(dataType === 's'){w = tXLSX.stringData[+value];} // why the hell is this the ONE place that MS decides to use 0 index?
					else if(dataType === 'n' || dataType === null){
						value = +value;
						//console.log('formatting', s, tXLSX.cellStyles.cellFormats[+s].numFormatIndex, value);
					  w=SSF.format(tXLSX.cellStyles.cellFormats[+s].numFormatIndex, value);
					}
					else w = value;
					var style = tXLSX.cellStyles.cellFormats[+s];

					//console.log(style.font, canvasString)
					//var canvasStyle = style.
					rowData.columns[ind.c] = new TCellXLSX(w, a1, ind, dataType, style, value, formula);

				}
				this.rows[rowData.rowNum]=rowData;
				if(this.test)console.log('rowData', rowData);
			}
			this.range = {s:{c:0,r:0},e:{c:maxCol, r:maxRow}};
			if(this.test)console.log('range', this.range);
		},

		// convert 'A1:B2' into {s{r,c},e{r,c}} object range
		convertA1B2ToRange: function(a1){
			a1 = a1.split(':');
			var s = this.a1ToIndex(a1[0]);
			var e;
			if(a1.length===1)e=s;
			else e = this.a1ToIndex(a1[1]);
			if(s.c>e.c){var x = s.c; s.c = e.c; e.c = x}
			if(s.r>e.r){var x = s.r; s.r = e.r; e.r = x}
			return {s:s, e:e};
		},

		// converts A1 type index value into 0-based c/r pairs
		a1ToIndex: function(a1){
			a1 = (a1.toUpperCase().match(/[a-zA-Z]+|[0-9]+/g));
			return {r: this.XLToIndex(a1[1],10,'1'), c: this.XLToIndex(a1[0],26,'A')}
		},

		// Converts XL ABC or 123 to column/row indices
		// XLToIndex('AB',26, 'A')  >>> 27
		// XLToIndex('123',10,'1')  >>> 122
		XLToIndex: function(s, base, z){
		    var rval = 0;
		    z = z.charCodeAt(0);
		    for(var i=0;i<s.length; i++)rval=rval*base+(1+s.charCodeAt(i)-z);
		    return rval-1;
		}
	},
	'accessing',
	{
		getRowHeights: function(){
			var r = [];
			for(var i=0; i<= this.range.e.r; i++)
				if(this.rows[i] && this.rows[i].height)r.push(this.rows[i].height)
				else r.push(this.defaultRowHeight);
			return r;
		},
		getColWidths: function(){
			var c = [];
			for(var i=0; i<= this.range.e.c; i++)
				if(this.columns[i])c[i] = this.columns[i];
				else c[i] = this.defaultColWidth;
			return c;
		},
		getRange: function(){return {r: this.range.e.r, c: this.range.e.c}},

		getCellString: function(r,c){
			r = this.rows[r];
			if(!r)return '';
			c= r.columns[c];
			if(!c)return'';
			return c.w;
		},

		// getCell(r,c) returns the data associated with this cell
		// cell.w - formatted text if available
		// cell.r - 'A1' cell reference
		// cell.index {c,r} cell address
		// cell.style - format style info
		// cell.style.numFormat - format string for numbers
		// cell.style.font - font name for string
		// cell.style.font.[i,b,c,u,strike]
		// cell.style.font.familyName - font name
		// cell.style.font.color - string color
		// cell.style.font.fontSize - rendered font size
		// cell.style.fill - cell fill (patten and color)
		// cell.style.fill.fgColor cell fill color
		// cell.style.fill.cellColor - THREE.JS color
		// cell.style.border - cell borders
		// cell.style.align - cell alignment
		// cell.value - raw value data
		// cell.formula - the Excel formula for that cell
		// cell.type - cell datatype - b Boolean, n Number, e error, s String, d Date, is Rich Text
		getCell: function(r,c){
			r = this.rows[r];
			if(!r)return null;
			//console.log('format', r.columns[c])
			return r.columns[c];
		}
	}
);

var TCellXLSX = Object.subclass('users.TCellXLSX',
 	'properties',
 	{
		w: null, // formatted text if available
		r: null, // 'A1' cell reference
		index: null, // {c,r} cell address
		style: null, // format style info
		// cell style details:
		// cell.style.numFormat - format string for numbers
		// cell.style.font - font name for string
		// cell.style.font.[i,b,c,u,strike]
		// cell.style.font.familyName - font name
		// cell.style.font.color - string color
		// cell.style.font.fontSize - rendered font size
		// cell.style.fill - cell fill (patten and color)
		// cell.style.fill.fgColor cell fill color
		// cell.style.fill.cellColor - THREE.JS color
		// cell.style.border - cell borders
		// cell.style.align - cell alignment
		canvasString: null, // format string for drawing into the canvas
		value: null, // raw value data
		formula: null, // the Excel formula for that cell
		type: null, // - cell datatype - b Boolean, n Number, e error, s String, d Date, is Rich Text
	},
	'initialization',{
		initialize: function(w, r, index, type, style, value, formula){
			this.w = w;
			this.r=r;
			this.index = index;
			this.type= type;
			this.style = style;
			this.value = value;
			this.formula = formula;

			this.canvasString = this.style.font.bold?'bold ':'';
			this.canvasString = this.canvasString + (this.style.font.italic?'italic ':'');
			this.canvasString = this.canvasString + (this.style.font.fontSize+'px '+ this.style.font.familyName);
		}
	},
	'accessing',{
		getValue: function(){return this.value;},
		getFillColor: function(){return this.style && this.style.fill && this.style.fill.cellColor;},
		doIgnore: function(){return false;}
	},
	'actions',{
		selectCell: function(bool){}, // nothing to do
		drawCell: function(image, rOffsetUV, cOffsetUV, heightUV,  widthUV){
           	var h, v;
            if(this.w){
              var col = this.style.font.color;
              var fontSize = +this.style.font.fontSize;
              if(col) {
                if(col[0]==='0'&&col[2]==='0'&&col[4]==='0')col='FFFFFF';
                image.setFillStyle('#'+col);
              }
              else image.setFillStyle('white');
              image.setFont(this.canvasString);

              var alignH = this.type === 'n'?'right':'left';
              var alignV = null;
              if(this.style.align){
                alignH = this.style.align.horizontal;
                alignV = this.style.align.vertical;
               }
              image.setAlign(alignH);

              if(alignH === 'center')h=cOffsetUV+widthUV/2;
              else if(alignH === 'right')h=cOffsetUV+widthUV-2;
              else h =cOffsetUV+2;

              if(alignV === 'top')v = rOffsetUV+fontSize+2;
              else if(alignV === 'center')v = rOffsetUV+heightUV/2+fontSize/2;
              else v = rOffsetUV+heightUV-4;

              image.setClip(cOffsetUV, rOffsetUV, widthUV, heightUV);
              image.drawText(this.w, h, v);
              image.removeClip();
              if(this.style.border){
                var lineWidth = {thin:1,medium:2,heavy:4, thick:4};
                if(this.style.border.top)image.drawLine(cOffsetUV,rOffsetUV,cOffsetUV+widthUV, rOffsetUV, "white", lineWidth[this.style.border.top]);
                if(this.style.border.bottom)image.drawLine(cOffsetUV,rOffsetUV+heightUV,cOffsetUV+widthUV, rOffsetUV+heightUV, "white", lineWidth[this.style.border.bottom]);
                if(this.style.border.left)image.drawLine(cOffsetUV,rOffsetUV,cOffsetUV, rOffsetUV+heightUV, "white", lineWidth[this.style.border.left]);
                if(this.style.border.right)image.drawLine(cOffsetUV+widthUV,rOffsetUV,cOffsetUV+widthUV, rOffsetUV+heightUV, "white", lineWidth[this.style.border.right]);
                if(this.style.border.diagonalDown)image.drawLine(cOffsetUV,rOffsetUV,cOffsetUV+widthUV, rOffsetUV+heightUV, "white", lineWidth[this.style.border.diagonal]);
                if(this.style.border.diagonalUp)image.drawLine(cOffsetUV,rOffsetUV+heightUV,cOffsetUV+widthUV, rOffsetUV, "white", lineWidth[this.style.border.diagonal]);
              }
            }
          }
	}
);
