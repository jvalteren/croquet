/**
 * @author alteredq / http://alteredqualia.com/
 * @authod mrdoob / http://mrdoob.com/
 * @authod arodic / http://aleksandarrodic.com/
 * @mod croqueteer / http://wearality.com/ 
 * this.offset is how the camera image is offset to allow for proper inter-pupilary distance
 * this.separation is the distance the cameras are from the center
 */

THREE.StereoEffect = function ( renderer ) {

	// API

	this.separation = 0;
	this.offset = 0;

	// internals

	var _width, _height, _offset;

	var _position = new THREE.Vector3();
	var _quaternion = new THREE.Quaternion();
	var _scale = new THREE.Vector3();

	var _cameraL = new THREE.PerspectiveCamera();
	var _cameraR = new THREE.PerspectiveCamera();

	// initialization
// http://www.youtube.com/watch?v=3xWiBCIxjIk
	renderer.autoClear = false;

	this.setSize = function ( width, height ) {

		_width = width / 2;
		_height = height;
		_offset = _width*this.offset;
		renderer.setSize( width, height );

	};

	this.render = function ( scene, camera ) {

		scene.updateMatrixWorld();

		//if ( camera.parent === undefined ) camera.updateMatrixWorld();
	
		camera.matrixWorld.decompose( _position, _quaternion, _scale );

		// left

		_cameraL.fov = camera.fov;
		_cameraL.aspect = 0.5 * camera.aspect;
		_cameraL.near = camera.near;
		_cameraL.far = camera.far;
		_cameraL.setViewOffset(_width, _height, this.offset*_width/2.0, 0, _width, _height);
		//_cameraL.updateProjectionMatrix();

		_cameraL.position.copy( _position );
		_cameraL.quaternion.copy( _quaternion );
		_cameraL.translateX( - this.separation );
		_cameraL.updateMatrixWorld();

		// right

		_cameraR.fov = camera.fov;
		_cameraR.aspect = 0.5 * camera.aspect;
		_cameraR.near = camera.near;
		_cameraR.far = camera.far;
		_cameraR.setViewOffset(_width, _height, - this.offset*_width/2.0, 0, _width, _height);
		//_cameraR.projectionMatrix = _cameraL.projectionMatrix;

		_cameraR.position.copy( _position );
		_cameraR.quaternion.copy( _quaternion );
		_cameraR.translateX( this.separation );
		_cameraR.updateMatrixWorld();


		renderer.setViewport( 0, 0, _width * 2, _height );
		renderer.clear();

		//world.updateLeft();
		renderer.setViewport( 0, 0, _width, _height );
		renderer.render( scene, _cameraL );

		//world.updateRight();
		renderer.setViewport( _width, 0, _width, _height );
		renderer.render( scene, _cameraR );

	};

};
