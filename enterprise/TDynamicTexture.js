// Copyright 2018 by arcos and OS.Vision.
// This software is licensed under the Apache 2 open source license
// davidasmith@gmail.com - david@os.vision
// 919-244-4448

/*global THREE*/
import { Globals } from "./TObject.js";
import { mobileCheck } from "./OnMobile.js";


// MipmapTexture generates a mipmap texture from any texture passed to it.
// This is used to dynamically compute a large texture so that a smaller one can replace it in graphics memory when it is far away.
// This is very important for use with extremely large data sets (spreadsheets - see TDataTable and TDataPanel)
var MipmapTexture = Object.subclass('users.MipmapTexture',
  'properties',{
    vertexShader: null,
    fragmentShader: null,
    camera: null,
    scene: null,
    texture: null,
    uniforms: null,
    object3D: null,
    width: null,
    height: null,
    testure: null
  },
  'initialize',{
    initialize: function(){
      this.vertexShader = [
        "varying vec2 vUV;",
        "void main() {",
          "vUV = uv;",
          "gl_Position = vec4( position, 1.0 );",
        "}"
        ].join("\n");
      this.fragmentShader = [
        "uniform float mipmapValue;    ",
        "uniform sampler2D mipmapTexture;",
        "varying vec2 vUV;",
        "void main()",
        "{",
        "  //float lod = mipmapValue*step( vUV.x, 0.5 );",
        "  vec4 col = texture2D( mipmapTexture, vec2(vUV.x, vUV.y), mipmapValue ).xyzw;",
        "  //col.w = step(col.w, 0.5);",
        "  //col.xyz = col.xyz * col.w;",
        "  gl_FragColor = col;",
        "}",
      ].join("\n");
      var self = this;
      this.camera = new THREE.OrthographicCamera( -256, 256, 256, -256, -10000, 10000 );
      this.camera.position.z = 100;
      //this.camera = new THREE.PerspectiveCamera(90, 1, 0.1, 10000);
      //this.camera.position.z = 1;
      this.scene = new THREE.Scene();
      var txtrLoader = new THREE.TextureLoader();
      txtrLoader.load(Globals.imagePath+'blue_particle.jpg', function(txtr){
        self.testure = txtr;
        self.uniforms = {
            mipmapValue:      { value: 0.0 },
            mipmapTexture:    { value: txtr },
          };

        var material = new THREE.ShaderMaterial( {
            uniforms: self.uniforms,
            vertexShader: self.vertexShader,
            fragmentShader: self.fragmentShader
          } );
        var geometry = new THREE.PlaneBufferGeometry( 2, 2 );
        self.object3D = new THREE.Mesh( geometry, material );
        self.scene.add( self.object3D );
      });
    },

    // a mipmapValue of 0 returns the full size. 1 returns 1/2 x 1/2, 2 returns 1/4 x 1/4, basically 1/(2^n)
    retrieveMipmap: function(texture, mipmapValue){
      // need to set the scale of the geometry
      this.object3D.material.uniforms.mipmapTexture.value = texture;
      this.object3D.material.uniforms.mipmapTexture.needsUpdate = true;
      this.object3D.material.uniforms.mipmapValue = mipmapValue;
      var scale = Math.pow(2,mipmapValue);
      var width = texture.image.width/scale;
      var height = texture.image.height/scale;
      var rtTexture = new THREE.WebGLRenderTarget( width, height, {  minFilter: THREE.LinearMipmapFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat } );
      // this uses the global renderer object.
      Globals.renderer.render( this.scene, this.camera, rtTexture, true );
      rtTexture.texture.generateMipmaps=true;
      return rtTexture.texture;
    }
  }
);

