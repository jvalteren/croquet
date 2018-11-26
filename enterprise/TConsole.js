// Copyright 2018 by arcos and OS.Vision.
// This software is licensed under the Apache 2 open source license
// davidasmith@gmail.com - david@os.vision
// 919-244-4448

import { TextEditRect } from "./TText.js";
import { TWindow } from "./TWindow.js";

// This is a somewhat standard web console, except that it works in a 3D window inside of Croquet V
// Use is Globals.console.log('first arg', 'second arg', 'third arg', 'etc');
export class TConsole extends TextEditRect {
	log(){
		this.tWindow.object3D.visible = true;
		Globals.tScene.addChild(this.tWindow);
		this.insertText('\n-----------',{row:0, column:0})
		// first line === Error, second line === local line, third line === the calling function/file
		var stack = '\n'+new Error().stack.toString().split(/\r\n|\n/)[2].trim();
		for(let i=arguments.length-1; i>=0;i--){
			this.insertText('\n'+String(arguments[i]), {row:0, column:0});// adds the string to the top. string could be undefined or null
			console.log(arguments[i]); //also add to traditional console
		}
		this.insertText(stack,{row:0, column:0})
	}
}

Globals.console = new TConsole(null, tObj=>{
	tObj.tWindow = new TWindow(Globals.tScene,
	tWin=>{tWin.object3D.position.set(-20,0,0);
		tWin.object3D.rotation.y=Math.PI/2;
		tWin.object3D.visible = false;
	},
	'TConsole', 1, tObj);

}, null, 16, 16, 32, 5, 5);
window.onerror = function (msg, url, lineNo, columnNo, error) {
	Globals.console.log(error, 'line '+lineNo, url, msg);
  return false;
}
