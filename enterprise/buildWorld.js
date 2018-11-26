// Copyright 2018 by arcos and OS.Vision.
// This software is licensed under the Apache 2 open source license
// davidasmith@gmail.com - david@os.vision
// 919-244-4448

// Initializing the world - this is used for testing at present. Most of the contents of the world will be
// dynamically created by the user and saved and reloaded. When the system is totally operational, the user
// may have a blank world possibly including some sort of splash screen image.
// This should be a JSON file at some point

/*global THREE,THREEx,Stats,NoSleep*/

import { loadXLSXDemo } from "./TXLSX.js";
import { TGrid } from "./TGrid.js";
import { Globals, TLight, TAvatar, TScene } from "./TObject.js";
import { TWindow, TTextLabel, TPedestal } from "./TWindow.js";
import { TLazySusan, TSlider, TRectangle } from "./TObjects.js";
import { TUSA, TCompass, TEarth } from "./TEarth.js";
import { TSpreadsheet } from "./TSpreadsheet.js";
import { TSlideShow } from "./TSlideShow.js";
import { TSystemButtons } from "./TSystemButtons.js";
import { TMenu } from "./TMenu.js";
import { TProgressBar } from "./TProgressBar.js";
import { TIndia } from "./TIndia.js";
import { TextEditRect } from "./TText.js";
import { TBottleChart } from "./TBottleChart.js";
import { TDaydreamController } from "./TPointer.js";
import { buildBottleChart } from "./loadJSON.js";
import { TButton } from "./TButtons.js";
import { mobileCheck } from "./OnMobile.js";
import { TSystemBrowser } from "./TSystemBrowser.js";
import { TDataTable } from "./TDataTable.js";
import "./TChartWall.js";
import { ShadamaDisplay } from "./Shadama.js";
import { TSmalltalk78 } from "./TSmalltalk78.js";


