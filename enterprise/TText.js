// This is the main text editing object. The actual editing is based on Carota
// (heavily modified to work as a texture)

/*global carota,THREE*/
import { TRectangle } from "./TObjects.js";
import {textCommands, jsEditorCommands, defaultKeyBindings} from "./text-commands.js";
import { TMenu } from "./TMenu.js";

function closestPow2(n) {
  return Math.pow(2, Math.ceil(Math.log(n) / Math.log(2)));
}

export class TextEditRect extends TRectangle {

//"initialize"

constructor(parent, onComplete, onFilterKey, w, h, resolution, wsegs, hsegs) {
  super(parent, onComplete, w, h, wsegs, hsegs);
  this.isText = true;
  this.eventStrings = [];
  this.eventColor = [];
  this.onFilterKey = onFilterKey;
  this.scaleX = 1;
  this.scaleY = 1;
  this.resolution = 1;
  this.scrollLeft = 0;
  this.scrollTop = 0;
  this.testing = false;
  this.initEditor(w, h, resolution);
  this.name = "TextEditRect";
  //this.object3D.castShadow = true;
  //this.object3D.receiveShadow = true;
}

initEditor(width, height, resolution) {
  var oldText = [];

  this.resolution = resolution || 1;

  if (this.editor) {
    oldText = this.editor.save();
  }

  this.width = width;
  this.height = height;
  this.extent = new THREE.Vector3(width, height, 0);

  if (!this.editor) {
    this.editor = carota.editor.create(width, height, resolution,
      (ctx, left, top, width, height) => {
        ctx.fillStyle = "white";
        ctx.fillRect(left, top, width, height);
      });

  } else {
    // closestPow2(wp);
    // closestPow2(hp);
    this.editor.screenWidth = width;
    this.editor.screenHeight = height;

    // this.element.style.width = width + "px";
    // this.element.style.height = height + "px";
    // this.editor.canvas.width = closestPow2(wp);
    // this.editor.canvas.height = closestPow2(hp);
  }

  // this.scaleX = this.editor.canvas.width / width;
  // this.scaleY = this.editor.canvas.height / height;
  this.textTexture = new THREE.CanvasTexture(this.editor.canvas);
  
  let mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x111111,
    map: this.textTexture,
    transparent: false
  });
  
  this.object3D.material = mat;
  
  this.object3D.geometry = new THREE.PlaneBufferGeometry(width, height, 8, 8);
  
  this.editor.load(oldText);
  
  this.changed();
}

newText(txt) {
  this.editor.load([]); //clear current text
  this.editor.insert(txt); //insert the new text
  this.textTexture.needsUpdate = true;
}

newHTML(html) {
  var runs = carota.html.parse(html);
  this.editor.load(runs);
  this.textTexture.needsUpdate = true;
}

clearText() {
  this.editor.load([]);
  this.textTexture.needsUpdate = true;
}

changed() {
  this.editor.drawSelection(this.editor.canvas.getContext("2d"), true);
  this.textTexture.needsUpdate = true;
}

redraw() {
  this.changed();
  this.editor.paint();
}

// "text access"

indexToPosition(index) {
  let carota = this.editor,
      lines = carota.frame.lines, row = 0;
  for (; row < lines.length; row++) {
    let line = lines[row];
    if (index < line.length) break;
    index -= line.length;
  }
  return {row, column: index};
}

positionToIndex(textPos) {
  let carota = this.editor,
      {row, column} = textPos,
      line = carota.frame.lines[row];
  return carota.frame.lines[row].ordinal + column
}

get cursorPosition() {
  return this.selection.range.start;
}

set cursorPosition(pos) {
  this.selection.range = {start: pos, end: pos};
}

getLineString(row) {
  // the carota interface is pretty awkward...
  return this.textInRange(this.lineRange(row));
}

lineRange(row) {
  if (typeof row !== "number") row = this.cursorPosition.row;
  let endCol = this.editor.frame.lines[row].length-1;
  return {start: {row, column: 0}, end: {row, column: endCol}};
}

withLinesDo(startRow, endRow, doFunc) {
  return lively.lang.arr.range(startRow, endRow).map(row => {
    var line = this.getLineString(row),
        range = {start: {row, column: 0}, end: {row, column: line.length}};
    return doFunc(line, range);
  });
}

get textString() { return this.editor.documentRange().plainText(); }

set textString(string) {
  this.editor.documentRange().setText(string);
  this.changed();
}

textInRange(range) {
  let from = this.positionToIndex(range.start),
      to = this.positionToIndex(range.end);
  return this.editor.range(from, to).plainText();
}

get tab() { return "  "; }

// "text layout related", {

getScrollLeft() { return this.editor.scrollLeft; }
setScrollLeft(n) { this.editor.scrollLeft = n; this.redraw(); }

