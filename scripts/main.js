// main.js:
//  handles all error checking and listing as well as anything
//  that we haven't found a home for yet

console.log('main js loaded');

const cutDirections = ['up', 'down', 'left', 'right', 'upLeft', 'upRight', 'downLeft', 'downRight', 'dot'];
const cutAngles = [180, 0, 90, 270, 135, 225, 45, 315, 0];

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
const bombMinTime = 1 / 4;

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
    constructor(type) {
        this.parity = 'forehand';
        this.lastInvertTime;
        this.type = type;
    }

    invert(time) {
        this.parity === 'forehand' ? this.parity = 'backhand' : this.parity = 'forehand';
        this.lastInvertTime = time;
    }

    init(notes) {
        let firstNote;
        for (let note of notes) {
            if (types[note._type] === this.type) {
                firstNote = note;
                console.log('found first note for ' + this.type);
                break;
            }
        }

        if (firstNote && cuts[this.type].good.forehand.includes(cutDirections[firstNote._cutDirection])) {
            this.parity = 'forehand';
        } else {
            this.parity = 'backhand';
        }
    }
}

const scrollLineHeight = getScrollLineHeight();

var mapDifficultySets;
var notesArray, wallsArray;
var sliderPrecision = 1 / 8;
var ready = false;

/**
 * Filters and sorts notes to ensure all notes in array are valid, and assigns an index to each
 * @param {Array} obj - A beat saber JSON array of notes
 * @returns {Array} - filtered, tagged & sorted notes
 */
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

function getWalls(obj) {
    let walls = obj._obstacles;
    walls.sort(function (a, b) {
        return a._time - b._time;
    });

    // filter out invalid/fake wall types
    walls = walls.filter(function (wall) {
        return (wall._width >= 1 && wall._duration >= 0);
    });

    return walls;
}

/**
 * Detects scroll line height in Firefox, as it is calculated differently to other browsers
 * based upon https://bit.ly/3fy5IEQ
 * @returns {number} - line height in pixels
 */
function getScrollLineHeight() {
    const el = document.createElement('div');
    el.style.fontSize = 'initial';
    el.style.display = 'none';
    document.body.appendChild(el);
    const fontSize = window.getComputedStyle(el).fontSize;
    document.body.removeChild(el);
    return fontSize ? window.parseInt(fontSize) : 16;
}

/**
 * prevents any event from causing it's default action
 * @param {Event} e - any event that
 */
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

/**
 * js' native modulo operator does not work well with negative values
 * @param {Number} n - divident of modulo
 * @param {Number} m - divisor of modulo
 * @returns {Number} - n % m, with support for negatives
 */
function mod(n, m) {
    return ((n % m) + m) % m;
}

/**
 * prints a fancy error message to the screen, supports both notes and raw text
 * @param {Array} note - the note responsible for the error (previewed in message). can be omitted
 * @param {String | Number} parity - if in note mode, the type of parity broken, otherwise the time of the error
 * @param {String} message - the caption/description of the error. can be broken into two lines with '|' in text mode
 * @param {String} messageType - the severity of the error - will be added to output as a class
 * @param {Boolean} persistent - indicates whether or not the message should be persistent
 * @returns {void} - outputs to DOM, should not return a value
 */
function outputUI(note, parity, message, messageType, persistent = false) {
    let wrapper = document.createElement('div');
    let element = document.createElement('div');
    element.classList.add('parent', messageType);

    let time, imgSrc, infoString;
    if (note != false) { // if note passed in note function
        time = note._time;
        let type = types[note._type];
        let column = lineIndices[note._lineIndex];
        let row = lineLayers[note._lineLayer];

        imgSrc = 'assets/';
        if (type === 'bomb') {
            imgSrc += 'bomb';
            infoString = 'Bomb at beat ' + time.toFixed(3) + ':';
            message = message[0].toUpperCase() + message.slice(1) + ' parity set to ' + parity; // ugly, but it works
        } else {
            imgSrc += ((cutDirections[note._cutDirection] === 'dot') ? 'dot_' : 'note_') + 'front_' + type;
            infoString = (parity === 'forehand') ? 'Forehand (' : 'Backhand ('; // capitalisation
            infoString += (column === 'middleLeft') ? 'centre-left' : (column === 'middleRight') ? 'centre-right' : (column + ' side');
            infoString += ', ' + row + ' row) at beat ' + time.toFixed(3) + ':';
        }
        imgSrc += '.svg';

        element.dataset.time = time.toFixed(3);
        element.addEventListener('click', function () { scrollTo(time); });
    } else { // message output mode
        imgSrc = 'assets/' + messageType + '.svg';
        if (message.includes('|')) {
            infoString = message.split('|')[0];
            message = message.split('|')[1];
        } else {
            infoString = message;
            message = '';
        }
        element.dataset.time = parity.toFixed(3);
        element.classList.add('noHighlight');
    }

    let img = document.createElement('img');
    img.src = imgSrc;
    if (note != false) {
        img.style.setProperty('transform', 'rotate(' + cutAngles[note._cutDirection] + 'deg)');
    }

    let text = document.createElement('div');
    text.classList.add('text');

    text.append(infoString, document.createElement('br'), message);
    element.append(img, text);
    wrapper.appendChild(element);

    if (persistent) {
        wrapper.classList.add('persistent');
    }

    output.appendChild(wrapper);
}

