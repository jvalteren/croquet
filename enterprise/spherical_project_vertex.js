// This replaces the standard pin-hole projection with a true spherical projection. 
// The vertex shader extension uses the same projection matrix, but performs an
// accurate spherical projection that is much better for larger field of view
// images - up to 179 degrees. 
// Since the projection maps to a curve, you may need to add additional vertices
// to an object to get a reasonable result.
// !!! This must be loaded after the three.js library.

var switchProjectVertex = function(){
	var initialProjectVertex = THREE.ShaderChunk[ "project_vertex"];
	var sphericalProjectVertex =[
		"#ifdef USE_SKINNING",
		"	vec4 mvPosition = modelViewMatrix * skinned;",
		"#else",
		"	vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );",
		"#endif",
		"	vec4 p = mvPosition; // put the vector into the camera frame",
		" float len = length(p.xyz); // use the length of the vector - not the z component",
		"	if(p.z<0.0)len = -len; // the length sign should reflect the z sign",
		"	float ctan = projectionMatrix[0][0]; // this is the cotangent of the x-component",
		"	p.y *= projectionMatrix[1][1]/ctan; // set the y aspect ratio",
		"	p.w = -len; // the w component is the negative of the z component",
		"	p.z = len*projectionMatrix[2][2]+projectionMatrix[3][2]; // the z component is really the length of the vector",
		"	p.xy *= sqrt((ctan*ctan)+1.0); // this is the camera field of view - the narrower the fov, the larger this multiplier is",
		"	p.x += projectionMatrix[2][0]*len;",
		"	p.y += projectionMatrix[2][1]*len;",
		"	gl_Position = p; // done"
	].join("\n");

	return function(){
		if(THREE.ShaderChunk[ "project_vertex"] === sphericalProjectVertex){
			THREE.ShaderChunk[ "project_vertex"] = initialProjectVertex;
			console.log('switch to initialProjectVertex');
		}else{
			THREE.ShaderChunk[ "project_vertex"] = sphericalProjectVertex;
			console.log('switch to sphericalProjectVertex 0.02');
		}
	}
}();
