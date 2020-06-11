const cutDirections = ['up', 'down', 'left', 'right', 'upLeft', 'upRight', 'downLeft', 'downRight', 'dot'];
// bombs are type 3 for some reason
const types = {
    0: 'red',
    1: 'blue',
    3: 'bomb'
};
const lineIndices = ['left', 'middleLeft', 'middleRight', 'right'];
const lineLayers = ['bottom', 'middle', 'top'];

// the minimum time between the last note or bomb for a bomb to be considered for each saber
// make user configurable?
const bombMinTime = 0.25;

// the tolerance when making float comparisons
// needed because different editors round in different ways
const comparisonTolerance = 1 / 128;

const cuts = {
    blue: {
        good: {
            forehand: ['down', 'left', 'downLeft', 'downRight', 'dot'],
            backhand: ['up', 'right', 'upLeft', 'upRight', 'downRight', 'dot']
        },
        borderline: {
            forehand: ['right', 'upLeft'],
            backhand: ['left']
        }
    },
    red: {
        good: {
            forehand: ['down', 'right', 'downRight', 'downLeft', 'dot'],
            backhand: ['up', 'left', 'upRight', 'upLeft', 'downLeft', 'dot']
        },
        borderline: {
            forehand: ['left', 'upRight'],
            backhand: ['right']
        }
    }
};

class Parity {
    constructor() {
        this.red = 'forehand';
        this.blue = 'forehand';
    }

    invert(color) {
        this[color] === 'forehand' ? this[color] = 'backhand' : this[color] = 'forehand';
    }

    init(notes) {
        let firstRed;
        let firstBlue;
        for (let note of notes) {
            if (!(firstRed) && types[note._type] === 'red') {
                firstRed = note;
            } else if (!(firstBlue) && types[note._type] === 'blue') {
                firstBlue = note;
            }
        }

        if (firstRed && cuts.red.good.forehand.includes(cutDirections[firstRed._cutDirection])) {
            this.red = 'forehand';
        } else {
            this.red = 'backhand';
        }

        if (firstBlue && cuts.blue.good.forehand.includes(cutDirections[firstBlue._cutDirection])) {
            this.blue = 'forehand';
        } else {
            this.blue = 'backhand';
        }
    }
}

var notesArray;
var sliderPrecision = Infinity;
var ready = false;

const fileInput = document.getElementById('file-input');
const sliderPrecisionInput = document.getElementById('slider-precision');
const submit = document.getElementById('submit');
const output = document.getElementById('output');

fileInput.addEventListener('change', readFile);
sliderPrecisionInput.addEventListener('change', readSliderPrecision);
submit.addEventListener('click', main);

function readFile() {
    ready = false;
    let fr = new FileReader();
    fr.readAsText(fileInput.files[0]);
    fr.addEventListener('load', function () {
        notesArray = getNotes(JSON.parse(fr.result));
        ready = true;
    });
}

function readSliderPrecision() {
    sliderPrecision = parseInt(sliderPrecisionInput.value) || Infinity;
}

function getNotes(obj) {
    let notes = obj._notes;
    notes.sort(function (a, b) {
        return a._time - b._time;
    })

    // filter out invalid note types
    notes = notes.filter(function (note) {
        return types[note._type] !== undefined;
    });
    return notes;
}

function logNote(note, parity) {
    let time = note._time;
    let type = types[note._type];
    let cutDirection = cutDirections[note._cutDirection];
    let column = lineIndices[note._lineIndex];
    let row = lineLayers[note._lineLayer];

    if (type === 'bomb') {
        return ('Bomb at beat ' + time + ' -- ' + column + ' -- ' + row);
    } else {
        return ('Note at beat ' + time + ' -- ' + type + ' -- ' + cutDirection + ' -- ' + column + ' -- ' + row + ' -- ' + parity[type]);
    }
}

