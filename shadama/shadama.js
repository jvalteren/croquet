/*global Int32Array,Int16Array,Int8Array,Uint8Array,Uint16Array,Uint32Array,Uint8ClampedArray,Float32Array,ImageData,WebGLTexture,localStorage,Option,alert,prompt,ohm*/
/*lively.vm keepTopLevelVarDecls: true*/

var TEXTURE_SIZE = 1024;
var FIELD_WIDTH = 512;
var FIELD_HEIGHT = 512;
var ENLARGE = 1;

var T = TEXTURE_SIZE;
var FW = FIELD_WIDTH;
var FH = FIELD_HEIGHT;

var readout;

var gl;
var targetTexture;
var readPixelArray;
var readPixelCallback;

var runTests = false;

var breedVAO;
var patchVAO;

var initialized;
var programs = programs || {};  // {name: {prog: shader, vao: VAO, uniLocations: uniformLocs}}
var scripts = scripts || {};    // {name: [function, inOutParam]}
var statics = statics || {};    // {name: function}
var staticsList = staticsList || []; // [name];
var steppers = steppers || {};  // {name: name}
var loadTime = loadTime || 0.0;

var editor;
var parseErrorWidget;
var compilation;
var setupCode;
var programName = null;
var watcherList;  // DOM
var watcherElements = watcherElements || []; // [DOM]

var shadamaCanvas;

var keepGoing = true;
var animationRequested = false;

var debugCanvas1;
var debugArray;
var debugArray1;
var debugArray2;

var times = times || [];

var framebufferT;
var framebufferF;
var framebufferR;
var framebufferD;

var debugTexture0;
var debugTexture1;

var env = env || {};


function initBreedVAO(gl) {
    var allIndices = new Array(T * T * 2);
    for (var j = 0; j < T; j++) {
        for (var i = 0; i < T; i++) {
            var ind = ((j * T) + i) * 2;
            allIndices[ind + 0] = i;
            allIndices[ind + 1] = j;
        }
    }

    breedVAO = gl.createVertexArray();
    gl.bindVertexArray(breedVAO);

    var positionBuffer = gl.createBuffer();

    var attrLocations = new Array(1);
    attrLocations[0] = 0 // gl.getAttribLocation(prog, 'a_index'); Now a_index has layout location spec

    var attrStrides = new Array(1);
    attrStrides[0] = 2;

    set_buffer_attribute(gl, [positionBuffer], [allIndices], attrLocations, attrStrides);
    gl.bindVertexArray(null);
}

function initPatchVAO(gl) {
    patchVAO = gl.createVertexArray();
    gl.bindVertexArray(patchVAO);

    var positionBuffer = gl.createBuffer();
    var rect = [
        -1.0,  1.0,
         1.0,  1.0,
        -1.0, -1.0,
         1.0,  1.0,
         1.0, -1.0,
        -1.0, -1.0,
    ];

    var attrLocations = new Array(1);
    attrLocations[0] = 0; //gl.getAttribLocation(prog, 'a_position'); ; Now a_position has layout location spec

    var attrStrides = new Array(1);
    attrStrides[0] = 2;

    set_buffer_attribute(gl, [positionBuffer], [rect], attrLocations, attrStrides);
    gl.bindVertexArray(null);
}

function createShader(gl, id, source) {
    var type;
    if (id.endsWith(".vert")) {
        type = gl.VERTEX_SHADER;
    } else if (id.endsWith(".frag")) {
        type = gl.FRAGMENT_SHADER;
    }

    var shader = gl.createShader(type);

    if (!source) {
        var scriptElement = document.getElementById(id);
        if(!scriptElement){return;}
        source = scriptElement.text;
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }

    console.log(gl.getShaderInfoLog(shader));
    alert(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }

    console.log(gl.getProgramInfoLog(program));
    alert(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

function evalShadama(source, /*become "dynamically" scoped =>*/env, scripts) {
  // evaluates ohm compiled shadama code (js code) so that variables are
  // accessible inside the eval
  return eval(source);
}

function loadShadama(id, source) {
    var newSetupCode;
    var oldProgramName = programName;
    statics = {};
    staticsList = [];
    scripts = {};
    if (!source) {
        var scriptElement = document.getElementById(id);
        if(!scriptElement){return "";}
        source = scriptElement.text;
    }
    cleanUpEditorState();
    var result = translate(source, "TopLevel", syntaxError);
    compilation = result;
    if (!result) {return "";}
    if (oldProgramName != result["_programName"]) {
        resetSystem();
    }
    programName = result["_programName"];
    delete result["_programName"];

    for (var k in result) {
        if (typeof result[k] === "string") { // static function case
            statics[k] = evalShadama(result[k], env, scripts);
            staticsList.push(k);
            if (k === "setup") {
                newSetupCode = result[k];
            }
        } else {
            var entry = result[k];
            var js = entry[3];
            if (js[0] === "updateBreed") {
                update(Breed, js[1], js[2]);
            } else if (js[0] === "updatePatch") {
                update(Patch, js[1], js[2]);
            } else if (js[0] === "updateScript") {
                var table = entry[0];
                scripts[js[1]] = [programFromTable(table, entry[1], entry[2], js[1]),
                                  table.insAndParamsAndOuts()];
            }
        }
    }

    if (setupCode !== newSetupCode) {
        callSetup();
        setupCode = newSetupCode;
    }
//    populateList(staticsList);
    runLoop();
    return source;
}

function createTexture(gl, data, type, width, height) {
    if (!type) {
        type = gl.UNSIGNED_BYTE;
    }
    if (!width) {
        width = T;
    }
    if (!height) {
        height = T;
    }
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);

    if (type == gl.UNSIGNED_BYTE) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, type, data);
    } else if (type == gl.R32F) {
        gl.texImage2D(gl.TEXTURE_2D, 0, type, width, height, 0, gl.RED, gl.FLOAT, data);
    } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, type, data);
    }

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return tex;
}

function initFramebuffer(gl, buffer, tex, format, width, height) {
    if (!format) {
        format = gl.UNSIGNED_BYTE;
    }
    if (!width) {
        width = T;
    }
    if (!height) {
        height = T;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
    gl.bindTexture(gl.TEXTURE_2D, tex);

    if (format == gl.R32F) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, width, height, 0, gl.RED, gl.FLOAT, null);
    } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, format, null);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
}

function setTargetBuffer(gl, buffer, tex) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
}

function setTargetBuffers(gl, buffer, tex) {
    var list = [];
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, buffer);
    for (var i = 0; i < tex.length; i++) {
        var val = gl.COLOR_ATTACHMENT0 + i;
        gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, val, gl.TEXTURE_2D, tex[i], 0);
        list.push(val);
    }
    gl.drawBuffers(list);
}

function set_buffer_attribute(gl, buffers, data, attrL, attrS) {
    for (var i in buffers) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[i]);
        gl.bufferData(gl.ARRAY_BUFFER,
              new Float32Array(data[i]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(attrL[i]);
        gl.vertexAttribPointer(attrL[i], attrS[i], gl.FLOAT, false, 0, 0);
    }
}

function createIBO (gl, data) {
    var ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int32Array(data), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    return ibo;
}

function Display() {
}

