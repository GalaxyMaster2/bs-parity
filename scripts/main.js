// main.js:
//  handles all error checking and listing as well as anything
//  that we haven't found a home for yet

console.log('main js loaded');

// things we find out from intro.dat:
var bpm = 120;
var offset = 0;

const cutDirections = ['up', 'down', 'left', 'right', 'upLeft', 'upRight', 'downLeft', 'downRight', 'dot'];
const cutAngles = [180, 0, 90, 270, 135, 225, 45, 315, 0];
const cutVectors = [[0, 1], [0, -1], [-1, 0], [1, 0], [-Math.SQRT1_2, Math.SQRT1_2], [Math.SQRT1_2, Math.SQRT1_2], [-Math.SQRT1_2, -Math.SQRT1_2], [Math.SQRT1_2, -Math.SQRT1_2], [0, 0]]

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

function getInfo(fName) {
    let songInfo = findInfo(fName, infoDat._difficultyBeatmapSets);
    let localOffset = 0;
    let globalOffset = infoDat._songTimeOffset;
    try {
        localOffset = songInfo._customData._editorOffset
    } catch {}
    offset = -0.001 * (localOffset + globalOffset) * bpm / 60;
    if (Math.abs(notesArray[0] + offset) < comparisonTolerance) { offset = notesArray[0] } // support for people who offset first note to 0 mark
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
 * @returns {void} - outputs to DOM, should not return a value
 */
function outputUI(note, parity, message, messageType) {
    let wrapper = document.createElement('div');
    let element = document.createElement('div');
    element.classList.add('parent', messageType);

    let time, imgSrc, infoString;
    if (note != false) { // if note passed in note function
        time = note._time + offset;
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
        time = parity;
        imgSrc = 'assets/' + messageType + '.svg';
        if (message.includes('|')) {
            infoString = message.split('|')[0];
            message = message.split('|')[1];
        } else {
            infoString = message;
            message = '';
        }
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
    output.appendChild(wrapper);
}

/** clears all error messages from output box */
function clear(parent) {
    while (parent.lastChild) {
        parent.removeChild(parent.lastChild);
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
var lastNote = 0;

/**
 * checks for errors in parity within the notes
 * @param notes - the array of notes to scan for errors
 * @returns {void} - outputs error messages through outputUI
 */
function checkMap(notes = notesArray) {
    clear(output);
    if (!ready) {
        outputUI(false, 0, 'File loading not ready:|Please try again', 'error');
        return;
    }

    let infCount = 0;
    let errCount = 0;
    let warnCount = 0;
    lastNote = 0;

    let summary = document.getElementById('summary');

    if (!zipFile) {
        outputUI(false, 0, 'Note that while .dat files are still supported, not all features are available:|Consider using a zip file instead!', 'warning');
    }

    let parity = new Parity();
    parity.init(notes);

    if (((notes[0]._time + offset) * 60 / bpm) < 1.5) {
        if (!zipFile) { 
            let plural = (notes[0]._time + offset == 1) ? ' beat ' : ' beats ';
            outputUI(false, notes[0]._time + offset, 'Potential hot start - first note is ' + notes[0]._time.toFixed(3) + plural + 'into the song:|Consider waiting before the first note or adding silence', 'warning'); 
        }
        else {
            let plural = (((notes[0]._time + offset) * 60 / bpm) == 1) ? ' second ' : ' seconds ';
            outputUI(false, notes[0]._time + offset, 'Potential hot start - first note is ' + ((notes[0]._time + offset) * 60 / bpm).toFixed(3) + plural + 'into the song:|Consider waiting before the first note or adding silence', 'warning');
        }
        warnCount++;
    }

    for (let i = 0; i < notes.length; i++) {
        let note = notes[i];

        let hcErr = checkClap(notes, i);
        warnCount += hcErr[0];
        errCount += hcErr[1];

        let pErr = checkParity(notes, i, parity);
        warnCount += pErr[0];
        errCount += pErr[1];
    }

    summary.textContent = 'found ' + ((errCount === 0) ? 'no' : errCount) + ((errCount === 1) ? ' error, ' : ' errors and ') +
        ((warnCount === 0) ? 'no' : warnCount) + ((warnCount === 1) ? ' warning' : ' warnings');;

    if (warnCount === 0 && errCount === 0) {
        outputUI(false, 0, 'No errors found!', 'success');
    }
}

function checkParity(notes = notesArray, i, parity = new Parity()) {
    let note = notes[i];
    let type = types[note._type];
    let cutDirection = cutDirections[note._cutDirection];
    let column = lineIndices[note._lineIndex];
    let row = lineLayers[note._lineLayer];

    let state = [0, 0, 0];

    if (type === 'bomb') {
        // this is super ugly, I'm hoping to come up with a better way later
        if (!(['middleLeft', 'middleRight'].includes(column)) || !(['bottom', 'top'].includes(row))) {
            return state;
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
                    state[2]++;
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
            state[0]++;
        } else {
            note.error = true;
            let deltaTime = 0;
            try {
                let last = notes[findCol(notes, type, i - 1)];
                if (zipFile) {
                    deltaTime = ((note._time - last._time) * 60 / bpm).toFixed(3);
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
            state[1]++;
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

    return state;
}

function checkClap(notes = notesArray, i) {
    let state = [0, 0];
    if (i < lastNote) return state;
    let note = notes[i];
    let time = note._time;

    let surroundingNotes = notes.filter(function (note) {
        return (Math.abs(note._time - time) <= 4 * comparisonTolerance);
    }); // get notes in same effective 2d frame - this could be expanded to a 3d slice in the future if i am feeling masochistic

    if (surroundingNotes.length == 1) return state; // ignore single-beat frames

    let sNoteTypes = [[], [], [], []]; // bombs are type 3 of course, so sNT[2] will always be empty which is a bit of a waste

    for (let j = 0; j < surroundingNotes.length; j++) { // filter into groups of notes
        sNoteTypes[surroundingNotes[j]._type].push(surroundingNotes[j]);
    }

    if (sNoteTypes[0].length == 1 && sNoteTypes[1].length == 1) { // single note in blue and red, basic line collision
        redLine = [
            sNoteTypes[0][0]._lineIndex, sNoteTypes[0][0]._lineLayer,
            cutVectors[sNoteTypes[0][0]._cutDirection][0],
            cutVectors[sNoteTypes[0][0]._cutDirection][1]
        ];

        blueLine = [
            sNoteTypes[1][0]._lineIndex, sNoteTypes[1][0]._lineLayer,
            cutVectors[sNoteTypes[1][0]._cutDirection][0],
            cutVectors[sNoteTypes[1][0]._cutDirection][1]
        ];

        let intersection = checkIntersection(redLine, blueLine, time);

        if (typeof(intersection) != "number") {}
        else if (intersection >= 0) {
            if (Math.abs(intersection) <= 1) {
                outputUI(false, note._time + offset, 'Handclap detected at beat ' + (note._time + offset).toFixed(3)+'|'+intersection, 'error');
                notes[i].error = true;
                notes[i + 1].error = true;
                state[1] += 1;
            }
            else if (Math.abs(intersection) <= 2) {
                outputUI(false, note._time + offset, 'Potential handclap detected at beat ' + (note._time + offset).toFixed(3) + '|Note that most handclaps depend upon context, and thus this may flag incorrectly' + ' ' +intersection, 'warning');
                notes[i].warn = true;
                notes[i + 1].warn = true;
                state[0] += 1;
            }
        } else {
            if (Math.abs(intersection) <= 0.71) {
                outputUI(false, note._time + offset, 'Handclap detected at beat ' + (note._time + offset).toFixed(3)+'|'+intersection, 'error');
                notes[i].error = true;
                notes[i + 1].error = true;
                state[1] += 1;
            }
            else if (Math.abs(intersection) <= 1.5) {
                outputUI(false, note._time + offset, 'Potential handclap detected at beat ' + (note._time + offset).toFixed(3) + '|Note that most handclaps depend upon context, and thus this may flag incorrectly' + ' ' +intersection, 'warning');
                notes[i].warn = true;
                notes[i + 1].warn = true;
                state[0] += 1;
            }
        }
    }
    
    else { // multiple lines: filter, then check every combination of lines
        let redLines = [], blueLines = [];

        sNoteTypes[0].forEach(element => { // add all notes to lines[] array
            let line = [element._lineIndex, element._lineLayer,
                        cutVectors[element._cutDirection][0],
                        cutVectors[element._cutDirection][1] ];
            redLines.push(line);
        });

        sNoteTypes[1].forEach(element => {
            let line = [element._lineIndex, element._lineLayer,
                cutVectors[element._cutDirection][0],
                cutVectors[element._cutDirection][1] ];
            blueLines.push(line);
        });

        for (let i = 0; i < redLines.length; i++) {
            for (let j = 0; j < redLines.length;) {
                if (i == j) j++;
                else {
                    if (checkIntersection(redLines[i], redLines[j]) == 'same') { // if the lines go in the same direction
                        redLines.splice(j, 1); // remove j from the array
                    } else { j++; }
                }
            }
        }

        for (let i = 0; i < blueLines.length; i++) {
            for (let j = 0; j < blueLines.length;) {
                if (i == j) j++;
                else {
                    if (checkIntersection(blueLines[i], blueLines[j]) == -2) { // if the lines go in the same direction
                        blueLines.splice(j, 1); // remove j from the array
                    } else { j++; }
                }
            }
        }

        blueLines.forEach(blue => { // add all notes to lines[] array
            redLines.forEach(red => {
                let intersection = checkIntersection(red, blue, time);
                if (typeof(intersection) != "number") {}
                else if (intersection >= 0) {
                    if (Math.abs(intersection) <= 1) {
                        outputUI(false, note._time + offset, 'Handclap detected at beat ' + (note._time + offset).toFixed(3)+'|'+intersection, 'error');
                        state[1] += 1;
                    }
                    else if (Math.abs(intersection) <= 2) {
                        outputUI(false, note._time + offset, 'Potential handclap detected at beat ' + (note._time + offset).toFixed(3) + '|Note that most handclaps depend upon context, and thus this may flag incorrectly'+' '+intersection, 'warning');
                        state[0] += 1;
                    }
                } else {
                    if (Math.abs(intersection) <= 0.71) {
                        outputUI(false, note._time + offset, 'Handclap detected at beat ' + (note._time + offset).toFixed(3)+'|'+intersection, 'error');
                        state[1] += 1;
                    }
                    else if (Math.abs(intersection) <= 1.5) {
                        outputUI(false, note._time + offset, 'Potential handclap detected at beat ' + (note._time + offset).toFixed(3) + '|Note that most handclaps depend upon context, and thus this may flag incorrectly'+' '+intersection, 'warning');
                        state[0] += 1;
                    }
                }
            });
        });
    }

    // hammer hit detection
    let hhLines = [];

    sNoteTypes[0].forEach(element => { // add all notes to lines[] array
        let line = [element._lineIndex, element._lineLayer,
                    cutVectors[element._cutDirection][0],
                    cutVectors[element._cutDirection][1] ];
        hhLines.push(line);
    });

    sNoteTypes[1].forEach(element => {
        let line = [element._lineIndex, element._lineLayer,
            cutVectors[element._cutDirection][0],
            cutVectors[element._cutDirection][1] ];
        hhLines.push(line);
    });

    for (let j = 0; j < sNoteTypes[3].length; j++) { // for every bomb, check collision with every block
        let bombX = sNoteTypes[3][j]._lineIndex;
        let bombY = sNoteTypes[3][j]._lineLayer;
        
        hhLines.forEach(element => {
            intersection = 'none'
            intersection = checkIntersection(element, [bombX, bombY, 0, 0], time);
            if (typeof(intersection) != "number") {}
            else if (intersection >= 0) {
                if (Math.abs(intersection) <= 1) {
                    outputUI(false, note._time + offset, 'Hammer hit detected at beat ' + (note._time + offset).toFixed(3) +'|'+intersection, 'error');
                    state[1] += 1;
                }
                else if (Math.abs(intersection) <= 1.5) {
                    outputUI(false, note._time + offset, 'Potential hammer hit detected at beat ' + (note._time + offset).toFixed(3) + '|Note that this filter ignores context, and thus this may flag incorrectly '+ intersection, 'warning');
                    state[0] += 1;
                }
            } else {
                if (Math.abs(intersection) <= 0.71) {
                    outputUI(false, note._time + offset, 'Hammer hit detected at beat ' + (note._time + offset).toFixed(3) +'|'+intersection, 'error');
                    state[1] += 1;
                }
                else if (Math.abs(intersection) <= 1) {
                    outputUI(false, note._time + offset, 'Potential hammer hit detected at beat ' + (note._time + offset).toFixed(3) + '|Note that this filter ignores context, and thus this may flag incorrectly '+ intersection, 'warning');
                    state[0] += 1;
                }
            }
            
        });
    }

    lastNote = i + surroundingNotes.length; // only show each frame once
    return state;
}

// based off of my own very dubious understanding of vector stuff and https://bit.ly/2Z393Gk
function checkIntersection(a, b, time = 0) {
    if ((a[2] == 0 && a[3] == 0) || (b[2] == 0 && b[3] == 0)) { // at least one of the notes is a dot, test for perpendicular distance between line and point
        // todo: how does this handle two dots?
        console.log(a, b, time);
        let line = a, dot = b;
        if (a[2] == 0 && a[3] == 0) { // swap so a is the dot
            dot = a;
            line = b;
        }

        let perpDist = checkColinear(line, [dot[0], dot[1]]);

        if (perpDist[0]) { // the dot lies on the line, calculate distance from line's point to dot
            return perpDist[1];
        } else {
            return 'notOnLine'; 
            
            // this may be a little harsh - assumes no hanclap possible if not immediately in a line, but i don't want to implement it properly right now
            // it pretty much holds true though, so should be fine
        }
    }

    if (a[2] == b[2] && a[3] == b[3]) { // cut dirs are parallel, return same or notSame depending on if describe the same line
        if (typeof(checkIntersection(a, [b[0], b[1], 0, 0])) == "number") return 'same'; // b lies on a, they describe the same line
        return 'notSame'; // b does not lie on a, they do not describe the same line

        // hopefully no hanclaps but there could be some abuse with regards to notes next to each other so you cannot get a full swing for both
        // maybe something to look into in the future?
    } 

    else { // both notes have different & non-zero directions
        let topA = (b[2] * (a[1] - b[1])) - (b[3] * (a[0] - b[0])); // calculating intersection point of lines using maths ugh
        let topB = (a[2] * (a[1] - b[1])) - (a[3] * (a[0] - b[0]));
        let bottom = (b[3] * a[2]) - (b[2] * a[3]);

        if (bottom == 0) { // same line but flipped (eg > < or < >): find the vertical and horizontal distances and compare to cut dirs to see if claps could occur
            return checkColinear(a, [b[0], b[1]])[1];      
        }

        if (Math.sign(topA/bottom) == -1 || Math.sign(topB/bottom) == -1) { // the intersection happens in the pre-swing to both: i want to make these collisions less sensitive
            return -1 * Math.max(Math.abs(topA / bottom), Math.abs(topB / bottom));
        }
        return Math.max(Math.abs(topA / bottom), Math.abs(topB / bottom));
    }
}

function checkColinear(line, dot) { // checks whether a dot lies on a line, and returns the mean squared distance if that is the case
    let dX = (dot[0] - line[0])/(2 * line[2]); // dX is the horizontal distance between the notes divided by twice the horizontal cut component of the swing
    let dY = (dot[1] - line[1])/(2 * line[3]); // the square of x/y direction components sums to one, so this just normalises the 45deg stuff for less swinging in each dir for full points
    
    if (Math.abs(dX) == Infinity || Math.abs(dY) == Infinity) { return [false, 'no']; } // if d(A) is infinity, there is distance but no direction in d(A) so no clap would be expected

    if (isNaN(dY) && !isNaN(dX)) return [true, Math.abs(dX)]; // if d(A) is NaN, both distance and direction are zero (eg deltaY in a |>| |<| handclap) so return the other value
    if (isNaN(dX) && !isNaN(dY)) return [true, Math.abs(dY)]; // if both are NaN, the notes are both dots and also overlap which i am not handling here
    
    if (Math.sign(dX) == -1 || Math.sign(dX) == -1) { // the intersection happens in the pre-swing to both: i want to make these collisions less sensitive
        return [true, -Math.sqrt(Math.pow(dX, 2) + Math.pow(dY, 2))];
    }
    return [true, Math.sqrt(Math.pow(dX, 2) + Math.pow(dY, 2))];
}