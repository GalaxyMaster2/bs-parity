var scene, camera, renderer;
var renderedNotes = [];

angleY = 0;
angleX = 1;

const geometry = new THREE.BoxGeometry();
const redMaterial  = new THREE.MeshBasicMaterial({ color: 0xf03e2d });
const blueMaterial = new THREE.MeshBasicMaterial({ color: 0x3f96e6 });
const bombMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
const markMaterial = new THREE.LineBasicMaterial({ color: 0xeeeeee });

initRender();
function initRender() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 75, 800/320, 0.1, 1000 );

    renderer = new THREE.WebGLRenderer();
    renderer.setSize( 800, 320 );

    renderContainer.appendChild( renderer.domElement );
}

function placeMarkers(count) {
    for (let i = 0; i < Math.floor(count); i++) {
        let points = []
        points.push(new THREE.Vector3(-1, i * 4, -.5));
        points.push(new THREE.Vector3(4, i * 4, -.5));
        let geometry = new THREE.BufferGeometry().setFromPoints(points);
        let line = new THREE.Line(geometry, markMaterial);
        scene.add( line );
    }
}

function placeNotes(notes = notesArray) {
    for (let i = 0; i < notes.length; i++) {
        let material = notes[i]._type == 0 ? redMaterial : (notes[i]._type == 1) ? blueMaterial : bombMaterial;
        renderedNotes[i] = makeCube(notes[i]._lineIndex, notes[i]._time * 4 * timeScale / 1.25, notes[i]._lineLayer, material);
    }
    renderedNotes.forEach(element => {
        scene.add(element);
    });
    placeMarkers(notes[notes.length - 1]._time);
    render();
}
function updateNotes() {
    for (let i = 0; i < renderedNotes.length; i++) {
        renderedNotes[i].position.y = notesArray[i]._time * 4 * timeScale / 1.25; // this breaks centerbeat so far which isn't great
    }
}
var cameraPos = [1.5, -2, 3]; // todo: orbit
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
