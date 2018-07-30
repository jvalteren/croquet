// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// helper

function comparePosition(pos1, pos2) {
  // pos1.row < pos2.row = -2
  // pos1.row = pos2.row and pos1.column < pos2.column  = -1
  // pos1 = pos2  = 0
  // pos1.row = pos2.row and pos1.column > pos2.column  = 1
  // pos1.row > pos2.row = 2
  var {row, column} = pos1,
      {row: row2, column: column2} = pos2;
  if (row < row2) return -2;
  if (row === row2) {
    if (column < column2) return -1;
    if (column === column2) return 0;
    return 1;
  }
  return 2;
}

function eqPosition(p1, p2) {
  return comparePosition(p1, p2) === 0;
}


function maybeSelectCommentOrLine(morph) {
  // Dan's famous selection behvior! Here it goes...
  /*   If you click to the right of '//' in the following...
  'wrong' // 'try this'.slice(4)  //should print 'this'
  'http://zork'.slice(7)          //should print 'zork'
  */
  // If click is in comment, just select that part
  var sel = morph.selection,
      {row, column} = sel.lead,
      text = morph.selectionOrLineString();

  if (!sel.isEmpty()) return;

  // text now equals the text of the current line, now look for JS comment
  var idx = text.indexOf('//');
  if (idx === -1                          // Didn't find '//' comment
      || column < idx                 // the click was before the comment
      || (idx>0 && (':"'+"'").indexOf(text[idx-1]) >=0)    // weird cases
      ) { morph.selectLine(row); return }

  // Select and return the text between the comment slashes and end of method
  sel.range = {start: {row, column: idx + 2}, end: {row, column: text.length}};
}


// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// commands

