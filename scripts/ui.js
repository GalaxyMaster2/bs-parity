// ui.js:
//  handles fancy ui elements and interactive inputs including but
//  not limited to drag-drop file imports, sliders and toggles, and
//  file handling

console.log('ui js loaded');

const renderContainer = document.getElementById('render-container');
const gridContainer = document.getElementById('grid-container');
const output = document.getElementById('output');

const sliderPrecisionInput = document.getElementById('slider-precision');
const fileInput = document.getElementById('file');

const dropArea = document.getElementById('drag-file');
const introDiv = document.getElementById('intro');
const themeToggle = document.getElementById('theme');

const warningToggle = document.getElementById('warnings');
const errorToggle = document.getElementById('errors');
const infoToggle = document.getElementById('info');

const perspectiveSlider = document.getElementById('perspectiveIntensity');
const renderDistanceSlider = document.getElementById('renderDistance');
const divisionValueSlider = document.getElementById('divisionValue');
const timeScaleSlider = document.getElementById('timeScale');

fileInput.addEventListener('change', handleFileInput);
dropArea.addEventListener('drop', handleDrop, false);

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});
['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, function () {
        dropArea.classList.add('highlight');
    }, false);
});
['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, function () {
        dropArea.classList.remove('highlight');
    }, false);
});

// drop handler based off of bit.ly/37mgISu and mzl.la/2UAdYvA
// todo: feature detection for drag and drop?
//  although tbf the overlap between transform 3d and drag/drop is probably pretty big

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
    introDiv.classList.add('uploading');
    const fr = new FileReader();
    fr.readAsText(files[0]);
    fr.addEventListener('load', function () {
        notesArray = getNotes(JSON.parse(fr.result));
        introDiv.classList.remove('uploading');
        introDiv.classList.add('done');
        console.log('successful read!');

        ready = true;
        centerBeat = 0;
        olaPosition = Ola(0);
        render();
        checkParity();
    });
}

function highlightElements(time) {
    timeInd = time.toFixed(3);

    document.querySelectorAll('.selected').forEach(
        (element) => { element.classList.remove('selected', 'multiSelected', 'firstSelected', 'lastSelected'); }
    );

    let selector = '.showWarnings > [data-time="' + timeInd + '"].warning, .showErrors > [data-time="' + timeInd + '"].error';
    let QScount = document.querySelectorAll(selector).length;
    let i = 0;

    document.querySelectorAll(selector).forEach(
        (element) => {
            if (QScount > 1) {
                element.classList.add('selected', 'multiSelected');
                if (i == 0) element.classList.add('firstSelected');
                if (i == QScount - 1) element.classList.add('lastSelected');
                i++;
            } else {
                element.classList.add('selected');
            }
        }
    );
}
