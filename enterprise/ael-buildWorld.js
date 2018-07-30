// Copyright 2017 by David A Smith and CEO Vision, Inc. All Rights Reserved.
// davidasmith@gmail.com
// 919-244-4448

// Initializing the world - this is used for testing at present. Most of the contents of the world will be
// dynamically created by the user and saved and reloaded. When the system is totally operational, the user
// may have a blank world possibly including some sort of splash screen image.
'use strict';

Object.subclass('World',
  'initialize',{
    initialize: function (scene, camera, renderer, controls, onComplete, editor){
      THREE.Object3D.prototype.setMatrix = function ( matrix ) {
          this.matrix = matrix;
          this.matrix.decompose( this.position, this.quaternion, this.scale );
        };

      Globals.renderer = renderer;
      Globals.scene = scene;
      Globals.camera = camera;

      renderer.setClearColor(0x000000);
      Globals.controls = controls;
      Globals.tScene = new users.TScene(scene, camera, renderer, true);
      Globals.tCamera = new users.TCamera(Globals.tScene, null, camera);

      // The TCamera and TScene have cross references to each other, so I need to add this bit
      Globals.tScene.tCamera = Globals.tCamera;
      Globals.tScene.pointerEvent.tCamera=Globals.tCamera;
      this.setupLight();
      this.buildCEOWorld(editor);
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
   
/* what DAS had
      var object3d  = new THREE.AmbientLight(0x999999);
      object3d.name = 'Ambient light';
      new users.TLight(Globals.tScene, null, object3d);

      var object3d  = new THREE.DirectionalLight('white', 0.225);
      object3d.position.set(-200.6,100,300);
      object3d.name = 'Back light';
      new users.TLight(Globals.tScene, null, object3d);
    
      var object3d  = new THREE.DirectionalLight('white', 0.35);
      object3d.position.set(500, -500, 500);
      object3d.name   = 'Key light';
      new users.TLight(Globals.tScene, null, object3d);

      var object3d  = new THREE.PointLight('white', 0.2);
      object3d.castShadow = true;
      object3d.position.set(-20, 6, 100);
      object3d.name = 'Fill light';
      new users.TLight(Globals.tScene, null, object3d);
*/

      // ael - make the ambient fully white
      var object3d  = new THREE.AmbientLight(0xffffff);
      object3d.name = 'Ambient light';
      new users.TLight(Globals.tScene, null, object3d);

/*  ael - maybe set up a point light
      var object3d  = new THREE.PointLight(0xcccccc, 0.3);
      object3d.castShadow = false;
      //object3d.color.set(new THREE.Color(0x44ff44));
      object3d.name = 'Camera light';
      new users.TLight(Globals.tCamera, null, object3d);
      object3d.position.set(0, 500, 3000)
*/

      // ael - or set up two lights behind the default fixed camera position, on either side and pointing across each other
/*
      var object3d  = new THREE.DirectionalLight('white', 0.35);
      object3d.position.set(-2000, 1000, 3000);;
      Globals.tScene.object3D.add(object3d.target)
      object3d.target.position.set(0, 500, 750);
      object3d.name   = 'Key light';
      new users.TLight(Globals.tScene, null, object3d);
    
      var object3d  = new THREE.DirectionalLight('white', 0.35);
      object3d.position.set(2000, 1000, 3000);
      Globals.tScene.object3D.add(object3d.target);
      object3d.target.position.set(0, 500, 750);
      object3d.name   = 'Key light 2';
      new users.TLight(Globals.tScene, null, object3d);
*/

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
/* NOTHING TO WAIT FOR YET */
              resolve(true);
        }).then(function(){
      Globals.executeArray.push(
      function(){
        Globals.demoMenu = new users.TMenu('Demo Menu');
        Globals.demoMenu.addItem(null, null); // break in menu
        //Globals.tScene.addSystemMenu(Globals.systemMenu);
        return(Globals.demoMenu);
      },function(val) {
        self.loadAelExpt();
        return true;
      },function(val) { // Text Editor
        self.buildTextEditor();
        return true;
      },function(val) { // Controller
        return self.setupController();
      },function(val){
        setTimeout(function(){
          new users.TGrid(Globals.tScene, function(tObj){tObj.object3D.position.y=-150; }, 1000, 50, Globals.standardColor.getHex(), Globals.secondaryColor.getHex(), 4);  
          //Globals.helpRect.goTo(new THREE.Vector3(0,0,0), null, null, 60);
          Globals.tScene.setupEvents(Globals.renderer.domElement);
          self.setupMobile();

          // AEL ADDED
          let cx = 0, cy = 400, cz = 550;
          Globals.tCamera.object3D.position.set(cx, cy, cz);
          Globals.tCamera.aelResetVector = new THREE.Vector3(cx, cy, cz);
          console.log("Lively ID: "+lively.l2l.client.id);
        }, 1000);
        return true;
      });
    });

      return;

},