var textCommands = [

  {
    name: "clipboard copy",
    doc: "placeholder for native copy",
    scrollCursorIntoView: false,
    exec: function(morph) {
      if (morph.selection.isEmpty())
        morph.selectLine(morph.cursorPosition.row);
      return false;
    }
  },

  {
    name: "clipboard cut",
    doc: "placeholder for native cut",
    exec: function(morph) {
      if (morph.selection.isEmpty())
        morph.selectLine(morph.cursorPosition.row, true/*including line end*/);
      return false;
    }
  },

  {
    name: "clipboard paste",
    doc: "placeholder for native paste",
    exec: function() { return false; }
  },


  {
    name: "select all",
    doc: "Selects entire text contents.",
    scrollCursorIntoView: false,
    multiSelectAction: "single",
    exec: function(morph) {
      // morph.saveMark();
      morph.selectAll();
      return true;
    }
  },

  {
    name: "delete backwards",
    doc: "Delete the character in front of the cursor or the selection.",
    exec: function(morph) {
      if (morph.rejectsInput()) return false;
      var sel = morph.selection;
      if (sel.isEmpty()) sel.growLeft(1);
      sel.text = "";
      sel.collapse();
      if (morph.activeMark) morph.activeMark = null;
      return true;
    }
  },

  {
    name: "delete",
    doc: "Delete the character following the cursor or the selection.",
    exec: function(morph) {
      var sel = morph.selection;
      if (morph.rejectsInput()) return false;
      if (sel.isEmpty()) sel.growRight(1);
      sel.text = "";
      sel.collapse();
      if (morph.activeMark) morph.activeMark = null;
      return true;
    }
  },

  {
    name: "indent",
    scrollCursorIntoView: false,
    exec: function(morph) {
      morph.withSelectedLinesDo((line, range) => morph.insertText(morph.tab, range.start));
      return true;
    }
  },

  {
    name: "outdent",
    scrollCursorIntoView: false,
    exec: function(morph) {
      morph.withSelectedLinesDo((line, range) => {
        if (line.startsWith(morph.tab))
          morph.deleteText({start: range.start, end: {row: range.start.row, column: morph.tab.length}})
      });
      return true;
    }
  },

  {
    name: "go left",
    doc: "Move the cursor 1 character left. At the beginning of a line move the cursor up. If a selection is active, collapse the selection left.",
    exec: function(morph) {
      morph.activeMark ?
        morph.selection.selectLeft(1) :
        morph.selection.goLeft(1);
      return true;
    }
  },

  {
    name: "go right",
    doc: "Move the cursor 1 character right. At the end of a line move the cursor down. If a selection is active, collapse the selection right.",
    exec: function(morph) {
      morph.activeMark ?
        morph.selection.selectRight(1) :
        morph.selection.goRight(1);
      return true;
    }
  },

  {
    name: "go up",
    doc: "Move the cursor 1 line. At the end of a line move the cursor down. If a selection is active, collapse the selection right.",
    scrollCursorIntoView: true,
    exec: function(morph) {
      morph.activeMark ?
        morph.selection.selectUp(1) :
        morph.selection.goUp(1, true/*use screen position*/);
      return true;
    }
  },

  {
    name: "go down",
    exec: function(morph) {
      morph.activeMark ?
        morph.selection.selectDown(1) :
        morph.selection.goDown(1, true/*use screen position*/);
      return true;
    }
  },

  {
    name: "select left",
    exec: function(morph) { morph.selection.selectLeft(1); return true; }
  },

  {
    name: "select right",
    exec: function(morph) { morph.selection.selectRight(1); return true; }
  },

  {
    name: "select up",
    exec: function(morph) { morph.selection.selectUp(1, true/*use screen position*/); return true; }
  },

  {
    name: "select down",
    exec: function(morph) { morph.selection.selectDown(1, true/*use screen position*/); return true; }
  },

  {
    name: "select line",
    exec: function(morph) {
      var sel = morph.selection,
          row = sel.lead.row,
          fullLine = morph.lineRange(row, false);
      sel.range = sel.range.equals(fullLine) ? morph.lineRange(row, true) : fullLine;
      return true;
    }
  },

  {
    name: "goto line start",
    exec: function(morph, opts = {select: false}) {
      var select = opts.select || !!morph.activeMark,
          sel = morph.selection,
          cursor = sel.lead,
          line = morph.lineRange(cursor, true);
      sel.lead = eqPosition(cursor, line.start) ? {column: 0, row: cursor.row} : line.start;
      !select && (sel.anchor = sel.lead);
      return true;
    }
  },

  {
    name: "goto line end",
    exec: function(morph, opts = {select: false}) {
      var select = opts.select || !!morph.activeMark,
          sel = morph.selection,
          cursor = sel.lead,
          line = morph.lineRange(cursor, true);
      sel.lead = line.end;
      !select && (sel.anchor = sel.lead);
      return true;
    }
  },

  {
    name: "newline",
    exec: function(morph) {
      var {row} = morph.cursorPosition,
          currentLine = morph.getLineString(row),
          indent = currentLine.match(/^\s*/)[0].length;

      if (!currentLine.trim() && indent) // remove trailing spaces of empty lines
        var deleted = morph.deleteText({start: {row, column: 0}, end: {row, column: indent}});
      let prefill = "\n" + " ".repeat(indent);

      morph.selection.text = prefill;
      morph.selection.collapseToEnd();
      return true;
    }
  },

  {
    name: "insertstring",
    exec: function(morph, args = {string: null, undoGroup: false}) {
      // morph.saveActiveMarkAndDeactivate();
      var {string, undoGroup} = args,
          isValid = typeof string === "string" && string.length;
      if (!isValid) console.warn(`command insertstring called with not string value`);
      if (morph.rejectsInput() || !isValid) return false;
      let sel = morph.selection, isDelete = !sel.isEmpty();
      sel.text = string;
      sel.collapseToEnd();
      return true;
    }
  }

];


function doEval(morph, range, additionalOpts, code) {  
  if (!range)
    range = morph.selection.isEmpty() ? morph.lineRange() : morph.selection.range;
  if (!code)
    code = morph.textInRange(range)

  return lively.vm.runEval(code, {...morph.evalEnvironment, ...additionalOpts});
}

