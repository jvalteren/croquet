/*global THREE*/

import { World } from "./enterprise/buildWorld.js";
import { Globals } from "./enterprise/TObject.js";
import { TConsole } from "./enterprise/TConsole.js";
import { mobileCheck } from "./enterprise/OnMobile.js";

var browserHistory = window.history;

// called as entrypoint in html
export function run() {

  initialize();
  
  window.addEventListener('resize', onResize, true);
  //window.removeEventListener('vrdisplaypresentchange', true);
  window.addEventListener('vrdisplaypresentchange', onVRPresentChange, true);

  // try to catch back button
  browserHistory.pushState(null, null, document.URL);
  window.addEventListener('popstate', function () {
      browserHistory.pushState(null, null, document.URL);
  });

  // warn about leaving world
  window.addEventListener('beforeunload', function(evt) {
    var msg = "CEO Cockpit is still running";
    evt.returnValue = msg;
    return msg;
  });
}

function initialize(){
  Globals.urlOptions = parseUrl();

// Setup three.js WebGL renderer. Note: Antialiasing is a big performance hit.
// Only enable it if you actually need to.
  document.addEventListener("contextmenu", function(e){ e.preventDefault(); }, false); //turn off right click menu
  document.addEventListener('touchmove', function(e) {e.preventDefault();}, true);
  
  Globals.renderer = new THREE.WebGLRenderer({antialias: !!Globals.urlOptions.antialias}); // false unless explicitly true
  Globals.renderer.setPixelRatio(Math.floor(window.devicePixelRatio));
  Globals.renderer.autoClear = false; // will be adding an overlay
  Globals.renderer.localClippingEnabled = true; // 3D clipping is used
  // Append the canvas element created by the renderer to document body element.
  document.body.appendChild(Globals.renderer.domElement);
  //WEBVR.getVRDisplay( function( display ){

  //  document.body.appendChild( WEBVR.getButton( display, Globals.renderer.domElement ));
  //});

  // Create a three.js scene.
  Globals.scene = new THREE.Scene();

  // Create a three.js camera.
  var cameraFar = Globals.urlOptions.camerafar || 10000;
  var cameraNear = Globals.urlOptions.cameranear || 0.1;
  Globals.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, cameraNear, cameraFar);

  Globals.controls = new THREE.VRControls(Globals.camera);
  Globals.controls.standing = true;
  
  // Apply VR stereo rendering to renderer.
  Globals.effect = new THREE.VREffect(Globals.renderer);
  Globals.vrDisplay = Globals.effect;
  Globals.effect.setSize(window.innerWidth, window.innerHeight);

  Globals.world = new World(setupStage);
};

