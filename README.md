
# CEO Cockpit
Copyright (C)2017 by David A Smith and CEO Vision, Inc. All Rights Reserved.
davidasmith@gmail.com
919-244-4448

The CEO Cockpit is an Immersive Analytics platform that allows the user to very easily view and control 3D data sets as well as define new visualizations based on those datasets.
You can try it out by launching the daydream.html file which runs on a single screen and should work with DayDream devices, or the sky.html file which uses the Wearality Sky, the micro-display and the spatial tracker. You can also try skyphone.html where you can run the app on your phone using a Sky. 

## Acknowledgments
* Alan Kay
* Vishal Sikka
* Mr Doob
* Dan Ingalls
* Robert Krahn
* Vi Hart
* Bert Freudenberg
* Derek M Tishler
* Yoshiki Ohshima
* Aran Lunzer

The system utilizes a number of other projects:

- [THREEJS](http://threejs.org) - This is the main graphics engine underneath the system
- [Carota](https://github.com/danielearwicker/carota) - This is a heavily modified version allowing it to run in 3-space
- [Lively](https://github.com/LivelyKernel/lively.lang) - This provides the OOP version for Javascript. Note that the "users.Txyzzy" is based on the current standard of the Lively Kernel. The "users" part will get dropped.
- [THREEX](https://github.com/jeromeetienne/threex) - I used a number of things from Jerome. Heavily modified. 
- [SHEETJS](https://github.com/SheetJS/js-xlsx) - This is an incomplete Excel file importer. Deprecated.
- [SERIALITY](https://code.google.com/archive/p/seriality/) - Serial communication to tracker. Only runs in Firefox.
- [JSZIP](https://stuk.github.io/jszip/) - ZIP expander/contracter for JS
- [SSF](https://github.com/SheetJS/ssf) - Spreadsheet format coding to properly render text from Excel
- [STATS](https://github.com/mrdoob/stats.js/) - Javascript performance monitor.

## User Interface

* Left mouse button to select, drag and move
* Right mouse button to move the user around in the space. 
* Click right:
  * Move the mouse up from where you clicked moves you forward
  * Move the mouse down moves you backwards
  * Move the mouse left or right rotates your point of view
* Mouse wheel and Apple mouse
  * Slide (or wheel) up/down moves you up/down
  * Slide left/right translates you left/right
* Key board - standard interface 
  * Space - will move you to home as long as the current target ignores keyboard events

## Architecture

### TObject 

TObject is the base class for all of the UI objects inside of the system

The T notation defining the user interface classes comes from Croquet which
was originally called Tea. At this point it is a meaningless historical 
footnote. Also, the "users." notation comes from Lively, as that was their
naming convention for users vs system parts of the Lively. The new version of

We use the Lively Kernel class system. This isn't better or worse than any 
others - I started building this system with Lively and just kept this
architecture. It is convenient.

Lively will eliminate that distinction, but until it is ready for prime-time
we will keep this because I may need to utilize Lively again.

The system uses an event management system based upon directing events to TObjects.
The methods that manage this are:

* onPointerDown(pEvt)
* onPointerMove(pEvt)
* onPointerUp(pEvt)
* onPointerEnter(pEvt)
* onPointerOver(pEvt)
* onPointerLeave(pEvt)
* onKeyDown(pEvt)
* onKeyPress(pEvt)
* onKeyUp(pEvt)
* update(time)

The programmer simply redefines the methods that she wishes to use to implement
the behaviors. The method must return true, which indicates that it has handled
the event so that it is not passed to its owner in turn.

The properties of TObject are:

* object3D - this holds the THREE.js Object3D
* parent - this holds a link to the parent TObject. The object3D also has a link to the parent object3D
* goToHere - object used for moving an object around dynamically in a scene
* selectable - if false, then this object will be ignored by the pointer
* plane - a selection plane for tracking an object - most objects are best tracked this way.

I don't manage the heirarchy of the system in the TObject side. Instead, I use the reference to the THREE.js 
Object3D. I put a reference to the TObject into the Object3D userData field. Hence, if I need to find the 
TObject parent it looks like: this.object3D.parent.userData.

### TScene

TScene manages the actual rendered scene, holding the root object. It also manages the flow 
events to the rest of the objects within the scene. 

### TCamera

TCamera maintains the body and the head of the user in the sense that the head, which also holds the camera, moves as if it were attached to 
the body (which it is). This allows us to move the body as well as the pointing device around in the scene in a natural way and of course the
users head tracking will move appropriately.

### PointerEvent

PointerEvent is the object that is passed to the pointer event methods of the TObjects.
It contains a number of properties that can be used to determine how the event is processed

* distance - distance of the object from the camera
* face - the face of the target object
* faceIndex - index of the face
* point - XYZ point on the selected TObject
* lastPoint - previous selected point
* uv - the UV coordinate in the texture
* target - the selected target object from the raycaster - most of this data is already unpacked into PointerEvent
* selectedTarget - the selected Object3D in the scene
* selectedTObject - the selected TObject that owns the Object3D
* keyboardTObject - the keyboard target
* tCamera - the current TCamera object
* tScene - the TScene, which is also the root
* ray3d - the THREE.RayCaster object. Allows you to perform another raycast test
* event2D - the original 2D mouse or keyboard events - this should probably be deprecated...

### TLight

Simply a cover TObject for a Object3D light.

### TPointer

This holds the pointer device and virtual laser. Used to allow the user to view what he is pointing at. Owned and managed by the TScene.

### TImporters

An extensible framework for enabling import of various data types.