var jsEditorCommands = [

  {
    name: "doit",
    doc: "Evaluates the selected code or the current line and report the result",
    exec: async function(morph, opts, count = 1) {
      maybeSelectCommentOrLine(morph);
      var result, err;
      try {
        opts = Object.assign({}, opts, {inspect: true, inspectDepth: count});
        result = await doEval(morph, undefined, opts);
        err = result.isError ? result.value : null;
      } catch (e) { err = e; }
      err ?
        morph.showError(err) :
        morph.setStatusMessage(result.value);
      return result;
    }
  },

  {
    name: "printit",
    doc: "Evaluates selected code or the current line and inserts the result in a printed representation",
    exec: async function(morph, opts) {
      // opts = {targetModule}
      maybeSelectCommentOrLine(morph);
      var result, err;
      try {
        opts = Object.assign({}, opts, {asString: true});
        result = await doEval(morph, undefined, opts);
        err = result.isError ? result.value : null;
      } catch (e) { err = e; }
      morph.selection.collapseToEnd();
      morph.insertTextAndSelect(err ?
        String(err) + (err.stack ? "\n" + err.stack : "") :
        String(result.value));
      return result;
    }
  },

  {
    name: "print inspectit",
    doc: "Prints a representation of the object showing it's properties. The count argument defines how deep (recursively) objects will be printed.",
    handlesCount: true,
    exec: async function(morph, opts, count = 1) {
      maybeSelectCommentOrLine(morph);
      var result, err;
      try {
        opts = Object.assign({}, opts, {inspect: true, inspectDepth: count});
        result = await doEval(morph, undefined, opts);
        err = result.isError ? result.value : null;
      } catch (e) { err = e; }
      morph.selection.collapseToEnd();
      morph.insertTextAndSelect(result.value);
      return result;
    }
  },

  {
    name: "save",
    doc: "Saves...",
    handlesCount: true,
    exec: async function(morph, opts, count = 1) {
      if (morph.parent && morph.parent.save) return morph.parent.save();
      Globals.alert("text doesn't know how to save", 1500);
      return true;     
    }
  }

]

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// keybindings

