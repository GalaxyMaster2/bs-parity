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

var difficultyString;
var sliderPrecision = Infinity;
var ready = false;

const fileInput = document.getElementById('file-input');
const sliderPrecisionInput = document.getElementById('slider-precision');
const submit = document.getElementById('submit');

fileInput.addEventListener('change', readFile);
sliderPrecisionInput.addEventListener('change', readSliderPrecision);
submit.addEventListener('click', main);

function readFile() {
    ready = false;
    let fr = new FileReader();
    fr.readAsText(fileInput.files[0]);
    fr.addEventListener('load', function () {
        difficultyString = fr.result;
        ready = true;
    });
}

function readSliderPrecision() {
    sliderPrecision = parseInt(sliderPrecisionInput.value) || Infinity;
}

function getDifficultyObject() {
    return JSON.parse(difficultyString);
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
        console.log('Bomb at beat ' + time + ' -- ' + column + ' -- ' + row);
    } else {
        console.log('Note at beat ' + time + ' -- ' + type + ' -- ' + cutDirection + ' -- ' + column + ' -- ' + row + ' -- ' + parity[type]);
    }
}

function main() {
    if (!ready) {
        console.log('not ready');
        return;
    }

    let notes = getNotes(getDifficultyObject());

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
            let logBomb = false;
            for (let color in setParity) {
                if (setParity[color]) {
                    if (row === 'bottom' && parity[color] === 'backhand') {
                        logBomb = true;
                        parity.invert(color);
                    }
                    if (row === 'top' && parity[color] === 'forehand') {
                        logBomb = true;
                        parity.invert(color);
                    }
                }
            }
            if (logBomb) {
                logNote(note, parity);
                for (let color in setParity) {
                    console.log(color + ' parity is now ' + parity[color]);
                }
            }
        } else {
            if (cuts[type].good[parity[type]].includes(cutDirection)) {
                parity.invert(type);
            } else if (cuts[type].borderline[parity[type]].includes(cutDirection)) {
                logNote(note, parity);
                console.log('borderline');
                parity.invert(type);
            } else {
                logNote(note, parity);
                console.log('bad, assuming wrist reset');
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
}