var World = Object.subclass('World',
  'initialize',{
    initialize: function (onComplete){
      // this is a missing function for THREE.js class Object3D.
      THREE.Object3D.prototype.setMatrix = function ( matrix ) {
          this.matrix = matrix;
          this.matrix.decompose( this.position, this.quaternion, this.scale );
        };

      Globals.renderer.setClearColor(0x002244);
      Globals.controls = Globals.controls;
      Globals.tScene = new TScene(Globals.scene, Globals.camera, Globals.renderer, true);
      Globals.tAvatar = new TAvatar(Globals.tScene, null, Globals.camera);
      // The tAvatar and TScene have cross references to each other, so I need to add this bit
      Globals.tScene.tAvatar = Globals.tAvatar;
      Globals.tScene.pointerEvent.tAvatar=Globals.tAvatar;
      this.setupLight();
      this.buildCEOWorld();
      Globals.stats = new Stats();
      document.body.appendChild( Globals.stats.dom );

      // For high end VR devices like Vive and Oculus, take into account the stage
      // parameters provided.
      if(onComplete)onComplete();
    }

  },
  'accessing',{
    find: function(matchFn) { return Globals.tScene.find(matchFn, 0); }
  },
  'stage',{
    setupLight:function(){
      var object3d  = new THREE.AmbientLight(0x999999);
      object3d.name = 'Ambient light';
      new TLight(Globals.tScene, null, object3d);

      var object3d  = new THREE.DirectionalLight('white', 0.225);
      object3d.position.set(-200.6,100,300);
      object3d.name = 'Back light';
      new TLight(Globals.tScene, null, object3d);

      var object3d  = new THREE.DirectionalLight('white', 0.35);
      object3d.position.set(500, -500, 500);
      object3d.name   = 'Key light';
      new TLight(Globals.tScene, null, object3d);

      var object3d  = new THREE.PointLight('white', 0.2);
      object3d.castShadow = true;
      object3d.position.set(-20, 6, 100);
      object3d.name = 'Fill light';
      new TLight(Globals.tScene, null, object3d);
    },
  },
  'debugging',{
    printScene: function() {
      return lively.lang.string.printTree(
        Globals.scene,
        n => `${n.userData.constructor.name} type: ${n.type}${n.name? ` name: ${n.name}` : ""}`,
        n => n.children);
    }
  },
  'update',{
    update: function(timeStamp){
       Globals.tScene.doUpdate(timeStamp, Globals.tScene);
    }
  },
  'worlds',{

    buildCEOWorld: function(){
      var self = this;
      var chart;

      Globals.tScene.addSystemButtons(new TSystemButtons(null, function(tObj){tObj.object3D.position.z = -4;}));

      new Promise(
        function(resolve){
          var slides = new TSlideShow(Globals.tScene);
          if(Globals.urlOptions.daviddemo)
            slides.buildVRTO(1, function(tObj){
              tObj.object3D.position.set(0,10-(25*tObj.extent.y/tObj.extent.x)/2,-14);
              Globals.helpRect = slides;
              Globals.progressBar = new TProgressBar(Globals.helpRect, function(tObj){tObj.object3D.position.set(0,0,0.5); tObj.object3D.rotation.z= -Math.PI/2;},
                0.5, 20, 0x22ff66, 0xff6622, 0);
               resolve(true);
            });
          else
            slides.buildOnboard(1, function(tObj){
              tObj.object3D.position.set(0,10-(25*tObj.extent.y/tObj.extent.x)/2,-14);
              Globals.helpRect = slides;
              Globals.progressBar = new TProgressBar(Globals.helpRect, function(tObj){tObj.object3D.position.set(0,0,0.5); tObj.object3D.rotation.z= -Math.PI/2;},
                0.5, 20, 0x22ff66, 0xff6622, 0);
               resolve(true);
            });
          /*new THREE.TextureLoader().load(Globals.imagePath+'UI-Info.jpg',
            function(texture){
              Globals.helpRect = new users.TRectangle(Globals.tScene, function(tObj){
                  tObj.object3D.position.set(0,10-(25*texture.image.height/texture.image.width)/2,-12);
                  tObj.object3D.material = new THREE.MeshBasicMaterial({map: texture});
                  //resolve(true)
                }, 25, 25*texture.image.height/texture.image.width, 20, 20);
              Globals.helpRect.selectable = false;
              Globals.progressBar = new TProgressBar(Globals.helpRect, function(tObj){tObj.object3D.position.set(4,4.75,0.5); tObj.object3D.rotation.z= -Math.PI/2;},
                0.5, 12, 0x22ff66, 0xff6622, 0);
              */

           // })
        }).then(function() {

      Globals.executeArray.push(
      function(val) {
        Globals.progressBar.setPercent(16);
        if (!(Globals.urlOptions.compass===false)) new TCompass(Globals.tScene, null, 500, 50);
        //new users.TPlanets(Globals.tScene, null, 500);
        return true;
      },function(val) { // Text Editor
        Globals.progressBar.setPercent(24);
        self.buildTextEditor();
        return true;
      },function(val) { // Controller
        Globals.progressBar.setPercent(80);
        return self.setupController();
      },function(val){ // Move help into a window
        Globals.progressBar.setPercent(88);
        var mw = new THREE.Matrix4();
        mw.copy(Globals.helpRect.object3D.matrixWorld);
        Globals.helpWin = new TWindow(Globals.tAvatar, function(tObj){tObj.object3D.position.set(0,10-Globals.helpRect.extent.y/2,-20)},
          "User Interface", 1, Globals.helpRect, true);
        Globals.helpWin.object3D.updateMatrixWorld(true);
        var mat = new THREE.Matrix4();
        mat.getInverse(Globals.helpWin.object3D.matrixWorld); // mat gets the inverse of the camera transform
        Globals.helpRect.object3D.setMatrix(mat.multiply(mw));
        Globals.helpWin.release();
      },function(val){ // Move rect into a window
        Globals.progressBar.setPercent(100);
        setTimeout(function(){
          Globals.tGrid = new TGrid(Globals.tScene, function(tObj){tObj.object3D.position.y=-150; }, 1000, 50, Globals.standardColor.getHex(), Globals.secondaryColor.getHex(), 4);

          if (Globals.urlOptions.quickstart) {
              Globals.helpWin.removeSelf();
          } else {
              Globals.helpRect.goTo(new THREE.Vector3(0,0,0), null, null, 60);
          }
          Globals.tScene.setupEvents(Globals.renderer.domElement);
          Globals.progressBar.removeSelf();
          Globals.isReady = true;
          //self.setupMobile();
          }, 1000);
        return true;
      });
    });
    return;
  },

  demoMenu() {
    if(Globals.systemMenu)return Globals.systemMenu;

    let menu = new TMenu('Demo Menu');
    menu.addItem(null, null); // break in menu
    //Globals.tScene.addSystemMenu(Globals.systemMenu);

    menu.addItem('Districts of India', () => {

      var tWindow = new TWindow(
      null,
        tObj => tObj.object3D.position.set(10, 0, -25),
        'Districts of India',
        1,
        new TIndia(null, null, 25),
        true
      );
      tWindow.display();
      menu.addWindow('Districts of India', tWindow);
    });


    menu.addItem('USA Terrain', () => {
      var tWindow = new TWindow(null, null, 'USA Terrain', 1.5, new TUSA(null, null));
      tWindow.display();
      menu.addWindow('USA Terrain', tWindow);
    })

    menu.addItem('The Earth', () => {
      // Allows the user to spin or move the attached object
      var lazy = new TLazySusan(null, null),
      // A globe of the Earth - plan to use this for charting as well
          earth = new TEarth(lazy, null, 16),
          tWindow = new TWindow(null, null, 'The Earth', 1, lazy, true, 4, 4);
      tWindow.display();
      menu.addWindow('The Earth', tWindow);
    });


    menu.addItem('State of the World', async () => {
      let chart = await this.buildWorldChart(),
          pedestal = new TPedestal(null, null,1, new TBottleChart(null, null, chart.bottles, chart.minYear, chart.maxYear,'income (log10)', 'life expectancy'));
      // FIXME
      // pedestal.display();
      Globals.tAvatar.addChild(pedestal);
      pedestal.object3D.visible = true;
      pedestal.object3D.position.set(0, 0, -pedestal.extent.y);
      pedestal.object3D.quaternion.set(0,0,0,1);
      pedestal.release();
      menu.addWindow('State of the World', pedestal);
    });

    menu.addItem('Super Spreadsheet', () => {
      var sheet = new TSpreadsheet(null, null, null, 128,1024,1, .25, false),
      tWindow = new TWindow(null, null, 'Super Spreadsheet', 2, sheet, true);
      tWindow.display();
      menu.addWindow('Super Spreadsheet', tWindow);
    });

    menu.addItem('Chart Wall', () => {
        // Chart Wall
        let controlObjects = [], baseLoc = [ 0, -29, -40 ], buttonRadius = mobileCheck() ? 3 : 1;

        let loadMsg = new TTextLabel(null, null, "Loading chart wall...", 16, 1, 48);
        loadMsg.object3D.position.set(0, 0, -10);
        Globals.tScene.addChild(loadMsg);

        let chartWall;

        setTimeout(()=>{
        chartWall = new users.TChartWall(()=>{
            setUpControls();
            loadMsg.removeSelf();
            chartWall.awaken();
            });
        Globals.chartWall = chartWall; // FOR DEBUG

        function setUpControls() {
            let wallController = new TSlider(null, null, function(v){
                let n = Math.round(1+(chartWall.maxWallCharts-1)*v);
                chartWall.sliderChanged(n)
                }, 30, mobileCheck() ? 3 : 1);
            placeInWorld(wallController, [0, 0, 0]);

            let closeButton = makeButton(new THREE.Color(0xff4444), buttonRadius, closeAll, 'close');
            placeInWorld(closeButton, [16, 0, 0]);
        }

        function placeInWorld(tobj, loc) {
            controlObjects.push(tobj);
            Globals.tAvatar.addChild(tobj);
            tobj.object3D.position.set(baseLoc[0]+loc[0], baseLoc[1]+loc[1], baseLoc[2]+loc[2]);
            tobj.object3D.quaternion.set(0,0,0,1);
            tobj.release();
        }

        function makeButton(color, radius, action, title){
          var geometry = new THREE.SphereBufferGeometry( radius, 16, 16 );
          var material = new THREE.MeshPhongMaterial({color: color.getHex(), emissive: 0x444444});
          var sphere = new THREE.Mesh( geometry, material );
          sphere.name = title;
          return new users.TButton(this, null, action, sphere, 0);
        }

        function closeAll() {
            chartWall.cleanup();
            controlObjects.forEach(o=>o.removeSelf());
        }
        },250);
    });


    menu.addItem(null, null);


    menu.addItem('Mortality Rates', ()=>{
      Globals.alert('Mortality Rates', 5000);
      loadXLSXDemo("demos/Mortality.xlsx", xlsx=>{menu.addWindow('Mortality Rates', xlsx.window);});
    });

    menu.addItem('US Breweries Growth', ()=>{
      Globals.alert('US Breweries', 5000);
      loadXLSXDemo("demos/USBreweries.xlsx", xlsx=>{menu.addWindow('US Breweries Growth', xlsx.window);});
    });

    if(Globals.urlOptions.daviddemo){   //menu.addItem('Demo 3', function(){Globals.alert('Demo 3', 5000); })
      menu.addItem(null, null);


      menu.addItem('SystemBrowser', () => new TSystemBrowser(null, browser => browser.openInWindow()));
      menu.addItem('Workspace', () => {
        var textRect = new TextEditRect(null, null, null, 128, 128, 3, 5, 5);
        textRect.newText([{
          text: "// Evaluate JavaScript expressions with Command+D and Command+P"
        }]);
        new TWindow(null, null, 'Workspace', 2, textRect).display()
      });
      menu.addItem(null,null);

      menu.addItem('Smalltalk', () => {
          new TSmalltalk78().openInWindow();
      });
      menu.addItem('Shadama', () => {

        var textRect = new TextEditRect(null, null, null, 128, 128, 3, 5, 5);
        textRect.newText([{
          text: "// Save Shadama program with Command+S"
        }]);
        var text = new TWindow(null, null, 'Shadama Code', 2, textRect);
        var shadama = new ShadamaDisplay();
        var code = shadama.testCode();
        text.contents.textString = code;
        shadama.loadCode(code);

        shadama.text = text;
        text.shadama = shadama
        Globals.shadama = shadama;

        var shadamaWindow = new TWindow(null, null, 'Shadama Simulation', 2, shadama);

        text.save = function() {
          text.shadama.loadCode(text.contents.textString)
        }

        shadamaWindow.primRemove =  shadamaWindow.remove;
  	   shadamaWindow.remove = function() {
              shadama.destroy();
              this.primRemove();
        };

  //	text.display();
        Globals.tAvatar.addChild(text);
        text.object3D.position.set(67, 0, -text.extent.y);
        text.object3D.quaternion.set(0,0,0,1);
        text.release()

        Globals.tAvatar.addChild(shadamaWindow);
        shadamaWindow.object3D.position.set(-67, 0, -text.extent.y);
        shadamaWindow.object3D.quaternion.set(0,0,0,1);
        shadamaWindow.release();
      });
    };

    // return new TDataTable(null, () => {}, menu, false);
    // menu.doShow(Globals.tScene);

    Globals.systemMenu = menu;
    return menu;
  },

  buildTextEditor: function(){
    // Text edit/intro panel
    var textRect = new TextEditRect(null, null, null, 128, 128, 3, 5, 5);
    textRect.newText([
      {
        "text": "CEO Vision\n",
        "bold": true,
        "color": "blue",
        "size": 32
      },
      {
        "text": "David A Smith",
        "size": 16
      },
      {
        "text": "\n\nThis is CEO Vision. It is an AR/VR application designed to allow the user to visualize and control extremely large datasets.\n"
      },
      {
        "text": "\n      Visualize, model and control the enterprise"
      },
      {
        "text": "\n      Dynamically replicated shared spaces"
      },
      {
        "text": "\n      Portable, wearable – always available"
      },
      {
        "text": "\n      Expressive – easy to describe and construct simulations"
      },
      {
        "text": "\n      Huge imaging area – as big as the world"
      },
      {
        "text": "\n      Large data set simulation and visualization"
      },
      {
        "text": "\n      Massive parallel computations – object-based language"
      },
      {
        "text": "\n      Component based architecture – extremely flexible and scalable"
      },
      {
        "text": "\n      Integrated project management and cross-project information sharing"
      },
      {
        "text": "\n      Integrates with existing enterprise infrastructure and systems"
      },
      {
        "text": "\n      Credential management/security"
      },
      {
        "text": "\n      Database and compute server integration, manipulation, visualization"

      },
      {
        "text": "\n\n"
      }
    ]);
    Globals.infoWin = new TWindow(null, null, 'CEO Vision', 2, textRect);
  },

  buildWorldChart:function(){

    return buildBottleChart(function(){
 //       Globals.demoMenu.addWindow('World Since 1802', pedestal);
        var textureLoader = new THREE.TextureLoader();
        textureLoader.load(Globals.imagePath+'UI-Info.jpg',
        function(texture) {
          var rect = new TRectangle(null, null, 25, 25*texture.image.height/texture.image.width, 20, 20);
          rect.object3D.material.map = texture;
          //Globals.systemMenu.addItem(null, null); // break in the menu
        },
         // Function called when download progresses
        function ( xhr ) {
          console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
        },
          // Function called when download errors
        function ( xhr ) {
          console.log( 'An error happened' );
        });

    })
  },

  // set up the visible controller with the TDaydreamController.
  // if mobile, force to use a controller - once I support a mouse, I can
  // back off of this.
  setupController: function(){
    //user controller object

    var self = this;
    Globals.tPointer = new TDaydreamController(Globals.tAvatar,
      function(tObj){
        tObj.model.scale.set(0.1,0.1,0.1);
        tObj.model.rotation.x =Math.PI/2;
        tObj.object3D.position.set(0,-2,-2);
        tObj.setLaser();
        Globals.tScene.setPointer(tObj);
      });
  },

  setupMobile: function(){
  if (mobileCheck()){ // if we are on mobile, we need a controller
    var noSleep = new NoSleep();
    // var helpWin = Globals.helpWin;
    // helpWin.remove(); // hide the help window, as it is in the way otherwise
    Globals.mobileButton = new TButton(Globals.tAvatar, function(tObj){tObj.object3D.position.z = -4; },
      function(rval, btn){
        noSleep.enable(); // this prevents the screen from going dark
        THREEx.FullScreen.request(); // this makes the page fullscreen
        Globals.isReady = true;
        btn.parent.removeChild(btn);
        //Globals.tPointer.installController().then(function(){
        //  btn.parent.removeChild(btn);
         // Globals.tScene.addChild(helpWin);
        //},function(v){console.log(v, 'abject failure')});
      },
    (new TTextLabel(null, null, 'Tap to Start', 16, 16)).object3D);
  }
},

    addControllerMenu: function(menu){
      if(!mobileCheck()){
        if ( 'bluetooth' in navigator ) {
          console.log('This browser supports the Web Bluetooth API');
          menu.addItem('Daydream Controller', function(){Globals.tPointer.installController();});
        }else{
          console.log('This browser does not support the Web Bluetooth API');
        }
      }
    }
  },
  'loaders',{
    mtlLoader: function(path, fileName, onComplete){
        var onProgress = function ( xhr ) {
          if ( xhr.lengthComputable ) {
            var percentComplete = xhr.loaded / xhr.total * 100;
            console.log( Math.round(percentComplete, 2) + '% downloaded' );
          }
        };
        var onError = function ( xhr ) { };
        THREE.Loader.Handlers.add( /\.dds$/i, new THREE.DDSLoader() );
        var mtlLoader = new THREE.MTLLoader();
        mtlLoader.setPath( path);
        mtlLoader.load( fileName, function( materials ) {
          materials.preload();
          var objLoader = new THREE.OBJLoader();
          objLoader.setMaterials( materials );
          objLoader.setPath( path);
          objLoader.load( fileName, function ( object ) {
            if(onComplete)onComplete(object);
          }, onProgress, onError );
        });

    },
    fbxLoader: function(fileName, onComplete){
        console.log("fbxLoader");
        var manager = new THREE.LoadingManager();
        console.log(manager);
        manager.onProgress = function( item, loaded, total ) {
          console.log( item, loaded, total );
        };
        var onProgress = function( xhr ) {
          if ( xhr.lengthComputable ) {
            var percentComplete = xhr.loaded / xhr.total * 100;
            console.log( Math.round( percentComplete, 2 ) + '% downloaded' );
          }
        };
        var onError = function( xhr ) {
        };
        var loader = new THREE.FBXLoader( manager );
        console.log(loader);
        loader.load( fileName , function( object ) {
          object.traverse( function( child ) {
            if ( child instanceof THREE.Mesh ) {
              // pass
            }
            if ( child instanceof THREE.SkinnedMesh ) {
              if ( child.geometry.animations !== undefined || child.geometry.morphAnimations !== undefined ) {
                child.mixer = new THREE.AnimationMixer( child );
                mixers.push( child.mixer );
                var action = child.mixer.clipAction( child.geometry.animations[ 0 ] );
                action.play();
              }
            }
          } );
          console.log('fbxLoader complete');
          console.log(object);
          if(onComplete) onComplete(object);
        }, onProgress, onError );
      }
  }
);

export {
  World
}
