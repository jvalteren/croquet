
function fibonacci(n) {
   return n < 1 ? 0
        : n <= 2 ? 1
        : fibonacci(n - 1) + fibonacci(n - 2);
}
//---------------------------------

let planets = Globals.tScene.find(o => o.constructor.name === "TCompass");
planets.update = () => planets.object3D.rotateY(.01);

//---------------------------------

let spreadsheet = Globals.tScene.find(o => o.constructor.name === "TSpreadsheet").parent,
    center = spreadsheet.center3D();

spreadsheet.update = () =>
  spreadsheet.withAllChildrenDo(o => {
    let o3D = o.object3D,
        spin = o.spin || (o.spin = new THREE.Vector3(Math.random()/10, 0, Math.random()/100)),
        delta = o.center3D().clone().sub(center).normalize().multiplyScalar(.1);
    o3D.position.add(delta);
    o3D.rotateX(spin.x/25 * Math.PI);
    o3D.rotateY(spin.y/25 * Math.PI);
    o3D.rotateZ(spin.z/25 * Math.PI);
  })

//---------------------------------
// shadama demo
static loop(env) {
  Filler.clear(Field);
  var x = mousemove.x-mousedown.x;
  var y= mousemove.y-mousedown.y;
  var r = sqrt(x*x + y*y); 
  r = max(20,r);  
  Filler.fillCircle(mousedown.x, mousedown.y, r, Field);
  Filler.fillCircle(300, 95, 25, Field);
  Turtle.bounce(Field);
  Field.draw();
  Turtle.draw();
}

//---------------------------------
def fillRectangle(x1, y1, x2, y2, field) {
  var x = this.x;
  var y = this.y;
  var cx = (x1 + x2) / 2;
  var cy = (y1 + y2) / 2;
  var s = (y2 - y1) / (x2 - x1);
  if (x1 <= x && x < x2 && y1 <= y && y < y2) {
    var myY = y - cy;
    var myX = x - cx;
    var myS = myY / myX;
    field.r = 0.2;
    field.g = 0.2;
    field.b = 0.8;
    field.a = 1.0;
    if (abs(myS) > s) {
      field.nx = 0;
      field.ny = sign(myY);
     } else {
      field.nx = sign(myX);
      field.ny = 0;
     }
  }
}

//---------------------------------
program "Ball Gravity"

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

def d() {
  this.dx = 0;
  this.dy = 0;
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

def bounce(field, mousex, mousey) {
  var nx = field.nx;
  var ny = field.ny;
  var dx = this.dx;
  var dy = this.dy;
  var dot = dx * nx + dy * ny;
  var rx = dx;
  var ry = dy;
  var origV = sqrt(dx * dx + dy * dy);

  var newX = this.x + dx;
  var newY = this.y + dy;

  this.x = newX;
  this.y = newY;

  var offX = newX - mousex;
  var offY = newY - mousey;

  var dist2 = sqrt(offX * offX + offY * offY);
  var gx;
  var gy;
  if (dist2 > 1.0) {
    gx = -(offX/dist2) * 0.1;
    gy = -(offY/dist2) * 0.1;
  } else {
    gx = 0;
    gy = 0;
  }
  this.dx = rx + gx;
  this.dy = ry + gy;
}

static setup() {
  Filler.fillSpace("x", "y", 512, 512);
  Turtle.fillSpace("x", "y", 512, 512);
  Turtle.d();
  Turtle.setColor();
}

static loop() {
  Filler.clear(Field);
  Filler.fillCircle(mousemove.x, mousemove.y, 20, Field);
  Turtle.bounce(Field, mousemove.x, mousemove.y);
  Field.draw();
  Turtle.draw();
}