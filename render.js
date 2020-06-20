// render.js:
//  handles all operations related to the 3d preview of the file
//  and interactions between the preview and other parts of the
//  page

console.log('render js loaded');

const renderContainer = document.getElementById('render-container');
const gridContainer = document.getElementById('grid-container');

var perspectiveMultiplier = parseFloat(piSlide.value);
var divisionValue  = parseFloat(dvSlide.value);
var renderDistance = parseFloat(rdSlide.value);
var timeScale      = parseFloat(tsSlide.value);
var centerBeat = 0; // changed to match values in html

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
    if(document.getElementsByClassName('selected').length != 0) {
        document.getElementsByClassName('selected')[0].classList.remove('selected');
    }
    centerBeat = Math.max(0, centerBeat + event.deltaY / -100);
    render(notesArray, centerBeat);
    event.preventDefault();
}

let scrolling = false;
async function scrollVal(end, target = null, framerate = 30) {
    if (scrolling) { return };
    scrolling = true; // prevent multiple copies of this function from running at once
                      // todo: make a queue system or a way to cancel and start again with new values?
                      // unless lots of smoothing code is added this will jerk it though :/

    if(document.getElementsByClassName('selected').length != 0) {
        document.getElementsByClassName('selected')[0].classList.remove('selected');
    }
    
    if (target != null) target.classList.add('selected')

    let initial = centerBeat;
    let pos, a, b;
    let delay = 1000 / framerate;
    let frames = Math.abs(end - initial) * 3;

    frames = (frames > 60) ? 60 : frames;
    frames = (frames < 8) ? 8 : frames;

    for (let i = 1; i <= frames; i++) {
        b = Math.ceil((i / frames) * 30); // find values of lut to interpolate between
        a = b - 1;

        pos = bezierLut[a] * (1 - 30 * ((i / frames) - (a / 30))) + bezierLut[b] * 30 * ((i / frames) - (a / 30)); // there are many brackets in this line that could be reduced
        centerBeat = (initial * (1 - pos)) + (end * pos);

        render(notesArray, centerBeat);
        await new Promise(r => setTimeout(r, delay)); // icky async but it works
    }
    scrolling = false;
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
    // TODO: render the page again when the width / height changes
    let containerWidth = renderContainer.offsetWidth;
    let containerHeight = renderContainer.offsetHeight;

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

        let noteAngle = cutAngles[note._cutDirection];
        let dot = (cutDirections[note._cutDirection] === 'dot');

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

        noteContainer.addEventListener('click', function () { scrollVal(note._time); }); // todo: highlight errors if an error block is chosen?
        
        if (note.error)               { noteContainer.classList.add("error"); }
        else if (note.precedingError) { noteContainer.classList.add("precedingError"); }

        if (note.warn)                { noteContainer.classList.add("warn");}
        else if (note.precedingWarn)  { noteContainer.classList.add("precedingWarn");}

        gridContainer.appendChild(noteContainer);
    }

    let beatMarkers = [];
    for (let i = Math.max(0, Math.ceil(centerBeat - renderDistance)); i <= Math.floor(centerBeat + renderDistance + 1); i++) {
        if (i <= Math.floor(centerBeat + renderDistance + 1)) {
            for (let j = 0; j < divisionValue; j++) {
                beatMarkers.push(i + (j / divisionValue));
            }
        }
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
        let fakeMarker = false, decimalTime = false;
        if ( Math.abs(relTime) > renderDistance ) { fakeMarker = true; }
        if ( beat != Math.floor(beat)  )          { decimalTime = true; }
        let lineWidth = gridHeight * 4 / 3;
        let posX = (gridHeight / 3) * 2 - (lineWidth / 2);
        let posY = gridHeight;
        let posZ = relTime * timeScale * (containerWidth / 4) * -1;

        line.style.setProperty('width', lineWidth + 'px');
        line.style.setProperty('height', (lineWidth / (decimalTime ? 60 : 30)) + 'px');
        if (!decimalTime) number.addEventListener('click', function () { scrollVal(beat); });

        marker.appendChild(line);
        marker.appendChild(number);

        marker.style.setProperty('left', posX + 'px');
        marker.style.setProperty('top', posY + 'px');
        marker.style.setProperty('transform', 'translateZ(' + posZ + 'px) rotateX(90deg)');
        if (fakeMarker)  marker.style.setProperty('opacity', 1 - (0.7)*(relTime - renderDistance));
        if (decimalTime) marker.classList.add('decimalTime');

        gridContainer.appendChild(marker);
    }

    gridContainer.style.setProperty('transform', 'perspective(' + containerHeight * (1 / perspectiveMultiplier) + 'px)' +
        'rotateX(' + angleX + 'deg) rotateY(' + angleY + 'deg)');
}
