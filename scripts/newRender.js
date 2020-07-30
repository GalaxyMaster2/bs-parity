var scene, camera, renderer;
var notes = [];

angleY = 0;
angleX = 0.5;

const geometry = new THREE.BoxGeometry();
const redMaterial = new THREE.MeshBasicMaterial({ color: 0xf03e2d });
const blueMaterial = new THREE.MeshBasicMaterial({ color: 0x3f96e6 });

initRender();
function initRender() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 75, 800/320, 0.1, 1000 );

    notes[0] = makeCube(0, 0, 0);
    scene.add( notes[0] );

    renderer = new THREE.WebGLRenderer();
    renderer.setSize( 800, 320 );

    renderContainer.appendChild( renderer.domElement );
}
var cameraPos = [0, -2, 3];
function render() {
    camera.position.x = cameraPos[0]; 
    camera.position.y = centerBeat + cameraPos[1]; 
    camera.position.z = cameraPos[2];
    camera.rotation.x = angleX;
    camera.rotation.y = angleY;

    renderer.render( scene, camera );
}
function makeCube(x, y, z, type = redMaterial) {
    let cube = new THREE.Mesh(geometry, type);
    cube.position.x = x;
    cube.position.y = y;
    cube.position.z = z;
    return cube;
}
function animate() {

    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

	requestAnimationFrame( animate );
	renderer.render( scene, camera );
}
