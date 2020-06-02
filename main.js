// TODO:
// - implement zip extraction?

const cutDirections = ['up', 'down', 'left', 'right', 'upLeft', 'upRight', 'downLeft', 'downRight', 'dot'];
const types = ['red', 'blue'];

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

        if (firstRed && cuts.red.good.forehand.indexOf(cutDirections[firstRed._cutDirection]) != -1) {
            this.red = 'forehand';
        } else {
            this.red = 'backhand';
        }

        if (firstBlue && cuts.blue.good.forehand.indexOf(cutDirections[firstBlue._cutDirection]) != -1) {
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

    // filter out bombs and invalid note types
    notes = notes.filter(function (note) {
        return (note._type === 0 || note._type === 1);
    })
    return notes;
}

function logNote(note, parity) {
    console.log('Note at beat ' + note._time + ' -- ' + types[note._type] + ' -- ' +
        cutDirections[note._cutDirection] + ' -- ' + parity);
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
        if (cuts[types[notes[i]._type]].good[parity[types[notes[i]._type]]].indexOf(cutDirections[notes[i]._cutDirection]) != -1) {
            parity.invert(types[notes[i]._type]);
        } else if (cuts[types[notes[i]._type]].borderline[parity[types[notes[i]._type]]].indexOf(cutDirections[notes[i]._cutDirection]) != -1) {
            logNote(notes[i], parity[types[notes[i]._type]]);
            console.log('borderline');
            parity.invert(types[notes[i]._type]);
        } else {
            logNote(notes[i], parity[types[notes[i]._type]]);
            console.log('bad, assuming wrist reset');
        }

        // invert parity again if there's a same-color note within sliderPrecision
        let offset = 1;
        while (((i + offset) < notes.length) &&
            (parseFloat((notes[i + offset]._time - notes[i]._time).toFixed(10)) <= parseFloat((1 / sliderPrecision).toFixed(10)))) {
            if (notes[i]._type === notes[i + offset]._type) {
                parity.invert(types[notes[i]._type]);
                break;
            }
            offset++;
        }
    }
}
