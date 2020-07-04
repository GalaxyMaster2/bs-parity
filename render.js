// render.js:
//  handles all operations related to the 3d preview of the file
//  and interactions between the preview and other parts of the
//  page

console.log('render js loaded');

var perspectiveMultiplier = parseFloat(piSlide.value);
var renderDistance = parseFloat(rdSlide.value);
var divisionValue = parseFloat(dvSlide.value);
var timeScale = parseFloat(tsSlide.value);

var centerBeat = 0; // changed to match values in html

// angle (0,0) is looking directly at the notes from player perspective
var angleX = 330;
var angleY = 320;

// TODO: this seems extraneous?
function scrollDelta(delta) {
    centerBeat = Math.max(0, centerBeat + delta);
    highlightElements(centerBeat);

    render(notesArray);
}

let scrolling = false;
async function scrollVal(end, framerate = 30) {
    if (scrolling) { return };
    scrolling = true; // prevent multiple copies of this function from running at once
    // todo: make a queue system or a way to cancel and start again with new values?
    // unless lots of smoothing code is added this will jerk it though :/

    highlightElements(end);

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

        render(notesArray);
        await new Promise(r => setTimeout(r, delay)); // icky async but it works
    }
    scrolling = false;
}

function render(notes) {
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
    //        this could be done with a listener, but it would kill resizing performance
    //        if we didn't delay / debounce (?) it to a reasonable degree
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
            if (relTime < -2 * comparisonTolerance) { // given beat times are rounded, some may not correctly centred beats may not highlight
                noteFace.classList.add('transl');
            }
            noteContainer.appendChild(noteFace);
        }

        noteContainer.style.setProperty('left', posX + 'px');
        noteContainer.style.setProperty('top', posY + 'px');
        noteContainer.style.setProperty('transform', 'translateZ(' + posZ + 'px) rotateZ(' + noteAngle + 'deg)');

        noteContainer.addEventListener('click', function () { scrollVal(note._time); });

        if (note.error) {
            noteContainer.classList.add('error');
        } else if (note.precedingError) {
            noteContainer.classList.add('precedingError');
        }

        if (note.warn) {
            noteContainer.classList.add('warn');
        } else if (note.precedingWarn) {
            noteContainer.classList.add('precedingWarn');
        }

        gridContainer.appendChild(noteContainer);
    }

    let beatMarkers = [];
    for (let i = Math.max(0, Math.ceil(centerBeat - renderDistance - 1)); i <= Math.floor(centerBeat + renderDistance + 1); i++) {
        if (i <= Math.floor(centerBeat + renderDistance + 1)) {
            for (let j = 0; j < divisionValue; j++) {
                beatMarkers.push(i + (j / divisionValue));
            }
        }
    }

    for (let beat of beatMarkers) {
        let marker = document.createElement('div');
        let number = document.createElement('div');
        let line = document.createElement('div');

        line.classList.add('marker-line');
        marker.classList.add('marker');

        number.classList.add('marker-number');
        number.textContent = beat;

        let relTime = beat - centerBeat;
        let fakeMarker = false, decimalTime = false, translucent = false;
        if (Math.abs(relTime) > renderDistance) {
            fakeMarker = true;
        }
        if (!Number.isInteger(beat)) {
            decimalTime = true;
        }
        if (relTime < -2 * comparisonTolerance) {
            translucent = true;
        }
        let lineWidth = gridHeight * 4 / 3;
        let posX = (gridHeight / 3) * 2 - (lineWidth / 2);
        let posY = gridHeight;
        let posZ = relTime * timeScale * (containerWidth / 4) * -1;

        line.style.setProperty('width', lineWidth + 'px');
        line.style.setProperty('height', (lineWidth / (decimalTime ? 60 : 30)) + 'px');
        if (!decimalTime) {
            number.addEventListener('click', function () { scrollVal(beat); });
        };

        marker.appendChild(line);
        marker.appendChild(number);

        marker.style.setProperty('left', posX + 'px');
        marker.style.setProperty('top', posY + 'px');
        marker.style.setProperty('transform', 'translateZ(' + posZ + 'px) rotateX(90deg)');

        if (fakeMarker) {
            marker.style.setProperty('opacity', 1 - (0.7) * (relTime - renderDistance));
        }
        if (decimalTime) {
            marker.classList.add('decimalTime');
        }
        if (translucent) {
            marker.classList.add('transl');
        }

        gridContainer.appendChild(marker);
    }

    gridContainer.style.setProperty('transform', 'perspective(' + containerHeight * (1 / perspectiveMultiplier) + 'px) ' +
        'rotateX(' + angleX + 'deg) rotateY(' + angleY + 'deg) translateZ(' + containerHeight / -3 + 'px)');
}
