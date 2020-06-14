// ui.js:
//  handles fancy ui elements and interactive inputs including but
//  not limited to drag-drop file imports, sliders and toggles, and
//  file handling

// todo: feature detection for drag and drop?
//  although tbf the overlap between transform 3d and drag/drop is probably pretty big

console.log('ui js loaded');
var file = null;

const bezierLut = [0, 0.0072564057811261105, 0.016502234897185466, 0.027936819176243296, 0.04178781400927524, 0.05831534448530133, 0.07781612851976319, 0.10062685254912386, 0.12712533983044808, 0.15772673158123052, 0.1928696520040952, 0.232983827059035, 0.2784261318503915, 0.3293690107687303, 0.3856314611255836, 0.4464733735454691, 0.5104391465906857, 0.5753995419474659, 0.638893517804059, 0.6986623556222522, 0.7530880701591078, 0.8013320046700174, 0.8432099794198935, 0.8789652874242738, 0.9090634268717853, 0.9340518341238436, 0.9544795406023789, 0.9708577903565768, 0.9836446524208822, 0.9932422576751736, 1];
/*
    generated using pomax.github.io/bezierjs/ in chrome dev console:
        let curve = new Bezier(0,0,0.58,0.11,0.51,0.92,1,1);
        let lut = curve.getLUT(30);
        let tvals = [];
        let bezierLut = [0];

        for (let i = 1; i < 31; i++) {
            var line = {p1:{x: i/30, y: 0}, p2: {x: i/30, y: 1}}
            tvals[i - 1] = curve.intersects(line)[0]
        }
        for (let i = 1; i <= 30; i++) {
            bezierLut[i] = curve.get(tvals[i])["y"];
        }
*/

const fileInput = document.getElementById('file');
const sliderPrecisionInput = document.getElementById('slider-precision');
const submit = document.getElementById('submit');

const dropArea = document.getElementById('drag-file');
const introDiv = document.getElementById('intro');
const themeBut = document.getElementById('theme');

const warn = document.getElementById('warnings');
const err = document.getElementById('errors');
const inf = document.getElementById('info');

const rdSlide = document.getElementById('renderDistance');
const tsSlide = document.getElementById('timeScale');
const piSlide = document.getElementById('perspectiveIntensity');

fileInput.addEventListener('change', handleFileInput);
sliderPrecisionInput.addEventListener('change', readSliderPrecision);
submit.addEventListener('click', checkParity);

themeBut.addEventListener('click', changeTheme);
warn.addEventListener('click', toggleWarn);
err.addEventListener('click', toggleErr);
inf.addEventListener('click', toggleInfo);

rdSlide.addEventListener('input', function () {
    renderDistance = parseFloat(rdSlide.value);
    render(notesArray, centerBeat);
});
tsSlide.addEventListener('input', function () {
    timeScale = parseFloat(tsSlide.value);
    render(notesArray, centerBeat);
});
piSlide.addEventListener('input', function () {
    perspectiveMultiplier = parseFloat(piSlide.value);
    render(notesArray, centerBeat);
});

function changeTheme() {
    let body = document.getElementsByTagName('body');
    let current = (body[0].classList[0] === 'dark');
    body[0].classList.remove(current ? 'dark' : 'light');
    body[0].classList.add(current ? 'light' : 'dark');
}

function toggleWarn() {
    let out = document.getElementById('output');
    let current = out.classList.contains('warning');
    if (current) { out.classList.remove('warning'); }
    else { out.classList.add('warning'); }
}

function toggleErr() {
    let out = document.getElementById('output');
    let current = out.classList.contains('error');
    if (current) { out.classList.remove('error'); }
    else { out.classList.add('error'); }
}

function toggleInfo() {
    let out = document.getElementById('output');
    let current = out.classList.contains('info');
    if (current) { out.classList.remove('info'); }
    else { out.classList.add('info'); }
}

// drop handler based off of bit.ly/37mgISu and mzl.la/2UAdYvA
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
});

dropArea.addEventListener('drop', handleDrop, false);

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    dropArea.classList.add('highlight');
}

function unhighlight(e) {
    dropArea.classList.remove('highlight');
}

function handleDrop(e) {
    let dt = e.dataTransfer;
    let files = dt.files;
    readFile(files);
}

function handleFileInput(e) {
    let files = this.files;
    readFile(files);
}

function readFile(files) {
    ready = false;
    const fr = new FileReader();
    introDiv.classList.add('uploading');
    fr.readAsText(files[0]);
    fr.addEventListener('load', function () {
        notesArray = getNotes(JSON.parse(fr.result));
        introDiv.classList.remove('uploading');
        introDiv.classList.add('done');
        console.log("successful read!");

        ready = true;
        render(notesArray, 0);
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
