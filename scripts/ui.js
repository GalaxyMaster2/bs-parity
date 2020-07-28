// ui.js:
//  handles fancy ui elements and interactive inputs including but
//  not limited to drag-drop file imports, sliders and toggles, and
//  file handling

console.log('ui js loaded');

const pageTitle = document.getElementById('title');

const renderContainer = document.getElementById('render-container');
const markerContainer = document.getElementById('marker-container');
const notesContainer = document.getElementById('note-container');
const wallsContainer = document.getElementById('wall-container');
const gridContainer = document.getElementById('grid-container');
const output = document.getElementById('output');

const sliderPrecisionInput = document.getElementById('slider-precision');
const fileInput = document.getElementById('file');

const dropArea = document.getElementById('drop-overlay');
const introDiv = document.getElementById('intro');
const themeToggle = document.getElementById('theme');

const warningToggle = document.getElementById('warnings');
const errorToggle = document.getElementById('errors');
const infoToggle = document.getElementById('info');

const perspectiveSlider = document.getElementById('perspectiveIntensity');
const renderDistanceSlider = document.getElementById('renderDistance');
const divisionValueSlider = document.getElementById('divisionValue');
const timeScaleSlider = document.getElementById('timeScale');

const wallsToggle = document.getElementById('toggleWalls');

fileInput.addEventListener('change', handleFileInput);
dropArea.addEventListener('drop', handleDrop, false);

document.addEventListener('dragenter', function () {
    dropArea.style.setProperty('pointer-events', 'auto');
    dropArea.style.setProperty('opacity', '0.3');
});

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});
['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, function () {
        dropArea.style.setProperty('pointer-events', 'none');
        dropArea.style.setProperty('opacity', '0');
    }, false);
});

/**
 * detects files dropped on start page and changes type so it can be read the same as an uploaded file
 * drop handler based off of bit.ly/37mgISu and mzl.la/2UAdYvA
 * todo: feature detection for drag and drop? (although tbf the overlap between transform 3d and drag/drop is probably pretty big)
 * @param {*} e - a drop event
 */
function handleDrop(e) {
    let dt = e.dataTransfer;
    let files = dt.files;
    readFile(files);
}

/**
 * detects files uploaded to the page
 * @param {*} e - a change event, this should probably be changed to something else at some point because it can cause issues if no files are uploaded
 */
function handleFileInput(e) {
    let files = this.files;
    readFile(files);
}

/**
 * parses json files and extracts notes from them
 * @param {Object} files - uploaded files (is it an object?)
 * @returns {void} - will lead to parity/render calls
 */
function readFile(files) {
    ready = false;
    introDiv.classList.add('uploading');
    const fr = new FileReader();
    fr.readAsText(files[0]);
    fr.addEventListener('load', function () {
        let parsed = JSON.parse(fr.result);
        notesArray = getNotes(parsed);
        wallsArray = getWalls(parsed);

        introDiv.classList.remove('uploading');
        introDiv.classList.add('done');
        console.log('successful read!');

        // disable the intro screen after animation
        // unfortunately this doesn't seem to be possible in pure CSS
        setTimeout(function () {
            introDiv.style.setProperty('display', 'none');
        }, 1000);

        ready = true;
        centerBeat = 0;
        olaPosition = Ola(0);
        checkParity();
        render();
    });
}

/**
 * adds highlight tags to errors at the given time, in 3dp for float comparison reasons
 * does some fancy logic to ensure that they make a nice block if multiple selected
 * @param {Number} time - the (float) time at which to round & highlight
 * @returns {void} - outputs to DOM
 */
function highlightElements(time) {
    timeInd = time.toFixed(3);

    document.querySelectorAll('.selected').forEach(
        (element) => { element.classList.remove('selected', 'multiSelected', 'firstSelected', 'lastSelected'); }
    );

    let selector = '.showWarnings [data-time="' + timeInd + '"].warning, .showErrors [data-time="' + timeInd + '"].error';
    let QScount = document.querySelectorAll(selector).length;
    let i = 0;

    document.querySelectorAll(selector).forEach(
        (element) => {
            if (QScount > 1) {
                element.classList.add('selected', 'multiSelected');
                if (i == 0) {
                    element.parentElement.scrollIntoView({ behavior: "smooth", block: "center" });
                    element.classList.add('firstSelected');
                }
                if (i == QScount - 1) element.classList.add('lastSelected');
                i++;
            } else {
                element.parentElement.scrollIntoView({ behavior: "smooth", block: "center" });
                element.classList.add('selected');
            }
        }
    );
}

pageTitle.addEventListener('click', randomizeTitle);

const easterEggTitles = [
    'adequately accurate atrocity auditor',
    'oopsie finder',
    'mildly mediocre map monitor',
    'ParityMaster',
    'somewhat successful slip-up scrutinizer',
    'uh-oh goner',
    'map de-crapifier',
    'just dont map mistakes smh my head',
    'software intended to detect and display blocks that are in positions which may be considered uncomfortable',
    'bad-bloq-buster',
    'practical parity parser',
    'cube contemplator',
    'cyan is a furry',
    'william gay',
    'GalaxyMaster\'s Error Blaster',
    'big-brain blunder buster'
];

function randomizeTitle() {
    pageTitle.textContent = easterEggTitles[Math.floor(Math.random() * easterEggTitles.length)];
}