getScrollTop() { return this.editor.scrollTop; }
setScrollTop(n) { this.editor.scrollTop = n; this.redraw(); }

textHeight() {
  // full scroll height
  return Math.max(this.editor.screenHeight, this.editor.frame.bounds().h);
}

textWidth() {
  // we currently force it to the screen
  return this.editor.screenWidth;
}

//"selection", {

get selection() {
  if (this._selection) return this._selection;
  let text = this, carota = this.editor;

  return this._selection = {

    get start() { return this.range.start; },
    set start(start) { this.range = {start, end: start}; },
  
    get end() { return this.range.end },
    set end(end) { this.range = {start: end, end}; },
  
    get anchor() { return this.isReverse() ? this.range.end : this.range.start },
    set anchor(pos) { this.range = {start: pos, end: this.lead}; },
    get lead() { return this.isReverse() ? this.range.start : this.range.end },
    set lead(pos) { this.range = {start: this.anchor, end: pos}; },

    get range() {
      return {
        start: text.indexToPosition(carota.selection.start),
        end: text.indexToPosition(carota.selection.end)
      }
    },
    
    set range(range) {
      let from = text.positionToIndex(range.start),
          to = text.positionToIndex(range.end);
      carota.select(from, to, true);
      text.changed();
    },

    get text() { return text.textInRange(this.range); },
    set text(string) { return text.setTextInRange(string, this.range); },

    isEmpty() { return carota.selection.start === carota.selection.end; },

    collapse() {
      let pos = text.indexToPosition(carota.selection.start);
      this.range = {start: pos, end: pos};
    },

    collapseToEnd() {
      let pos = text.indexToPosition(carota.selection.end);
      this.range = {start: pos, end: pos};
    },

    isReverse() { return false; },

    growRight(n) {
      carota.select(carota.selection.start, carota.selection.end+n, true);
      text.changed();
    },
    growLeft(n) {
      carota.select(carota.selection.start-n, carota.selection.end, true);
      text.changed();
    },

    selectLeft(n) { this.growLeft(n); },
    selectRight(n) { this.growRight(n); },

    selectUp(n) {
      let {start, end: pos} = this.range,
          lastPos = text.documentRange.end,
          newRow = Math.min(Math.max(0, pos.row-n), lastPos.row),
          range = text.lineRange(newRow),
          newCol = Math.min(pos.column, range.end.column),
          newPos = {row: newRow, column: newCol};
      return this.range = {start, end: newPos};
    },

    selectDown(n) { return this.selectUp(-n); },

    goRight(n) {
      let index = carota.selection.start + n;
      carota.select(index, index, true);
      text.changed();
    },
    goLeft(n) { return this.goRight(-n); },

    goUp(n) {
      this.selectUp(n);
      this.collapseToEnd();
    },
    goDown(n) { return this.goUp(-n); }
  }
}

selectLine(row) {
  return this.selection.range = this.lineRange(row);
}

selectionOrLineString() {
  return this.textInRange(this.selection.isEmpty() ? this.lineRange() : this.selection.range);
}

get documentRange() {
  let {start, end} = this.editor.documentRange();
  return {start: this.indexToPosition(start), end: this.indexToPosition(end)};
}

selectAll() {
  return this.selection.range = this.documentRange;
}

withSelectedLinesDo(doFunc) {
  var range = this.selection.isEmpty() ?
    this.lineRange(undefined, false) :
    this.selection.range;
  var {start: {row: startRow}, end: {row: endRow, column: endColumn}} = range;
  // if selection is only in the beginning of last line don't include it
  return this.withLinesDo(startRow, endColumn === 0 && endRow > startRow ? endRow-1 : endRow, doFunc);
}

//"text modification"

rejectsInput() { return false; }

setTextInRange(string, range, keepSelection) {
  let {start, end} = this.editor.selection;
  this.selection.range = range;
  this.editor.insert(string, true);
  let {end: newEnd} = this.editor.selection;
  keepSelection && this.editor.select(start, end, true);
  this.changed();
  return {start: this.indexToPosition(start), end: this.indexToPosition(newEnd)};
}

insertText(string, textPos) {
  if (textPos === undefined) textPos = this.cursorPosition;
  return this.setTextInRange(string, {start: textPos, end: textPos});
}

insertTextAndSelect(string, pos) {
  return this.selection.range = this.insertText(string, pos);
}

deleteText(range) { return this.setTextInRange("", range); }

//"events", {

onPointerDown(pEvt) {
  this.makePlane(pEvt);
  var pt = this.trackPlane(pEvt);
  this.object3D.worldToLocal(pt);
  let {width, height, editor: {scrollLeft, scrollTop, scaleX, scaleY}} = this,
      x = Math.floor((width / 2 + pt.x + scrollLeft) * scaleX),
      y = Math.floor((height / 2 - pt.y + scrollTop) * scaleY);
  this.editor.mouseDown(x, y);
  this.textTexture.needsUpdate = true;
  return true;
}

