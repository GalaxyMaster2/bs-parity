var scene, camera, renderer;
var renderedNotes = [], renderedMarkers = [];
var songLength;

angleY = -0.7;
angleX = -0.2;

var matrix = new THREE.Matrix4();
var cMatrix = new THREE.Matrix3();
cMatrix.set(1.5, centerBeat, 0);

const geometry = new THREE.BoxGeometry();
const loader = new THREE.TextureLoader();

var points = [];
points.push(new THREE.Vector3(-2.5, 0, -.5));
points.push(new THREE.Vector3(2.5, 0, -.5));
const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

const redMaterial  = new THREE.MeshBasicMaterial({ color: 0xf03e2d });
const blueMaterial = new THREE.MeshBasicMaterial({ color: 0x3f96e6 });
const bombMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
const mrk1Material = new THREE.LineBasicMaterial({ color: 0xeeeeee });
const mrk2Material = new THREE.LineBasicMaterial({ color: 0x777777 });

const nFB = new THREE.MeshBasicMaterial({map: loader.load('assets/png/note_front_blue.png')});
const dFB = new THREE.MeshBasicMaterial({map: loader.load('assets/png/dot_front_blue.png')});
const nSB = new THREE.MeshBasicMaterial({map: loader.load('assets/png/note_side_blue.png')});
const nFR = new THREE.MeshBasicMaterial({map: loader.load('assets/png/note_front_red.png')});
const dFR = new THREE.MeshBasicMaterial({map: loader.load('assets/png/dot_front_red.png')});
const nSR = new THREE.MeshBasicMaterial({map: loader.load('assets/png/note_side_red.png')});

const textures = [
    [[nSR, nSR, nSR, nFR, nSR, nSR], [nSR, nSR, nSR, dFR, nSR, nSR]],
    [[nSB, nSB, nSB, nFB, nSB, nSB], [nSB, nSB, nSB, dFB, nSB, nSB]]
]
const blueNote = [nSB, nSB, nSB, nFB, nSB, nSB];
const redNote = [nSR, nSR, nSR, nFR, nSR, nSR];

initRender();
function initRender() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 75, 800/320, 0.1, 1000 );

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize( 800, 320 );

    renderContainer.appendChild( renderer.domElement );
}
function makeCube(x, y, z, noteData) {
    let type;
    if (noteData._type <= 1) { // red or blue
        if (noteData._cutDirection != 8) { // note not dot
            type = textures[noteData._type][0];
        } else type = textures[noteData._type][1];
    } else {
        type = bombMaterial;
    }

    let cube = new THREE.Mesh(geometry, type);
    cube.position.x = x;
    cube.position.y = y;
    cube.position.z = z;
    cube.rotation.y = cutAngles[noteData._cutDirection] * 2 * Math.PI / 360;
    return cube;
}

function placeMarkers(count = songLength) {
    renderedMarkers.forEach(element => {
        scene.remove(element);
    });
    renderedMarkers = [];
    for (let i = 0; i < Math.floor(count); i++) {
        for (let j = 0; j < divisionValue; j++) {
            let line;

            if (j == 0) line = new THREE.Line(lineGeometry, mrk1Material);
            else        {
                line = new THREE.Line(lineGeometry, mrk2Material);
            }
            
            line.position.y = (i + (j / divisionValue)) * 4 * timeScale / 1.25;
            line._time = i + (j / divisionValue);
            renderedMarkers.push(line);
        }
    }
    renderedMarkers.forEach(element => {
        scene.add(element);
    })
}

function placeNotes(notes = notesArray) {
    for (let i = 0; i < notes.length; i++) {
        renderedNotes[i] = makeCube(-1.5 + notes[i]._lineIndex, notes[i]._time * 4 * timeScale / 1.25, notes[i]._lineLayer, notes[i]);
        renderedNotes[i]._time = notes[i]._time;
    }
    renderedNotes.forEach(element => {
        scene.add(element);
    });
    songLength = notes[notes.length - 1]._time
    placeMarkers();
}
var lastBeat = 0;
function update() {
    if (lastBeat == centerBeat) return;
    for (let i = 0; i < renderedNotes.length; i++) {
        renderedNotes[i].position.y = (renderedNotes[i]._time - centerBeat) * 4 * timeScale / 1.25; // this breaks centerbeat so far which isn't great
    }
    for (let i = 0; i < renderedMarkers.length; i++) {
        renderedMarkers[i].position.y = (renderedMarkers[i]._time - centerBeat) * 4 * timeScale / 1.25; // this breaks centerbeat so far which isn't great
    }
    lastBeat = centerBeat;
}
function render() {
    update();
    camera.position.x = 0;
    camera.position.y = -3;
    camera.position.z = 3;

    scene.rotation.z = angleY;
    scene.rotation.x = angleX;
    camera.rotation.x = 1;
    renderer.render(scene, camera);
}
function animate() {
    angleX += 0.01;
    renderer.render( scene, camera );
    requestAnimationFrame( animate );
}