/** clears all non-persistent error messages from output box */
function clearOutput() {
    for (let i = output.childNodes.length - 1; i >= 0; i--) {
        let child = output.childNodes[i];
        if (!child.classList.contains('persistent')) {
            output.removeChild(child);
        }
    }
}

/**
 * finds the last note in the same colour (for preceding-error highlighting)
 * @param {Array} jsonData - the notes array
 * @param {Number} type - whether the note is a blue or red block
 * @param {Number} lastVal - the position of the error note inside the array
 * @returns {Number} - the index of the last note of the same colour in the array, or -1 if not found
 */
function findCol(jsonData, type, lastVal) {
    for (let i = lastVal; i >= 0; i--) {
        if (types[jsonData[i]._type] === type) {
            return i
        }
    }
    return -1;
}

/**
 * checks for errors in parity within the notes
 * @param notes - the array of notes to scan for errors
 * @returns {void} - outputs error messages through outputUI
 */
function checkParity(notes = notesArray) {
    clearOutput();
    if (!ready) {
        outputUI(false, 0, Strings.getNotReadyText(), 'error');
        return;
    }

    let infCount = 0;
    let errCount = 0;
    let warnCount = 0;
    let summary = document.getElementById('summary');

    let parity = {
        red: new Parity('red'),
        blue: new Parity('blue')
    };
    parity.red.init(notes);
    parity.blue.init(notes);

    for (let i = 0; i < notes.length; i++) {
        let note = notes[i];
        let type = types[note._type];
        let cutDirection = cutDirections[note._cutDirection];
        let column = lineIndices[note._lineIndex];
        let row = lineLayers[note._lineLayer];

        note.error = false;
        note.warn = false;
        note.precedingError = false;
        note.precedingWarn = false;

        if (type === 'bomb') {
            // this is super ugly, I'm hoping to come up with a better way later
            if (!(['middleLeft', 'middleRight'].includes(column)) || !(['bottom', 'top'].includes(row))) {
                continue;
            }

            let suggestedParity = (row === 'bottom' ? 'forehand' : 'backhand');
            let setParity = {
                red: true,
                blue: true
            };
            for (let color in parity) {
                // look ahead for bombMinTime and skip setting parity if it would be set by a note, or inverted back by another bomb
                let targetColumn = (color === 'red' ? 'middleLeft' : 'middleRight');
                let targetRow = (row === 'bottom' ? 'top' : 'bottom');
                for (let offsetNote of notes.slice(i + 1)) {
                    if (offsetNote._time - note._time - bombMinTime > comparisonTolerance) {
                        break;
                    }

                    if (types[offsetNote._type] === color
                        && !(cuts[color].good[suggestedParity].includes(cutDirections[offsetNote._cutDirection]))) {
                        setParity[color] = false;
                        break;
                    }

                    if (types[offsetNote._type] === 'bomb'
                        && lineIndices[offsetNote._lineIndex] === targetColumn
                        && lineLayers[offsetNote._lineLayer] === targetRow) {
                        setParity[color] = false;
                        break;
                    }
                }

                // if it's been less than bombMinTime since the last parity invert, ignore bomb
                if (note._time - parity[color].lastInvertTime - bombMinTime <= comparisonTolerance) {
                    setParity[color] = false;

                    // if bomb wouldn't set parity anyway, reset lastInvertTime
                    if (suggestedParity === parity[color].parity) {
                        parity[color].lastInvertTime = note._time;
                    }
                }
            }

            // invert parity if needed and log the bomb if so
            for (let color in setParity) {
                if (setParity[color]) {
                    if (suggestedParity !== parity[color].parity) {
                        parity[color].invert(note._time);
                        outputUI(note, parity[color].parity, color, 'info');
                        infCount++;
                    }
                }
            }
        } else {
            if (cuts[type].good[parity[type].parity].includes(cutDirection)) {
                parity[type].invert(note._time);
            } else if (cuts[type].borderline[parity[type].parity].includes(cutDirection)) {
                note.warn = true;

                try {
                    let last = notes[findCol(notes, type, i - 1)];
                    last.precedingWarn = true;
                }
                catch {
                    console.log('error finding note!');
                }

                outputUI(note, parity[type].parity, Strings.getBorderlineHitText(), 'warning');
                parity[type].invert(note._time);
                warnCount++;
            } else {
                note.error = true;
                let deltaTime = note._time - (parity[type].lastInvertTime ?? 0);
                try {
                    let last = notes[findCol(notes, type, i - 1)];
                    last.precedingError = true;
                }
                catch {
                    console.log('error finding note!');
                }

                outputUI(note, parity[type].parity, Strings.getParityBreakText(deltaTime), 'error');
                errCount++;
            }

            // invert parity again if there's a same-color note within sliderPrecision
            let offset = 1;
            let offsetNote = notes[i + offset];
            while ((i + offset) < notes.length &&
                (offsetNote._time - note._time - sliderPrecision) <= comparisonTolerance) {
                if (note._type === offsetNote._type) {
                    parity[type].invert(note._time);
                    break;
                }
                offset++;
                offsetNote = notes[i + offset];
            }
        }
    }

    summary.textContent = 'found ' + ((errCount === 0) ? 'no' : errCount) + ((errCount === 1) ? ' error, ' : ' errors and ') +
        ((warnCount === 0) ? 'no' : warnCount) + ((warnCount === 1) ? ' warning' : ' warnings');;

    if (warnCount === 0 && errCount === 0) {
        outputUI(false, 0, 'No errors found!', 'success');
    }
}