function parseUrl() {
    if (typeof document === "undefined" || !document.location) return {};
    var search = (document.location.hash || document.location.search).slice(1),
        args = search && search.split("&"),
        options = {};
    if (args) for (var i = 0; i < args.length; i++) {
        var keyAndVal = args[i].split("="),
            key = keyAndVal[0],
            val = true;
        if (keyAndVal.length > 1) {
            val = decodeURIComponent(keyAndVal.slice(1).join("="));
            if (val.match(/^(true|false|null|[0-9"[{].*)$/))
                try { val = JSON.parse(val); } catch(e) {
                    if (val[0] === "[") val = val.slice(1,-1).split(","); // handle string arrays
                    // if not JSON use string itself
                }
        }
        options[key] = val;
    }
    return options;
}

function setupStage() {

  if(navigator.getVRDisplays){
    navigator.getVRDisplays().then(function(displays) {
      if (displays.length > 0) {
        Globals.vrDisplay = displays[0];
        console.log('vrDisplay', Globals.vrDisplay);
        Globals.renderer.vr.setDevice(Globals.vrDisplay);
        Globals.vrDisplay.requestAnimationFrame(animate);
        Globals.vrPresentButton = VRSamplesUtil.addButton("Enter VR", null, "img/cardboard64.png", enterVR);
      }else {
        Globals.vrDisplay = Globals.effect;
        Globals.vrDisplay.requestAnimationFrame(animate);
      }
      
      console.log('VRDisplay:',Globals.vrDisplay)
    });
  }else{
    console.log('WebVR Unavailable')
    Globals.vrDisplay = Globals.effect;
    Globals.vrDisplay.requestAnimationFrame(animate);
    console.log('Using Globals.effect');
  }
  Globals.console.log("window.addEventListener('vr controller connected')");
  window.addEventListener( 'vr controller connected', vrController);
}

// Request animation frame loop function
function animate(timestamp) {
  Globals.vrDisplay.requestAnimationFrame(animate); // do this first so we don't die
  THREE.VRController.update();
  if(Globals.executeArray.length)(Globals.executeArray.shift())();
  Globals.world.update(timestamp);
  if(Globals.vrDisplay.capabilities && Globals.vrDisplay.capabilities.canPresent && Globals.isReady){
    Globals.controls.update();
    Globals.tScene.enterControllerMove();
  }
  Globals.effect.render(Globals.scene, Globals.camera, null, true);
  Globals.hasRendered = true;
  Globals.stats.update();
}

function onResize(e) {
  Globals.effect.setSize(window.innerWidth, window.innerHeight);
  Globals.camera.aspect = window.innerWidth / window.innerHeight;
  Globals.camera.updateProjectionMatrix();
}


function enterVR(){
  Globals.console.log('enterVR');
  (new NoSleep()).enable(); // this prevents the screen from going dark
  Globals.vrDisplay.requestPresent([{source: Globals.renderer.domElement}]);
}

function exitVR(){
  Globals.console.log('exitVR')
  Globals.vrDisplay.exitPresent();
}

function onVRPresentChange () {
  //onResize();
  if (Globals.vrDisplay.isPresenting) {
    //if (mobileCheck())(new NoSleep()).enable(); // turn it on
    if (Globals.vrDisplay.capabilities.hasExternalDisplay) {
      VRSamplesUtil.removeButton(Globals.vrPresentButton);
      Globals.vrPresentButton = VRSamplesUtil.addButton("Exit VR", null, "img/cardboard64.png", exitVR);
    }
  } else {
    if (Globals.vrDisplay.capabilities.hasExternalDisplay) {
      VRSamplesUtil.removeButton(Globals.vrPresentButton);
      Globals.vrPresentButton = VRSamplesUtil.addButton("Enter VR", null, "img/cardboard64.png", enterVR);
    }
  }
}

/* vrController sets up the VR controller devices when we switch to VR mode.
 *
 */

function vrController( event ){
  Globals.console.log('vr controller startup');
  THREE.VRController.verbosity = 0;
  //  Here it is, your VR controller instance.
  //  It’s really a THREE.Object3D so you can just add it to your scene:

  Globals.controller = event.detail;
  Globals.tAvatar.object3D.add( Globals.controller );


  //  HEY HEY HEY! This is important. You need to make sure you do this.
  //  For 6DOF (room-scale) controllers we need to set the standingMatrix
  //  otherwise you’ll wonder why your controller appears on the floor
  //  instead of in your hands!

  Globals.controller.standingMatrix = Globals.controls.getStandingMatrix();
  //console.log('standingMatrix', Globals.controller.standingMatrix);

  //  And for 3DOF (seated) controllers you need to set the controller.head
  //  to reference your camera. That way we can make an educated guess where
  //  your hand ought to appear based on the camera’s rotation. 
  
  Globals.controller.head = Globals.camera;

  //  Right now your controller has no visual. 
  //  It’s just an empty THREE.Object3D.
  //  Let’s fix that!
  // Transfer my pointer from the TAvatar to the camera
  Globals.tPointer.removeSelf(); // remove the tPointer from the TAvatar
  Globals.tPointer.object3D.position.set(0,-2.5,0);
  Globals.controller.add(Globals.tPointer.object3D);

  //  Button events. How easy is this?!
  //  We’ll just use the “primary” button -- whatever that might be ;)
  //  Check out the THREE.VRController.supported{} object to see
  //  all the named buttons we’ve already mapped for you!
  Globals.console.log('set up controller event listeners');
  Globals.controller.addEventListener( 'primary press began', function( event ){
    Globals.tPointer.buttonDown();
    Globals.tScene.enterControllerDown();
    //Globals.console.log('primary press began');
    //event.target.userData.mesh.material.color.setHex( meshColorOn )
    //guiInputHelper.pressed( true )
  });
  Globals.controller.addEventListener( 'primary press ended', function( event ){
    Globals.tPointer.buttonUp();
    Globals.tScene.enterControllerUp();
    //Globals.console.log('primary press ended');
    //event.target.userData.mesh.material.color.setHex( meshColorOff )
    //guiInputHelper.pressed( false )
  });
 Globals.controller.addEventListener( 'primary touch began', function( event ){
    Globals.tPointer.touchDown();
    //Globals.console.log('primary touch began');
    //event.target.userData.mesh.material.color.setHex( meshColorOn )
    //guiInputHelper.pressed( true )
  });
  Globals.controller.addEventListener( 'primary touch ended', function( event ){
    Globals.tPointer.touchUp();
    Globals.tScene.isMoving = false;
    //Globals.console.log('primary touch ended');
    //event.target.userData.mesh.material.color.setHex( meshColorOff )
    //guiInputHelper.pressed( false )
  });
  Globals.controller.addEventListener( 'axes changed', function( event ){
    let ax=event.axes[0],ay=event.axes[1];
    Globals.tPointer.trackAxis(ax, ay);
    Globals.tScene.enterControllerTouch(ax,ay);
  });

  //  Daddy, what happens when we die?

  Globals.controller.addEventListener( 'disconnected', function( event ){
    Globals.scene.remove( Globals.controller );
    Globals.controller = null;
    Globals.tAvatar.addChild(Globals.tPointer);
  });
}