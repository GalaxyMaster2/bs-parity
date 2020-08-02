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

var renderContainerHeight;

var animationFrameId;

/**
 * enables use of requestAnimationFrame with Ola (?)
 * @param {Number} timestamp - unused
 * @returns {void} - leads to render call
 */
function renderTransition(timestamp) {
    // assumes centerBeat is never updated on its own, aside from here
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

/**
 * smooth scrolls to any given point in the song using requestAnimationFrame/Ola
 * calculates animation time proportional to log of distance
 * @param {Number} target - the beat to scroll to
 * @returns {void} - leads to render call
 */
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

/**
 * clears all rendered elements
 */
function clearRenderedElements() {
    recycledNotes = {
        red: [],
        blue: [],
        bomb: []
    };
    recycledWalls = [];
    for (let container of [notesContainer, wallsContainer, markerContainer]) {
        while (container.lastChild) {
            container.removeChild(container.lastChild);
        }
    }
}

let recycledNotes = {
    red: [],
    blue: [],
    bomb: []
};
let recycledWalls = [];
/**
 * outputs notes and positions them within the render container around centerBeat
 * does many fancy things
 * @param {Array} notes - the array of notes to render, defaults to notesArray
 * @param {Array} walls - the array of walls to render, defaults to wallsArray
 * @returns {void} - outputs to DOM, should not return a value
 */
function render(notes = notesArray, walls = wallsArray) {
    if (!ready) {
        outputUI(false, 0, 'File loading not ready:|Please try again', 'error');
        return;
    }

    let firstViewableNote = -renderDistance;
    if (angleX >= 270) { // vertically looking forwards
        if (Math.min(angleY, 360 - angleY) <= 45) {
            firstViewableNote = Math.max(-renderDistance, -1.875 / timeScale);
        }
        else if (Math.min(angleY, 360 - angleY) <= 90) {
            firstViewableNote = Math.max(-renderDistance, -3.75 / timeScale);
        }
    }

    function renderNote(time) {
        return (time >= centerBeat + firstViewableNote && time <= centerBeat + renderDistance);
    }

    // assumes notesArray is sorted by time
    let firstRenderedNote, lastRenderedNote;
    for (let i = 0; i < notes.length; i++) {
        if (renderNote(notes[i]._time)) {
            firstRenderedNote = i;
            break;
        }
    }
    // no need to find last note if no notes are rendered
    if (firstRenderedNote !== undefined) {
        for (let i = notes.length - 1; i >= 0; i--) {
            if (renderNote(notes[i]._time)) {
                lastRenderedNote = i;
                break;
            }
        }
    }

    // remove notes not to be rendered and store the remaining ones in presentNotes
    let presentNotes = [];
    for (let i = 0; i < notesContainer.childNodes.length; i++) {
        let child = notesContainer.childNodes[i];
        let id = child.dataset.note_id;
        if (!recycledNotes[types[notes[id]._type]].includes(child)) {
            if (renderNote(notes[id]._time)) {
                presentNotes[id] = child;
            } else {
                child.classList.add('recycled');
                recycledNotes[types[notes[id]._type]].push(child);
            }
        }
    }

    // limit number of recycled notes
    // TODO: tweak value for best performance?
    // ideally this should depend on highest common note density in the map
    for (let type in recycledNotes) {
        while (recycledNotes[type].length > (2.5 * renderDistance)) {
            recycledNotes[type][0].remove();
            recycledNotes[type].shift();
        }
    }

    if (renderContainerHeight === undefined) {
        renderContainerHeight = getRenderContainerHeight();
    }

    // TODO: set grid-container CSS dimensions here
    let gridHeight = renderContainerHeight / 2;

    let noteSize = gridHeight / 3 / 1.41;

    // calculate note position, make note element and add to the container
    // firstRenderedNote == undefined is handled because undefined <= undefined evaluates to false
    for (let i = firstRenderedNote; i <= lastRenderedNote; i++) {
        let note = notes[i];
        let noteContainer;

        let relTime = note._time - centerBeat;
        let posZ = relTime * timeScale * (gridHeight * 4 / 3) * -1;
        let noteAngle = cutAngles[note._cutDirection];
        let translucent = relTime < -2 * comparisonTolerance;
        if (presentNotes[i] !== undefined) {
            noteContainer = presentNotes[i];

            noteContainer.classList.remove('error', 'warn', 'precedingError', 'precedingWarn');
        } else {
            let posX = (gridHeight / 3) * (0.5 + note._lineIndex) - (noteSize / 2);
            let posY = (gridHeight / 3) * (2.5 - note._lineLayer) - (noteSize / 2);
            let dot = (cutDirections[note._cutDirection] === 'dot');

            if (recycledNotes[types[note._type]].length > 0) {
                noteContainer = recycledNotes[types[note._type]].shift();

                noteContainer.classList.remove('error', 'warn', 'precedingError', 'precedingWarn', 'recycled');

                // only causes a repaint when the class actually changes (at least in Chromium)
                let front = noteContainer.childNodes[0];
                let type = types[note._type];
                front.classList.remove('note_front_' + type, 'dot_front_' + type);
                front.classList.add((dot ? 'dot_' : 'note_') + 'front_' + type);
            } else {
                noteContainer = document.createElement('div');
                noteContainer.classList.add('note');

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

                notesContainer.appendChild(noteContainer);
            }

            noteContainer.style.setProperty('left', posX + 'px');
            noteContainer.style.setProperty('top', posY + 'px');
            noteContainer.onclick = function () { scrollTo(note._time); };
            noteContainer.dataset.note_id = i;
        }

        noteContainer.style.setProperty('transform', 'translateZ(' + posZ + 'px) rotateZ(' + noteAngle + 'deg)');

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

        if (translucent) {
            noteContainer.classList.add('translucent');
        } else {
            noteContainer.classList.remove('translucent');
        }
    }

    if (gridContainer.classList.contains('showWalls')) {
        function renderWall(wall) {
            let start = wall._time;
            let end = wall._time + wall._duration;
            let rStart = centerBeat + firstViewableNote;
            let rEnd = centerBeat + renderDistance + 0.5;
            return (start <= rEnd && end >= rStart);
        }

        let firstRenderedWall, lastRenderedWall;
        for (let i = 0; i < walls.length; i++) {
            if (renderWall(walls[i])) {
                firstRenderedWall = i;
                break;
            }
        }
        if (firstRenderedWall !== undefined) {
            for (let i = walls.length - 1; i >= 0; i--) {
                if (renderWall(walls[i])) {
                    lastRenderedWall = i;
                    break;
                }
            }
        }

        let presentWalls = [];
        for (let i = 0; i < wallsContainer.childNodes.length; i++) {
            let child = wallsContainer.childNodes[i];
            if (!recycledWalls.includes(child)) {
                let id = child.dataset.wall_id;

                if (renderWall(walls[id])) {
                    presentWalls[id] = child;
                } else {
                    child.classList.add('recycled');
                    recycledWalls.push(child);
                }
            }
        }

        while (recycledWalls.length > 5) {
            recycledWalls[0].remove();
            recycledWalls.shift();
        }

        for (let i = firstRenderedWall; i <= lastRenderedWall; i++) {
            let wall = walls[i];
            let wallContainer;

            let relTime = wall._time - centerBeat;
            let relEnd = relTime + wall._duration;
            let posZ = relTime * timeScale * (gridHeight * 4 / 3) * -1;
            let depth = Math.min(wall._duration, renderDistance + 0.5 - relTime) * timeScale * (gridHeight * 4 / 3);
            let translucent = relEnd < -2 * comparisonTolerance;

            if (presentWalls[i] !== undefined) {
                wallContainer = presentWalls[i];
            } else {
                let posX = (gridHeight / 3) * wall._lineIndex;
                let width = wall._width;
                let height = (wall._type == 0) ? 1 : 0.5

                if (recycledWalls.length > 0) {
                    wallContainer = recycledWalls.shift();
                    wallContainer.classList.remove('recycled');
                } else {
                    wallContainer = document.createElement('div');
                    wallContainer.classList.add('wall');

                    let faces = ['front', 'back', 'left', 'right', 'top', 'bottom'];
                    for (let face of faces) {
                        let wallFace = document.createElement('div');
                        wallFace.classList.add('wall-face', face);
                        wallContainer.appendChild(wallFace);
                    }

                    wallsContainer.appendChild(wallContainer);
                }

                wallContainer.style.setProperty('--width', width);
                wallContainer.style.setProperty('--height', height);
                wallContainer.style.setProperty('left', posX + 'px');
                wallContainer.dataset.wall_id = i;
            }

            wallContainer.style.setProperty('--depth', depth + 'px');
            wallContainer.style.setProperty('transform', 'translateZ(' + posZ + 'px)');

            if (translucent) {
                wallContainer.classList.add('translucent');
            } else {
                wallContainer.classList.remove('translucent');
            }
        }
    }

    // generate all valid beats within the range
    let bmCountOld = gridContainer.querySelectorAll('.marker').length;
    let beatMarkers = [];
    for (let i = Math.max(0, Math.ceil(divisionValue * (centerBeat + firstViewableNote))); i <= Math.floor(divisionValue * (centerBeat + renderDistance + 1)); i++) {
        beatMarkers.push(i / divisionValue);
    }
    let deltaMarkers = beatMarkers.length - bmCountOld;

    if (deltaMarkers != 0) {
        while (deltaMarkers < 0) {
            markerContainer.childNodes[0].remove();
            deltaMarkers++;
        }
        while (deltaMarkers > 0) {
            let marker = document.createElement('div');
            let number = document.createElement('div');
            let line = document.createElement('div');

            marker.classList.add('marker');
            number.classList.add('marker-number');
            line.classList.add('marker-line');

            marker.appendChild(line);
            marker.appendChild(number);
            markerContainer.appendChild(marker);

            deltaMarkers--;
        }
    }

    let i = 0;
    for (let beat of beatMarkers) {
        let marker = markerContainer.childNodes[i];
        let number = marker.getElementsByClassName('marker-number')[0];
        let line = marker.getElementsByClassName('marker-line')[0];

        number.textContent = beat;

        let relTime = beat - centerBeat;
        let fakeMarker = false, decimalTime = false, translucent = false;

        fakeMarker = Math.abs(relTime) > renderDistance;
        decimalTime = !Number.isInteger(beat);
        translucent = relTime < -2 * comparisonTolerance;

        let lineWidth = gridHeight * 4 / 3;
        let posX = (gridHeight / 3) * 2 - (lineWidth / 2);
        let posY = gridHeight;
        let posZ = relTime * timeScale * (gridHeight * 4 / 3) * -1;

        line.style.setProperty('width', lineWidth + 'px');
        line.style.setProperty('height', (lineWidth / (decimalTime ? 60 : 30)) + 'px');

        if (!decimalTime) {
            number.onclick = function () { scrollTo(beat); }; // addEventListener can run multiple times - as an alternative, onClick works just as well
        };

        marker.style.setProperty('left', posX + 'px');
        marker.style.setProperty('top', posY + 'px');
        marker.style.setProperty('transform', 'translateZ(' + posZ + 'px) rotateX(90deg)');

        if (fakeMarker && relTime > 0) {
            marker.style.setProperty('opacity', Math.max(0, 1 - (0.7) * (relTime - renderDistance)));
        } else {
            marker.style.removeProperty('opacity');
        }
        if (decimalTime) {
            marker.classList.add('decimalTime');
        } else {
            marker.classList.remove('decimalTime');
        }
        if (translucent) {
            marker.classList.add('translucent');
        } else {
            marker.classList.remove('translucent');
        }

        i++;
    }

    gridContainer.style.setProperty('transform', 'perspective(' + renderContainerHeight * (1 / perspectiveMultiplier) + 'px) ' +
        'rotateX(' + angleX + 'deg) rotateY(' + angleY + 'deg) translateZ(' + renderContainerHeight / -3 + 'px)');
}