Display.prototype.clear = function() {
    if (targetTexture) {
	setTargetBuffer(gl, framebufferF, targetTexture);
    } else {
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (!targetTexture) {
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
}

Display.prototype.playSound = function(name) {
    var dom = document.getElementById(name);
    if (dom) {dom.play()}
}

function textureCopy(obj, src, dst) {
    var prog = programs["copy"];
    var width;
    var height;
    var buffer;
    if (obj.constructor === Breed) {
        width = T;
        height = T;
        buffer = framebufferT;
    } else {
        width = FW;
        height = FH;
        buffer = framebufferR;
    }

    setTargetBuffer(gl, buffer, dst);

    gl.useProgram(prog.program);
    gl.bindVertexArray(prog.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src);

    gl.viewport(0, 0, width, height);

    gl.uniform1i(prog.uniLocations["u_value"], 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.flush();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

var updateOwnVariable = function(obj, name, optData) {
    var width;
    var height;
    var ary;
    if (obj.constructor === Breed) {
        var width = T;
        var height = T;
    } else {
        var width = FW;
        var height = FH;
    }

    if (!optData) {
        ary = new Float32Array(width * height);
    } else {
        ary = optData;
    }

    if (obj[name]) {
        gl.deleteTexture(obj[name]);
    }
    if (obj["new"+name]) {
        gl.deleteTexture(obj["new"+name]);
    }

    obj.own[name] = name;
    obj[name] = createTexture(gl, ary, gl.R32F, width, height);
    obj["new"+name] = createTexture(gl, ary, gl.R32F, width, height);
}

var removeOwnVariable = function(obj, name) {
    delete obj.own[name];
    if (obj[name]) {
        gl.deleteTexture(obj[name]);
        delete obj[name];
    }
    if (obj["new"+name]) {
        gl.deleteTexture(obj["new"+name]);
        delete obj["new"+name];
    }
}

function setTarget(aTexture) {
    targetTexture = aTexture;
}

function makeTarget() {
    if (!targetTexture)
        targetTexture = createTexture(gl, new Uint8Array(FW*FH*4), gl.UNSIGNED_BYTE, FW, FH);
}

function setReadPixelCallback(func) {
    readPixelCallback = func;
}

function readPixels() {
    var width = FW;
    var height = FH;

    if (!readPixelArray) {
        readPixelArray = new Uint8Array(width * height * 4);
    }
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, readPixelArray);
    
    var clamped = new Uint8ClampedArray(readPixelArray);
    var img = new ImageData(clamped, width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return img;
}

class Breed {

  constructor(count) {
    this.own = {};
    this.count = count;
  }

  fillRandom(name, min, max) {
    var ary = new Float32Array(T * T);
    var range = max - min;
    for (var i = 0; i < ary.length; i++) {
      ary[i] = Math.random() * range + min;
    }
    updateOwnVariable(this, name, ary);
  }

  fillRandomDir(xName, yName) {
    var x = new Float32Array(T * T);
    var y = new Float32Array(T * T);
    for (var i = 0; i < x.length; i++) {
      var dir = Math.random() * Math.PI * 2.0;
      x[i] = Math.cos(dir);
      y[i] = Math.sin(dir);
    }
    updateOwnVariable(this, xName, x);
    updateOwnVariable(this, yName, y);
  }

  fillSpace(xName, yName, xDim, yDim) {
    this.count = xDim * yDim;
    var x = new Float32Array(T * T);
    var y = new Float32Array(T * T);

    for (var j = 0; j < yDim; j++) {
      for (var i = 0; i < xDim; i++) {
        var ind = xDim * j + i;
        x[ind] = i;
        y[ind] = j;
      }
    }
    updateOwnVariable(this, xName, x);
    updateOwnVariable(this, yName, y);
  }

  fill(name, value) {
    var x = new Float32Array(T * T);

    for (var j = 0; j < this.count; j++) {
      x[j] = value;
    }
    updateOwnVariable(this, name, x);
  }

  fillImage(xName, yName, rName, gName, bName, aName, imagedata) {
    var xDim = imagedata.width;
    var yDim = imagedata.height;
    this.fillSpace(xName, yName, xDim, yDim);

    var r = new Float32Array(T * T);
    var g = new Float32Array(T * T);
    var b = new Float32Array(T * T);
    var a = new Float32Array(T * T);

    for (var j = 0; j < yDim; j++) {
      for (var i = 0; i < xDim; i++) {
        var src = j * xDim + i;
        var dst = (yDim - 1 - j) * xDim + i;
        r[dst] = imagedata.data[src * 4 + 0] / 255.0;
        g[dst] = imagedata.data[src * 4 + 1] / 255.0;
        b[dst] = imagedata.data[src * 4 + 2] / 255.0;
        a[dst] = imagedata.data[src * 4 + 3] / 255.0;
      }
    }
    updateOwnVariable(this, rName, r);
    updateOwnVariable(this, gName, g);
    updateOwnVariable(this, bName, b);
    updateOwnVariable(this, aName, a);
  }

  draw() {
    var prog = programs["drawBreed"];

    if (targetTexture) {
      setTargetBuffer(gl, framebufferF, targetTexture);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    gl.useProgram(prog.program);
    gl.bindVertexArray(prog.vao);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    //    gl.blendFunc(gl.ONE, gl.ONE);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.x);
    gl.uniform1i(prog.uniLocations["u_x"], 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.y);
    gl.uniform1i(prog.uniLocations["u_y"], 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.r);
    gl.uniform1i(prog.uniLocations["u_r"], 2);

    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.g);
    gl.uniform1i(prog.uniLocations["u_g"], 3);

    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, this.b);
    gl.uniform1i(prog.uniLocations["u_b"], 4);

    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, this.a);
    gl.uniform1i(prog.uniLocations["u_a"], 5);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.uniform2f(prog.uniLocations["u_resolution"], FW, FH);
    gl.uniform1f(prog.uniLocations["u_particleLength"], T);

    gl.drawArrays(gl.POINTS, 0, this.count);

    gl.flush();
    gl.disable(gl.BLEND);
    if (!targetTexture) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  }

  setCount(n) {
    var oldCount = this.count;
    if (n < 0 || !n) {
      n = 0;
    }
    this.count = n;
    //
  }
}


class Patch {

  constructor() {
   this.own = {};
  }

  draw() {
    if (targetTexture) {
      setTargetBuffer(gl, framebufferF, targetTexture);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    var prog = programs["drawPatch"];

    gl.useProgram(prog.program);
    gl.bindVertexArray(prog.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.r);
    gl.uniform1i(prog.uniLocations["u_r"], 0);

    gl.activeTexture(gl.TEXTURE0 + 1);
    gl.bindTexture(gl.TEXTURE_2D, this.g);
    gl.uniform1i(prog.uniLocations["u_g"], 1);

    gl.activeTexture(gl.TEXTURE0 + 2);
    gl.bindTexture(gl.TEXTURE_2D, this.b);
    gl.uniform1i(prog.uniLocations["u_b"], 2);

    gl.activeTexture(gl.TEXTURE0 + 3);
    gl.bindTexture(gl.TEXTURE_2D, this.a);
    gl.uniform1i(prog.uniLocations["u_a"], 3);


    gl.viewport(0, 0, FW, FH);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.flush();
    if (!targetTexture) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  }

  diffuse(name) {
    var prog = programs["diffusePatch"];

    var target = this["new"+name];
    var source = this[name];

    setTargetBuffer(gl, framebufferR, target);

    gl.useProgram(prog.program);
    gl.bindVertexArray(prog.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, source);

    gl.viewport(0, 0, FW, FH);

    gl.uniform1i(prog.uniLocations["u_value"], 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.flush();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this["new"+name] = source;
    this[name] = target;
  };

}


var shaders = {
  "copy.vert":
`#version 300 es
layout (location = 0) in vec2 a_position;

void main(void) {
    gl_Position = vec4(a_position, 0.0, 1.0);
}`,
  "copy.frag":
`#version 300 es
precision highp float;

uniform sampler2D u_value;

out float fragColor;

void main(void) {
  ivec2 fc = ivec2(gl_FragCoord.s, gl_FragCoord.t);
  fragColor = texelFetch(u_value, fc, 0).r;
}`,
  "drawBreed.vert":
`#version 300 es
layout (location = 0) in vec2 a_index;

uniform vec2 u_resolution;
uniform float u_particleLength;
uniform sampler2D u_x;
uniform sampler2D u_y;

uniform sampler2D u_r;
uniform sampler2D u_g;
uniform sampler2D u_b;
uniform sampler2D u_a;

out vec4 v_color;

void main(void) {
    vec2 zeroToOne = a_index / u_particleLength;
    float x = texelFetch(u_x, ivec2(a_index), 0).r;
    float y = texelFetch(u_y, ivec2(a_index), 0).r;
    vec2 dPos = vec2(x, y);   // (0-resolution, 0-resolution)
    vec2 normPos = dPos / u_resolution;  // (0-1.0, 0-1.0)
    vec2 clipPos = normPos * 2.0 - 1.0;  // (-1.0-1.0, -1.0-1.0)
    gl_Position = vec4(clipPos, 0, 1.0);

    float r = texelFetch(u_r, ivec2(a_index), 0).r;
    float g = texelFetch(u_g, ivec2(a_index), 0).r;
    float b = texelFetch(u_b, ivec2(a_index), 0).r;
    float a = texelFetch(u_a, ivec2(a_index), 0).r;
    v_color = vec4(r, g, b, a);
    gl_PointSize = 1.0;
}`,

  "drawBreed.frag":
`#version 300 es
precision highp float;

in vec4 v_color;

out vec4 fragColor;

void main(void) {
  fragColor = v_color;
}`,

  "drawPatch.vert":
`#version 300 es
layout (location = 0) in vec2 a_position;

void main(void) {
    gl_Position = vec4(a_position, 0.0, 1.0);
}`,

  "drawPatch.frag":
`#version 300 es
precision highp float;

uniform sampler2D u_r;
uniform sampler2D u_g;
uniform sampler2D u_b;
uniform sampler2D u_a;

out vec4 fragColor;

void main(void) {
  ivec2 fc = ivec2(gl_FragCoord.s, gl_FragCoord.t);
  float r = texelFetch(u_r, fc, 0).r;
  float g = texelFetch(u_g, fc, 0).r;
  float b = texelFetch(u_b, fc, 0).r;
  float a = texelFetch(u_a, fc, 0).r;
  fragColor = vec4(r, g, b, a);
}`,

  "diffusePatch.vert":
`#version 300 es
layout (location = 0) in vec2 a_position;

void main(void) {
    gl_Position = vec4(a_position, 0.0, 1.0);
}`,

  "diffusePatch.frag":
`#version 300 es
precision highp float;
uniform sampler2D u_value;

const float weight[9] = float[9](
    0.077847, 0.123317, 0.077847,
    0.123317, 0.195346, 0.123317,
    0.077847, 0.123317, 0.077847
);

out float fragColor;

void main(void) {
  ivec2 fc = ivec2(gl_FragCoord.s, gl_FragCoord.t);
  float v;
  v = texelFetch(u_value, fc + ivec2(-1, -1), 0).r * weight[0];
  v += texelFetch(u_value, fc + ivec2(-1,  0), 0).r * weight[1];
  v += texelFetch(u_value, fc + ivec2(-1,  1), 0).r * weight[2];
  v += texelFetch(u_value, fc + ivec2( 0, -1), 0).r * weight[3];
  v += texelFetch(u_value, fc + ivec2( 0,  0), 0).r * weight[4];
  v += texelFetch(u_value, fc + ivec2( 0,  1), 0).r * weight[5];
  v += texelFetch(u_value, fc + ivec2( 1, -1), 0).r * weight[6];
  v += texelFetch(u_value, fc + ivec2( 1,  0), 0).r * weight[7];
  v += texelFetch(u_value, fc + ivec2( 1,  1), 0).r * weight[8];
  v = v <= (1.0/256.0) ? 0.0 : v;
  fragColor = v;
}`,

  "debugPatch.vert":
`#version 300 es
layout (location = 0) in vec2 a_position;

void main(void) {
    gl_Position = vec4(a_position, 0.0, 1.0);
}`,

  "debugPatch.frag":
`#version 300 es
precision highp float;
uniform sampler2D u_value;

out vec4 fragColor;

void main(void) {
    ivec2 fc = ivec2(gl_FragCoord.s, gl_FragCoord.t);
    fragColor = texelFetch(u_value, fc, 0);
}`
}


function makePrimitive(gl, name, uniforms, vao) {
    var vs = createShader(gl, name + ".vert", shaders[name+'.vert']);
    var fs = createShader(gl, name + ".frag", shaders[name+'.frag']);

    var prog = createProgram(gl, vs, fs);

    var uniLocations = {};
    uniforms.forEach(function (n) {
        uniLocations[n] = gl.getUniformLocation(prog, n);
    });

    return {program: prog, uniLocations: uniLocations, vao: vao};
}

function drawBreedProgram(gl) {
    return makePrimitive(gl, "drawBreed", ["u_resolution", "u_particleLength", "u_x", "u_y", "u_r", "u_g", "u_b", "u_a"], breedVAO);
}

function drawPatchProgram(gl) {
    return makePrimitive(gl, "drawPatch", ["u_a", "u_r", "u_g", "u_b"], patchVAO);
}

function debugPatchProgram(gl) {
    return makePrimitive(gl, "debugPatch", ["u_value"], patchVAO);
}

function diffusePatchProgram(gl) {
    return makePrimitive(gl, "diffusePatch", ["u_value"], patchVAO);
}

function copyProgram(gl) {
    return makePrimitive(gl, "copy", ["u_value"], patchVAO);
}

function debugDisplay(objName, name) {
    var object = env[objName];
    var forBreed = object.constructor == Breed;
    var width = forBreed ? T : FW;
    var height = forBreed ? T : FH;

    if (!debugCanvas1) {
        debugCanvas1 = document.getElementById("debugCanvas1");
        debugCanvas1.width = width;
        debugCanvas1.height = height;
    }
    var prog = programs["debugPatch"];

    if (forBreed) {
        setTargetBuffer(gl, framebufferD, debugTexture0);
    } else {
        setTargetBuffer(gl, framebufferF, debugTexture1);
    }

    gl.useProgram(prog.program);
    gl.bindVertexArray(prog.vao);

    var tex = object[name];

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);

    gl.viewport(0, 0, width, height);

    gl.uniform1i(prog.uniLocations["u_value"], 0);

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.flush();

    debugArray = new Float32Array(width * height * 4);
    debugArray1 = new Float32Array(width * height);
    debugArray2 = new Uint8ClampedArray(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, debugArray);

    for (var i = 0; i < width * height; i++) {
        debugArray1[i] = debugArray[i * 4 + 0];
    }

    console.log(debugArray1);

    for (var i = 0; i < width * height; i++) {
        debugArray2[i * 4 + 0] = debugArray[i * 4 + 0] * 255;
        debugArray2[i * 4 + 1] = debugArray[i * 4 + 1] * 255;
        debugArray2[i * 4 + 2] = debugArray[i * 4 + 2] * 255;
        debugArray2[i * 4 + 3] = debugArray[i * 4 + 3] * 255;
    }

    var img = new ImageData(debugArray2, width, height);
    debugCanvas1.getContext("2d").putImageData(img, 0, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function update(cls, name, fields) {
    var stringify = (obj) => {
        var type = Object.prototype.toString.call(obj);
        if (type === "[object Object]") {
            var pairs = [];
            for (var k in obj) {
                if (!obj.hasOwnProperty(k)) continue;
                pairs.push([k, stringify(obj[k])]);
            }
            pairs.sort((a, b) => a[0] < b[0] ? -1 : 1);
            pairs = pairs.map(v => '"' + v[0] + '":' + v[1]);
            return "{" + pairs + "}";
        }
        if (type === "[object Array]") {
            return "[" + obj.map(v => stringify(v)) + "]";
        }
        return JSON.stringify(obj);
    };

    var obj = env[name];
    if (!obj) {
        obj = new cls();
        for (var i = 0; i < fields.length; i++) {
            updateOwnVariable(obj, fields[i]);
        }
        env[name] = obj;
        return obj;
    }

    var oldOwn = obj.own;
    var toBeDeleted = [];  // [<str>]
    var toBeCreated = [];  // [<str>]
    var newOwn = {};

    // common case: when the existing own and fields are the same
    for (var i = 0; i < fields.length; i++) {
        var k = fields[i];
        newOwn[k] = k;
    }
    if (stringify(newOwn) === stringify(oldOwn)) {
        return; obj;
    }

    // other case: get things into toBeDeleted and toBeCreated, and toBeMoved
    for (var k in oldOwn) {
         if (fields.indexOf(k) < 0) {
             toBeDeleted.push(k)
        }
    }
    for (var i = 0; i < fields.length; i++) {
        var k = fields[i];
        if (!oldOwn[k]) {
            toBeCreated.push(k);
        }
    }

    toBeCreated.forEach((k) => updateOwnVariable(obj, k));
    toBeDeleted.forEach((k) => removeOwnVariable(obj, k));
}

function programFromTable(table, vert, frag, name) {
    return (function () {
        var debugName = name;
	if (debugName === "cream") {
	}
        var prog = createProgram(gl, createShader(gl, name + ".vert", vert),
                                 createShader(gl, name + ".frag", frag));
        var vao = breedVAO;
        var uniLocations = {};


        var forBreed = table.forBreed;
        var viewportW = forBreed ? T : FW;
        var viewportH = forBreed ? T : FH;
        var hasPatchInput = table.hasPatchInput;

        table.defaultUniforms.forEach(function(n) {
            uniLocations[n] = gl.getUniformLocation(prog, n);
        });

        table.uniformTable.keysAndValuesDo((key, entry) => {
            var uni = table.uniform(entry);
            uniLocations[uni] = gl.getUniformLocation(prog, uni);
        });

        table.scalarParamTable.keysAndValuesDo((key, entry) => {
            var name = entry[2];
            var uni = "u_use_vector_" + name;
            uniLocations[uni] = gl.getUniformLocation(prog, uni);
            uni = "u_vector_" + name;
            uniLocations[uni] = gl.getUniformLocation(prog, uni);
            uni = "u_scalar_" + name;
            uniLocations[uni] = gl.getUniformLocation(prog, uni);
        });

        return function(objects, outs, ins, params) {
            // objects: {varName: object}
            // outs: [[varName, fieldName]]
            // ins: [[varName, fieldName]]
            // params: {shortName: value}
            if (debugName === "cream") {
            }
            var object = objects["this"];

            outs.forEach((pair) => {
                textureCopy(objects[pair[0]],
                            objects[pair[0]][pair[1]],
                            objects[pair[0]]["new" + pair[1]])});

            var targets = outs.map(function(pair) {return objects[pair[0]]["new" + pair[1]]});
            if (forBreed) {
                setTargetBuffers(gl, framebufferT, targets);
            } else {
                setTargetBuffers(gl, framebufferF, targets);
            }

            gl.useProgram(prog);
            gl.bindVertexArray(vao);

            gl.viewport(0, 0, viewportW, viewportH);
            gl.uniform2f(uniLocations["u_resolution"], FW, FH);
            gl.uniform1f(uniLocations["u_particleLength"], T);

            var offset = 0;
            if (!forBreed || hasPatchInput) {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, object.x);
                gl.uniform1i(uniLocations["u_that_x"], 0);

                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, object.y);
                gl.uniform1i(uniLocations["u_that_y"], 1);
                offset = 2;
            }

            for (var ind = 0; ind < ins.length; ind++) {
                var pair = ins[ind];
                var glIndex = gl.TEXTURE0 + ind + offset;
                var k = pair[1]
                var val = objects[pair[0]][k];
                gl.activeTexture(glIndex);
                gl.bindTexture(gl.TEXTURE_2D, val);
                gl.uniform1i(uniLocations["u" + "_" + pair[0] + "_" + k], ind + offset);
            }

            for (var k in params) {
                var val = params[k];
                if (val.constructor == WebGLTexture) {
                    var glIndex = gl.TEXTURE0 + ind + offset;
                    gl.activeTexture(glIndex);
                    gl.bindTexture(gl.TEXTURE_2D, val);
                    gl.uniform1i(uniLocations["u_vector_" + k], ind + offset);
                    ind++;
                } else {
                    gl.uniform1i(uniLocations["u_vector_" + k], 0);
                    gl.uniform1f(uniLocations["u_scalar_" + k], val);
                    gl.uniform1i(uniLocations["u_use_vector_" + k], 0);
                }
            }

//            if (forBreed) {
//                gl.clearColor(0.0, 0.0, 0.0, 0.0);
//                gl.clear(gl.COLOR_BUFFER_BIT);
//            }
            gl.drawArrays(gl.POINTS, 0, object.count);
            gl.flush();
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
            for (var i = 0; i < outs.length; i++) {
                var pair = outs[i];
                var o = objects[pair[0]];
                var name = pair[1];
                var tmp = o[name];
                o[name] = o["new"+name];
                o["new"+name] = tmp;
            }
        }
    })();
}

function cleanUpEditorState() {
    if (editor) {
        if (parseErrorWidget) {
            editor.removeLineWidget(parseErrorWidget);
            parseErrorWidget = undefined;
        }
        editor.getAllMarks().forEach(function(mark) { mark.clear(); });
    }
}

function syntaxError(match, src) {
    function toDOM(x) {
        if (x instanceof Array) {
            var xNode = document.createElement(x[0]);
            x.slice(1)
                .map(toDOM)
                .forEach(yNode => xNode.appendChild(yNode));
            return xNode;
        } else {
            return document.createTextNode(x);
        }
    };

    if (editor) {
        setTimeout(
            function() {
                if (editor.getValue() === src && !parseErrorWidget) {
                    function repeat(x, n) {
                        var xs = [];
                        while (n-- > 0) {
                            xs.push(x);
                        }
                        return xs.join('');
                    }
                    var msg = 'Expected: ' + match.getExpectedText();
                    var pos = editor.doc.posFromIndex(match.getRightmostFailurePosition());
                    var error = toDOM(['parseerror', repeat(' ', pos.ch) + '^\n' + msg]);
                    parseErrorWidget = editor.addLineWidget(pos.line, error);
                }
            },
            2500
        );
    }
}

function resetSystem() {
    scripts = {};
    statics = {};
    staticsList = [];
    steppers = {};
    setupCode = null;
    programName = null;

    for (var o in env) {
        var obj = env[o];
        if (typeof obj == "object" && (obj.constructor == Breed || obj.constructor == Patch)) {
            for (var k in obj.own) {
                var tex = obj[k];
                if (tex.constructor === WebGLTexture) {
                    gl.deleteTexture(obj[k]);
                }
            }
            delete env[o];
        }
    }
}

//function updateCode() {
//    var code = editor.getValue();
//    loadShadama(null, code);
//    if (!programName) {
//        programName = "My Cool Effect!";
//    code = "program " + '"' + programName + '"\n' + code;
//        editor.setValue(code);
//    }
//};

function callSetup() {
    loadTime = window.performance.now() / 1000.0;
    env["time"] = 0.0;
    if (statics["setup"]) {
        statics["setup"](env);
    }
}

function addListeners(aCanvas) {
    var rect = aCanvas.getBoundingClientRect();
    var left = rect.left;
    var top = rect.top;
    aCanvas.addEventListener("mousemove", function(e) {
        env.mousemove = {x: e.clientX - left, y: FH - (e.clientY - top)};
    });
    aCanvas.addEventListener("mousedown", function(e) {
        env.mousedown = {x: e.clientX, y: FH - (e.clientY - top)};
    });
    aCanvas.addEventListener("mouseup", function(e) {
        env.mouseup = {x: e.clientX, y: FH - (e.clientY - top)};
    });
}

function emptyImageData(width, height) {
    var ary = new Uint8ClampedArray(width * height * 4);
    for (var i = 0; i < width * height; i++) {
        ary[i * 4 + 0] = i;
        ary[i * 4 + 1] = 0;
        ary[i * 4 + 2] = 0;
        ary[i * 4 + 3] = 255;
    }
    return new ImageData(ary, 256, 256);
}

function initEnv(callback) {
    env.mousedown = {x: 0, y: 0};
    env.mousemove = {x: 0, y: 0};
    env.width = FW;
    env.height = FH;

    env["Display"] = new Display();

    callback();
}

function makeClock() {
    var aClock = document.createElement("canvas");
    aClock.width = 40;
    aClock.height = 40;
    aClock.ticking = false;
    aClock.hand = 0;
    drawClock(aClock, 0, false);

    aClock.onclick = function () {toggleScript(aClock.entry.scriptName)};

    return aClock;
}

function stopClock(aClock) {
    aClock.ticking = false;
    drawClock(aClock);
}

function startClock(aClock) {
    aClock.ticking = true;
    drawClock(aClock);
}

function stopScript(name) {
    delete steppers[name];
    stopClock(detectEntry(name).clock);
}

function startScript(name) {
    steppers[name] = name;
    startClock(detectEntry(name).clock);
}

function toggleScript(name) {
    if (steppers[name]) {
        stopScript(name);
    } else {
        startScript(name);
    }
}

function drawClock(aClock) {
    var hand = aClock.hand;
    var ticking = aClock.ticking;
    function drawFace(ctx, radius, backColor) {
        ctx.moveTo(0, 0);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, 2*Math.PI);
        ctx.fillStyle = backColor;
        ctx.fill();

        ctx.strokeStyle = '#333';
        ctx.lineWidth = radius*0.1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, radius*0.1, 0, 2*Math.PI);
        ctx.fillStyle = "#333";
        ctx.fill();
    };

    function drawHand(ctx, length, dir) {
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.moveTo(0, 0);
        ctx.rotate(dir);
        ctx.lineTo(0, -length);
        ctx.stroke();
    };

    var ctx = aClock.getContext('2d');
    var backColor = ticking ? '#ffcccc' : '#ffffff';
    var dir = hand / 360.0 * (Math.PI * 2.0);

    ctx.transform(1, 0, 0, 1, 18, 18);
    drawFace(aClock.getContext('2d'), 16, backColor);
    drawHand(aClock.getContext('2d'), 10, dir);
    ctx.resetTransform();
}

function makeEntry(name) {
    var entry = document.createElement("div");
    var aClock = makeClock();
    entry.scriptName = name;
    entry.appendChild(aClock);
    entry.clock = aClock;
    aClock.entry = entry;
    var button = document.createElement("div");
    button.className = "staticName";
    button.innerHTML = name;
    button.onclick = function() {
        env["time"] = (window.performance.now() / 1000) - loadTime;
        if (statics[entry.scriptName]) {
            statics[entry.scriptName](env);
        }
    };
    entry.appendChild(button);
    return entry;
}

function detectEntry(name) {
    for (var j = 0; j < watcherList.children.length; j++) {
        var oldEntry = watcherList.children[j];
        if (oldEntry.scriptName === name) {return oldEntry;}
    }
    return null;
}

function removeAll() {
    while (watcherList.firstChild) {
	watcherList.removeChild(watcherList.firstChild);
    }
}

function addAll(elems) {
    for (var j = 0; j < elems.length; j++) {
        watcherList.appendChild(elems[j]);
    }
}

function updateClocks() {
    for (var j = 0; j < watcherList.children.length; j++) {
        var child = watcherList.children[j];
        var aClock = child.clock;
        if (aClock.ticking) {
            aClock.hand = (aClock.hand + 2) % 360;
        }
        drawClock(aClock);
    }
}

function updateEnv() {
    function printNum(obj) {
        if (typeof obj !== "number") return obj;
        let str = Math.abs(obj) < 1 ? obj.toPrecision(3) : obj.toFixed(3);
        return str.replace(/\.0*$/, "");
    }
    function print(obj) {
        if (typeof obj !== "object") return printNum(obj);
        let props = Object.getOwnPropertyNames(obj)
                    .filter((k)=>typeof obj[k] !== "object")
                    .map((k)=>`${k}:${printNum(obj[k])}`);
        return `{${props.join(' ')}}`;
    }
    let list = Object.getOwnPropertyNames(env)
               .sort()
               .map((k)=>`${k}: ${print(env[k])}`);
    envList.innerHTML = `<pre>${list.join('\n')}</pre>`;
}

function populateList(newList) {
    watcherElements = [];
    for (var i = 0; i < newList.length; i++) {
        var name = newList[i];
        var entry = detectEntry(name);
        if (!entry) {
            entry = makeEntry(name);
        }
        watcherElements.push(entry);
    }
    removeAll();
    addAll(watcherElements);

    if (statics["loop"]) {
        startScript("loop");
    }
}

function runLoop() {
  if (statics["loop"]) {
    steppers["loop"] = "loop";
  }
}

function initialize() {
    if (initialized) return;
    initialized = true;

    runTests = /test.?=/.test(window.location.search);

    if (runTests) {
        setTestParams();
        document.getElementById("bigTitle").innerHTML = "Shadama Tests";
    }

    readout = document.getElementById("readout");
    watcherList = document.getElementById("watcherList");
  
    shadamaCanvas = document.getElementById("shadamaCanvas");
    if (!shadamaCanvas) {
	shadamaCanvas = document.createElement("canvas");
    }
    shadamaCanvas.id = "shadamaCanvas";
    shadamaCanvas.width = FW;
    shadamaCanvas.height = FH;
    shadamaCanvas.style.width = (FW * ENLARGE) + "px";
    shadamaCanvas.style.height = (FH * ENLARGE) + "px";

    //    addListeners(shadamaCanvas);
  
    gl = shadamaCanvas.getContext("webgl2");
    var ext = gl.getExtension("EXT_color_buffer_float");

    initBreedVAO(gl);
    initPatchVAO(gl);
    initCompiler();
    //  initServerFiles();
    //  initFileList();

    programs["drawBreed"] = drawBreedProgram(gl);
    programs["drawPatch"] = drawPatchProgram(gl);
    programs["debugPatch"] = debugPatchProgram(gl);
    programs["diffusePatch"] = diffusePatchProgram(gl);
    programs["copy"] = copyProgram(gl);

    debugTexture0 = createTexture(gl, new Float32Array(T*T*4), gl.FLOAT, T, T);
    debugTexture1 = createTexture(gl, new Float32Array(FW*FH*4), gl.FLOAT, FW, FH);

    var tmp = createTexture(gl, new Float32Array(T * T), gl.R32F, T, T);
    framebufferT = gl.createFramebuffer();
    initFramebuffer(gl, framebufferT, tmp, gl.R32F, T, T);
    gl.deleteTexture(tmp);

    var tmp = createTexture(gl, new Float32Array(FW*FH), gl.R32F, FW, FH);
    framebufferR = gl.createFramebuffer();
    initFramebuffer(gl, framebufferR, tmp, gl.R32F, FW, FH);
    gl.deleteTexture(tmp);

    var tmp = createTexture(gl, new Float32Array(FW*FH*4), gl.FLOAT, FW, FH);
    framebufferF = gl.createFramebuffer();
    initFramebuffer(gl, framebufferF, tmp, gl.FLOAT, FW, FH);
    gl.deleteTexture(tmp);

    var tmp = createTexture(gl, new Float32Array(T*T*4), gl.FLOAT, T, T);
    framebufferD = gl.createFramebuffer();
    initFramebuffer(gl, framebufferD, tmp, gl.FLOAT, FW, FH);
    gl.deleteTexture(tmp);

    initEnv(function() {
	//runner();
    });
}

function maybeRunner() {
    if (!animationRequested) {
	runner();
    }
}

function runner() {
    animationRequested = false;
    step();
    if (readPixelCallback) {
	readPixelCallback(readPixels());
    }
    if (keepGoing) {
	window.requestAnimationFrame(runner);
	animationRequested = true;
    } else {
	keepGoing = true;
    }
}

function step() {
    env["time"] = (window.performance.now() / 1000) - loadTime;
    for (var k in steppers) {
        var func = statics[k];
        if (func) {
            func(env);
        }
    }
}

function getCanvas() {
  return shadamaCanvas;
}

function pause() {
  keepGoing = false;
}

function destroy() {
    keepGoing = false;
    Globals.shadama = null;
}

function pointermove(x, y) {
  env.mousemove = {x: x, y: y};
}

function pointerup(x, y) {
  env.mouseup = {x: x, y: y};
}

function pointerdown(x, y) {
  env.mousedown = {x: x, y: y}
}

var shadamaGrammar = String.raw`
Shadama {
  TopLevel
    = ProgramDecl? (Breed | Patch | Script | Static)*

  ProgramDecl = program string
  Breed = breed ident "(" Formals ")"
  Patch = patch ident "(" Formals ")"
  Script = def ident "(" Formals ")" Block
  Static = static ident "(" Formals ")" Block

  Formals
    = ident ("," ident)* -- list
    | empty

  Block = "{" StatementList "}"

  StatementList = Statement*

  Statement
    = Block
    | VariableStatement
    | AssignmentStatement
    | ExpressionStatement
    | IfStatement
    | ExpressionStatement

  VariableStatement = var VariableDeclaration ";"
  VariableDeclaration = ident Initialiser?
  Initialiser = "=" Expression

  ExpressionStatement = Expression ";"
  IfStatement = if "(" Expression ")" Statement (else Statement)?

  AssignmentStatement
    = LeftHandSideExpression "=" Expression ";"

  LeftHandSideExpression
    = ident "." ident -- field
    | ident

  Expression = EqualityExpression

  EqualityExpression
    = EqualityExpression "==" LogicalExpression  -- equal
    | EqualityExpression "!=" LogicalExpression  -- notEqual
    | LogicalExpression

  LogicalExpression
    = LogicalExpression "&&" RelationalExpression       -- and
    | LogicalExpression "||" RelationalExpression       -- or
    | RelationalExpression

  RelationalExpression
    = RelationalExpression "<" AddExpression           -- lt
    | RelationalExpression ">" AddExpression           -- gt
    | RelationalExpression "<=" AddExpression          -- le
    | RelationalExpression ">=" AddExpression          -- ge
    | AddExpression

  AddExpression
    = AddExpression "+" MulExpression  -- plus
    | AddExpression "-" MulExpression -- minus
    | MulExpression

  MulExpression
    = MulExpression "*" PrimExpression  -- times
    | MulExpression "/" PrimExpression  -- divide
    | MulExpression "%" PrimExpression  -- mod
    | UnaryExpression

  UnaryExpression
    = "+" PrimExpression -- plus
    | "-" PrimExpression -- minus
    | "!" PrimExpression -- not
    | PrimExpression

  PrimExpression
    = "(" Expression ")"  -- paren
    | PrimitiveCall
    | MethodCall
    | PrimExpression "." ident     -- field
    | ident               -- variable
    | string              -- string
    | number              -- number

  PrimitiveCall
    = ident "(" Actuals ")"

  MethodCall
    = ident "." ident "(" Actuals ")"

  Actuals
    = Expression ("," Expression)* -- list
    | empty

  ident
    = letter (alnum | "_")*

  number
    = digit* "." digit+  -- fract
    | digit+             -- whole

  string = "\"" doubleStringCharacter* "\""

  doubleStringCharacter
    = "\\" any           -- escaped
    | ~"\"" any          -- nonEscaped

  identifierStart = letter | "_"
  identifierPart = identifierStart | digit

  var = "var" ~identifierPart
  if = "if" ~identifierPart
  breed = "breed" ~identifierPart
  patch = "patch" ~identifierPart
  else = "else" ~identifierPart
  def = "def" ~identifierPart
  this = "this" ~identifierPart
  self = "self" ~identifierPart
  static = "static" ~identifierPart
  program = "program" ~identifierPart

  empty =
  space
   += "//" (~nl any)* nl  -- cppComment
    | "/*" (~"*/" any)* "*/" -- cComment
  nl = "\n"
}
`;

var g;
var s;

function initCompiler() {
    g = ohm.grammar(shadamaGrammar);
    s = g.createSemantics();
    initSemantics();
}

function initSemantics() {
    function addDefaults(obj) {
        obj["clear"] = new SymTable([]);
        obj["setCount"] = new SymTable([
            ["param", null, "num"]]);
        obj["draw"] = new SymTable([]);
        obj["fillRandom"] = new SymTable([
            ["param", null, "name"],
            ["param", null, "min"],
            ["param", null, "max"]]);
        obj["fillRandomDir"] = new SymTable([
            ["param", null, "xDir"],
            ["param", null, "yDir"]]);
        obj["fillSpace"] = new SymTable([
            ["param", null, "xName"],
            ["param", null, "yName"],
            ["param", null, "x"],
            ["param", null, "y"]]);
        obj["fillImage"] = new SymTable([
            ["param", null, "xName"],
            ["param", null, "yName"],
            ["param", null, "rName"],
            ["param", null, "gName"],
            ["param", null, "bName"],
            ["param", null, "aName"],
            ["param", null, "imageData"]]);
        obj["diffuse"] = new SymTable([
            ["param", null, "name"],
	]);
        obj["random"] = new SymTable([
            ["param", null, "seed"],
	]);
        obj["playSound"] = new SymTable([
            ["param", null, "name"],
	]);
    }

    s.addOperation(
        "symTable(table)",
        {
            TopLevel(p, ds) {
                var result = {};
                addDefaults(result);
                if (p.children.length > 0) {
                    result = addAsSet(result, p.children[0].symTable(null));
                }
                for (var i = 0; i< ds.children.length; i++) {
                    var d = ds.children[i].symTable(null);
                    var ctor = ds.children[i].ctorName;
                    if (ctor == "Script" || ctor == "Static") {
                        addAsSet(result, d);
                    }
                }
                return result;
            },

            ProgramDecl(_p, s) {
                return {_programName: s.sourceString.slice(1, s.sourceString.length - 1)}
            },

            Breed(_b, n, _o, fs, _c) {
                var table = new SymTable();
                fs.symTable(table);
                table.process();
                return {[n.sourceString]: table};
            },

            Patch(_p, n, _o, fs, _c) {
                var table = new SymTable();
                fs.symTable(table);
                table.process();
                return {[n.sourceString]: table};
            },

            Script(_d, n, _o, ns, _c, b) {
                var table = new SymTable();
                ns.symTable(table);
                b.symTable(table);
                table.process();
                return {[n.sourceString]: table};
            },

            Static(_s, n, _o, ns, _c, b) {
                var table = new SymTable();
                ns.symTable(table);
                table.process();
                return {[n.sourceString]: table};
            },

            Formals_list(h, _c, r) {
                var table = this.args.table;
                table.add("param", null, h.sourceString);
                for (var i = 0; i < r.children.length; i++) {
                    var n = r.children[i].sourceString;
                    table.add("param", null, n);
                }
                return table;
            },

            StatementList(ss) { // an iter node
                var table = this.args.table;
                for (var i = 0; i< ss.children.length; i++) {
                    ss.children[i].symTable(table);
                }
                return table;
            },

            VariableDeclaration(n, optI) {
                var table = this.args.table;
                var r = {["var." + n.sourceString]: ["var", null, n.sourceString]};
                table.add("var", null, n.sourceString);
                if (optI.children.length > 0) {
                    optI.children[0].symTable(table);
                }
                return table;
            },

            IfStatement(_if, _o, c, _c, t, _e, optF) {
                var table = this.args.table;
                c.symTable(table);
                t.symTable(table);
                if (optF.children.length > 0) {
                    optF.children[0].symTable(table);
                }
                return table;
            },

            LeftHandSideExpression_field(n, _a, f) {
                this.args.table.add("propOut", n.sourceString, f.sourceString);
                return this.args.table;
            },
            PrimExpression_field(n, _p, f) {
                var table = this.args.table;
                if (!(n.ctorName === "PrimExpression" && (n.children[0].ctorName === "PrimExpression_variable"))) {
                    console.log("you can only use 'this' or incoming patch name");
                }
                var name = n.sourceString;
                if (!table.isBuiltin(name)) {
                    table.add("propIn", n.sourceString, f.sourceString);
                }
                return table;
            },

            PrimExpression_variable(n) {
                return {};//["var." + n.sourceString]: ["var", null, n.sourceString]};
            },

            PrimitiveCall(n, _o, as, _c) {
                this.args.table.maybePrimitive(n.sourceString);
                return as.symTable(this.args.table);
            },

            Actuals_list(h, _c, r) {
                var table = this.args.table;
                h.symTable(table);
                for (var i = 0; i < r.children.length; i++) {
                    r.children[i].symTable(table);
                }
                return table;
            },

            ident(_h, _r) {return this.args.table;},
            number(s) {return this.args.table;},
            _terminal() {return this.args.table;},
            _nonterminal(children) {
                var table = this.args.table;
                for (var i = 0; i < children.length; i++) {
                    children[i].symTable(table);
                }
                return table;
            },
        });

    function transBinOp(l, r, op, args) {
        var table = args.table;
        var vert = args.vert;
        var frag = args.frag;
        vert.push("(");
        l.glsl(table, vert, frag);
        vert.push(op);
        r.glsl(table, vert, frag);
        vert.push(")");
    };

    s.addOperation(
        "glsl_script_formals",
        {
            Formals_list(h, _c, r) {
                return [h.sourceString].concat(r.children.map((c) => c.sourceString));
            },
        });

    s.addOperation(
        "glsl_helper(table, vert, frag)",
        {
            Block(_o, ss, _c) {
                var table = this.args.table;
                var vert = this.args.vert;
                var frag = this.args.frag;

                var patchInput = `
  float _x = texelFetch(u_that_x, ivec2(a_index), 0).r;
  float _y = texelFetch(u_that_y, ivec2(a_index), 0).r;
  vec2 _pos = vec2(_x, _y);
`;

                var patchPrologue = `
  vec2 oneToOne = (_pos / u_resolution) * 2.0 - 1.0;
`;

                var breedPrologue = `
  vec2 oneToOne = (a_index / u_particleLength) * 2.0 - 1.0;
`;

                var epilogue = `
  gl_Position = vec4(oneToOne, 0.0, 1.0);
  gl_PointSize = 1.0;
`;
                var breedEpilogue = `
  gl_Position = vec4(oneToOne, 0.0, 1.0);
  gl_PointSize = 1.0;
`;

                vert.pushWithSpace("{\n");
                vert.addTab();

                if (table.hasPatchInput || !table.forBreed) {
                    vert.push(patchInput);
                }

                if (table.forBreed) {
                    vert.push(breedPrologue);
                } else {
                    vert.push(patchPrologue);
                }

                table.scalarParamTable.keysAndValuesDo((key, entry) => {
                    var e = entry[2];
                    var template1 = `float ${e} = u_use_vector_${e} ? texelFetch(u_vector_${e}, ivec2(a_index), 0).r : u_scalar_${e};`;
                    vert.tab();
                    vert.push(template1);
                    vert.cr();
                });

                table.uniformDefaults().forEach(elem => {
                    vert.tab();
                    vert.push(elem);
                    vert.cr();
                });


                ss.glsl(table, vert, frag);
                vert.push(table.forBreed ? epilogue : epilogue);

                vert.decTab();
                vert.tab();
                vert.push("}");
            },

            Script(_d, n, _o, ns, _c, b) {
                var table = this.args.table;
                var vert = this.args.vert;
                var frag = this.args.frag;

                var breedPrologue =
`#version 300 es
layout (location = 0) in vec2 a_index;
uniform vec2 u_resolution;
uniform float u_particleLength;
`;

                var patchPrologue = breedPrologue + `
uniform sampler2D u_that_x;
uniform sampler2D u_that_y;
`;

                vert.push(table.forBreed && !table.hasPatchInput ? breedPrologue : patchPrologue);

                table.uniforms().forEach(elem => {
                    vert.push(elem);
                    vert.cr();
                });

                table.paramUniforms().forEach(elem => {
                    vert.push(elem);
                    vert.cr();
                });

                table.vertVaryings().forEach(elem => {
                    vert.push(elem);
                    vert.cr();
                });

                vert.crIfNeeded();

                table.primitives().forEach((n) => {
                    vert.push(n);
                });

                vert.push("void main()");

                // fragment head

                frag.push("#version 300 es\n");
                frag.push("precision highp float;\n");

                table.fragVaryings().forEach((elem) =>{
                    frag.push(elem);
                    frag.cr();
                });

                table.outs().forEach((elem) => {
                    frag.push(elem);
                    frag.cr();
                });

                frag.crIfNeeded();
                frag.push("void main()");

                b.glsl_helper(table, vert, frag);

                vert.crIfNeeded();

                frag.pushWithSpace("{");
                frag.cr();

                frag.addTab();
                table.fragColors().forEach((line) => {
                    frag.tab();
                    frag.push(line);
                    frag.cr();
                });
                frag.decTab();
                frag.crIfNeeded();
                frag.push("}");
                frag.cr();

                return {[n.sourceString]: [table, vert.contents(), frag.contents(), ["updateScript", n.sourceString]]};
            }
        });

    s.addOperation(
        "glsl(table, vert, frag)",
        {
            TopLevel(p, ds) {
                var table = this.args.table;
                var result = {};
                for (var i = 0; i < ds.children.length; i++) {
                    var child = ds.children[i];
                    if (child.ctorName == "Static") {
                        var js = new CodeStream();
                        var val = child.static(table, js, null, false);
                        addAsSet(result, val);
                    } else {
                        var val = child.glsl(table, null, null);
                        addAsSet(result, val);
                    }
                }
                result["_programName"] = table["_programName"];
                return result;
            },

            Breed(_b, n, _o, fs, _c) {
                var table = this.args.table;
                var vert = new CodeStream();
                var frag = new CodeStream();
                var js = [];
                js.push("updateBreed");
                js.push(n.sourceString);
                js.push(fs.glsl_script_formals());
                return {[n.sourceString]: [table[n.sourceString], vert.contents(), frag.contents(), js]};
            },

            Patch(_p, n, _o, fs, _c) {
                var table = this.args.table;
                var vert = new CodeStream();
                var frag = new CodeStream();
                var js = [];
                js.push("updatePatch");
                js.push(n.sourceString);
                js.push(fs.glsl_script_formals());
                return {[n.sourceString]: [table[n.sourceString], vert.contents(), frag.contents(), js]};
            },

            Script(_d, n, _o, ns, _c, b) {
                var inTable = this.args.table;
                var table = inTable[n.sourceString];
                var vert = new CodeStream();
                var frag = new CodeStream();

                return this.glsl_helper(table, vert, frag);
            },

            Block(_o, ss, _c) {
                var table = this.args.table;
                var vert = this.args.vert;
                var frag = this.args.frag;

                vert.pushWithSpace("{");
                vert.cr();
                vert.addTab();
                ss.glsl(table, vert, frag);
                vert.decTab();
                vert.tab();
                vert.push("}");
            },

            StatementList(ss) {
                var table = this.args.table;
                var vert = this.args.vert;
                var frag = this.args.frag;
                for (var i = 0; i < ss.children.length; i++) {
                    vert.tab();
                    ss.children[i].glsl(table, vert, frag);
                }
            },

            Statement(e) {
                var table = this.args.table;
                var vert = this.args.vert;
                var frag = this.args.frag;
                e.glsl(table, vert, frag);
                if (e.ctorName !== "Block" && e.ctorName !== "IfStatement") {
                    vert.push(";");
                    vert.cr();
                }
                if (e.ctorName == "IfStatement") {
                    vert.cr();
                }
            },

            IfStatement(_i, _o, c, _c, t, _e, optF) {
                var table = this.args.table;
                var vert = this.args.vert;
                var frag = this.args.frag;
                vert.pushWithSpace("if");
                vert.pushWithSpace("(");
                c.glsl(table, vert, frag);
                vert.push(")");
                t.glsl(table, vert, frag);
                if (optF.children.length === 0) { return;}
                vert.pushWithSpace("else");
                optF.glsl(table, vert, frag);
            },

            AssignmentStatement(l, _a, e, _) {
                var table = this.args.table;
                var vert = this.args.vert;
                var frag = this.args.frag;
                l.glsl(table, vert, frag);
                vert.push(" = ");
                e.glsl(table, vert, frag);
            },

            VariableStatement(_v, d, _s) {
                var table = this.args.table;
                var vert = this.args.vert;
                var frag = this.args.frag;
                d.glsl(table, vert, frag);
            },

            VariableDeclaration(n, i) {
                var table = this.args.table;
                var vert = this.args.vert;
                var frag = this.args.frag;
                vert.push("float");
                vert.pushWithSpace(n.sourceString);
                if (i.children.length !== 0) {
                    vert.push(" = ");
                    i.glsl(table, vert, frag);
                }
            },

            Initialiser(_a, e) {
                e.glsl(this.args.table, this.args.vert, this.args.frag);
            },

            LeftHandSideExpression_field(n, _p, f) {
                var table = this.args.table;
                var vert = this.args.vert;
                vert.push(table.varying(["propOut", n.sourceString, f.sourceString]));
            },

            ExpressionStatement(e ,_s) {
                var table = this.args.table;
                var vert = this.args.vert;
                var frag = this.args.frag;
                e.glsl(table, vert, frag);
            },

            Expression(e) {
                e.glsl(this.args.table, this.args.vert, this.args.frag);
            },

            EqualityExpression(e) {
                e.glsl(this.args.table, this.args.vert, this.args.frag);
            },

            EqualityExpression_equal(l, _, r) {
                transBinOp(l, r, " == ", this.args);
            },

            EqualityExpression_notEqual(l, _, r) {
                transBinOp(l, r, " != ", this.args);
            },

            RelationalExpression(e) {
                e.glsl(this.args.table, this.args.vert, this.args.frag);
            },

            RelationalExpression_lt(l, _, r) {
                transBinOp(l, r, " < ", this.args);
            },

            RelationalExpression_gt(l, _, r) {
                transBinOp(l, r, " > ", this.args);
            },

            RelationalExpression_le(l, _, r) {
                transBinOp(l, r, " <= ", this.args);
            },

            RelationalExpression_ge(l, _, r) {
                transBinOp(l, r, " >= ", this.args);
            },

            LogicalExpression(e) {
                e.glsl(this.args.table, this.args.vert, this.args.frag);
            },

            LogicalExpression_and(l, _, r) {
                transBinOp(l, r, " && ", this.args);
            },

            LogicalExpression_or(l, _, r) {
                transBinOp(l, r, " || ", this.args);
            },

            AddExpression(e) {
                e.glsl(this.args.table, this.args.vert, this.args.frag);
            },

            AddExpression_plus(l, _, r) {
                transBinOp(l, r, " + ", this.args);
            },

            AddExpression_minus(l, _, r) {
                transBinOp(l, r, " - ", this.args);
            },

            MulExpression(e) {
                e.glsl(this.args.table, this.args.vert, this.args.frag);
            },

            MulExpression_times(l, _, r) {
                transBinOp(l, r, " * ", this.args);
            },

            MulExpression_divide(l, _, r) {
                transBinOp(l, r, " / ", this.args);
            },

            MulExpression_mod(l, _, r) {
                transBinOp(l, r, " % ", this.args);
            },

            UnaryExpression(e) {
                e.glsl(this.args.table, this.args.vert, this.args.frag);
            },

            UnaryExpression_plus(_p, e) {
                e.glsl(this.args.table, this.args.vert, this.args.frag);
            },

            UnaryExpression_minus(_p, e) {
                var table = this.args.table;
                var vert = this.args.vert;
                var frag = this.args.frag;
                vert.pushWithSpace("-");
                e.glsl(table, vert, frag);
            },

            UnaryExpression_not(_p, e) {
                var table = this.args.table;
                var vert = this.args.vert;
                var frag = this.args.frag;
                vert.pushWithSpace("!");
                e.glsl(table, vert, frag);
            },

            PrimExpression(e) {
                e.glsl(this.args.table, this.args.vert, this.args.frag);
            },

            PrimExpression_paren(_o, e, _c) {
                e.glsl(this.args.table, this.args.vert, this.args.frag);
            },

            PrimExpression_number(e) {
                var vert = this.args.vert;
                var ind = e.sourceString.indexOf(".");
                if (ind < 0) {
                    vert.push(e.sourceString + ".0");
                } else {
                    vert.push(e.sourceString);
                }
            },

            PrimExpression_field(n, _p, f) {
                var table = this.args.table;
                var vert = this.args.vert;
                var frag = this.args.frag;

                if (table.isBuiltin(n.sourceString)) {
                    vert.push(n.sourceString + "." + f.sourceString);
                } else {
                    if (n.sourceString === "this") {
                        vert.push("texelFetch(" +
                                  table.uniform(["propIn", n.sourceString, f.sourceString]) +
                                  ", ivec2(a_index), 0).r");
                    } else {
                        vert.push("texelFetch(" +
                                  table.uniform(["propIn", n.sourceString, f.sourceString]) +
                                  ", ivec2(_pos), 0).r");
                    }
                }
            },

            PrimExpression_variable(n) {
                var table = this.args.table;
                var vert = this.args.vert;
                var frag = this.args.frag;
                vert.push(n.sourceString);
            },

            PrimitiveCall(n, _o, as, _c) {
                var table = this.args.table;
                var vert = this.args.vert;
                var frag = this.args.frag;
                vert.push(n.sourceString);
                vert.push("(");
                as.glsl(table, vert, frag);
                vert.push(")");
            },

            Actuals_list(h, _c, r) {
                var table = this.args.table;
                var vert = this.args.vert;
                var frag = this.args.frag;
                h.glsl(table, vert, frag);
                for (var i = 0; i < r.children.length; i++) {
                    vert.push(", ");
                    r.children[i].glsl(table, vert, frag);
                }
            },

            ident(n, rest) {
                this.args.vert.push(this.sourceString);
            }
        });

    function staticTransBinOp(l, r, op, args) {
        var table = args.table;
        var js = args.js;
        var method = args.method;
        var isOther = args.isOther;
        js.push("(");
        l.static(table, js, method, isOther);
        js.push(op);
        r.static(table, js, method, isOther);
        js.push(")");
    };

    s.addOperation(
        "static_method_helper(table, js, method, isOther)",
        {
            Actuals_list(h, _c, r) {
                var table = this.args.table;
                var result = [];
                var js = new CodeStream();
                var method = this.args.method;

                function isOther(i) {
                    var realTable = table[method];
                    if (!realTable) {return false}
                    var r = realTable.usedAsOther(realTable.param.at(i)[2]);
                    return r;
                };
                h.static(table, js, method, isOther(0));
                result.push(js.contents());
                for (var i = 0; i < r.children.length; i++) {
                    var c = r.children[i];
                    var js = new CodeStream();
                    c.static(table, js, method, isOther(i+1));
                    result.push(js.contents());
                }
                return result;
            },

            Formals_list(h, _c, r) {
                var table = this.args.table;
                var result = [];
                var js = new CodeStream();

                result.push(h.sourceString);
                for (var i = 0; i < r.children.length; i++) {
                    var c = r.children[i];
                    result.push(", ");
                    result.push(c.sourceString);
                }
                return result;
            },

            empty() {
                return [];
            }
        });

    s.addOperation(
        "static(table, js, method, isOther)",
        {

            Static(_s, n, _o, fs, _c, b) {
                var table = this.args.table;
                var js = this.args.js;
                var method = this.args.method;

                js.push("(function");
                js.pushWithSpace(n.sourceString);
                js.push("(");
                js.push(fs.static_method_helper(table, null, null, null));
                js.push(") ");
                b.static(table, js, method, false);
                js.push(")");
                return {[n.sourceString]: js.contents()};
            },

            Block(_o, ss, _c) {
                var table = this.args.table;
                var js = this.args.js;
                var method = this.args.method;
                js.pushWithSpace("{");
                js.cr();
                js.addTab();
                ss.static(table, js, method, false);
                js.decTab();
                js.tab();
                js.push("}");
            },

            StatementList(ss) {
                var table = this.args.table;
                var js = this.args.js;
                var method = this.args.method;
                var isOther = this.args.isOther;
                for (var i = 0; i < ss.children.length; i++) {
                    js.tab();
                    ss.children[i].static(table, js, method, isOther);
                }
            },

            Statement(e) {
                var table = this.args.table;
                var js = this.args.js;
                var method = this.args.method;
                var isOther = this.args.isOther;
                e.static(table, js, method, isOther);
                if (e.ctorName !== "Block" && e.ctorName !== "IfStatement") {
                    js.push(";");
                    js.cr();
                }
                if (e.ctorName == "IfStatement") {
                    js.cr();
                }
            },

            IfStatement(_i, _o, c, _c, t, _e, optF) {
                var table = this.args.table;
                var js = this.args.js;
                var method = this.args.method;
                var isOther = this.args.isOther;
                js.push("if");
                js.pushWithSpace("(");
                c.static(table, js, method, isOther);
                js.push(")");
                t.static(table, js, method, isOther);
                if (optF.children.length === 0) {return;}
                js.pushWithSpace("else");
                optF.static(table, js, method, isOther);
            },

            VariableStatement(_v, d, _s) {
                var table = this.args.table;
                var js = this.args.js;
                var method = this.args.method;
                var isOther = this.args.isOther;
                d.static(table, js, method, isOther);
            },

            VariableDeclaration(n, i) {
                var table = this.args.table;
                var js = this.args.js;
                var method = this.args.method;
                var isOther = this.args.isOther;
                js.push("env.");
                js.push(n.sourceString);
                js.pushWithSpace("= ");
                if (i.children.length !== 0) {
                    i.static(table, js, method, isOther);
                } else {
                    js.pushWithSpace("null;");
                }
            },

            AssignmentStatement(l, _a, e, _) {
                var table = this.args.table;
                var js = this.args.js;
                var method = this.args.method;
                var isOther = this.args.isOther;
                js.push("env.");
                js.push(l.sourceString);
                js.pushWithSpace("= ");
                e.static(table, js, method, isOther);
            },

            Initialiser(_a, e) {
                e.static(this.args.table, this.args.js, this.args.method, this.args.isOther);
            },

            ExpressionStatement(e, _s) {
                e.static(this.args.table, this.args.js, this.args.method, this.args.isOther);
            },

            Expression(e) {
                e.static(this.args.table, this.args.js, this.args.method, this.args.isOther);
            },

            EqualityExpression(e) {
                e.static(this.args.table, this.args.js, this.args.method, this.args.isOther);
            },

            EqualityExpression_equal(l, _, r) {
                staticTransBinOp(l, r, " == ", this.args);
            },

            EqualityExpression_notEqual(l, _, r) {
                staticTransBinOp(l, r, " != ", this.args);
            },

            RelationalExpression(e) {
                e.static(this.args.table, this.args.js, this.args.method, this.args.isOther);
            },

            RelationalExpression_lt(l, _, r) {
                staticTransBinOp(l, r, " < ", this.args);
            },

            RelationalExpression_gt(l, _, r) {
                staticTransBinOp(l, r, " > ", this.args);
            },

            RelationalExpression_le(l, _, r) {
                staticTransBinOp(l, r, " <= ", this.args);
            },

            RelationalExpression_ge(l, _, r) {
                staticTransBinOp(l, r, " >= ", this.args);
            },

            LogicalExpression(e) {
                e.static(this.args.table, this.args.js, this.args.method, this.args.isOther);
            },

            LogicalExpression_and(l, _, r) {
                staticTransBinOp(l, r, " && ", this.args);
            },

            LogicalExpression_or(l, _, r) {
                staticTransBinOp(l, r, " || ", this.args);
            },

            AddExpression(e) {
                e.static(this.args.table, this.args.js, this.args.method, this.args.isOther);
            },

            AddExpression_plus(l, _, r) {
                staticTransBinOp(l, r, " + ", this.args);
            },

            AddExpression_minus(l, _, r) {
                staticTransBinOp(l, r, " - ", this.args);
            },

            MulExpression(e) {
                e.static(this.args.table, this.args.js, this.args.method, this.args.isOther);
            },

            MulExpression_times(l, _, r) {
                staticTransBinOp(l, r, " * ", this.args);
            },

            MulExpression_divide(l, _, r) {
                staticTransBinOp(l, r, " / ", this.args);
            },

            MulExpression_mod(l, _, r) {
                staticTransBinOp(l, r, " % ", this.args);
            },

            UnaryExpression(e) {
                e.static(this.args.table, this.args.js, this.args.method, this.args.isOther);
            },

            UnaryExpression_plus(_p, e) {
                e.static(this.args.table, this.args.js, this.args.method, this.args.isOther);
            },

            UnaryExpression_minus(_p, e) {
                var js = this.args.js;
                js.pushWithSpace("-");
                e.static(this.args.table, this.args.js, this.args.method, this.args.isOther);
            },

            UnaryExpression_not(_p, e) {
                var js = this.args.js;
                js.pushWithSpace("!");
                e.static(this.args.table, this.args.js, this.args.method, this.args.isOther);
            },

            PrimExpression(e) {
                e.static(this.args.table, this.args.js, this.args.method, this.args.isOther);
            },

            PrimExpression_paren(_o, e, _c) {
                e.static(this.args.table, this.args.js, this.args.method, this.args.isOther);
            },

            PrimExpression_string(e) {
                var js = this.args.js;
                js.push(e.sourceString);
            },

            PrimExpression_number(e) {
                var js = this.args.js;
                js.push(e.sourceString);
            },

            PrimExpression_field(n, _p, f) {
                var js = this.args.js;
                n.static(this.args.table, js, this.args.method, this.args.isOther);
                js.push(".");
                js.push(f.sourceString);
            },

            PrimExpression_variable(n) {
                var table = this.args.table;
                var js = this.args.js;
                var method = this.args.method;
                var isOther = this.args.isOther;
                js.push('env["' + n.sourceString + '"]');
            },

            PrimitiveCall(n, _o, as, _c) {
                var table = this.args.table;
                var js = this.args.js;
                var prim = n.sourceString;
                var math = ["random", // 0 arg
                            "abs", "acos", "acosh", "asin", "asinh", "atan", "atanh",
                            "cbrt", "ceil", "cos", "cosh", "exp", "expm1", "floor",
                            "log", "log1p", "log10", "log2", "round", "sign", "sin",
                            "sinh", "sqrt", "tan", "tanh", "trunc", // 1 arg
                            "atan2", "log2", "max", "min", "pow" // 2 args
                           ];
                if (math.indexOf(prim) >= 0) {
                    var actuals = as.static_method_helper(table, null, null, false);
                    var str = actuals.join(", ");
                    js.push("Math.");
                    js.push(prim);
                    js.push("(");
                    js.push(str);
                    js.push(")");
                }
            },

            MethodCall(r, _p, n, _o, as, _c) {
                var table = this.args.table;
                var js = this.args.js;
                var method = n.sourceString;

                var displayBuiltIns = ["clear", "playSound"];

                var builtIns = ["draw", "setCount", "fillRandom", "fillSpace", "fillRandomDir", "fillImage", "diffuse"];
                var myTable = table[n.sourceString];


                if (r.sourceString === "Display" && displayBuiltIns.indexOf(method) >= 0) {
                    var actuals = as.static_method_helper(table, null, method, false);
                    var str = actuals.join(", ");
                    js.push(`env["${r.sourceString}"].${method}(${str})`);
                    return;
                }

                if (builtIns.indexOf(method) >= 0) {
                    var actuals = as.static_method_helper(table, null, method, false);
                    var str = actuals.join(", ");
                    js.push(`env["${r.sourceString}"].${method}(${str})`);
                    return;
                }

                var actuals = as.static_method_helper(table, null, method, false);
                var formals;
                if (myTable) {
                    formals = myTable.param;
                }

                if (formals && (actuals.length !== formals.size())) {
                    throw "number of arguments don't match.";
                }
                var params = new CodeStream();
                var objectsString = new CodeStream();

                params.addTab();
                objectsString.addTab();
                for (var i = 0; i < actuals.length; i++) {
                    var actual = actuals[i];
                    if (formals) {
                        var formal = formals.at(i);
                        var shortName = formal[2];
                        var isOther = myTable.usedAsOther(shortName);
                    } else {
                        var shortName = "t" + i;
                        isOther = false;
                    }

                    if (isOther) {
                        objectsString.tab();
                        objectsString.push(`objects["${shortName}"] = ${actual};\n`);
                    } else {
                        params.push(`params["${shortName}"] = ${actual};\n`);
                    }
                }

                var callProgram = `
(function() {
    var data = scripts["${n.sourceString}"];
    var func = data[0];
    var ins = data[1][0]; // [[name, <fieldName>]]
    var formals = data[1][1];
    var outs = data[1][2]; //[[object, <fieldName>]]
    var objects = {};
    objects.this = env["${r.sourceString}"];
    ${objectsString.contents()}
    var params = {};
    ${params.contents()}
    func(objects, outs, ins, params);
})()`;
                js.push(callProgram);
            },
        });
}

class OrderedPair {
    constructor() {
        this.keys = [];
        this.entries = {};
    }

    add(k, entry) {
        var maybeEntry = this.entries[k];
        if (maybeEntry) {
                if (maybeEntry[0] === entry[0] &&
                    maybeEntry[1] === entry[1] &&
                    maybeEntry[2] === entry[2]) {
                    return;
                } else {
                    throw "error duplicate variable" + k
                    return;
                }
        }
        this.entries[k] = entry;
        this.keys.push(k);
    }

    addAll(other) {
        other.keysAndValuesDo((key, entry) =>
            this.add(key, entry));
    }

    at(key) {
        if (typeof key === "number") {
            return this.entries[this.keys[key]];
        } else {
            return this.entries[key];
        }
    }

    keysAndValuesDo(func) {
        for (var i = 0; i < this.keys.length; i++) {
            func(this.keys[i], this.entries[this.keys[i]]);
        }
    }

    keysAndValuesCollect(func) {
        var result = [];
        this.keysAndValuesDo((key, value) => {
            var element = func(key, value);
            result.push(element);
        });
        return result;
    }

    size() {
        return this.keys.length;
    }
}

class SymTable {
    constructor(entries) {
        this.forBreed = true;
        this.hasBreedInput = false;
        this.hasPatchInput = false;
        this.defaultUniforms = null;
        this.defaultAttributes = null;
        this.usedPrimitives = {};

        // - from source (extensional)
        // I use this term because I want to remember which is which)

        this.thisIn = new OrderedPair();   // v = this.x    -> ["propIn", "this", "x"]
        this.otherIn = new OrderedPair();  // v = other.x   -> ["propIn", "other", "x"]
        this.thisOut = new OrderedPair();  // this.x = ... -> ["propOut", "this", "x"]
        this.otherOut = new OrderedPair(); // other.x = ... -> ["propOut", "other", "x"]
        this.param = new OrderedPair();   // def foo(a, b, c) -> [["param", null, "a"], ...]
        this.local= new OrderedPair();    // var x = ... -> ["var", null, "x"]

        // - generated (intensional)

        this.varyingTable = new OrderedPair();
        this.uniformTable = new OrderedPair();
        this.scalarParamTable = new OrderedPair();

        if (entries) {
            for (var i = 0; i < entries.length; i++) {
                this.add.apply(this, (entries[i]))
            }
        }

        this.defaultUniforms = ["u_resolution", "u_particleLength"];
        this.defaultAttributes = ["a_index"];
    }

    process() {
        // maybe a hack: look for outs that are not ins and add them to ins.  Those are use
        this.thisOut.keysAndValuesDo((key, entry) => {
            var newEntry = ["propIn", "this", entry[2]];
            var newK = newEntry.join(".");
            this.thisIn.add(newK, newEntry);
        });
        this.otherOut.keysAndValuesDo((key, entry) => {
            var newEntry = ["propIn", entry[1], entry[2]];
            var newK = newEntry.join(".");
            this.otherIn.add(newK, newEntry);
        });

        this.uniformTable.addAll(this.thisIn);
        this.uniformTable.addAll(this.otherIn);

        if (this.thisIn.size() > 0) {
            this.hasBreedInput = true;
        }
        if (this.otherIn.size() > 0) {
            this.hasPatchInput = true;
        }

        if (this.thisOut.size() > 0 && this.otherOut.size() > 0) {
            throw "shadama cannot write into this and others from the same script."
        } else {
            this.forBreed = this.thisOut.size() > 0;
        }

        if (this.forBreed) {
            this.varyingTable.addAll(this.thisOut);
        } else {
            this.varyingTable.addAll(this.otherOut);
        }
        this.param.keysAndValuesDo((key, entry) => {
            if (!this.usedAsOther(entry[2])) {
                this.scalarParamTable.add(key, entry);
            }
        });
    };

    add(tag, rcvr, name) {
        var entry = [tag, rcvr, name];
        var k = [tag, rcvr ? rcvr : "null", name].join(".");

        if (tag === "propOut" && rcvr === "this") {
            this.thisOut.add(k, entry);
        } else if (tag === "propOut" && rcvr !== "this") {
            this.otherOut.add(k, entry);
        } else if (tag === "propIn" && rcvr === "this") {
            this.thisIn.add(k, entry);
        } else if (tag === "propIn" && rcvr !== "this") {
            this.otherIn.add(k, entry);
        } else if (tag === "param") {
            this.param.add(k, entry);
        } else if (tag === "var") {
            this.local.add(k, entry);
        }

        if ((this.otherOut.size() > 0 || this.otherIn.size() > 0) &&
            this.defaultUniforms.indexOf("u_that_x") < 0) {
            this.defaultUniforms = this.defaultUniforms.concat(["u_that_x", "u_that_y"]);
        }
    }

    usedAsOther(n) {
        var result = false;
        this.otherIn.keysAndValuesDo((k, entry) => {
            result = result || (entry[1] === n);
        });
        this.otherOut.keysAndValuesDo((k, entry) => {
            result = result || (entry[1] === n);
        });
        return result;
    }

    uniform(entry) {
        var k = ["propIn", entry[1], entry[2]].join(".");
        var entry = this.uniformTable.at(k);
        if (!entry) {
            debugger;
        }
        return ["u", entry[1], entry[2]].join("_");
    }

    varying(entry) {
        var k = ["propOut", entry[1], entry[2]].join(".");
        var entry = this.varyingTable.at(k);
        return ["v", entry[1],  entry[2]].join("_");
    }

    out(entry) {
        var k = ["propOut", entry[1], entry[2]].join(".");
        var entry = this.varyingTable.at(k);
        return ["o", entry[1],  entry[2]].join("_");
    }

    uniforms() {
        return this.uniformTable.keysAndValuesCollect((key, entry) =>
            "uniform sampler2D " + this.uniform(entry) + ";");
    }

    paramUniforms() {
        var result = [];
        this.scalarParamTable.keysAndValuesDo((key, entry) => {
            result.push("uniform bool u_use_vector_" + entry[2] + ";");
            result.push("uniform sampler2D u_vector_" + entry[2] + ";");
            result.push("uniform float u_scalar_" + entry[2] + ";");
        });
        return result;
    }

    vertVaryings() {
        return this.varyingTable.keysAndValuesCollect((key, entry) =>
                                                 "out float " + this.varying(entry) + ";");
    }

    fragVaryings() {
        return this.varyingTable.keysAndValuesCollect((key, entry) =>
                                                 "in float " + this.varying(entry) + ";");
    }

    uniformDefaults() {
        return this.varyingTable.keysAndValuesCollect((key, entry) => {
            var u_entry = ["propIn", entry[1], entry[2]];
            var ind = entry[1] === "this" ? "ivec2(a_index)" : "ivec2(_pos)";
            return `${this.varying(entry)} = texelFetch(${this.uniform(u_entry)}, ${ind}, 0).r;`;
        })
    }

    outs() {
        var i = 0;
        var result = [];
        this.varyingTable.keysAndValuesDo((key, entry) => {
            result.push("layout (location = " + i + ") out float " + this.out(entry) + ";");
            i++;
        })
        return result;
    }

    fragColors() {
        return this.varyingTable.keysAndValuesCollect((key, entry) =>
                                                 this.out(entry) + " = " + this.varying(entry) + ";");
    }

    isBuiltin(n) {
        return this.defaultAttributes.indexOf(n) >= 0 || this.defaultUniforms.indexOf(n) >= 0 ;
    }

    insAndParamsAndOuts() {
        var ins = this.uniformTable.keysAndValuesCollect((key, entry) => [entry[1], entry[2]]);
        var shortParams = this.scalarParamTable.keysAndValuesCollect((key, entry) => entry[2]);
        var outs;
        if (this.forBreed) {
            outs = this.thisOut.keysAndValuesCollect((key, entry) => [entry[1], entry[2]]);
        } else {
            outs = this.otherOut.keysAndValuesCollect((key, entry) => [entry[1], entry[2]]);
        }
        return [ins, shortParams, outs];
    }

    rawTable() {
        var result = {};
        this.thisIn.keysAndValuesDo((key, entry) => result[key] = entry);
        this.thisOut.keysAndValuesDo((key, entry) => result[key] = entry);
        this.otherIn.keysAndValuesDo((key, entry) => result[key] = entry);
        this.otherOut.keysAndValuesDo((key, entry) => result[key] = entry);
        this.param.keysAndValuesDo((key, entry) => result[key] = entry);
        this.local.keysAndValuesDo((key, entry) => result[key] = entry);
        return result;
    }

    maybePrimitive(aString) {
        this.usedPrimitives[aString] = aString;
    }

    primitives() {
        var result = [];
        for (var n in this.usedPrimitives) {
            if (n === "random") {
                result.push(
`
highp float random(float seed) {
   highp float a  = 12.9898;
   highp float b  = 78.233;
   highp float c  = 43758.5453;
   highp float dt = seed * a + b;
   highp float sn = mod(dt, 3.14159);
   return fract(sin(sn) * c);
}
`);
            }
        };
        return result;
    }
}

class CodeStream {
    constructor() {
        this.result = [];
        this.hadCR = true;
        this.hadSpace = true;
        this.tabLevel = 0;
    }

    addTab() {
        this.tabLevel++;
    }

    decTab() {
        this.tabLevel--;
    }

    cr() {
        this.result.push("\n");
        this.hadCR = true;
    }

    tab() {
        for (var i = 0; i < this.tabLevel; i++) {
            this.result.push("  ");
            this.hadSpace = true;
        }
    }

    skipSpace() {
        this.hadSpace = true;
    }

    crIfNeeded() {
        if (!this.hadCR) {
            this.cr();
        }
    }

    push(val) {
        this.result.push(val);
        var last = val[val.length - 1];
        this.hadSpace = (last === " " || last == "\n" || last == "{" || last == "(");
        this.hadCR = last == "\n";
    }

    pushWithSpace(val) {
        if (!this.hadSpace) {
            this.push(" ");
        }
        this.push(val);
    }

    contents() {
        function flatten(ary) {
            return ary.reduce(function (a, b) {
                return a.concat(Array.isArray(b) ? flatten(b) : b)}, []).join("");
        };
        return flatten(this.result);
    }
}

function parse(aString, optRule) {
    var rule = optRule;
    if (!rule) {
        rule = "TopLevel";
    }
    return g.match(aString, rule);
}

function addAsSet(to, from) {
    for (var k in from) {
        if (from.hasOwnProperty(k)) {
            to[k] = from[k];
        }
    }
    return to;
}

function translate(str, prod, errorCallback) {
    if (!prod) {
        prod = "TopLevel";
    }
    var match = g.match(str, prod);
    if (!match.succeeded()) {
        console.log(str);
        console.log("did not parse: " + str);
        if (errorCallback) {
            return errorCallback(match, str);
        }
        return null;
    }

    var n = s(match);
    var symTable = n.symTable(null);
    return n.glsl(symTable, null, null);
}

function testShadama() {
    return `
program "Bounce"

breed Turtle (x, y, dx, dy, r, g, b, a)
breed Filler (x, y)
patch Field (nx, ny, r, g, b, a)

def setColor() {
  this.r = this.x / 512.0;
  this.g = this.y / 512.0;
  this.b = 0.0;
  this.a = 1.0;
}

def clear(field) {
  field.r = 0.0;
  field.g = 0.0;
  field.b = 0.0;
  field.a = 0.0;
  field.nx = 0.0;
  field.ny = 0.0;
}

def fillCircle(cx, cy, r, field) {
  var dx = this.x - cx;
  var dy = this.y - cy;
  var dr = sqrt(dx * dx + dy * dy);
  if (dr < r) {
    field.r = 0.2;
    field.g = 0.2;
    field.b = 0.8;
    field.a = 1.0;
    field.nx = dx / r;
    field.ny = dy / r;
  }
}

def zeroDir() {
  this.dx = 0.0;
  this.dy = 0.0;
}

def bounce(field) {
  var nx = field.nx;
  var ny = field.ny;
  var dx = this.dx;
  var dy = this.dy - 0.01;
  var dot = dx * nx + dy * ny;
  var rx = dx;
  var ry = dy;
  var origV = sqrt(dx * dx + dy * dy);

  if (dot < 0.0) {
    rx = dx - 2.0 * dot * nx;
    ry = dy - 2.0 * dot * ny;
    var norm = sqrt(rx * rx + ry * ry);
    rx = rx / (norm / origV);
    ry = ry / (norm / origV);
  }

  var newX = this.x + dx;
  var newY = this.y + dy;

  if (newX < 0.0) {
    newX = -newX;
    rx = -rx * 0.9;
  }
  if (newX > u_resolution.x) {
    newX = u_resolution.x - (newX - u_resolution.x);
    rx = -rx * 0.9;
  }
  if (newY < 0.0) {
    newY = mod(newY, u_resolution.y);
    ry = -0.1;
  }
  if (newY > u_resolution.y) {
    newY = u_resolution.y - (newY - u_resolution.y);
    ry = -ry;
  }

  this.x = newX;
  this.y = newY;
  this.dx = rx;
  this.dy = ry;
}

static setup() {
  Filler.fillSpace("x", "y", 512, 512);
  Turtle.setCount(300000);
  Turtle.fillRandom("x", 0, 512);
  Turtle.fillRandom("y", 256, 512);
  Turtle.fillRandomDir("dx", "dy");
  Turtle.setColor();
}

static loop(env) {
  Filler.clear(Field);
  Filler.fillCircle(75, 75, 20, Field);
  Filler.fillCircle(300, 95, 25, Field);
  Turtle.bounce(Field);
  Field.draw();
  Turtle.draw();
}
`;
};

var shadama = {
  loadShadama,
  runner,
  step,
  testShadama,
  initialize,
  getCanvas,
  setTarget,
  makeTarget,
  readPixels,
  setReadPixelCallback,
  pause,
  destroy,
  maybeRunner,
  pointerdown,
  pointermove,
  pointerup
};

export {
  shadama
}
