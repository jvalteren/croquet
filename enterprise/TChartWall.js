// Copyright 2017 by David A Smith and CEO Vision, Inc. All Rights Reserved.
// davidasmith@gmail.com
// 919-244-4448

// Code for initial demo of a wall of flying chart canvases

/*global d3,THREE*/
import { TObject, Globals } from "./TObject.js";
import { TRectangle } from "./TObjects.js";
import { loadHTTP } from "./TImporters.js";
import { mobileCheck } from "./OnMobile.js";
import { TTextLabel } from "./TWindow.js";

TObject.subclass('users.TChartWall',
	'properties',{
        isInVR: false,
        undistortRects: true,
		maxWallCharts: null,
		chartsToShow: null,
        relatedTObjects: [],
        rectWidth: 240, rectHeight: 135,  // 16:9, because... why not?
        wallSizeMultiple: 1, wallCanvasMultiple: 2,         // wall canvases are 480*270
        scrollerSizeMultiple: 1, scrollerCanvasMultiple: 2, // as are scroller canvases
        focusSizeMultiple: 2, focusCanvasMultiple: 4,       // focus canvas is 960*540
        rectsPerRow: 20, wallRadius: 1560, maxWallAngle: Math.PI*0.47,
        //rectsOnScroller: 12, scrollerRadius: 900, maxScrollerAngle: Math.PI*0.47, scrollerY: -200, scrollerStepTime: 250,
        rectsOnScroller: 9, scrollerRadius: 650, maxScrollerAngle: Math.PI*0.47, scrollerY: -75, scrollerControlY: -175, scrollerStepTime: 200,
        wallRowHeightFactor: 1.05,
        numHighlightBlobs: 5,
        numMaps: 1, mapWidth: 13, mapHeight: 4, mapCanvasMultiple: 20,
        plotMargin: 0,
        cameraToFocus: 530, cameraResetPos: null,
        focusRect: null, focusCountry: null,
        unpickTimeout: null, controlPickTimeout: null,
        wallRects: [], scrollerRects: [], scrollerControlRects: [], mapRects: [],
        lastRenderedRotation: null,
        highlightYear: null, highlightYearLocked: false,
        timedChange: null,
        renderChecker: null,
        healthWealth: null,
        orderedCountries: null, // the ordering used for showing fewer than all countries
        headUp: null,
        dormant: true,
        includeScroller: null
	},
    
	'initalize',{
		initialize: function(thenDo){
            this.includeScroller = true; // !!Globals.urlOptions.scrollcharts;
            this.loadBostockData(thenDo);
            },
            
        awaken: function() {
            this.dormant = false;
            this.isInVR = mobileCheck() || Globals.vrDisplay.isPresenting;
            this.undistortRects = !(this.isInVR || Globals.urlOptions.nonvrcompensation===false);
            this.cameraResetPos = Globals.resetVector;
            this.lastRenderedRotation = Globals.tAvatar.getObject3D().rotation.y;
            this.makeHeadUp();
            if (this.includeScroller) {
                this.orderedCountries = this.healthWealth.countriesByPopulation.slice();
                this.orderedCountries.reverse();

                this.setUpScrollerRects();
                this.setUpScrollerControlRects();
                this.setUpScrollStepper();
                
                this.makeMapRects();
            } else this.orderedCountries = this.healthWealth.countries;
            this.setUpWallRects();
            if (this.undistortRects) this.setUpRenderChecker();
            },

        makeHeadUp: function() {
            let head = this.headUp = new TTextLabel(null, tobj=>{ tobj.object3D.position.set(0, -0.5, -5); }, "hullo", 4, 1, 64);
            head.object3D.material.opacity = 0.8;
            head.object3D.visible = false;
            Globals.tAvatar.addChild(head);
            this.relatedTObjects.push(head);
            },
            
        makeRect: function(rectWidth, rectHeight, canvasMultiple, options) {
            // main canvas is accessible as rect.mainCanvas; its texture as rect.mainCanvasTexture.
            // if requested, it has an extra rect.ephemeralCanvas, rect.ephemeralCanvasTexture.
            let withBacking = !!options.withBacking,
                withEphemeral = !!options.withEphemeral,
                withHighlightBlobs = !!options.withHighlightBlobs,
                withPointerShape = false && !!options.withPointerShape; // @@
            let width = rectWidth * canvasMultiple, height = rectHeight * canvasMultiple; // dimensions of the canvas, which we then scale down
            let newRect = new TRectangle(null, null, rectWidth, rectHeight, 1, 1);
            newRect.canvasMultiple = canvasMultiple;

            newRect.makeCanvas = function() {
                let canvas = document.createElement("canvas"), mult = this.canvasMultiple;
                canvas.width = this.width * mult;
                canvas.height = this.height * mult;
                canvas.getContext("2d").scale(1/mult, 1/mult);
                return canvas;
            }

            newRect.makeTexture = function(canvas) {
                let texture = new THREE.CanvasTexture(canvas);
                texture.minFilter = THREE.LinearFilter; // tip from http://stackoverflow.com/questions/29421702/threejs-texture to suppress "power of two" warnings
                return texture;
            }

            let canvas = newRect.mainCanvas = newRect.makeCanvas();
            let texture = newRect.mainCanvasTexture = newRect.makeTexture(canvas)
            // use Lambert, as per http://stackoverflow.com/questions/39427721/use-a-texture-and-a-color-on-a-cube-three-js
            newRect.object3D.material = new THREE.MeshLambertMaterial({
              map: texture,
              transparent: true
              });
            
            if (withBacking) {
                let rect = new THREE.PlaneBufferGeometry(1, 1, 32, 32);
                let mat = new THREE.MeshPhongMaterial({color:0xffffff /*0xcccccc*/, emissive: 0xffffff /*0x222222*/, side: THREE.DoubleSide });
                newRect.backRect = new THREE.Mesh(rect, mat);
                newRect.backRect.scale.set(rectWidth, rectHeight, 1);
                newRect.backRect.position.set(0,0,-2);
                newRect.object3D.add(newRect.backRect);
            }

            if (withEphemeral) {
                let ephemRect = new TRectangle(null, null, rectWidth, rectHeight, 1, 1);
                let canvas = newRect.ephemeralCanvas = newRect.makeCanvas();
                let texture = newRect.ephemeralCanvasTexture = newRect.makeTexture(canvas);
                ephemRect.object3D.material = new THREE.MeshLambertMaterial({
                  map: texture,
                  transparent: true
                  });
                ephemRect.object3D.position.set(0,0,2);
                //newRect.ephemeralRect = ephemRect; probably no need
                newRect.addChild(ephemRect);
                
                newRect.clearEphemeralCanvas = ()=>{ canvas.width=canvas.width; texture.needsUpdate = true }
            }

            if (withHighlightBlobs) {
                let blobs = newRect.highlightBlobs = [];
                let colour = new THREE.Color("black");
                let radius = this.rectWidth*this.wallCanvasMultiple/(options.highlightBlobDivisor ||75);   // NB: arbitrary
                for (let ri=0; ri<this.numHighlightBlobs; ri++) {
                    let geometry = new THREE.CircleGeometry(radius, 12);
                    let material = new THREE.MeshBasicMaterial( {color: colour} );
                    let blob = new THREE.Mesh( geometry, material );
                    blob.material.transparent = false;
                    blob.renderOrder = 99-ri;       // IS THIS HELPING??
                    newRect.object3D.add(blob);
                    blob.position.set(0, 0, 0); // for now
                    blob.visible = false;
                    blobs.push(blob);
                }
            }

            if (withPointerShape) {
                var arrowShape = new THREE.Shape(), scale = 4.5;
                var x = 0, y = 0;
                arrowShape.moveTo( x, y );
                arrowShape.lineTo( x - 5*scale, y + 1*scale );
                arrowShape.lineTo( x - 3*scale, y + 2*scale );
                arrowShape.lineTo( x - 5*scale, y + 4*scale );
                arrowShape.lineTo( x - 4*scale, y + 5*scale );
                arrowShape.lineTo( x - 2*scale, y + 3*scale );
                arrowShape.lineTo( x - 1*scale, y + 5*scale );
                arrowShape.lineTo( x, y );

                var geometry = new THREE.ShapeGeometry( arrowShape );
                var material = new THREE.MeshBasicMaterial( { color: 0xffffff } );
                var pointer = new THREE.Mesh( geometry, material ) ;

                var innerArrowShape = new THREE.Shape(), scale = 3;
                innerArrowShape.moveTo( x, y );
                innerArrowShape.lineTo( x - 5*scale, y + 1*scale );
                innerArrowShape.lineTo( x - 3*scale, y + 2*scale );
                //innerArrowShape.lineTo( x - 7*scale, y + 6*scale );
                //innerArrowShape.lineTo( x - 6*scale, y + 7*scale );
                innerArrowShape.lineTo( x - 6*scale, y + 5*scale );
                innerArrowShape.lineTo( x - 5*scale, y + 6*scale );
                innerArrowShape.lineTo( x - 2*scale, y + 3*scale );
                innerArrowShape.lineTo( x - 1*scale, y + 5*scale );
                innerArrowShape.lineTo( x, y );

                geometry = new THREE.ShapeGeometry( innerArrowShape );
                material = new THREE.MeshBasicMaterial( { color: 0xa0522d } );
                var innerPointer = new THREE.Mesh( geometry, material ) ;
                pointer.add(innerPointer);
                innerPointer.position.set(-2, 2, 1); // relative to backing
                pointer.renderOrder = 290;
                innerPointer.renderOrder = 299;
                newRect.object3D.add(pointer);
                pointer.position.set(0, 0, 0.5); // for now
                pointer.visible = false;
                newRect.pointerShape = pointer;
            }

            // @@ move these out of here?
            newRect.xScaleCompensation = 1; // unless fudged to reduce stretch on flat screen
            newRect.xIncomeScale = this.xIncomeScale(width, height, canvasMultiple*this.plotMargin);
            newRect.yLifeScale = this.yLifeScale(width, height, canvasMultiple*this.plotMargin);
            newRect.rPopScale = this.rPopScale(width, height);
            
            return newRect
            },
            
        setUpWallRects: function() {
            // initialise one rect per country
            this.wallRects = [];
            let chartWall = this;
            for (let ri = 0; ri < this.maxWallCharts; ri++) {
                let r = this.makeRect(this.rectWidth*this.wallSizeMultiple, this.rectHeight*this.wallSizeMultiple, this.wallCanvasMultiple, { withBacking: true, withEphemeral: false, withHighlightBlobs: true });
                r.rawYAngle = 0;
                r.rectIndex = ri;
                if (true || !this.includeScroller) {
                    r.onPointerEnter = function(pEvt){ chartWall.pickedCountry(this.country); return true;};
                    r.onPointerLeave = function(pEvt){ chartWall.pickedCountry(null); return true;};
                }
                
                let country = this.orderedCountries[ri];
                r.country = country;
                this.plotCountryPath(r, country, {});
                r.object3D.position.set(0, this.rectHeight*this.wallSizeMultiple/2, this.cameraResetPos.z-this.wallRadius);
                Globals.tScene.addChild(r);
                this.wallRects.push(r);
                this.relatedTObjects.push(r);
                r.object3D.visible = false;
            }

            this.focusRect = this.makeFocusRect();
            this.chartsToShow = 1;

            this.showWallRects(1000, d3.easeQuadInOut);
            },
        
        setUpScrollerRects: function() {
            // initialise only as many rects as will be shown at one time
            this.scrollerRects = [];
            let hw = this.healthWealth, numRects = this.rectsOnScroller, totalSteps = hw.maxYear - hw.minYear + 1;
            this.scrollerAnglePerYear = this.maxScrollerAngle * 2 / (totalSteps - 1);
            this.scrollerAngleBetweenRects = this.maxScrollerAngle * 2 / (numRects-1);

            for (let ri = 0; ri < numRects; ri++) {
                let r = this.makeRect(this.rectWidth*this.scrollerSizeMultiple, this.rectHeight*this.scrollerSizeMultiple, this.scrollerCanvasMultiple, { withBacking: true, withPointerShape: true });

                r.baseYAngle = -this.maxScrollerAngle + ri*this.scrollerAngleBetweenRects;
                r.plottedYear = null;

                Globals.tScene.addChild(r);
                this.scrollerRects.push(r);
                this.relatedTObjects.push(r);
            }
            
            },

        setUpScrollerControlRects: function() {
            // initialise one rect per year, spaced evenly around the scroller arc
            let chartWall = this;
            this.scrollerControlRects = [];
            let hw = this.healthWealth, numRects = hw.maxYear - hw.minYear + 1;
            let scrollerAngleDelta = this.maxScrollerAngle * 2 / (numRects-1);
            let segmentWidth = scrollerAngleDelta * this.scrollerRadius + 1; // aim to overlap
            let segmentHeight = 40;
            let neutralColour = new THREE.Color("#0000dd");

            function clearPickingTimeout() {
                if (chartWall.controlPickTimeout) { clearTimeout(chartWall.controlPickTimeout); chartWall.controlPickTimeout = null }
            }
            function setControlColours() {
                let pickedYear = chartWall.highlightYear, pickedColour = new THREE.Color(chartWall.highlightYearLocked ? "#dddd00" : "#dd0000");
                chartWall.scrollerControlRects.forEach(r=>{
                    let colour = pickedYear && pickedYear===r.year ? pickedColour : neutralColour;
                    r.object3D.material.color.set(colour);
                    });
            }

            let activated = false;
            for (let ri = 0; ri < numRects; ri++) {
                let r = new TRectangle(null, null, segmentWidth, segmentHeight, 1, 1);

                let year = hw.minYear+ri;
                r.year = year;
                r.object3D.material.color.set(neutralColour);

                r.desiredYAngle = -this.maxScrollerAngle + ri*scrollerAngleDelta;

                Globals.tScene.addChild(r);
                this.scrollerControlRects.push(r);
                this.relatedTObjects.push(r);
                
                r.onPointerEnter = function(pEvt){
                    if (!activated) return true;
                    
                    let thisYear = this.year;
                    if (chartWall.highlightYearLocked && chartWall.highlightYear===thisYear) return true;

                    clearPickingTimeout();
                 
                    function pickThis() {
                        chartWall.highlightYear = thisYear;
                        chartWall.highlightYearLocked = false; // for now
                        setControlColours();
                    }
                 
                    if (chartWall.highlightYearLocked) {
                        // wait for a while, then (if still here) unlock and pick this instead
                        chartWall.controlPickTimeout = setTimeout(pickThis, 500);
                    } else pickThis();  // pick immediately
                 
                    return true;
                    };

                r.onPointerLeave = function(pEvt){
                    if (chartWall.highlightYearLocked) {
                        // if we've entered and (now) left a control segment other than the locked one, make sure there's no lock-override timeout in progress
                        if (chartWall.highlightYear !== this.year) clearPickingTimeout();
                        return true;
                    }
                 
                    chartWall.controlPickTimeout = setTimeout(()=>{
                        chartWall.highlightYear = null;
                        setControlColours();
                        chartWall.clearHeadUpMessage();
                        chartWall.wallRects.slice(0, chartWall.chartsToShow).forEach(rect=>chartWall.removeHighlight(rect));
                        chartWall.removeHighlight(chartWall.focusRect);
                        chartWall.removeWallMapHighlights();
                    }, 250);
                    return true;
                    };
/*
                r.onPointerDown = function(pEvt){
                    ctx.fillStyle = "#dd0";
                    ctx.fillRect(0, 0, segmentWidth, segmentHeight);
                    r.mainCanvasTexture.needsUpdate = true;
                    chartWall.highlightYear = null;
                    return true;
                    };
*/
                r.onPointerUp = function(pEvt){
                    clearPickingTimeout();

                    chartWall.highlightYear = this.year;
                    chartWall.highlightYearLocked = true;
                    setControlColours();
                    return true;
                    };

            }
            
            this.placeScrollerRects(this.scrollerControlRects, this.scrollerControlY);
            setTimeout(()=>activated = true, 2000); // hack.  for some reason they were being hit.
            
            },
            
        placeScrollerRects: function(rects, rectY) {
            let cameraRotation = this.lastRenderedRotation;

            for (let ri=0; ri<rects.length; ri++) {
                let r = rects[ri];
                let rawYAngle = r.desiredYAngle,
                    yAngleFromViewCentre = rawYAngle + cameraRotation,
                    yAngle = this.undistortRects ? Math.atan(yAngleFromViewCentre)-cameraRotation : rawYAngle;
                    
                r.object3D.setRotationFromEuler(new THREE.Euler(0, -yAngle, 0));
                r.object3D.updateMatrix();
                r.object3D.position.set(
                    this.scrollerRadius*Math.sin(yAngle),
                    rectY,
                    this.cameraResetPos.z-this.scrollerRadius*Math.cos(yAngle)
                    );

                if (this.undistortRects) this.adjustScaleForCameraAngle(r, this.scrollerRadius);
            }
            },
        
        makeFocusRect: function() {
            // build the near-to-camera roving "focus" view
            let lowerOcclusion = -10, /*this.rectHeight*0.05,*/
                relativeCentreY = this.focusSizeMultiple*this.rectHeight/2; // to line up top of rect, use -this.focusSizeMultiple*this.rectHeight/2;
            let focusRect = this.makeRect(this.rectWidth*this.focusSizeMultiple, this.rectHeight*this.focusSizeMultiple, this.focusCanvasMultiple, { withBacking: true, withHighlightBlobs: true, highlightBlobDivisor: 100 });
            let rectY = (this.cameraResetPos.y-lowerOcclusion)*(this.wallRadius-this.cameraToFocus)/this.wallRadius+lowerOcclusion+relativeCentreY;
            focusRect.object3D.raycast = function(){}; // don't allow picking
            focusRect.backRect.material.color.set(new THREE.Color("#e2c49c"));
            focusRect.backRect.material.emissiveIntensity = 0;
            focusRect.object3D.visible = false;
            Globals.tAvatar.addChild(focusRect);
            focusRect.object3D.position.set(0, rectY-this.cameraResetPos.y, -this.cameraToFocus);
            this.relatedTObjects.push(focusRect);
            return focusRect;
            },

        makeMapRects: function() {
            // build the near-to-camera roving "map" views
            this.mapRects = [];
            let numMaps = this.numMaps, mapW = this.mapWidth, mapH = this.mapHeight, mapMult = this.mapCanvasMultiple, mapSep = 1, totalWidth = mapW*numMaps + (numMaps-1)*mapSep;
            let mapY = -11, mapZ = -21;
            for (let ri=0; ri<numMaps; ri++) {
                let mapRect = new TRectangle(null, null, mapW, mapH, 1, 1);
                mapRect.countryRects = [];
                mapRect.object3D.material.transparent = false;
                mapRect.object3D.material.color.set(new THREE.Color("#eeeeee"));
                Globals.tAvatar.addChild(mapRect);
                mapRect.object3D.position.set(-totalWidth/2 + mapW/2 + (mapW+mapSep)*ri, mapY, mapZ);
                this.relatedTObjects.push(mapRect);
                this.mapRects.push(mapRect);
            }
            },

        makeBaseCircle: function() {
            /* circle as guide for cylindrical placement of views */
            let geometry = new THREE.CircleBufferGeometry( this.wallRadius, 32 );
            let material = new THREE.MeshPhongMaterial({color:0x777777, emissive: 0x222222, side: THREE.DoubleSide});
            //new THREE.MeshBasicMaterial( {color: 0xffffff, side: THREE.DoubleSide} );
            let circle = new THREE.Mesh( geometry, material );
            let c = new TObject(Globals.tScene, (tObj)=>{ }, circle);
            circle.position.set(0, 0, this.cameraResetPos.z);
            circle.setRotationFromEuler(new THREE.Euler(-Math.PI/2, 0, 0));
            circle.updateMatrix();
            this.relatedTObjects.push(c);
            return c;
            },
        
        setUpRenderChecker: function() {
            let chartWall = this;
            this.renderChecker = new TObject(Globals.tScene, null);
            this.renderChecker.update = function() {
                let rot = Globals.tAvatar.getObject3D().rotation.y;
                if (rot !== chartWall.lastRenderedRotation) {
                    chartWall.lastRenderedRotation = rot;
                    chartWall.showWallRects(0, d3.easeLinear);
                    chartWall.placeScrollerRects(chartWall.scrollerRects, chartWall.scrollerY);
                    chartWall.placeScrollerRects(chartWall.scrollerControlRects, chartWall.scrollerControlY);
                }
                }
            this.relatedTObjects.push(this.renderChecker);
            },

        setUpScrollStepper: function() {
            let chartWall = this;
            this.scrollStepper = new TObject(Globals.tScene, null);
            let timeOfLastReset = Date.now(),
                steppingRects = this.scrollerRects,
                numRects = steppingRects.length,
                anglePerYear = this.scrollerAnglePerYear,
                angleBetweenRects = this.scrollerAngleBetweenRects,
                timeBetweenResets = this.scrollerStepTime * angleBetweenRects / anglePerYear,
                minYear = this.healthWealth.minYear,
                maxYear = this.healthWealth.maxYear,
                minAngle = -this.maxScrollerAngle;

            this.scrollStepper.update = function() {
                let portionThroughStep = (Date.now() - timeOfLastReset)/timeBetweenResets;

                if (portionThroughStep >= 1) {
                    portionThroughStep -= 1;
                    timeOfLastReset = Date.now();
                }

                for (let ri=0; ri<numRects; ri++) {
                    let r = steppingRects[ri];
                    r.desiredYAngle = r.baseYAngle + portionThroughStep*angleBetweenRects;
                    let year = Math.floor(minYear + (r.desiredYAngle - minAngle) / anglePerYear);
                    if (year !== r.plottedYear) {
                        let visible = year <= maxYear;
                        r.object3D.visible = visible;
                        if (visible) {
                            let highlightHere = false;
                            if (chartWall.highlightYear) {
                                let minAngle = r.desiredYAngle - angleBetweenRects / 2, maxAngle = r.desiredYAngle + angleBetweenRects / 2;
                                let highlightAngle = -chartWall.maxScrollerAngle + (chartWall.highlightYear - minYear) * anglePerYear;
                                highlightHere = highlightAngle >= minAngle && highlightAngle <= maxAngle;
                            }
                            chartWall.plotYearBlobs(r, year, { highlight: highlightHere });
                            if (highlightHere) {
                                chartWall.showHeadUpMessage(String(year));
                                chartWall.wallRects.slice(0, chartWall.chartsToShow).forEach(rect=>chartWall.addHighlight(rect, rect.country, year));
                                if (chartWall.focusCountry) chartWall.addHighlight(chartWall.focusRect, chartWall.focusCountry, year);
                            }
                        }
                        r.plottedYear = year;
                    }
                }
                chartWall.placeScrollerRects(chartWall.scrollerRects, chartWall.scrollerY);
                }
            this.relatedTObjects.push(this.scrollStepper);
            }

	},
    'action', {
        showHeadUpMessage: function(msg) {
            // specialised to showing years, in brick red, in centre of view
            this.headUp.replaceText(msg, 54, 60, "#ff4444");
            this.headUp.object3D.visible = true;
            },
            
        clearHeadUpMessage: function(msg) {
            this.headUp.object3D.visible = false;
            },
            
        sliderChanged: function(n) {
            if (this.dormant) this.awaken();

            if (n===this.chartsToShow) return;

            this.chartsToShow = n;
            this.scrollerRects.forEach(rect=>delete rect.cachedTextures);
            this.wallRects.forEach(rect=>this.removeHighlight(rect));
            this.showWallRects(400, d3.easeLinear);
            },
    
        cleanup: function() {
            this.dormant = true;
            this.relatedTObjects.forEach(ea => ea.removeSelf());
            this.relatedTObjects = [];
            this.wallRects = [];
            this.scrollerRects = [];
            this.scrollerControlRects = [];
            this.mapRects = [];
            this.chartsToShow = null;
            this.lastRenderedRotation = null;
            this.timedChange = null;
            this.renderChecker = null;
            },
        
        startTimedChange: function(duration, updateFn, startDelay) {
            let start = Date.now()+(startDelay || 0);
            let timerObj = new TObject(Globals.tScene, null);
            timerObj.cancelChange = function() { if (!this.cancelled) { delete this.update; this.removeSelf(); this.cancelled = true; } };
            timerObj.update = function() {
                let t = Date.now()-start;
                if (t>=0) {
                    updateFn(Math.min(1, t/duration));
                    if (t >= duration) this.cancelChange();
                    }
                }
            return timerObj;
            },

        adjustScaleForCameraAngle: function(rect, radius) {
            let halfSubtended = this.rectWidth/2/radius;
            let cameraRotation = this.lastRenderedRotation;
            let rectRotation = rect.object3D.rotation.y;
            let absAngle = Math.abs(rectRotation-cameraRotation), innerAngle = absAngle - halfSubtended, outerAngle = absAngle + halfSubtended;
            let projectedWidth = radius * (Math.tan(outerAngle)-Math.tan(innerAngle)), scaleCompensation = this.rectWidth/projectedWidth;
            rect.xScaleCompensation = scaleCompensation;
            rect.object3D.scale.set(scaleCompensation, 1, 1);
            if (rect.crosshair) rect.crosshair[1].scale.set(Math.sqrt(1/scaleCompensation), 1, 1);
            },

        showWallRects: function(duration, ease) {
            if (this.timedChange) this.timedChange.cancelChange();

            for (let ri=0; ri<this.maxWallCharts; ri++) {
                let r = this.wallRects[ri];
                if (ri<this.chartsToShow) {
                    r.wallRow = Math.floor(ri/this.rectsPerRow), r.wallColumn = ri-this.rectsPerRow*r.wallRow;
                    r.object3D.visible = true;
                } else {
                    r.object3D.visible = false;
                    r.object3D.position.set(0, this.rectHeight/2, this.cameraResetPos.z-this.wallRadius);
                    r.object3D.setRotationFromEuler(new THREE.Euler(0, 0, 0));
                    r.object3D.updateMatrix();
                    }
            }

            let numRows = Math.ceil(this.chartsToShow/this.rectsPerRow);
            let cameraRotation = this.lastRenderedRotation;
            
            let startVals = [], endVals = [];
            for (let ri=0; ri<this.chartsToShow; ri++) {
                let r = this.wallRects[ri], row = r.wallRow, column = r.wallColumn, rectsInThisRow = row<numRows-1 ? this.rectsPerRow : this.chartsToShow-row*this.rectsPerRow, maxRotInThisRow = rectsInThisRow===1 ? 0 : this.maxWallAngle*(rectsInThisRow-1)/(this.rectsPerRow-1);
                let oldPos = r.object3D.position;
                startVals.push({ position: [ oldPos.x, oldPos.y, oldPos.z ], rotationY: r.object3D.rotation.y, rawYAngle: r.rawYAngle });
                // the raw angle is how far you'd have to turn off centre to view this rectangle straight on.  we place
                // the rectangle less far around (arcTan of rawAngle), to compensate for perspective-restoring narrowing
                // of rectangles that are off centre.
                let rawYAngle = rectsInThisRow===1 ? 0 : -maxRotInThisRow + column*maxRotInThisRow*2/(rectsInThisRow-1),
                    yAngleFromViewCentre = rawYAngle + cameraRotation,
                    yAngle = this.undistortRects ? Math.atan(yAngleFromViewCentre)-cameraRotation : rawYAngle,
                    newPosition = [
                        this.wallRadius*Math.sin(yAngle),
                        this.wallRowHeightFactor * this.rectHeight * (numRows-row-1) + this.rectHeight/2,
                        this.cameraResetPos.z-this.wallRadius*Math.cos(yAngle)
                        ];
                endVals.push({ position: newPosition, rotationY: -yAngle, rawYAngle: rawYAngle });
                }

            let wallTick = tick.bind(this);
            if (duration) this.timedChange = this.startTimedChange(duration, wallTick);
            else wallTick(1);

            function tick(rawStage) {
                let stage = ease(rawStage);
                function interp(start, end) { return start + stage*(end-start) };
                let mappingCoords = [];
                for (let ri=0; ri<this.chartsToShow; ri++) {
                    let r = this.wallRects[ri], starts = startVals[ri], ends = endVals[ri];
                    
                    let interPosition = [0,1,2].map(i=>interp(starts.position[i], ends.position[i]));
                    let interAngle = interp(starts.rotationY, ends.rotationY);
                    
                    r.object3D.setRotationFromEuler(new THREE.Euler(0, interAngle, 0));
                    r.object3D.updateMatrix();
                    r.object3D.position.set(interPosition[0], interPosition[1], interPosition[2]);

                    let rawYAngle = interp(starts.rawYAngle, ends.rawYAngle);
                    mappingCoords.push({ country: r.country, yAngle: rawYAngle, y: interPosition[1] });
                    r.rawYAngle = rawYAngle;

                    if (this.undistortRects) this.adjustScaleForCameraAngle(r, this.wallRadius);
                }
                this.updateWallMaps(mappingCoords);
            };
            },

        updateWallMaps: function(countryRectCoords) {
            let maps = this.mapRects;
            if (maps.length===0) return;
            
            // for now, all these coords are in pixel scale, from when we were using a canvasMultiple
            let miniRectW = 10, miniRectH = 6, mult = 20;
            let sample = maps[0],
                mapW = sample.width,
                mapH = sample.height,
                mapCanvW = mapW*mult,
                mapCanvH = mapH*mult,
                margin = 6,
                innerCanvW = mapCanvW - margin*2 - miniRectW,
                innerCanvH = mapCanvH - margin*2 - miniRectH;
            let maxWallHeight = this.wallRowHeightFactor * this.rectHeight * (Math.ceil(this.maxWallCharts/this.rectsPerRow)-1);
            let yMinMax = d3.extent(countryRectCoords, d=>d.y), yMin = yMinMax[0], yMax = yMinMax[1], yRange = yMax - yMin, scaledYRange = yRange/maxWallHeight * innerCanvH;
            let yScale = yRange === 0 ? yIn=>mapCanvH/2 : yIn=>(mapCanvH + scaledYRange)/2 - scaledYRange*(yIn-yMin)/yRange;
            let xScale = yAngleIn=>mapCanvW/2 + innerCanvW/2 * yAngleIn/this.maxWallAngle;
            let chartWall = this, startColour = new THREE.Color("black");
            for (let ri=0; ri<maps.length; ri++) {
                let map = maps[ri], countryRects = map.countryRects;
                Object.keys(countryRects).forEach(country=>countryRects[country].object3D.visible = false);
                countryRectCoords.forEach(rectInfo=>{
                    let country = rectInfo.country, countryRect = countryRects[country];
                    if (!countryRect) {
                        countryRects[country] = countryRect = new TRectangle(null, null, miniRectW/mult, miniRectH/mult, 1, 1);
                        countryRect.country = country;
                        countryRect.object3D.renderOrder = 199;
                        countryRect.object3D.material.color.set(startColour);
                        map.addChild(countryRect);

                        countryRect.onPointerEnter = function(pEvt){ chartWall.pickedCountry(this.country); return true;};
                        countryRect.onPointerLeave = function(pEvt){ chartWall.pickedCountry(null); return true;};
                    }

                    countryRect.object3D.visible = true;
                    let x = xScale(rectInfo.yAngle)/mult-mapW/2, y = mapH/2-yScale(rectInfo.y)/mult, distInFront = 0.01;
                    countryRect.object3D.position.set(x, y, distInFront);
                    });
            }
            
            },

        updateWallMapsForCountry: function(country, colour) {
            let maps = this.mapRects;
            if (maps.length===0) return;
            for (let ri=0; ri<maps.length; ri++) {
                let map = maps[ri], countryRects = map.countryRects, countryRect = countryRects[country];
                if (countryRect) countryRect.object3D.material.color.set(colour);
            }
            },

        removeWallMapHighlights: function() {
            let maps = this.mapRects;
            if (maps.length===0) return;
            
            let colour = new THREE.Color("black");
            for (let ri=0; ri<maps.length; ri++) {
                let map = maps[ri], countryRects = map.countryRects;
                Object.keys(countryRects).forEach(country=>countryRects[country].object3D.material.color.set(colour));
            }
            },
            
        plotCountryPath: function(rect, country, options) {
            let addBorder = !!options.addBorder, withAxes = !!options.withAxes;

            let canvas = rect.mainCanvas, width = canvas.width, height = canvas.height, mult = rect.canvasMultiple;
            let titleFontSize = 22, labelFontSize = 8;
            let ctx = canvas.getContext("2d");
            canvas.width = canvas.width;  // fast way to clear

            if (addBorder) {
                ctx.strokeStyle = "grey";
                let lw = 2*mult;
                ctx.lineWidth = lw;
                ctx.strokeRect(lw/2, lw/2, width-lw, height-lw);
            }

            let fontSize = titleFontSize*mult;
            ctx.fillStyle = "black";
            ctx.font = fontSize+"px Arial";
            ctx.fillText(country, 5*mult, 20*mult);

            let hw = this.healthWealth;
            let countryIncome = hw.statOverYears("income", country), countryLife = hw.statOverYears("lifeExpectancy", country), minYear = hw.minYear, maxYear = hw.maxYear, yearColourScale = hw.yearColourScale;
            
            let xScale = rect.xIncomeScale, yScale = rect.yLifeScale;
            let relData = null;
            if (options.relativeCountry) {
                relData = options.relativeData;
                if (relData.length===0) {  // first time through, fill it up
                    let relCountry = options.relativeCountry;
                    let relIncome = hw.statOverYears("income", relCountry), relLife = hw.statOverYears("lifeExpectancy", relCountry);
                    for (let yr = minYear; yr<= maxYear; yr++) {
                        relData[yr] = { x: xScale(relIncome[yr]), y: yScale(relLife[yr]) };
                    }
                }
                ctx.strokeStyle = "grey";
                ctx.lineWidth = 2;
                ctx.beginPath()
                ctx.moveTo(0, height/2);
                ctx.lineTo(width, height/2);
                ctx.stroke();
                ctx.beginPath()
                ctx.moveTo(width/2, 0);
                ctx.lineTo(width/2, height);
                ctx.stroke();
            }

            function xy(year) {
                return relData
                    ? { x: ((xScale(countryIncome[year]) - relData[year].x + width)/2) | 0, y: ((height - (yScale(countryLife[year]) - relData[year].y ))/2) | 0 }
                    : { x: xScale(countryIncome[year]) | 0, y: height-(yScale(countryLife[year]) | 0) }
                }

            ctx.lineWidth = 3;

            let numSegs = 8, yearsPerSeg = Math.ceil((maxYear-minYear)/numSegs);
            let startPt = xy(minYear), pt;
            for (let si=0; si<numSegs; si++) {
                let startYear = minYear + si*yearsPerSeg, endYear = Math.min(maxYear, startYear+yearsPerSeg-1), colour = yearColourScale((startYear+endYear)/2|0);
                ctx.strokeStyle = colour;
                ctx.beginPath();
                ctx.moveTo(startPt.x, startPt.y);
                for (let yr=startYear+1; yr<=endYear; yr++) {
                    pt = xy(yr);
                    ctx.lineTo(pt.x, pt.y);
                }
                ctx.stroke();
                startPt = pt;  // for next segment
            }

            if (withAxes) {
                ctx.save();
                ctx.fillStyle = "black";
                let fontSize = labelFontSize*mult;
                ctx.font = fontSize+"px Arial";
                ctx.textAlign = "center";
                ctx.strokeStyle = "black";
                ctx.lineWidth = mult+"px";
                hw.gdpAxisValues.forEach(val=>{
                    let x = xScale(val);
                    ctx.fillText(String(val), x, height-8*mult);
                    ctx.beginPath();
                    ctx.moveTo(x, height-6*mult);
                    ctx.lineTo(x, height);
                    ctx.stroke();
                    });
                ctx.textAlign = "right";
                ctx.fillText("GDP (US$)", width-10*mult, height-10*mult-fontSize*1.25);
                
                ctx.textAlign = "left";
                ctx.fillText("life (years)", 10*mult, (titleFontSize*1.15 + labelFontSize)*mult);
                ctx.textBaseline = "middle";
                hw.lifeAxisValues.forEach(val=>{
                    let y = height-yScale(val);
                    ctx.fillText(String(val), 10*mult, y);
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(7*mult, y);
                    ctx.stroke();
                    });
                ctx.restore();
            }

            rect.mainCanvasTexture.needsUpdate = true;
            },

        plotYearBlobs: function(rect, year, options) {
            // plot blobs for the given year, for all countries currently on view.
            // if there's a focusCountry, place the rect's pointer shape next to it.
            let addBorder = !!options.addBorder, highlight = !!options.highlight;
            let textures = rect.cachedTextures, mult = rect.canvasMultiple;
            let width = rect.width * mult, height = rect.height * mult;
            if (!textures) textures = rect.cachedTextures = {};
            
            let yearTexture = textures[year];
            if (!yearTexture) {
                let canvas = rect.makeCanvas();
                canvas.width = canvas.width;  // dunno why, but this seems essential to get the scale right
                let ctx = canvas.getContext("2d");

                if (addBorder) {
                    ctx.strokeStyle = "grey";
                    let lw = 2*mult;
                    ctx.lineWidth = lw;
                    ctx.strokeRect(lw/2, lw/2, width-lw, height-lw);
                }
                
                let fontSize = 18*mult;
                ctx.fillStyle = "black";
                ctx.font = fontSize+"px Arial";
                ctx.fillText(year, 5*mult, 20*mult);
                           
                let twoPi = Math.PI*2;
                let deets = this.orderedCountries.slice(0, this.chartsToShow).map(country=>this.calculatePlotProperties(rect, country, year, ["xy", "colour", "radius"]));
                deets.sort((a,b)=>b.radius-a.radius); // descending, so we plot smaller blobs later
                deets.forEach(blobDeets=>{
                    let centre = blobDeets.xy;
                    ctx.fillStyle = blobDeets.colour;
                    ctx.beginPath();
                    ctx.arc(centre.x, centre.y, blobDeets.radius, 0, twoPi);
                    ctx.fill();
                    });

                if (this.focusCountry) {
                    ctx.save();
                    let numRings = 6, yearOffset = (year % numRings) - numRings, perYear = 2;
                    for (var yi=1; yi<=numRings; yi++) {
                        let deets = this.calculatePlotProperties(rect, this.focusCountry, year-yi, ["xy", "colour", "radius"]);
                        let centre = deets.xy;
                        ctx.strokeStyle = deets.colour;
                        let radiusOffset = perYear*numRings*yi+yearOffset*perYear;
                        ctx.globalAlpha = 1 - radiusOffset/(perYear*numRings*numRings);
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(centre.x, centre.y, deets.radius+radiusOffset, 0, twoPi);
                        ctx.stroke();
                    }
                    ctx.restore();
                }

                yearTexture = textures[year] = rect.makeTexture(canvas);
                rect.backRect.material.color.set(new THREE.Color("red")); // might as well do it here, rather than every time
            }
            rect.object3D.material.map = yearTexture;
            yearTexture.needsUpdate = true;
            rect.backRect.material.emissiveIntensity = highlight ? 0.7 : 1.0;  // 0.7 lets the red shine through a bit
/*
            let pointer = rect.pointerShape;
            if (pointer) {
                if (this.focusCountry) {
                    let deets = this.calculatePlotProperties(rect, this.focusCountry, year, ["xy", "radius"]);
                    let offset = deets.radius/Math.sqrt(2);
                    pointer.position.set((deets.xy.x-offset-width/2)/mult, (height/2-deets.xy.y+offset)/mult, 0.5);
                    pointer.visible = true;
                } else pointer.visible = false;
            }
*/

            },

        placeYearBlobs: function(rect, year, options) {
            // NOT USED
            // experiment in using THREE.js shapes for the countries.  would need more work to avoid render-order jostling.
            let mult = rect.canvasMultiple;
/*
            let highlight = !!options.highlight;
            let canvas = rect.mainCanvas, width = canvas.width, height = canvas.height;
            let ctx = canvas.getContext("2d");
            canvas.width = canvas.width;  // fast way to clear

            if (highlight) {
                ctx.fillStyle = "rgba(200, 0, 0, 0.2)";
                ctx.fillRect(0, 0, width, height)
            }
                 
            let fontSize = 18*mult;
            ctx.fillStyle = "black";
            ctx.font = fontSize+"px Arial";
            ctx.fillText(year, 5*mult, 20*mult);
*/

            if (!rect.blobList) rect.blobList = {};
            let blobList = rect.blobList;
            this.orderedCountries.forEach(country=>{
                let blobDeets = this.calculatePlotProperties(rect, country, year, ["xy", "colour", "radius"]);
                let countryBlob = blobList[country];
                if (!countryBlob) {
                    let geometry = new THREE.CylinderGeometry( blobDeets.radius, blobDeets.radius, 1, 16 ); // assumes const radius for the years covered by a rect
                    let material = new THREE.MeshBasicMaterial( {color: blobDeets.colour} );
                    let blob = new THREE.Mesh( geometry, material );
                    blob.renderOrder = 100-((blobDeets.radius*2)|0);
                    blob.rotation.x = Math.PI/2;
                    rect.object3D.add(blob);
                    countryBlob = blobList[country] = blob;
                }
                let xy = blobDeets.xy, blobX = xy.x/mult - rect.width/2, blobY = rect.height/2 - xy.y/mult;
                countryBlob.position.set(blobX, blobY, 6);
                });
            
//            rect.mainCanvasTexture.needsUpdate = true;
            },

        addHighlight(rect, country, year) {
            // "highlight" with a bunch of 2D circle objects.
            // we colour blobs with redness depending on the distance moved, and lightness depending on age of the blob
            let rectWidth = rect.width, rectHeight = rect.height, mult = rect.canvasMultiple;
            let blobs = rect.highlightBlobs, numBlobs = blobs.length, distInFront = 1;
            
            // hide all blobs when the year jumps back to a lower value
            if (rect.highlightYear && rect.highlightYear>year) {
                blobs.forEach(blob=>blob.visible=false)
            }
            rect.highlightYear = year;
            
            // work backwards, copying position and redness iff the preceding blob is visible
            for (let ri=numBlobs-1; ri>=1; ri--) {
                if (blobs[ri-1].visible) {
                    let thisBlob = blobs[ri];
                    let pos = blobs[ri-1].position;
                    thisBlob.position.set(pos.x, pos.y, distInFront);
                    let redness = thisBlob.redness = blobs[ri-1].redness;
                    let lightness = ri*0.15;
                    thisBlob.material.color.set(new THREE.Color(Math.min(1, lightness+redness), lightness, lightness));
                    thisBlob.visible = true;
                }
            }
            let xy = this.calculatePlotProperties(rect, country, year, ["xy"]).xy;
            let blobX = xy.x/mult - rectWidth/2, blobY = rectHeight/2 - xy.y/mult;
            let topBlob = blobs[0];
            let redness = 0;
            if (topBlob.visible) {
                let bigJump = rectWidth*mult/100; // a 1% jump will be fully red
                let oldPos = topBlob.position, dx = blobX-oldPos.x, dy = blobY-oldPos.y, distSquared = dx*dx+dy*dy;
                redness = Math.min(1, distSquared/(bigJump*bigJump));
            }
            let topBlobColour = new THREE.Color(redness, 0, 0);
            this.updateWallMapsForCountry(country, topBlobColour);
            topBlob.material.color.set(topBlobColour);
            topBlob.redness = redness;
            topBlob.position.set(blobX, blobY, distInFront);
            topBlob.visible = true;
            },
            
        removeHighlight(rect) {
            if (rect.highlightBlobs) {
                rect.highlightYear = null;
                rect.highlightBlobs.forEach(blob=>blob.visible = false);
            }
            },

        calculatePlotProperties(rect, country, year, properties) {
            let rectHeight = rect.mainCanvas.height; // hacky
            
            let propCache = rect.propCache; // by year, then by country
            if (!propCache) propCache = rect.propCache = {};
            let propYearCache = propCache[year];
            if (!propYearCache) propYearCache = propCache[year] = {};
            let propCountryCache = propYearCache[country];
            if (!propCountryCache) propCountryCache = {};

            if (properties.some(p=>propCountryCache[p]===undefined)) {
                let hw = this.healthWealth;
                let xScale = rect.xIncomeScale, yScale = rect.yLifeScale, popScale = rect.rPopScale, colourScale = hw.regionColourScale;

                function xy(country, year) {
                    return { x: xScale(hw.statOverYears("income", country)[year]) | 0, y: rectHeight-(yScale(hw.statOverYears("lifeExpectancy", country)[year]) | 0) }
                    }
                    
                function radius(country, year) {
                    return popScale(hw.statOverYears("population", country)[year]);
                    }

                properties.forEach(property=>{
                    switch (property) {
                        case "xy":
                            propCountryCache.xy = xy(country, year);
                            break;
                           
                        case "colour":
                            propCountryCache.colour = colourScale(hw.countryRegion(country));
                            break;
                           
                        case "radius":
                            propCountryCache.radius = radius(country, year);
                    }
                    });
            }
            
            return propCountryCache;
            },
        

        drawTextOnRect(rect, texts, fontSize) {
            let canvas = rect.mainCanvas, width = canvas.width, height = canvas.height, mult = rect.canvasMultiple;
            let ctx = canvas.getContext("2d");
            canvas.width = canvas.width;  // somehow important for keeping the scale?  also clears the canvas.
            
            let margin = 5, lineHeight = fontSize+2, totalTextHeight = texts.length * lineHeight;

            //ctx.textAlign = "center";
            ctx.textBaseline = "top";
            function drawLines(textLines, verticalOffset) {
                ctx.fillStyle = "#ff0";
                ctx.fillRect(0, 0, width, height);
                ctx.fillStyle = "black";
                ctx.font = fontSize+"px Arial";
                textLines.forEach((text, i)=>{
                    let y = verticalOffset + lineHeight*i;
                    if (y>-lineHeight && y<=height) ctx.fillText(text, margin, y);
                    });
                rect.mainCanvasTexture.needsUpdate = true;
            }
            drawLines(texts, margin);
            },
        
        pickedCountry: function(countryOrNull) {
            let focusRect = this.focusRect;
            this.removeHighlight(focusRect);
            let focusCountry = this.focusCountry = countryOrNull;
            this.scrollerRects.forEach(rect=>delete rect.cachedTextures);
            if (focusCountry !== null) {
                if (this.unpickTimeout) {
                    clearTimeout(this.unpickTimeout);
                    this.unpickTimeout = null;
                }
                focusRect.object3D.visible = true;
                focusRect.country = focusCountry;
                this.plotCountryPath(focusRect, focusCountry, { addBorder: true, withAxes: true });
/* code for telling charts to draw a new path based on values relative to the focus country
let countryData = [];  // gets filled in by first country panel to be plotted
for (let ri = 0; ri < this.maxWallCharts; ri++) {
    let r = this.wallRects[ri];
    this.plotCountryPath(r, r.country, { relativeCountry: focusCountry, relativeData: countryData });
}
*/
            } else {
                focusRect.update = ()=>{};
                this.unpickTimeout = setTimeout(()=>{
                    focusRect.object3D.visible = false;
/* linked to the above: if we were requesting relative plots, now reset them
for (let ri = 0; ri < this.maxWallCharts; ri++) {
    let r = this.wallRects[ri];
    this.plotCountryPath(r, r.country, {});
}
*/
                    }, 250);
            }
            }

    },
            
    'data', {

        xIncomeScale: function(width, height, margin) {
            let minIn = 150, maxIn = 140000;
            let minLogIn = Math.log(minIn), maxLogIn = Math.log(maxIn), inLogRange = maxLogIn-minLogIn;
            
            let minOut = margin, maxOut = width - margin;
            
            return function(income) {
                let val = Math.log(income), valRatio = (val-minLogIn)/inLogRange;
                return minOut + (maxOut-minOut) * valRatio;
            }
            },

        yLifeScale: function(width, height, margin) {
            let minIn = 0, maxIn = 95, inRange = maxIn-minIn;
            let minOut = margin, maxOut = height - margin;
            
            return function(life) {
                let valRatio = (life-minIn)/inRange;
                return minOut + (maxOut-minOut) * valRatio;
            }
            },
            
        rPopScale: function(width, height, margin) {
            // arbitrarily, set a population of 1 billion to be a diameter of one-fifteenth the view height, and a minimum diameter of one fiftieth
            let maxOut = height/15/2, minOut = height/50/2;
            let scaleFactor = maxOut/10000;
            
            return function(pop) {
                return Math.max(minOut, Math.sqrt(pop)*scaleFactor);
            }
            },
            
        colourScale: function(min, max) {
            let valueScale = d3.scaleLinear().domain([min, max]);
            let colourInterpolator = d3.interpolateHcl("#5086FE", "#FD2EA7");
            return val => colourInterpolator(valueScale(val)).toString();
            },

        loadBostockData: function(thenDo) {
            // copied and hacked from http://bost.ocks.org/mike/nations/
            // data come in as one object per country, with properties
            //      region: africa, asia etc
            //      income: array of pairs [year, income] for which stats are available
            //      population: likewise
            //      lifeExpectancy: likewise
            // we throw these into a single object, using the country names as keys

            // Load and process the data.
            let self=this;
            loadHTTP("demos/augmented-nations-data-from-bostock.json", function(data) {
                let nations = JSON.parse(data), minYear = 1802, maxYear = 2009;
                
                // Finds (and possibly interpolates) the value for the specified year.
                function interpolateValues(values, year) {
                    let i = bisect.left(values, year, 0, values.length - 1),
                        a = values[i];
                    if (i > 0) {
                      let b = values[i - 1],
                          t = (year - a[0]) / (b[0] - a[0]);
                      return a[1] * (1 - t) + b[1] * t;
                    }
                    return a[1];
                }

                function accessInterpolatedValue(property, country, year) {
                    return Math.round(interpolateValues(nationsObject[country][property], year));
                }
                
                function accessValue(property, country, year) {
                    return nationsObject[country][property][year];
                }
                
                let nationsObject = {};
                nations.forEach(function(d) {
                    // some countries only have a few data points
                    if (d.income.length > 10 && d.lifeExpectancy.length > 10) {
                        let name = d.name;
                        let suffix = name.indexOf(", ");
                        if (suffix >= 0) {
                            name = name.slice(0, suffix)+" ("+name.slice(suffix+2)+")";
                        }
                        nationsObject[name] = d;
                    }
                    });

                // use a bisector because many nations' data are sparsely defined
                let bisect = d3.bisector(function(d) { return d[0]; });
                
                let allCountries = Object.keys(nationsObject).sort((a, b)=>a < b ? -1 : a > b ? 1 : 0);
                let allYears = [];
                for (let y=minYear; y<=maxYear; y++) allYears.push(y);

                // pre-calculate all values that might involve interpolation
                for (let ci=0; ci<allCountries.length; ci++) {
                    let c=allCountries[ci];
                    [ "income", "lifeExpectancy", "population"].forEach(function(prop) {
                        let baseVals=nationsObject[c][prop];
                        let yearVals=[];
                        for (let yi=0; yi<allYears.length; yi++) {
                            let y=allYears[yi];
                            yearVals[y]=(interpolateValues(baseVals, y));
                        }
                        nationsObject[c][prop]=yearVals;
                        })
                }
                
                // as a convenience, pre-calculate the countries' order according to their average populations
                let avgPops = allCountries.map(country=>({ country: country, pop: d3.mean(nationsObject[country].population) }));
                avgPops.sort((a, b)=>a.pop - b.pop);
                let popSortedCountries = avgPops.map(d=>d.country);
                
                self.healthWealth = {
                    minYear: minYear,
                    maxYear: maxYear,
                    countries: allCountries,
                    countriesByPopulation: popSortedCountries,
                    countryRegion: country=>nationsObject[country].region,
                    statOverYears: (property, country) => nationsObject[country][property],
                    yearColourScale: self.colourScale(minYear, maxYear),
                    regionColourScale: d3.scaleOrdinal(d3.schemeCategory10),
                    gdpAxisValues: [ 200, 1000, 2000, 10000, 20000, 100000 ],
                    lifeAxisValues: [ 10, 20, 30, 40, 50, 60, 70, 80 ]
                    }

                self.maxWallCharts = allCountries.length;

                if (thenDo) thenDo();
                    
                });
                
        }
    }
    )
            