onPointerMove(pEvt) {
  var pt = this.trackPlane(pEvt);
  if (pt) {
    this.object3D.worldToLocal(pt);
  let {width, height, editor: {canvas, scrollLeft, scrollTop, scaleX, scaleY}} = this,
      x = Math.floor((width / 2 + pt.x + scrollLeft) * scaleX),
      y = Math.floor((height / 2 - pt.y + scrollTop) * scaleY);
    this.editor.mouseMove(x, y);
    this.textTexture.needsUpdate = true;
  }
  return true;
}

onPointerUp(pEvt) {
  var pt = this.trackPlane(pEvt);
  if (pt) {
    this.object3D.worldToLocal(pt);
  let {width, height, editor: {canvas, scrollLeft, scrollTop, scaleX, scaleY}} = this,
      x = Math.floor((width / 2 + pt.x + scrollLeft) * scaleX),
      y = Math.floor((height / 2 - pt.y + scrollTop) * scaleY);
    this.editor.mouseUp(x, y);
    this.textTexture.needsUpdate = true;
  }
  return true;
}

onKeyDown(pEvt) {
  //console.log("Text onKeyDown: " + lively.keyboard.Keys.canonicalizeEvent(pEvt.event2D).keyCombo);
  if (this.onFilterKey) if (this.onFilterKey(pEvt)) return true;
  if (lively.keyboard.KeyHandler
      .invokeKeyHandlers(this, pEvt.event2D, true/*no input evts*/)) {
    this.editor.scrollCursorIntoView();
    pEvt.event2D.preventDefault();
    return true;
  }
  return true;
}

onTextInput(pEvt) {
  // console.log("Text onInput: " + lively.keyboard.Keys.canonicalizeEvent(pEvt.event2D).keyCombo);
  lively.keyboard.KeyHandler.invokeKeyHandlers(this, pEvt.event2D, false/*allow input evts*/);
  this.editor.scrollCursorIntoView();
  return true;
}

onCopy(pEvt, deleteSelection) {
  pEvt.event2D.clipboardData.setData("text/plain", this.selection.text);
  pEvt.event2D.preventDefault();
  if (deleteSelection) this.selection.text = "";
  return true;
}

onPaste(pEvt) {
  this.selection.text = pEvt.event2D.clipboardData.getData("text");
  pEvt.event2D.preventDefault();
  return true;
}

onCut(pEvt) { return this.onCopy(pEvt, true); }
                                      
//"other stuff"

get evalEnvironment() {
  return (this.parent && this.parent.evalEnvironment) || {
    format: "esm",
    targetModule: "lively://ceo-cockpit/workspace",
    context: this
  };
}

get commands() {
  return textCommands.concat(jsEditorCommands).concat(completionCommand);
}

get keybindings() {
  return defaultKeyBindings.concat({command: "text completion", keys: "Alt-Space"});
}

}

let completionCommand = {
  name: "text completion",
  exec: async editor => {

    let sel = editor.selection,
        roughPrefix = sel.isEmpty() ?
          editor.getLineString(sel.lead.row).slice(0, sel.lead.column) : sel.text,
        isValidPrefix = /\.[a-z0-9_]*$/i.test(roughPrefix);
    
    if (!isValidPrefix) return [];
    
    let systemInterface = lively.systemInterface.localInterface;
    
    var {
      isError,
      value: err,
      completions,
      prefix
    } = await systemInterface.dynamicCompletionsForPrefix(
          editor.evalEnvironment.targetModule, roughPrefix, editor.evalEnvironment);
    
    let items = [];
    for (let group of completions)
      for (let compl of group[1]) {
        if (!compl.toLowerCase().includes(prefix.toLowerCase())) continue;
        items.push({string: `${group[0]}>>${compl}`, action: () => {
          sel.collapseToEnd();
          var end = sel.lead,
              start = prefix ?
              editor.indexToPosition(editor.positionToIndex(end) - prefix.length) : end;
          editor.selection.range = {start, end}
          editor.selection.text = compl;
          Globals.tScene.keyboardTObject = editor;
        }});
      }

    let menu = new TMenu('completions', undefined, undefined, 500);
    items.forEach(item => menu.addItem(item.string, item.action))
    let dTable = Globals.tScene.setDisplay(menu);
    dTable.object3D.position.y = -dTable.extent.y/2 + 8
    dTable.object3D.position.z = -12
    
    
    function isValidIdentifier(completion) {
      if (typeof completion !== "string") return false;
      // method call completion like foo(bar)
      if (this.isMethodCallCompletion(completion))
        completion = completion.slice(0, completion.indexOf("("));
      if (/^[a-z_\$][0-9a-z_\$]*$/i.test(completion)) return true;
      return false;
    }
    
  }

}
