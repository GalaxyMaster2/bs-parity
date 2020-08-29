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

const badHitText = 'Bad hit, wrist reset is necessary in ';
const borderlineHitText = 'Borderline hit, not all players might read or be able to play this correctly';

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
        outputUI(false, 0, 'File loading not ready:|Please try again', 'error');
        return;
    }

    let infCount = 0;
    let errCount = 0;
    let warnCount = 0;
    let summary = document.getElementById('summary');

    let parity = new Parity();
    parity.init(notes);

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
            for (let color in setParity) {
                if (setParity[color]) {
                    if ((row === 'bottom' && parity[color] === 'backhand') || (row === 'top' && parity[color] === 'forehand')) {
                        parity.invert(color);
                        outputUI(note, parity[color], color, 'info');
                        infCount++;
                    }
                }
            }
        } else {
            if (cuts[type].good[parity[type]].includes(cutDirection)) {
                parity.invert(type);
            } else if (cuts[type].borderline[parity[type]].includes(cutDirection)) {
                note.warn = true;

                try {
                    let last = notes[findCol(notes, type, i - 1)];
                    last.precedingWarn = true;
                }
                catch {
                    console.log('error finding note!');
                }

                outputUI(note, parity[type], borderlineHitText, 'warning');
                parity.invert(type);
                warnCount++;
            } else {
                note.error = true;
                let deltaTime = 0;
                try {
                    let last = notes[findCol(notes, type, i - 1)];
                    deltaTime = (note._time - last._time).toFixed(3);
                    deltaTime += (deltaTime == 1) ? ' beat' : ' beats';
                    last.precedingError = true;
                }
                catch {
                    console.log('error finding note!');
                }

                outputUI(note, parity[type], badHitText + deltaTime, 'error');
                errCount++;
            }

            // invert parity again if there's a same-color note within sliderPrecision
            let offset = 1;
            let offsetNote = notes[i + offset];
            while ((i + offset) < notes.length &&
                (offsetNote._time - note._time - sliderPrecision) <= comparisonTolerance) {
                if (note._type === offsetNote._type) {
                    parity.invert(type);
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

function getStats(notes = notesArray) {
    const rotTranspose =    [1, 7, 3, 5, 0, 2, 6, 8, 4]; // no longer used except as reference
    const rotTransposeInv = [4, 0, 5, 2, 8, 3, 6, 1, 7];

    const blockType = ['all', 'red', 'blue', 'bomb'];
    const blockName = ['block', 'red note', 'blue note', 'bomb'];
    const niceCutDirections = ['up', 'down', 'left', 'right', 'up-left', 'up-right', 'down-left', 'down-right', 'dot']; // while aB works well for class names it looks a bit off in text

    let notePos = [
        [ [ 0, 0, 0, 0 ],
          [ 0, 0, 0, 0 ],
          [ 0, 0, 0, 0 ] ],
        [ [ 0, 0, 0, 0 ],
          [ 0, 0, 0, 0 ],
          [ 0, 0, 0, 0 ] ],
        [ [ 0, 0, 0, 0 ],
          [ 0, 0, 0, 0 ],
          [ 0, 0, 0, 0 ] ],
        [ [ 0, 0, 0, 0 ],
          [ 0, 0, 0, 0 ],
          [ 0, 0, 0, 0 ] ]
    ];

    let noteRot = [ [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0] ];
    let noteTyp = [0, 0, 0, 0];

    for (let i = 0; i < notes.length; i++) {
        let note = notes[i];

        notePos[0][2 - note._lineLayer][note._lineIndex]++;
        notePos[Math.min(3, note._type + 1)][2 - note._lineLayer][note._lineIndex]++;

        if (note._type != 3) { 
            noteRot[0][note._cutDirection]++;
            noteRot[note._type + 1][note._cutDirection]++; 
        }

        noteTyp[0]++;
        noteTyp[Math.min(3, note._type + 1)]++;
    }
    
    let out = document.getElementById('statsbox');
    for (let i = out.childNodes.length - 1; i >= 0; i--) {
        out.removeChild(out.childNodes[i]);
    }

    let line = document.createElement('div');
    
    let label = document.createElement('span');
    label.append('block positioning');

    let label2 = document.createElement('span');
    label2.append('note rotation');

    line.append(label);
    line.append(label2);
    out.append(line);

    for (let i = 0; i < 3; i++) {
        let line = document.createElement('div');
        
        line.classList.add('line');

        for (let j = 0; j < 4; j++) { // position
            let spacer  = document.createElement('span');
            spacer.classList.add('tile', 'spacer');
            spacer.style = '--opacity: 0;';

            notePos[j][i].forEach(item => {
                let tile = document.createElement('span');
                tile.classList.add('tile');
                tile.classList.add(blockType[j]);
                let max = Math.max(...notePos[j][0], ...notePos[j][1], ...notePos[j][2]);
                let opacity = (noteTyp[j] == 0) ? 0.05 : (0.05 + 0.9 * Math.pow(item/max, 0.75)) // convert to percentages of largest value
                tile.style = '--opacity: ' + opacity + ';';
                let title = item + ' ';
                title += blockName[j];
                title += (item == 1) ? '' :'s';
                title += ' in this position';
                if (noteTyp[j] != 0) title += ' (' + (100*item/noteTyp[j]).toFixed(1) + '% of ' + blockName[j] + 's)';
                tile.title = title;
                line.append(tile);
            });
            line.append(spacer);
        }

        for (let j = 0; j < 3; j++) { // rotation
            if (noteTyp[j] == 0) continue;
            
            let spacer  = document.createElement('span');
            spacer.classList.add('tile', 'spacer');
            spacer.style = '--opacity: 0;';

            for (let k = 0; k < 3; k++) {
                let item = noteRot[j][rotTransposeInv[3 * i + k]];
                let tile = document.createElement('span');
                tile.classList.add('tile');
                tile.classList.add(blockType[j]);
                tile.style = '--opacity: '+ (0.05 + 0.9 * Math.pow(item/Math.max(...noteRot[j]), 0.75)) + ';'; // convert to percentages of largest value
                let title = item + ' ';
                title += ['', 'red ', 'blue ', 'bomb '][j]; // while i would love to swap this for blockName, sadly english's fun adjective rules disagree with that idea
                title += niceCutDirections[rotTransposeInv[3 * i + k]];
                title += (item == 1) ? ' note' :' notes';
                if (noteTyp[j] != 0) title += ' (' + (100*item/noteTyp[j]).toFixed(1) + '% of ' + blockName[j] + 's)';
                tile.title = title;
                line.append(tile);
            }
            line.append(spacer);
        }

        
        if (i == 0) { line.append('red/blue:'); }
        else if (i == 1) { line.append((noteTyp[2] / noteTyp[1]).toFixed(2)); }

        out.append(line);
    }
}
