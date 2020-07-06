// main.js:
//  handles all error checking and listing as well as anything
//  that we haven't found a home for yet

console.log('main js loaded');

// things we find out from intro.dat:
var bpm = 120;
var offset = 0;

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

var notesArray;
var sliderPrecision = 1 / 8;
var ready = false;

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

function getInfo(fName) {
    let songInfo = findInfo(fName, infoDat._difficultyBeatmapSets);
    let localOffset = 0;
    let globalOffset = infoDat._songTimeOffset;
    try {
        localOffset = songInfo._customData._editorOffset
    } catch {}
    offset = - (localOffset * 0.001 + globalOffset) * bpm / 60;
}

function findInfo(fname, json) {
    for (let i = 0; i < json.length; i++) {
        for (let j = 0; j < json[i]._difficultyBeatmaps.length; j++) {
            if (json[i]._difficultyBeatmaps[j]._beatmapFilename == fname) {
                return (json[i]._difficultyBeatmaps[j]);
            };
        }
    }
}

// used to detect the scroll line height in FireFox
// graciously provided by StackOverflow: https://stackoverflow.com/a/57788612
function getScrollLineHeight() {
    const el = document.createElement('div');
    el.style.fontSize = 'initial';
    el.style.display = 'none';
    document.body.appendChild(el);
    const fontSize = window.getComputedStyle(el).fontSize;
    document.body.removeChild(el);
    return fontSize ? window.parseInt(fontSize) : 16;
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// js modulo operator does not work well with negative values
function mod(n, m) {
    return ((n % m) + m) % m;
}

function outputUI(note, parity, message, messageType) {
    let time = note._time + offset;
    let type = types[note._type];
    let column = lineIndices[note._lineIndex];
    let row = lineLayers[note._lineLayer];

    let imgSrc = 'assets/';
    let infoString;
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

    let element = document.createElement('div');
    element.classList.add('parent', messageType);
    element.dataset.time = time.toFixed(3);
    element.addEventListener('click', function () { scrollVal(time); });

    let img = document.createElement('img');
    img.src = imgSrc;
    img.style.setProperty('transform', 'rotate(' + cutAngles[note._cutDirection] + 'deg)');

    let text = document.createElement('div');
    text.classList.add('text');

    text.append(infoString, document.createElement('br'), message);
    element.append(img, text);
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
        // TODO: reimplement this with outputUI()?
        console.log('File loading not ready, try again');
        return;
    }

    let infCount = 0;
    let errCount = 0;
    let warnCount = 0;
    let summary = document.getElementById('summary');

    let parity = new Parity();
    parity.init(notesArray);

    if ((notesArray[0]._time * 60 / bpm) < 1.5) {
        if (!zipFile) { 
            let plural = (notesArray[0]._time == 1) ? ' beat ' : ' beats ';
            outputMessage('potential hot start - first note is ' + notesArray[0]._time.toFixed(3) + plural + 'into the song - consider waiting before the first note or adding silence', 'warning'); 
        }
        else {
            let plural = (notesArray[0]._time == 1) ? ' second ' : ' seconds ';
            outputMessage('potential hot start - first note is ' + (notesArray[0] * 60 / bpm)._time.toFixed(3) + plural + 'into the song - consider waiting before the first note or adding silence', 'warning');
        }
        warnCount++;
    }

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
                    let last = notesArray[findCol(notesArray, type, i - 1)];
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
                    let last = notesArray[findCol(notesArray, type, i - 1)];
                    if (zipFile) {
                        deltaTime = (bpm * (note._time - last._time) / 60).toFixed(3);
                        deltaTime += (deltaTime == 1) ? ' second' : ' seconds';
                    }
                    else { 
                        deltaTime = (note._time - last._time).toFixed(3);
                        deltaTime += (deltaTime == 1) ? ' beat' : ' beats'; 
                    }
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

    // TODO: reimplement this with outputUI()?
    // if (document.getElementsByClassName('warning').length === 0 && document.getElementsByClassName('error').length === 0) {
    //     outputMessage('No errors found', 'success');
    // }
}

function checkHandclap() {
    clearOutput();
    if (!ready) {
        console.log('File loading not ready, try again');
        return;
    }

    for (let i = 0; i < notesArray.length; i++) {
        let note = notesArray[i];
        let time = note._time;
        let type = types[note._type];
        let cutDirection = cutDirections[note._cutDirection];
        let column = lineIndices[note._lineIndex];
        let row = lineLayers[note._lineLayer];

        surroundingNotes = notesArray.filter
    }
}

function outputMessage(text, type) { // when outputui no longer needs notes, replace this
    let element = document.createElement('div');
    element.textContent = text;
    element.classList.add('parent', type);
    element.style.setProperty('padding-bottom', '10px');
    output.appendChild(element);
}