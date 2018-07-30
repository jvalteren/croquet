/*global THREE*/

import { World } from "./enterprise/buildWorld.js";
import { Globals } from "./enterprise/TObject.js";
var browserHistory = window.history;

// called as entrypoint in html
export function run() {
  initialize();
  
  window.addEventListener('resize', onResize, true);
  window.addEventListener('vrdisplaypresentchange', onVRPresentChange, true);

  /*
  // Button click handlers.
  document.querySelector('button#fullscreen').addEventListener('click', function() {
    THREEx.FullScreen.request();
  });
  document.querySelector('button#vr').addEventListener('click', function() {
    vrDisplay.requestPresent([{source: renderer.domElement}]);
  });
  document.querySelector('button#reset').addEventListener('click', function() {
    vrDisplay.resetPose();
  });
  */
  // try to catch back button
  browserHistory.pushState(null, null, document.URL);
  window.addEventListener('popstate', function () {
      browserHistory.pushState(null, null, document.URL);
  });

  // warn about leaving world
  // window.addEventListener('beforeunload', function(evt) {
  //   var msg = "CEO Cockpit is still running";
  //   evt.returnValue = msg;
  //   return msg;
  // });
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

  // Create a three.js scene.
  Globals.scene = new THREE.Scene();

  // Create a three.js camera.
  var cameraFar = Globals.urlOptions.camerafar || 10000;
  Globals.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, cameraFar);

  Globals.controls = new THREE.VRControls(Globals.camera);
  Globals.controls.standing = true;
  
  // Apply VR stereo rendering to renderer.
  Globals.effect = new THREE.VREffect(Globals.renderer);
  Globals.effect.setSize(window.innerWidth, window.innerHeight);

  Globals.world = new World(setupStage);
  Globals.vrDisplay = null;
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
  navigator.getVRDisplays().then(function(displays) {
    if (displays.length > 0) {
      Globals.vrDisplay = displays[0];
      Globals.vrDisplay.requestAnimationFrame(animate);
      Globals.vrPresentButton = VRSamplesUtil.addButton("Enter VR", null, "img/cardboard64.png", enterVR);
    }else {
      document.getElementById("VRButton").style.display = 'none'; 
      Globals.vrDisplay = Globals.effect;
      Globals.vrDisplay.requestAnimationFrame(animate);
    }
    
    console.log('VRDisplay:',Globals.vrDisplay)
  });
}

// Request animation frame loop function
function animate(timestamp) {
  if(Globals.executeArray.length)(Globals.executeArray.shift())();
  Globals.world.update(timestamp);
  if(Globals.vrDisplay.capabilities.canPresent && Globals.isReady)Globals.controls.update();
  Globals.effect.render(Globals.scene, Globals.camera, null, true);
  Globals.hasRendered = true;
  Globals.stats.update();
  Globals.vrDisplay.requestAnimationFrame(animate);
}

function onResize(e) {
  Globals.effect.setSize(window.innerWidth, window.innerHeight);
  Globals.camera.aspect = window.innerWidth / window.innerHeight;
  Globals.camera.updateProjectionMatrix();
}

function enterVR(){
  Globals.vrDisplay.requestPresent([{source: Globals.renderer.domElement}]);
}

function exitVR(){
  Globals.vrDisplay.exitPresent();
}

function onVRPresentChange () {
  onResize();

  if (Globals.vrDisplay.isPresenting) {
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

function getGamepads(){
  var vrGamepads = [];

  var gamepads = navigator.getGamepads();
  console.log(gamepads);
  for (var i = 0; i < gamepads.length; ++i) {
    var gamepad = gamepads[i];
    // The array may contain undefined gamepads, so check for that as
    // well as a non-null pose.
    if (gamepad) {
      if (gamepad.pose)
        vrGamepads.push(gamepad);

      if ("hapticActuators" in gamepad && gamepad.hapticActuators.length > 0) {
        for (var j = 0; j < gamepad.buttons.length; ++j) {
          if (gamepad.buttons[j].pressed) {
            // Vibrate the gamepad using to the value of the button as
            // the vibration intensity.
            gamepad.hapticActuators[0].pulse(gamepad.buttons[j].value, 100);
            break;
          }
        }
      }
    }
  }
  if(vrGamepads.length>0)gamepadData(vrGamepads[0]);
  //console.log(vrGamepads);
  return vrGamepads;
}

function gamepadData(gamepad){
  console.log(gamepad);
  console.log('orientation: ',gamepad.pose.orientation); // quaternion
  console.log('position: ',gamepad.pose.position); // translation
  console.log('axes: ',gamepad.axes); // array of positions on track pad
  console.log('buttons: ',gamepad.buttons); // array of pressed buttons
  //gamepad.buttons[].pressed
  //gamepad.buttons[].value
}
