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

var notesArray;
var sliderPrecision = 1 / 8;
var ready = false;

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
    textNode.textContent = text;
    element.classList.add('outline', type);
    element.appendChild(textNode);
    output.appendChild(element);
}

function outputUI(note, parity, time2, errString, errType) {
    let time_raw = note._time
    let time = time_raw.toFixed(3);
    let type = types[note._type];
    let cutDirection = cutDirections[note._cutDirection];
    let column = lineIndices[note._lineIndex];
    let row = lineLayers[note._lineLayer];

    let imgClass;
    if (type === 'bomb') {
        imgClass = 'bomb';
    } else {
        imgClass = ((cutDirection === 'dot') ? 'dot_' : 'note_') + 'front_' + type;
    }

    let infoString;
    if (type === 'bomb') {
        infoString = 'Bomb at beat ' + time + ': ';
    } else {
        infoString = (parity[type] == 'forehand') ? 'Forehand (' : 'Backhand (' // capitalisation
        infoString += (column === 'middleLeft') ? 'centre-left' : (column === 'middleRight') ? 'centre-right' : (column + ' side');
        infoString += ', ' + row + ' row) at beat ' + time + ': ';
    }

    let element = document.createElement('div');

    element.classList.add('parent');
    element.classList.add(errType);

    element.dataset.time = time;
    element.dataset.time2 = time2;

    element.addEventListener('click', function () { scrollVal(time_raw); });

    let img = document.createElement('img');
    img.src = 'assets/' + imgClass + '.svg';
    img.style.setProperty('transform', 'rotate(' + cutAngles[note._cutDirection] + 'deg)');

    element.appendChild(img);

    let text = document.createElement('div');
    text.classList.add('text');

    let infoStringNode = document.createTextNode(infoString);
    let errStringNode = document.createTextNode(errString);
    let br = document.createElement('br');

    text.appendChild(infoStringNode);
    text.appendChild(br);
    text.appendChild(errStringNode);

    element.appendChild(text);
    // structure allows easier css styling for each error in the list

    output.appendChild(element);
}

function clearOutput() {
    while (output.lastChild) {
        output.removeChild(output.lastChild);
    }
}

function findCol(jsonData, type, lastVal) {
    for (let i = lastVal; i >= 0; i--) {
        if (types[jsonData[i]._type] === type) {
            return i
        }
    }
    return -1;
}

function checkParity() {
    clearOutput();
    if (!ready) {
        outputMessage('File loading not ready, try again', 'error');
        return;
    }

    let infCount = 0;
    let errCount = 0;
    let warnCount = 0;
    let summary = document.getElementById('summary');

    let parity = new Parity();
    parity.init(notesArray);

    for (let i = 0; i < notesArray.length; i++) {
        let note = notesArray[i];
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
            let offsetNote = notesArray[i + offset];
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
                offsetNote = notesArray[i + offset];
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
                infCount++;
            }
        } else {
            if (cuts[type].good[parity[type]].includes(cutDirection)) {
                parity.invert(type);
            } else if (cuts[type].borderline[parity[type]].includes(cutDirection)) {
                note.warn = true;
                let lastTime = -1;

                try {
                    let last = notesArray[findCol(notesArray, type, i - 1)];
                    last.precedingWarn = true;
                    lastTime = last._time.toFixed(3);
                }
                catch {
                    console.log('error finding note!');
                }

                outputUI(note, parity, lastTime, 'Borderline hit, not all players might read or be able to play this correctly', 'warning');
                parity.invert(type);
                warnCount++;
            } else {
                note.error = true;
                let deltaTime = 0;
                let lastTime = -1;
                try {
                    let last = notesArray[findCol(notesArray, type, i - 1)];
                    deltaTime = (note._time - last._time).toFixed(3);
                    deltaTime += (deltaTime == 1) ? ' beat' : ' beats';
                    last.precedingError = true;
                    lastTime = last._time.toFixed(3);
                }
                catch {
                    console.log('error finding note!');
                }

                outputUI(note, parity, lastTime, 'Bad hit, wrist reset is necessary in ' + deltaTime, 'error');
                errCount++;
            }

            // invert parity again if there's a same-color note within sliderPrecision
            let offset = 1;
            let offsetNote = notesArray[i + offset];
            while ((i + offset) < notesArray.length &&
                (offsetNote._time - note._time - sliderPrecision) <= comparisonTolerance) {
                if (note._type === offsetNote._type) {
                    parity.invert(type);
                    break;
                }
                offset++;
                offsetNote = notesArray[i + offset];
            }
        }
    }

    summary.textContent = 'found ' + ((errCount === 0) ? 'no' : errCount) + ((errCount === 1) ? ' error, ' : ' errors, ') + 
        ((warnCount === 0) ? 'no' : warnCount) + ((warnCount === 1) ? ' warning, ' : ' warnings, ') + 
        'and generated ' + ((infCount === 0) ? 'no' : infCount) + ' debug messages:';

    if (document.getElementsByClassName('warning').length === 0 && document.getElementsByClassName('error').length === 0) {
        outputMessage('No errors found', 'success');
    }
}
