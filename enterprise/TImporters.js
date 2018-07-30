// Copyright 2017 by David A Smith and CEO Vision, Inc. All Rights Reserved.
// davidasmith@gmail.com
// 919-244-4448

/*global THREE,FileReader,XMLHttpRequest*/
import { TXLSX } from "./TXLSX.js";
import { Globals } from "./TObject.js";
import { TRectangle } from "./TObjects.js";
import { TWindow } from "./TWindow.js";

// All drag and drop files are imported here. This needs to be extensible... someday.

var Counter = Object.subclass("Counter",
"properties", {
  count: 0
},
"methods", {
  initialize: function() {
    this.count = 0;
  },
  add: function() {
    this.count++;
  },
  reset: function() {
    this.count = 0;
  }
});

var TImporter = Object.subclass('users.TImporter',
 	"properties",{
 		windows:null,
 		files: null,
 		counter: new Counter() //tracks the number of files that have been loaded
 	},
 	"import",
 	{
 		initialize: function(tScene, files){
			for (var i=0, file; file=files[i]; i++) {
				this.import(tScene, file);
			}
 		},
 		import: function(tScene, file){
		 	var fileExtensionTest = /\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/
		    var fileType = file.name.match(fileExtensionTest);
		    console.log(fileType[0]);
		    console.log("counter = ", this.counter.count)
		 	switch(fileType[0].toLowerCase()){
			 	case ".png": 
			 	case ".jpg": 
			 	case ".jpeg": 
			 	case ".bmp": 
			 	case ".gif":  this.importTexture(tScene, file, this.counter.count); break;
			 	case ".xls":  Globals.alert("XLS not supported! Use XLSX", 5000); break;
			 	case ".csv":  Globals.alert("CSV not supported! Use XLSX", 5000); break;
			 	case ".xlsx": 
			 								var count = this.counter.count;
			 								Globals.executeArray.push(function(){Globals.alert(file.name+ ' is loading', 5000)}); 
			 								setTimeout(()=>{
			 									Globals.executeArray.push(()=>{new TXLSX(Globals.tScene, null, file, count);}); 
			 								}, 1000);
			 								break;
			 	case ".svg": 
			 								break;
			 	case ".dae": 
			 	case ".fbx": 
			 	case ".obj": 
			 	case ".mtl": 
			 	case ".stl": 
			 		break;
			 	case ".mp4":
			 	default: Globals.alert(fileType[0].toLowerCase() + ' files not supported.', 5000);
		 	}
		  	this.counter.add();
		}
	},
	"importers",{
		importTexture: function(tScene, file, count){
			var reader = new FileReader();
			reader.onload = function(event) {
				//console.log(event.target.result);
				var textureLoader = new THREE.TextureLoader();
				var txtr = textureLoader.load(event.target.result,
					function(texture) {
						var rect = new TRectangle(null, null, 25, 25*texture.image.height/texture.image.width, 20, 20);
						rect.object3D.material.map = texture;
						var win = new TWindow(tScene.tAvatar, function(tObj){tObj.object3D.position.set(0,(10-count*4)-rect.extent.y/2,-10-count*1.5)}, file.name, 1, rect, true);
						//win.shrink();
						win.release();
		         	},
		       // Function called when download progresses
		        function ( xhr ) {
		          console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
		        },
		        // Function called when download errors
		        function ( xhr ) {
		          console.log( 'An error happened' );
		        });

			};
			reader.readAsDataURL(file);
		},

	  importXLSX: function(tScene, file, counter){
	  	console.log(file);
	  	new TXLSX(tScene, file, counter);
	  }
    }
);


function loadHTTP(filename, callback) {   
  return new Promise(function(resolve, reject) {
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', filename, true); 
    xobj.onreadystatechange = function () {
      if (xobj.readyState == 4 && xobj.status == "200") {
        // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
        resolve(callback(xobj.responseText));
      }
    };
    xobj.send(null);  
  }); 
}

export { TImporter, loadHTTP }