loadAelExpt: function() {
    // temporary.  set up a ball to be clicked on to reload the experimental code in ael-expt.js
    let radius = window.mobileCheck() ? 20 : 10;
	let but = makeButton(new THREE.Color(0xff4444), radius, loadScript, 'load');
    but.object3D.position.set(0, 0, -40);
    Globals.tScene.addChild(but);

    function makeButton(color, radius, action, title){
      var geometry = new THREE.SphereBufferGeometry( radius, 16, 16 );
      var material = new THREE.MeshPhongMaterial({color: color.getHex(), emissive: 0x444444});
      var sphere = new THREE.Mesh( geometry, material );
      sphere.name = title;
      return new users.TButton(this, null, action, sphere, 0);
    }

    function loadScript() {
        let file = `${document.location.origin}/cockpit/enterprise/ael-expt.js`;
        var rawFile = new XMLHttpRequest();
        rawFile.open("GET", file, false);
        rawFile.onreadystatechange = function ()
        {
            if(rawFile.readyState === 4)
            {
                if(rawFile.status === 200 || rawFile.status == 0)
                {
                    var allText = rawFile.responseText;
                    eval(`${allText}`);
                }
            }
        }
        rawFile.send(null);
    }
},

  buildTextEditor: function(){
        // Text edit/intro panel
        var textRect = new users.TextEditRect(null, null, null, 512, 512, 16, 16 ,5, 5);
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
        "text": "\n\n"
    }
]);
  Globals.infoWin = new users.TWindow(null, null, 'CEO Vision', 0.5,textRect);
    //Globals.systemMenu.addWindow('About CEO.Vision', tWindow); 
},

  addDemoMenus: function(){
        Globals.demoMenu.addItem(null, null);
        //Globals.demoMenu.addItem('Mortality Rates', function(){Globals.alert('Mortality Rates', 5000); loadXLSXDemo("demos/Mortality.xlsx")});
        //Globals.demoMenu.addItem('Demo 2', function(){Globals.alert('Demo 2', 5000); });
        //Globals.demoMenu.addItem('Demo 3', function(){Globals.alert('Demo 3', 5000); })
  },

    // set up the visible controller with the TDaydreamController.
    // if mobile, force to use a controller - once I support a mouse, I can 
    // back off of this.
    setupController: function(){
      //user controller object

      var self = this;
      Globals.tPointer = new users.TDaydreamController(Globals.tCamera,
          function(tObj){
            tObj.model.scale.set(0.1,0.1,0.1); 
            tObj.model.rotation.x =Math.PI/2; 
            tObj.object3D.position.set(0,-2,-2); 
            tObj.setLaser(); 
            Globals.tScene.setPointer(tObj);
          });
      },

      setupMobile: function(){
      if(window.mobileCheck()){ // if we are on mobile, we need a controller 
        var noSleep = new NoSleep();
        // var helpWin = Globals.helpWin;
        // helpWin.remove(); // hide the help window, as it is in the way otherwise
        Globals.mobileButton = new users.TButton(Globals.tCamera, function(tObj){tObj.object3D.position.z = -4; }, 
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
          (new users.TTextLabel(null, null, 'Tap to Start', 16, 16)).object3D);
      }
    },

    addControllerMenu: function(menu){
      if(!window.mobileCheck()){
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

