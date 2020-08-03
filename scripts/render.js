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
// var angleX = 330;
// var angleY = 320;

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
        update();
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
 * outputs notes and positions them within the render container around centerBeat
 * does many fancy things
 * @param {Array} notes - the array of notes to render, defaults to notesArray
 * @param {Array} walls - the array of walls to render, defaults to wallsArray
 * @returns {void} - outputs to DOM, should not return a value
 */
/*
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
    for (let i = 0; i < notesContainer.childNodes.length;) {
        let child = notesContainer.childNodes[i];
        let id = child.dataset.note_id;

        if (!renderNote(notes[id]._time)) {
            notesContainer.removeChild(child);
        } else {
            presentNotes[id] = child;
            i++;
        }
    }

    // container size in pixels
    // TODO: render the page again when the width / height changes
    //        this could be done with a listener, but it would kill resizing performance
    //        if we didn't delay / debounce (?) it to a reasonable degree
    let containerHeight = renderContainer.offsetHeight;

    // TODO: set grid-container CSS dimensions here
    let gridHeight = containerHeight / 2;

    let noteSize = gridHeight / 3 / Math.SQRT2;
    let wallSize = gridHeight / 3;

    // calculate note position, make note element and add to the container
    // firstRenderedNote == undefined is handled because undefined <= undefined evaluates to false
    for (let i = firstRenderedNote; i <= lastRenderedNote; i++) {
        let note = notes[i];
        if (presentNotes[i] !== undefined) {
            let relTime = note._time - centerBeat;
            let posZ = relTime * timeScale * (gridHeight * 4 / 3) * -1;
            let noteAngle = cutAngles[note._cutDirection];
            let noteContainer = presentNotes[i];

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
            let posZ = relTime * timeScale * (gridHeight * 4 / 3) * -1;

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

            noteContainer.dataset.note_id = i;

            notesContainer.appendChild(noteContainer);
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
        for (let i = 0; i < wallsContainer.childNodes.length;) {
            let child = wallsContainer.childNodes[i];
            let id = child.dataset.wall_id;

            if (!renderWall(walls[id])) {
                wallsContainer.removeChild(child);
            } else {
                presentWalls[id] = child;
                i++;
            }
        }

        for (let i = firstRenderedWall; i <= lastRenderedWall; i++) {
            let wall = walls[i];
            if (presentWalls[i] !== undefined) {
                let wallContainer = presentWalls[i];
                let relTime = wall._time - centerBeat;
                let relEnd = relTime + wall._duration;

                let posZ = relTime * timeScale * (gridHeight * 4 / 3) * -1;

                let depth = Math.min(wall._duration, renderDistance + 0.5 - relTime);
                depth = depth * timeScale * (gridHeight * 4 / 3);

                wallContainer.style.setProperty('--depth', depth + 'px');
                wallContainer.style.setProperty('--size', wallSize + 'px');
                wallContainer.style.setProperty('transform', 'translateZ(' + posZ + 'px)');

                if (relEnd < -2 * comparisonTolerance) {
                    wallContainer.classList.add('translucent');
                } else {
                    wallContainer.classList.remove('translucent');
                }
            } else {
                let relTime = wall._time - centerBeat;
                let relEnd = relTime + wall._duration;

                let posX = (gridHeight / 3) * wall._lineIndex;
                let posZ = relTime * timeScale * (gridHeight * 4 / 3) * -1;
                let width = wall._width;
                let depth = Math.min(wall._duration, renderDistance + 0.5 - relTime);
                let height = (wall._type == 0) ? 1 : 0.5

                depth = depth * timeScale * (gridHeight * 4 / 3);

                let wallContainer = document.createElement('div');

                wallContainer.classList.add('wall');
                wallContainer.style.setProperty('--size', wallSize + 'px');
                wallContainer.style.setProperty('--width', width);
                wallContainer.style.setProperty('--depth', depth + 'px');
                wallContainer.style.setProperty('--height', height);

                let faces = ['front', 'back', 'left', 'right', 'top', 'bottom'];
                for (let face of faces) {
                    let wallFace = document.createElement('div');
                    wallFace.classList.add('wall-face', face);
                    wallContainer.appendChild(wallFace);
                }

                if (relEnd < -2 * comparisonTolerance) {
                    wallContainer.classList.add('translucent');
                }

                wallContainer.style.setProperty('left', posX + 'px');
                wallContainer.style.setProperty('transform', 'translateZ(' + posZ + 'px)');

                wallContainer.dataset.wall_id = i;

                wallsContainer.appendChild(wallContainer);
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

    gridContainer.style.setProperty('transform', 'perspective(' + containerHeight * (1 / perspectiveMultiplier) + 'px) ' +
        'rotateX(' + angleX + 'deg) rotateY(' + angleY + 'deg) translateZ(' + containerHeight / -3 + 'px)');
}
*/