var defaultKeyBindings = [
  {keys: {mac: 'Meta-C', win: 'Ctrl-C'}, command: {command: "clipboard copy", passEvent: true}},
  {keys: {mac: 'Meta-X', win: 'Ctrl-X'}, command: {command: "clipboard cut", passEvent: true}},
  {keys: {mac: 'Meta-V', win: 'Ctrl-V'}, command: {command: "clipboard paste", passEvent: true}},

  // {keys: {mac: 'Meta-Z|Ctrl-Shift--|Ctrl-x u', win: 'Ctrl-Z|Ctrl-Shift--|Ctrl-x u'}, command: "text undo"},
  // {keys: {mac: 'Meta-Shift-Z', win: 'Ctrl-Shift-Z'}, command: "text redo"},

  {keys: {mac: 'Meta-A|Ctrl-X H', win: 'Ctrl-A|Ctrl-X H'}, command: "select all"},
  {keys: {mac: 'Meta-D', win:  'Ctrl-D'}, command: "doit"},
  {keys: {mac: "Meta-Shift-L X B"},      command: "eval all"},
  {keys: {mac: 'Meta-P', win: 'Ctrl-P'}, command: "printit"},
  {keys: {mac: 'Meta-S', win: 'Ctrl-S'}, command: "save"},
  {keys: {mac: 'Meta-I', win: 'Ctrl-I'}, command: "print inspectit"},
  {keys: {mac: 'Meta-Shift-I', win: 'Ctrl-Shift-I'}, command: "inspectit"},
  {keys: {mac: 'Meta-Shift-U', win: 'Ctrl-Shift-U'}, command: "undefine variable"},

  {keys: 'Backspace',                           command: "delete backwards"},
  {keys: {win: 'Delete', mac: 'Delete|Ctrl-D'}, command: "delete"},

  {keys: {win: 'Left', mac: 'Left|Ctrl-B'},   command: "go left"},
  {keys: {win: 'Right', mac: 'Right|Ctrl-F'}, command: "go right"},
  {keys: {win: 'Up', mac: 'Up|Ctrl-P'},       command: "go up"},
  {keys: {win: 'Down', mac: 'Down|Ctrl-N'},   command: "go down"},

  {keys: 'Shift-Left',  command: "select left"},
  {keys: 'Shift-Right', command: "select right"},
  {keys: 'Shift-Up',    command: "select up"},
  {keys: 'Shift-Down',  command: "select down"},

  {keys: {win: 'Ctrl-Right', mac: 'Alt-Right|Alt-F'}, command: "goto word right"},
  {keys: {win: 'Ctrl-Left', mac: 'Alt-Left|Alt-B'}, command: "goto word left"},
  {keys: {win: 'Ctrl-Shift-Right', mac: 'Alt-Shift-Right|Alt-Shift-F'}, command: {command: "goto word right", args: {select: true}}},
  {keys: {win: 'Ctrl-Shift-Left', mac: 'Alt-Shift-Left|Alt-Shift-B'}, command: {command: "goto word left", args: {select: true}}},
  {keys: 'Alt-Backspace',                command: "delete word left"},
  {keys: 'Alt-D',                        command: "delete word right"},
  {keys: 'Alt-Ctrl-K',                   command: "delete word right"/*actualle delete sexp!*/},
  {keys: 'Alt-Shift-2',                  command: "select word right"},

  {keys: "Ctrl-X Ctrl-X",                                     command: "reverse selection"},
  {keys: {win: "Ctrl-Shift-L", mac: 'Meta-L'},                command: "select line"},
  {keys: {win: "Shift-Home", mac: "Shift-Home|Ctrl-Shift-A"}, command: {command: "goto line start", args: {select: true}}},
  {keys: {win: "Home", mac: "Home|Ctrl-A"},                   command: {command: "goto line start", args: {select: false}}},
  {keys: {win: "Shift-End", mac: "Shift-End|Ctrl-Shift-E"},   command: {command: "goto line end", args: {select: true}}},
  {keys: {win: "End", mac: "End|Ctrl-E"},                     command: {command: "goto line end", args: {select: false}}},

  {keys: "Ctrl-C J",                                     command: {command: "join line", args: {withLine: "before"}}},
  {keys: "Ctrl-C Shift-J",                               command: {command: "join line", args: {withLine: "after"}}},
  {keys: {win: "Ctrl-Shift-D", mac: "Meta-Shift-D|Ctrl-C P"},     command: "duplicate line or selection"},
  {keys: {win: "Ctrl-Backspace", mac: "Meta-Backspace"}, command: "delete left until beginning of line"},
  {keys: "Ctrl-K",                                       command: "delete emtpy line or until end of line"},

  {keys: {win: "Ctrl-Alt-Up|Ctrl-Alt-P", mac: "Ctrl-Meta-Up|Ctrl-Meta-P"}, command: "move lines up"},
  {keys: {win: "Ctrl-Alt-Down|Ctrl-Alt-N", mac: "Ctrl-Meta-Down|Ctrl-Meta-N"}, command: "move lines down"},

  {keys: {win: "PageDown", mac: "PageDown|Ctrl-V"},      command: "goto page down"},
  {keys: {win: "PageUp", mac: "PageUp|Alt-V"},           command: "goto page up"},
  {keys: {win: "Shift-PageDown", mac: "Shift-PageDown"}, command: "goto page down and select"},
  {keys: {win: "Shift-PageUp", mac: "Shift-PageUp"},     command: "goto page up and select"},
  {keys: 'Alt-Ctrl-,'/*Alt-Ctrl-<*/,                     command: 'move cursor to screen top in 1/3 steps'},
  {keys: 'Alt-Ctrl-.'/*Alt-Ctrl-<*/,                     command: 'move cursor to screen bottom in 1/3 steps'},

  {keys: {win: "Alt-Left", mac: "Meta-Left"},               command: "goto matching left"},
  {keys: {win: "Alt-Shift-Left", mac: "Meta-Shift-Left"},   command: {command: "goto matching left", args: {select: true}}},
  {keys: {win: "Alt-Right", mac: "Meta-Right"},             command: "goto matching right"},
  {keys: {win: "Alt-Shift-Right", mac: "Meta-Shift-Right"}, command: {command: "goto matching right", args: {select: true}}},

  // FIXME this is actually fwd/bwd sexp
  {keys: "Alt-Ctrl-B", command: "goto matching left"},
  {keys: "Alt-Ctrl-F", command: "goto matching right"},

  {keys: "Ctrl-Up", command: "goto paragraph above"},
  {keys: "Ctrl-Down", command: "goto paragraph below"},


  {keys: {win: "Ctrl-Shift-Home", mac: "Meta-Shift-Up"},           command: {command: "goto start", args: {select: true}}},
  {keys: {win: "Ctrl-Shift-End", mac: "Meta-Shift-Down"},          command: {command: "goto end", args: {select: true}}},
  {keys: {win: "Ctrl-Home", mac: "Meta-Up|Meta-Home|Alt-Shift-,"}, command: "goto start"},
  {keys: {win: "Ctrl-End", mac: "Meta-Down|Meta-End|Alt-Shift-."}, command: "goto end"},

  {keys: "Ctrl-L",                                           command: "realign top-bottom-center"},
  {keys: {win: "Ctrl-Shift-L", mac: "Ctrl-Shift-L|Alt-G G"}, command: "goto line"},

  {keys: 'Enter', command: "newline"},
  {keys: 'Space', command: {command: "insertstring", args: {string: " ", undoGroup: true}}},
  {keys: 'Tab',   command: {command: "tab - snippet expand or indent"}},

  {keys: {win: 'Ctrl-]', mac: 'Meta-]'}, command: "indent"},
  {keys: {win: 'Ctrl-[', mac: 'Meta-['}, command: "outdent"},

  {keys: {win: 'Ctrl-Enter', mac: 'Meta-Enter'}, command: {command: "insert line", args: {where: "below"}}},
  {keys: 'Shift-Enter',                          command: {command: "insert line", args: {where: "above"}}},
  {keys: 'Ctrl-O',                               command: "split line"},

  {keys: {mac: 'Ctrl-X Ctrl-T'}, command: "transpose chars"},
  {keys: {mac: 'Ctrl-C Ctrl-U'}, command: "uppercase"},
  {keys: {mac: 'Ctrl-C Ctrl-L'}, command: "lowercase"},
  {keys: {mac: 'Meta-Shift-L W t'}, command: "remove trailing whitespace"},

  {keys: "Ctrl-Space", command: "toggle active mark"},


  {keys: {mac: 'Meta-Shift-L L T'}, command: "toggle line wrapping"},
  {keys: {win: 'Ctrl-=', mac: 'Meta-='}, command: "increase font size"},
  {keys: {win: 'Ctrl--', mac: 'Meta--'}, command: "decrease font size"},

  {keys: "Esc|Ctrl-G", command: "cancel input"},

  {keys: {win: "Ctrl-/", mac: "Meta-/"}, command: "toggle comment"},
  {keys: {win: "Alt-Ctrl-/", mac: "Alt-Meta-/|Alt-Meta-÷"/*FIXME*/}, command: "toggle block comment"},
  {keys: "Meta-Shift-L /  D", command: "comment box"},

  {keys: {windows: "Ctrl-.", mac: "Meta-."}, command: '[IyGotoChar] activate'},
  {keys: {windows: "Ctrl-,", mac: "Meta-,"}, command: {command: '[IyGotoChar] activate', args: {backwards: true}}},

  {keys: "Alt-Shift-Space|Alt-Space|Meta-Shift-P", command: "text completion"},

  {keys: "Alt-Q", command: "fit text to column"},

  {keys: {win: "Ctrl-F|Ctrl-G|F3", mac: "Meta-F|Meta-G|Ctrl-S"},                      command: "search in text"},
  {keys: {win: "Ctrl-Shift-F|Ctrl-Shift-G", mac: "Meta-Shift-F|Meta-Shift-G|Ctrl-R"}, command: {command: "search in text", args: {backwards: true}}}

]

export {
  textCommands,
  jsEditorCommands,
  defaultKeyBindings
}
