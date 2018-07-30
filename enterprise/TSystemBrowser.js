/*global THREE*/

import { TWindow } from "./TWindow.js";
import { TextEditRect } from "./TText.js";
import { TObject, Globals } from "./TObject.js";
import { TMenu } from "./TMenu.js";
import { TDataTable } from "./TDataTable.js";
import { meshFor as iconMeshFor } from "./icons.js";
import { TButton } from "./TButtons.js";

export class TSystemBrowser extends TObject {

  constructor(parent, onComplete) {
    super(parent, null);
    
    this.moduleMenu = null;
    this.codeEditor = null;
    this.codeEntitySearchBtn = null;
    this.selectedModule = null;

    lively.lang.events.makeEmitter(this);
    this.on("module selected", evt => this.onModuleSelected(evt));
    this.on("code entity search requested", evt => this.onCodeEntitySearchRequest(evt));
    this.build(onComplete);
  }

  get isSystemBrowser() { return true; }

  async build(onComplete) {
    let m = this.moduleMenu = this.addChild(await this.buildMenuForModules(this)),
        ed = this.codeEditor = this.addChild(this.buildEditor(this, 30, m.extent.y)),
        searchBtn = (this.codeEntitySearchBtn = this.addChild(
                                            new TButton(null, null,
                                              () => this.emit("code entity search requested"),
                                              await iconMeshFor("search"))));


    // FIXME layouting...
    let mPos = m.object3D.position,
        mExt = m.extent,
        edPos = ed.object3D.position,
        edExt = ed.extent;
    edPos.x = mPos.x + mExt.x/2 + edExt.x/2;

    searchBtn.object3D.geometry.scale(1.5,1.5,1.5)    ;
    searchBtn.position3D().x = edPos.x + edExt.x/2 - searchBtn.extent3D().x;
    searchBtn.position3D().y = edExt.y/2 - searchBtn.extent3D().y;
    searchBtn.object3D.material.side = THREE.DoubleSide;

    typeof onComplete === "function" && onComplete(this);
  }

  buildEditor(eventEmitter, width, height) {
    return new TextEditRect(null, null, null, width, height, 20, 5, 5);
  }

  async buildMenuForModules() {
    var browser = this,
        systemInterface = lively.systemInterface.localInterface,
        packages = await systemInterface.getPackages();

    var menu = new TMenu('Loaded modules', false);
    for (let p of packages) {
      for (let m of p.modules) {
        let mName = systemInterface.shortModuleName(m.name, p);
        menu.addItem(mName, async () =>
        browser.emit("module selected", {
          module: m,
          source: await systemInterface.moduleRead(m.name)
        }));
      }
    }

    // menuItems.forEach(([title, action]) => menu.addItem(title, action));
    var dataTable;
    return new Promise((resolve, reject) => dataTable = new TDataTable(null, resolve, menu, false))
      .then(() => lively.lang.promise.delay(20)) // there is some layouting issue...
      .then(() => dataTable)
  }

  openInWindow() {
    return new TWindow(null, null, 'System Browser', .5, this).display();
  }

  onModuleSelected({module, source}) {
    let ed = this.codeEditor;
    ed.editor.scrollTop = 0;
    ed.editor.documentRange().getFormatting();
    ed.newText([{text: source, font: "Monaco, monospace", size: 11}]);
    this.selectedModule = module;
  }

  onCodeEntitySearchRequest(evt) {
    let menu = new TMenu('code entities', undefined, undefined, 500);
    menu.addItem(null, null); // break in menu
    if (this.selectedModule) {
      let source = this.codeEditor.textString,
          parsed = lively.ast.parse(source),
          decls = lively.ast.categorizer.findDecls(parsed, {hideOneLiners: true});
      for (let decl of decls) {
        let {name, type, parent} = decl;
        menu.addItem(
          `${parent ? "  " : ""}${name} (${type})`,
          () => this.selectCodeEntity(decl));
      }
    }
    let dTable = Globals.tScene.setDisplay(menu);
    dTable.object3D.position.set(0,0,-12);
  }

  selectCodeEntity(decl) {
    if (!decl) return;
    let {start, end} = decl.node,
        ed = this.codeEditor;
    ed.selection.range = {
      start: ed.indexToPosition(start),
      end: ed.indexToPosition(end),
    }
    ed.editor.scrollCursorIntoView();
    ed.editor.selectDragStart = true; // FIXME!
    ed.redraw()
  }

  async save() {
    let m = this.selectedModule;
    
    if (!m) {
      console.log("No module selected");
      return;
    }
    try {
      let source = this.codeEditor.textString,
          systemInterface = lively.systemInterface.localInterface,
          shortName = systemInterface.shortModuleName(m.name, systemInterface.getPackageForModule(m.name));
      await systemInterface.moduleWrite(m.name, source);
      Globals.alert(`${shortName} saved`, 2400);
    } catch(err) {
      console.error(err);
      throw err;
    }
  }

  get evalEnvironment() {
    let systemInterface = lively.systemInterface.localInterface;
    return {
      format: systemInterface.moduleFormat(this.selectedModule.name),
      targetModule: this.selectedModule.name,
      context: this/*browser*/
    }
  }

  onKeyDown(pEvt) {
    console.log("Browser>>onKeyDown: " + lively.keyboard.Keys.canonicalizeEvent(pEvt.event2D).key);
    if (lively.keyboard.KeyHandler.invokeKeyHandlers(
      this, pEvt.event2D, false/*allow input evts*/))
      pEvt.event2D.preventDefault();
    return true;
  }

  get keybindings() {
    return [
      {keys: "Meta-S", command: "save selected module"}
    ]
  }

  get commands() {
    return [
      {
        name: "save selected module",
        exec: async browser => {
          await browser.saveSelectedModule()
          return true;
        }
        
      }
    ]
  }
}
