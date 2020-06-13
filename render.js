const renderContainer = document.getElementById('render-container');
const gridContainer = document.getElementById('grid-container');

var perspectiveMultiplier = 1;
var renderDistance = 2;
var timeScale = 1;
var centerBeat = 0;

// angle (0,0) is looking directly at the notes from player perspective
var angleX = -30;
var angleY = -40;

function rotate(event) {
    switch (event.key) {
        case 'w':
            angleX -= 10;
            break;
        case 'a':
            angleY += 10;
            break;
        case 's':
            angleX += 10;
            break;
        case 'd':
            angleY -= 10;
            break;
    }
    angleX = mod(angleX, 360);
    angleY = mod(angleY, 360);
    render(notesArray, centerBeat);
}

// js modulo operator does not work well with negative values
function mod(n, m) {
    return ((n % m) + m) % m;
}

document.addEventListener('keydown', rotate);
renderContainer.addEventListener('wheel', scroll);

function scroll(event) {
    centerBeat = Math.max(0, centerBeat + event.deltaY / -100);
    render(notesArray, centerBeat);
    event.preventDefault();
}

function scrollVal(value) {
    centerBeat = value;
    render(notesArray, centerBeat);
}

function render(notes, centerBeat) {
    if (!ready) {
        clearOutput();
        outputMessage('File loading not ready, try again', 'error');
        return;
    }

    // clear container
    while (gridContainer.lastChild) {
        gridContainer.removeChild(gridContainer.lastChild);
    }

    // container size in pixels
    // TODO: calculate from page
    let containerWidth = 600;
    let containerHeight = 300;

    // TODO: set grid-container CSS dimensions here
    let gridHeight = containerHeight / 2;

    let noteSize = gridHeight / 3 / Math.SQRT2;

    // filter notes outside of range
    notes = notes.filter(function (note) {
        return (note._time >= centerBeat - renderDistance && note._time <= centerBeat + renderDistance);
    });

    // calculate note position, make note element and add to the container
    for (let note of notes) {
        let relTime = note._time - centerBeat;

        let posX = (gridHeight / 3) * (0.5 + note._lineIndex) - (noteSize / 2);
        let posY = (gridHeight / 3) * (2.5 - note._lineLayer) - (noteSize / 2);
        let posZ = relTime * timeScale * (containerWidth / 4) * -1;

        let noteAngle = 0;
        let dot = false;

        switch (cutDirections[note._cutDirection]) {
            case 'down':
                noteAngle = 0;
                break;
            case 'downLeft':
                noteAngle = 45;
                break;
            case 'left':
                noteAngle = 90;
                break;
            case 'upLeft':
                noteAngle = 135;
                break;
            case 'up':
                noteAngle = 180;
                break;
            case 'upRight':
                noteAngle = 225;
                break;
            case 'right':
                noteAngle = 270;
                break;
            case 'downRight':
                noteAngle = 315;
                break;
            case 'dot':
                noteAngle = 0;
                dot = true;
                break;
        }

        let noteContainer = document.createElement('div');
        noteContainer.classList.add('note');
        noteContainer.style.setProperty('--size', noteSize + 'px');

        let faces = ['front', 'back', 'left', 'right', 'top', 'bottom'];
        for (let face of faces) {
            let noteFace = document.createElement('div');
            let imgClass;
            if (types[note._type] === 'bomb') {
                imgClass = 'bomb';
            } else {
                imgClass = (dot && face === 'front' ? 'dot_' : 'note_') +
                    (face === 'front' ? 'front_' : 'side_') + types[note._type];
            }
            noteFace.classList.add('note-face', face, imgClass);
            noteContainer.appendChild(noteFace);
        }

        noteContainer.style.setProperty('left', posX + 'px');
        noteContainer.style.setProperty('top', posY + 'px');
        noteContainer.style.setProperty('transform', 'translateZ(' + posZ + 'px) rotateZ(' + noteAngle + 'deg)');

        gridContainer.appendChild(noteContainer);
    }

    let beatMarkers = [];
    for (let i = Math.max(0, Math.ceil(centerBeat - renderDistance)); i <= Math.floor(centerBeat + renderDistance); i++) {
        beatMarkers.push(i);
    }

    for (let beat of beatMarkers) {
        let marker = document.createElement('div');
        let line = document.createElement('div');
        let number = document.createElement('div');
        marker.classList.add('marker');
        line.classList.add('marker-line');
        number.classList.add('marker-number');
        number.textContent = beat;

        let relTime = beat - centerBeat;
        let lineWidth = gridHeight * 4 / 3;
        let posX = (gridHeight / 3) * 2 - (lineWidth / 2);
        let posY = gridHeight;
        let posZ = relTime * timeScale * (containerWidth / 4) * -1;

        line.style.setProperty('width', lineWidth + 'px');
        line.style.setProperty('height', (lineWidth / 25) + 'px');

        marker.appendChild(line);
        marker.appendChild(number);

        marker.style.setProperty('left', posX + 'px');
        marker.style.setProperty('top', posY + 'px');
        marker.style.setProperty('transform', 'translateZ(' + posZ + 'px) rotateX(90deg)');

        gridContainer.appendChild(marker);
    }

    gridContainer.style.setProperty('transform', 'perspective(' + containerHeight * (1 / perspectiveMultiplier) + 'px)' +
        'rotateX(' + angleX + 'deg) rotateY(' + angleY + 'deg)');
}
