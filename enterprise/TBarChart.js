// Copyright 2017 by David A Smith and CEO Vision, Inc. All Rights Reserved.
// davidasmith@gmail.com
// 919-244-4448

/*global THREE*/
import { TObject } from "./TObject.js";
export class TBarChart extends TObject {

	//'initialize',{
	constructor(parent, onComplete, columns, rows, size, initialData){
		super(parent, onComplete); // create the base object3D
		this.scale = 4;
		this.columns = columns;
		this.rows = rows;
		this.size = size||0.5;
		this.extent = new THREE.Vector3(columns*size,size,rows*size);
		this.color = new THREE.Color();
		//this.computeFunction = computeFunction; // returns a height and a color
		this.bars = [];
		var r2 = (rows-1)/2;
		var c2 = (columns-1)/2;
		var min = Infinity;
		var max = -Infinity;
		/*
		for(var i=0; i<initialData.length;i++){
			min = Math.min(min, initialData[i]);
			max = Math.max(max, initialData[i]);
		}
		var mScale= max-min;
		mScale = 1;
		*/
		var index = 0;
		//if(mScale>0){
			//min = min/mScale;
			//for(var i=0; i<initialData.length;i++)
			//	initialData[i]=initialData[i]/mScale;
			for(var r = 0; r<rows; r++ )
				for(var c = 0; c<columns; c++)
				{
					var val = initialData[index];
					this.color.setRGB((1-val)/2, 1-val*val, (1+val)/2);
					val = (val+1)*this.scale;
					var box = new THREE.BoxGeometry(this.size*.9, 1, this.size*.9, 2, 10, 2 );
          			var mat      = new THREE.MeshStandardMaterial({color: this.color.getHex()});
          			var bar     = new THREE.Mesh(box, mat); 
          			bar.scale.y = val;
          			bar.position.set(size*(c-c2), val/2, size*(r-r2));
          			index++;
          			this.bars.push(bar);
         			this.object3D.add(bar);
				} 
	}

	boundingBox(){
		var min = new THREE.Vector3();
		min.copy(this.extent);
		min.multiplyScalar(-0.5);
		min.y+this.size;

		var max = new THREE.Vector3();
		max.copy(this.extent);
		max.multiplyScalar(0.5);
		max.y+=this.size;

		return {min:min, max: max};
	}
	//'behavior',{
	update(time, tScene){
		var index = 0;
		for(var r=0;r<this.rows; r++){
			var barTo=this.bars[index+this.columns-1];
			var barFrom=this.bars[index];
			barTo.position.y=barFrom.position.y;
			barTo.scale.y=barFrom.scale.y;
			barTo.material.color = barFrom.material.color;
			for(var c=0; c<this.columns-1;c++){
				barTo = this.bars[index];
				barFrom = this.bars[index+1];
				barTo.position.y=barFrom.position.y;
				barTo.scale.y = barFrom.scale.y;
				barTo.material.color = barFrom.material.color;
				index++;
			}
			index++;
		}
  }
}


