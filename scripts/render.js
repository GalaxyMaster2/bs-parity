// render.js:
//  handles all operations related to the 3d preview of the file
//  and interactions between the preview and other parts of the
//  page

console.log('render js loaded');

var perspectiveMultiplier = parseFloat(perspectiveSlider.value);
var renderDistance = parseFloat(renderDistanceSlider.value);
var divisionValue = parseFloat(divisionValueSlider.value);
var timeScale = parseFloat(timeScaleSlider.value);

var centerBeat = 0; // changed to match values in html
var olaPosition = Ola(0);

// angle (0,0) is looking directly at the notes from player perspective
var angleX = 330;
var angleY = 320;

var animationFrameId;

// assumes centerBeat is never updated on its own, aside from here
function renderTransition(timestamp) {
    // this could lead to a very unlikely edge case where we pass precisely over the target
    // in the middle of a transition instantly stopping the animation
    if (olaPosition._value.to === centerBeat) {
        animationFrameId = undefined;
        wheelScrolling = false;
    } else {
        animationFrameId = window.requestAnimationFrame(renderTransition);
        centerBeat = olaPosition.value;
        render();
    }
}

function scrollTo(target) {
    wheelScrolling = false;
    highlightElements(target);

    let distance = target - olaPosition.value;

    // in beats per second
    let speed = Math.abs(olaPosition._value.getSpeed(Date.now()));

    let animationTime = Math.log(Math.abs(distance) + 1) * 500;

    // roll off to minimum time based on speed
    // EPSILON needed because Ola doesn't work with 0 time
    animationTime = Math.pow(Math.pow(animationTime, 3) + Math.pow(speed * 10, 3), 1 / 3) + Number.EPSILON;

    olaPosition.set({ value: target }, animationTime);

    if (animationFrameId === undefined) {
        animationFrameId = window.requestAnimationFrame(renderTransition);
    }
}

function render(notes = notesArray) {
    if (!ready) {
        outputUI(false, 0, 'File loading not ready:|Please try again', 'error');
        return;
    }

    function renderNote(time) {
        return (time >= centerBeat - renderDistance && time <= centerBeat + renderDistance);
    }

    // filter notes outside of range
    notes = notes.filter(function (note) {
        return renderNote(note._time);
    });

    // remove notes not to be rendered and store the remaining ones in presentNotes
    let presentNotes = [];
    let i = 0;
    while (i < gridContainer.childNodes.length) {
        let child = gridContainer.childNodes[i];
        let id = child.dataset.note_id;

        if (id === undefined || !renderNote(notesArray[id]._time)) {
            gridContainer.removeChild(child);
        } else {
            let index = notes.findIndex(function (note) {
                return note.id == id;
            });
            presentNotes[index] = child;
            i++;
        }
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

    // calculate note position, make note element and add to the container
    let iterator = notes.entries();
    for (let [index, note] of iterator) {
        if (presentNotes[index] !== undefined) {
            let relTime = note._time - centerBeat;
            let posZ = relTime * timeScale * (containerWidth / 4) * -1;
            let noteAngle = cutAngles[note._cutDirection];
            let noteContainer = presentNotes[index];

            noteContainer.style.setProperty('--size', noteSize + 'px');
            noteContainer.style.setProperty('transform', 'translateZ(' + posZ + 'px) rotateZ(' + noteAngle + 'deg)');

            let translucent = relTime < -2 * comparisonTolerance;
            for (let face of noteContainer.childNodes) {
                if (translucent) {
                    face.classList.add('translucent');
                } else {
                    face.classList.remove('translucent');
                }
            }

            noteContainer.classList.remove('error', 'warn', 'precedingError', 'precedingWarn');
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
        } else {
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
                    noteFace.classList.add('translucent');
                }
                noteContainer.appendChild(noteFace);
            }

            noteContainer.style.setProperty('left', posX + 'px');
            noteContainer.style.setProperty('top', posY + 'px');
            noteContainer.style.setProperty('transform', 'translateZ(' + posZ + 'px) rotateZ(' + noteAngle + 'deg)');

            noteContainer.addEventListener('click', function () { scrollTo(note._time); });

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

            noteContainer.dataset.note_id = note.id;

            gridContainer.appendChild(noteContainer);
        }
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
            number.addEventListener('click', function () { scrollTo(beat); });
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
            marker.classList.add('translucent');
        }

        gridContainer.appendChild(marker);
    }

    gridContainer.style.setProperty('transform', 'perspective(' + containerHeight * (1 / perspectiveMultiplier) + 'px) ' +
        'rotateX(' + angleX + 'deg) rotateY(' + angleY + 'deg) translateZ(' + containerHeight / -3 + 'px)');
}