Globals.mipmapTexture = new MipmapTexture(); // this is a factory to make mipmap textures.
// TDynamicTexture is used to define and interact with an offscreen canvas that updates a texture object. In particular,
// it is used as the text editing object.
var TDynamicTexture = Object.subclass('users.TDynamicTexture',
  'properties',{
    canvas: null,
    width: null,
    height: null,
    context: null,
    texture: null,
    fontName: 'Arial',
    fillStyle: null, // ctx.fillStyle = ["#FF0000", "black", "blue",...]
    clearStyle: null, // null, "#FF0000", "black", "blue"
    font: null, // ctx.font = "normal 32px Arial", "italic bold 40pt Calibri"
    align: null, // ctx.textAlign = ["left","center","right"]
    scaledDynamicTextures: null,
    fontHeight: 32,
    scale: 1,
    mipmapTexture:null
  },
  'initialize',{
    initialize:function(canvas, width, height, fillStyle, clearStyle){
      //console.log(canvas)
      if(canvas){this.canvas = canvas;}
      else{
        this.canvas = document.createElement( 'canvas' );
        this.canvas.width = width;
        this.canvas.height = height;
      }
      this.width = width;
      this.height = height;
      this.context = this.canvas.getContext( '2d' );
      this.texture  = new THREE.CanvasTexture(this.canvas);
      this.fillStyle = fillStyle || 'black';
      this.clearStyle = clearStyle;
      this.font = "normal 32px Arial";
      this.align = 'left';
      this.fontHeight = 32;
      this.scale = 1;
    }
  },
  'interface',{
    getTexture:function(){return this.texture},

    getMiniTexture:function(){
      this.mipmapTexture = this.mipmapTexture || Globals.mipmapTexture.retrieveMipmap(this.texture, mobileCheck()?8:4);
      return this.mipmapTexture;
    },

    setFont: function(font){this.font = font;},

    setFillStyle: function(fillStyle){this.fillStyle = fillStyle;},

    setAlign: function(align){this.align = align;},

    setClip: function(x, y, width, height){
        this.context.save();
        this.context.rect(x,y,width,height);
        this.context.clip();
    },

    removeClip: function(){
      this.context.restore();
    },

    fill: function(fillStyle){
      this.context.save();
      this.context.scale(1/this.scale, 1/this.scale);
      this.fillRect(0, 0, this.canvas.width, this.canvas.height, fillStyle);
      this.context.restore();
    },

    clear: function(){
      this.context.save();
      this.context.scale(1/this.scale, 1/this.scale);
      this.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.texture.needsUpdate  = true;
      this.context.restore();
    },

    fillRect: function(x, y, width, height, fillStyle){
      this.context.fillStyle  = fillStyle || this.fillStyle;
      this.context.fillRect(x,y,width, height);
      this.texture.needsUpdate  = true;
    },

    clearRect: function(x,y,width, height){
      if( this.clearStyle !== undefined ){
        this.context.fillStyle  = this.clearStyle;
        this.context.fillRect(x,y,width, height);
      }else{
        this.context.clearRect(x,y,width, height);
      }
      this.texture.needsUpdate  = true;
    },

    drawImage: function(){
      // execute the drawImage on the internal context
      // the arguments are the same the official context2d.drawImage so we just pass it through
      this.context.drawImage.apply(this.context, arguments);
      this.texture.needsUpdate  = true;
    },

    drawText: function(text, x, y, fillStyle, contextFont){
      this.context.font = contextFont||this.font;
      this.context.textAlign = this.align;
      this.context.fillStyle = 'black';
      this.context.fillText(text, x+1, y+1);

      this.context.fillStyle = fillStyle||this.fillStyle;
      this.context.fillText(text, x, y);
      this.texture.needsUpdate  = true;
     },

    drawTextCentered: function(text, y, fillStyle, contextFont){
      this.context.font = contextFont||this.font;
      var w = this.context.measureText(text).width;
      var h = this.fontHeight;
      var x = (this.canvas.width-w)/2, y = (this.canvas.height+h)/2 -2;
      this.context.fillStyle = 'black';
      this.context.fillText(text, x+1, y+1);
      this.context.fillStyle = fillStyle||this.fillStyle;
      this.context.fillText(text, x, y);
      this.texture.needsUpdate  = true;
    },

    drawRect: function(x, y, width, height, style, lineWidth){
      // Green rectangle
      this.context.beginPath();
      this.context.lineWidth=lineWidth||"4";
      this.context.strokeStyle= style||"green";
      this.context.rect(x,y,width,height);
      this.context.stroke();
      this.texture.needsUpdate  = true;
    },

    drawLine: function(fromX,fromY, toX,toY, style, lineWidth){
      this.context.lineWidth=lineWidth||"1";
      this.context.strokeStyle= style||"white";
      this.context.beginPath();
      this.context.moveTo(fromX,fromY);
      this.context.lineTo(toX,toY);
      this.context.stroke();
      this.texture.needsUpdate  = true;
    },

    changed: function(){this.texture.needsUpdate  = true;  this.mipmapTexture.dispose(); this.mipmapTexture = null;},

    setScale: function(scale){this.scale = scale; this.context.scale(scale, scale);},
  }
);

export class TVideo2D extends Object {
  //'initialize',{
  constructor(fName, onComplete){
    this.fileName = fName;
    this.video = document.createElement("video");
    this.videoready = false;
    this.video.autoplay = false;
    this.video.loop = true;
    this.isPlaying = false;
    var self = this;

    this.video.oncanplay = function(){
      self.videoready=true;
      self.width = self.video.videoWidth;
      self.height = self.video.videoHeight;
      if(onComplete)onComplete(self);
    };

    this.video.onerror = function(){
      var err = "unknown error";

      switch(self.video.error.code){
        case 1: err = "video loading aborted"; break;
        case 2: err = "network loading error"; break;
        case 3: err = "video decoding failed / corrupted data or unsupported codec"; break;
        case 4: err = "video not supported"; break;
      };
      console.log("Error: " + err + " (errorcode="+self.video.error.code+")");
    };

    this.video.crossOrigin = "anonymous";

    if ( !this.video.canPlayType("video/mp4").match(/maybe|probably/i) && this.video.canPlayType("video/theora").match(/maybe|probably/i) ){
      // try webm if mp4 isn't supported
      console.log("can't play video");
    }

    this.video.src = this.fileName;
    this.video.load();//start it - need to know the size
    //this.video.pause();

    this.texture = new THREE.Texture( this.video );
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.format = THREE.RGBFormat;
    this.texture.generateMipmaps = false;

  }

  play(){ this.video.play(); this.isPlaying = true; }
  pause(){this.video.pause(); this.isPlaying = false; }
  startStop(){if(this.isPlaying)this.pause(); else this.play();}
}


export {
  TDynamicTexture,
}