function outputMessage(text, type) {
    let element = document.createElement('div');
    let textNode = document.createElement('pre');
    textNode.innerHTML = text;
    element.classList.add('outline', type);
    element.appendChild(textNode);
    output.appendChild(element);
}

function clearOutput() {
    while (output.lastChild) {
        output.removeChild(output.lastChild);
    }
}

function main() {
    clearOutput();
    if (!ready) {
        outputMessage('File loading not ready, try again', 'error');
        return;
    }

    let notes = notesArray;

    let parity = new Parity();
    parity.init(notes);

    for (let i = 0; i < notes.length; i++) {
        let note = notes[i];
        let type = types[note._type];
        let cutDirection = cutDirections[note._cutDirection];
        let column = lineIndices[note._lineIndex];
        let row = lineLayers[note._lineLayer];

        if (type === 'bomb') {
            // this is super ugly, I'm hoping to come up with a better way later
            if (!(['middleLeft', 'middleRight'].includes(column)) || !(['bottom', 'top'].includes(row))) {
                continue;
            }

            // for each saber: ignore the bomb if it's within bombMinTime after a note or own-side bomb that says otherwise
            let setParity = {
                red: true,
                blue: true
            };
            let offset = -1;
            let offsetNote = notes[i + offset];
            while ((i + offset) >= 0 &&
                (note._time - offsetNote._time - bombMinTime) <= comparisonTolerance) {
                switch (types[offsetNote._type]) {
                    case 'bomb':
                        if (lineIndices[offsetNote._lineIndex] === 'middleLeft') {
                            setParity.red = false;
                        } else if (lineIndices[offsetNote._lineIndex] === 'middleRight') {
                            setParity.blue = false;
                        }
                        break;
                    case 'red':
                        setParity.red = false;
                        break;
                    case 'blue':
                        setParity.blue = false;
                        break;
                }
                offset--;
                offsetNote = notes[i + offset];
            }

            // invert parity if needed and log the bomb if so
            let logString = '';
            for (let color in setParity) {
                if (setParity[color]) {
                    if (row === 'bottom' && parity[color] === 'backhand') {
                        parity.invert(color);
                        logString += '\n' + color + ' parity set to ' + parity[color];
                    }
                    if (row === 'top' && parity[color] === 'forehand') {
                        parity.invert(color);
                        logString += '\n' + color + ' parity set to ' + parity[color];
                    }
                }
            }
            if (logString) {
                logString = logNote(note, parity) + logString;
                outputMessage(logString, 'info');
            }
        } else {
            if (cuts[type].good[parity[type]].includes(cutDirection)) {
                parity.invert(type);
            } else if (cuts[type].borderline[parity[type]].includes(cutDirection)) {
                outputMessage(logNote(note, parity) +
                    '\nBorderline hit, not all players might read or be able to play this correctly', 'warning');
                parity.invert(type);
            } else {
                outputMessage(logNote(note, parity) + '\nBad hit, wrist reset is necessary', 'error');
            }

            // invert parity again if there's a same-color note within sliderPrecision
            let offset = 1;
            let offsetNote = notes[i + offset];
            while ((i + offset) < notes.length &&
                (offsetNote._time - note._time - (1 / sliderPrecision)) <= comparisonTolerance) {
                if (note._type === offsetNote._type) {
                    parity.invert(type);
                    break;
                }
                offset++;
                offsetNote = notes[i + offset];
            }
        }
    }

    if (document.getElementsByClassName('warning').length === 0 && document.getElementsByClassName('error').length === 0) {
        outputMessage('No errors found', 'success');
    }
}

