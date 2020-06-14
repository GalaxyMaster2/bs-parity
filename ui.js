// ui.js:
//  handles fancy ui elements and interactive inputs including but
//  not limited to drag-drop file imports, sliders and toggles, and
//  file handling

// todo: feature detection for drag and drop?
//  although tbf the overlap between transform 3d and drag/drop is probably pretty big

// drop handler based off of bit.ly/37mgISu and mzl.la/2UAdYvA

console.log('ui js loaded');
var file = null;

const fileInput = document.getElementById('file');
const sliderPrecisionInput = document.getElementById('slider-precision');
const submit = document.getElementById('submit');

let dropArea = document.getElementById('drag-file');
let introDiv = document.getElementById('intro');
let themeBut = document.getElementById('theme');

let warn = document.getElementById('warnings');
let err = document.getElementById('errors');
let inf = document.getElementById('info');

let rdSlide = document.getElementById('renderDistance');
let tsSlide = document.getElementById('timeScale');
let piSlide = document.getElementById('perspectiveIntensity');

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
    timeScale = parseFloat(tsSlide.value)
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
    if (current) {
        out.classList.remove('warning');
    }
    else {
        out.classList.add('warning');
    }
}

function toggleErr() {
    let out = document.getElementById('output');
    let current = out.classList.contains('error');
    if (current) {
        out.classList.remove('error');
    }
    else {
        out.classList.add('error');
    }
}

function toggleInfo() {
    let out = document.getElementById('output');
    let current = out.classList.contains('info');
    if (current) {
        out.classList.remove('info');
    }
    else {
        out.classList.add('info');
    }
}

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
