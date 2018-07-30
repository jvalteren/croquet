// Copyright 2017 by David A Smith and CEO Vision, Inc. All Rights Reserved.
// davidasmith@gmail.com
// 919-244-4448

/*global THREE*/
import { loadHTTP } from "./TImporters.js";
import { TBottleLine } from "./TBottleChart.js";

 
 function buildBottleChart(){
    return loadHTTP("demos/augmented-nations-data-from-bostock.json", function(data) {
        var nationsData = JSON.parse(data);
        var nations = {};
        nations.nation = {};
        nations.maxPopulation = 0;
        nations.minPopulation = Infinity;
        nations.maxLifeExpectancy = 0;
        nations.minLifeExpectancy = Infinity;
        nations.maxIncome = 0;
        nations.minIncome = Infinity;
        nationsData.forEach(function(d){
            nations.nation[d.name]=massageNation(d, d.name);
            //if(d.name==="Mongolia") console.log(d.name, nations.nation[d.name], d );
            if(nations.maxPopulation < nations.nation[d.name].population[2])  
                nations.maxPopulation = nations.nation[d.name].population[2];
            if(nations.maxLifeExpectancy < nations.nation[d.name].lifeExpectancy[2])  
                nations.maxLifeExpectancy = nations.nation[d.name].lifeExpectancy[2];
            if(nations.maxIncome < nations.nation[d.name].income[2])  
                nations.maxIncome = nations.nation[d.name].income[2];
            if(nations.minPopulation > nations.nation[d.name].population[1])  
                nations.minPopulation = nations.nation[d.name].population[1];
            if(nations.minLifeExpectancy > nations.nation[d.name].lifeExpectancy[1])  
                nations.minLifeExpectancy = nations.nation[d.name].lifeExpectancy[1];
            if(nations.minIncome > nations.nation[d.name].income[1])  
                nations.minIncome = nations.nation[d.name].income[1];        
        } );

        var deltaIncome = nations.maxIncome-nations.minIncome;
        var deltaLife = nations.maxLifeExpectancy-nations.minLifeExpectancy;
        var counter = 0;
        var bottles = [];
        var minYear = Infinity, maxYear = -Infinity;
        Object.keys(nations.nation).forEach(function(key){
            var points = [];
            var n = nations.nation[key];
            var maxPop = Math.sqrt(nations.maxPopulation);
            var base=-1;
            // cut off all elements where we don't have all three years for base and last years. Ignore data before and after that.
            var baseYear = Math.max(n.population[0], n.lifeExpectancy[0]);
            baseYear = Math.max(baseYear, n.income[0]);
            minYear = Math.min(minYear, baseYear);
            var lastYear = Math.min(n.population[0]+n.population.length-3, n.lifeExpectancy[0]+n.lifeExpectancy.length-3);
            lastYear = Math.min(lastYear, n.income[0]+n.income.length-3);
            maxYear = Math.max(maxYear, lastYear);
            var offset=baseYear-1802;

            for(var i = 3+(baseYear-n.population[0]); i<3+lastYear-baseYear;i++){
                if(base === -1){base = i; }
                points.push(new THREE.Vector2(Math.sqrt(n.population[i])/maxPop, (i+offset-3)/10));
            }
            var geometry = new THREE.LatheBufferGeometry( points , 32);
            var positions = geometry.getAttribute('position');
            var w = 3;
            var color = new THREE.Color((Math.random()+w-2)/w, (Math.random()+w-2)/w, (Math.random()+w-2)/w);
            var material = new THREE.MeshStandardMaterial( { color: color.getHex() ,side: THREE.DoubleSide } );
            var lathe = new THREE.Mesh( geometry, material);
            lathe.raycast = function(){} // this is a no-op
            for(var i=0; i<=32; i++){
                for(var j=0; j<points.length; j++){
                    var index = i*points.length+j;
                    var px = positions.getX(index);
                    var py = positions.getY(index);                    
                    var pz = positions.getZ(index); 

                    var offsetIncome = n.income[j+3+baseYear-n.income[0]];
                    offsetIncome = 20*(offsetIncome-nations.minIncome)/deltaIncome;

                    var offsetLife = n.lifeExpectancy[j+3+baseYear-n.lifeExpectancy[0]];

                    offsetLife = 20*(offsetLife-nations.minLifeExpectancy)/deltaLife;
                    positions.setXYZ(index, px+offsetIncome,py,pz-offsetLife); // pz-offsetLife because z is into the screen in base position
                }
            }
            //if(key!=="Mongolia") lathe.visible=false;
            geometry.name = lathe.name = key;
            geometry.computeVertexNormals();
            //lathe.position.x = counter;
            var min = new THREE.Vector3(n.income[1], n.population[1], n.lifeExpectancy[1]);
            var max = new THREE.Vector3(n.income[2], n.population[2], n.lifeExpectancy[2]);
            var bottle = new TBottleLine(null, null, lathe, min, max);

            bottles.push( bottle );
        });
        return {bottles: bottles, minYear: minYear, maxYear: maxYear};
    });
}

function massageNation(ndata,name){
    var nation = {};
    nation.income = interpolate(ndata.income,name);
    convertToLog(nation.income);
    nation.lifeExpectancy = interpolate(ndata.lifeExpectancy,name);
    //filter(nation.lifeExpectancy, 0.05);
    nation.population = interpolate(ndata.population,name);
    //if(name==="China")console.log(ndata, nation);
    nation.name = ndata.name;
    nation.region = ndata.region;
    return nation;
}

function filter(array, mx){
    for(var i=1; i<array.length-2; i++){
        if(Math.abs((array[i-1][1]-array[i][1])/array[i-1][1])>mx){array[i][1]=(array[i-1][1]+array[i+1][1])/2;}
    }
}

function convertToLog(array){
    for(var i=1, alen = array.length; i<alen; i++){
        array[i]=Math.log10(array[i]);
    }
}

function interpolate(from,name){
    var values=[];
    var year, baseYear, fromYear, endYear;
    var lastVal;
    var maxVal = 0, minVal = Infinity;
    for(var i=0, flen = from.length; i<flen;i++){
        year = from[i][0];
        if(!baseYear)baseYear = year;
        if(!fromYear)fromYear = year;
        endYear  = year;
        var val = values[3+year-baseYear]=from[i][1];
        if(val>maxVal) maxVal = val;
        if(val>0 && val<minVal) minVal = val;
        if(year-fromYear>1){
            var delta = year-fromYear;
            for(var y = fromYear+1; y<year; y++){
                values[3+y-baseYear]=lastVal+(val-lastVal)*(y-fromYear)/delta;
            }
        }
        fromYear = year;
        lastVal = val;
        //if(name==="Mongolia")console.log(year, val, from[i][1]);
    }
    //console.log(baseYear, endYear);
    values[0]=baseYear;
    values[1]=minVal;
    values[2]=maxVal;
    return values;
}

export { buildBottleChart }