// angle (0,0) is looking directly at the notes from player perspective
let angleX = 30;
let angleY = 40;
let centerBeat = 0;
function rotate(event) {
    switch (event.key) {
        case 'w':
            angleX += 10;
            break;
        case 'a':
            angleY -= 10;
            break;
        case 's':
            angleX -= 10;
            break;
        case 'd':
            angleY += 10;
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
document.addEventListener('wheel', scroll);

function scroll(event) {
    centerBeat = Math.max(0, centerBeat + event.deltaY / -100);
    render(notesArray, centerBeat);
}

// I like to work in degrees, fight me
function toRadians(angle) {
    return angle * (Math.PI / 180);
}

const renderContainer = document.getElementById('render-container');

function render(notes, centerBeat) {
    if (!ready) {
        clearOutput();
        outputMessage('File loading not ready, try again', 'error');
        return;
    }

    // clear container
    while (renderContainer.lastChild) {
        renderContainer.removeChild(renderContainer.lastChild);
    }

    // container size in pixels
    // TODO: calculate from page
    let containerWidth = 600;
    let containerHeight = 300;

    let gridHeight = containerHeight / 2;

    let noteSize = gridHeight / 3 / Math.SQRT2;

    // scaling factors for time/column/row transformation into x,y coordinates
    let timeScaleX = Math.sin(toRadians(angleY));
    let timeScaleY = Math.cos(toRadians(angleY)) * Math.sin(toRadians(angleX)) * -1;

    let columnScaleX = Math.cos(toRadians(angleY));
    let columnScaleY = Math.sin(toRadians(angleY)) * Math.sin(toRadians(angleX));

    // row never affects x coordinate regardless of camera angle
    let rowScaleY = Math.cos(toRadians(angleX)) * -1;

    // range around centerBeat to render, also affects the scale
    // TODO: make a scale parameter, calculate this range automatically based on visibility
    let beatRange = 2;

    // filter notes outside of range
    notes = notes.filter(function (note) {
        return (note._time >= centerBeat - beatRange && note._time <= centerBeat + beatRange);
    });

    // decide time order
    let reverseTimeOrder = false;
    if (angleY >= 90 && angleY < 270) {
        reverseTimeOrder = !reverseTimeOrder;
    }
    if (angleX <= 90 || angleX > 270) {
        reverseTimeOrder = !reverseTimeOrder;
    }

    // decide column order
    let reverseColumnOrder = false;
    if (angleY >= 180) {
        reverseColumnOrder = !reverseColumnOrder;
    }
    if (angleX >= 90 && angleX < 270) {
        reverseColumnOrder = !reverseColumnOrder;
    }

    // decide row order
    let reverseRowOrder = false;
    if (angleX >= 180) {
        reverseRowOrder = !reverseRowOrder;
    }

    // sort by row, then column, then time
    notes = notes.sort(function (a, b) {
        return (reverseRowOrder ? b._lineLayer - a._lineLayer : a._lineLayer - b._lineLayer) ||
            (reverseColumnOrder ? b._lineIndex - a._lineIndex : a._lineIndex - b._lineIndex) ||
            (reverseTimeOrder ? b._time - a._time : a._time - b._time);
    });

    // calculate note position, make img element and add to the container
    for (let note of notes) {
        let relTime = note._time - centerBeat;
        let posX = (relTime / beatRange) * (containerWidth / 2) * timeScaleX + (containerWidth / 2);
        let posY = (relTime / beatRange) * (containerWidth / 2) * timeScaleY + (containerHeight / 2);

        let columnOffsetX = (gridHeight / 3) * (note._lineIndex - 1.5) * columnScaleX;
        let columnOffsetY = (gridHeight / 3) * (note._lineIndex - 1.5) * columnScaleY;

        posX += columnOffsetX;
        posY += columnOffsetY;

        let rowOffsetY = (gridHeight / 3) * (note._lineLayer - 1) * rowScaleY;

        posY += rowOffsetY;

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

        noteContainer.style.setProperty('left', 'calc(' + posX + 'px - (var(--size) / 2))');
        noteContainer.style.setProperty('top', 'calc(' + posY + 'px - (var(--size) / 2))');
        noteContainer.style.setProperty('transform', 'rotateX(' + -angleX + 'deg) rotateY(' + -angleY + 'deg) rotateZ(' + noteAngle + 'deg)');

        renderContainer.appendChild(noteContainer);
    }
}
