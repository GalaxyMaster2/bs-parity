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
const urlInput = document.getElementById('url');

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
urlInput.addEventListener('keyup', function(event) {
    if (event.key == 'Enter') {
        readUrl();
    }
});

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
var zipFile = false;
var datFiles = {};
var infoDat;
var file = null;

function handleDrop(e) {
    let dt = e.dataTransfer;
    let file = dt.files[0];
    if (files.name.substr(-3) == 'dat') {
        readFile(file);
    } else {
        readZip(file);
    }
}

/**
 * detects files uploaded to the page
 * @param {*} e - a change event, this should probably be changed to something else at some point because it can cause issues if no files are uploaded
 */
function handleFileInput(e) {
    let file = this.files[0];
    if (file.name.substr(-3) == 'dat') {
        readFile(file);
    } else {
        readZip(file);
    }
}

/**
 * parses json files and extracts notes from them
 * @param {Object} file - uploaded file (is it an object?)
 * @returns {void} - will lead to parity/render calls
 */
function readFile(file) {
    ready = false;
    introDiv.classList.add('uploading');
    const fr = new FileReader();
    fr.readAsText(file);
    fr.addEventListener('loadend', function () {
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

async function readUrl() {
    let _url = urlInput.value;
    console.log(_url);
    const validurl = new RegExp('^(https?:\\/\\/)?'+ // protocol
                                '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
                                '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
                                '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
                                '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
                                '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
    const validhex = new RegExp('\/[0-9A-Fa-f]{*}\/g'); // string only made of 0-9, a-f and A-F

    if (!validurl.test(_url)) return -3;
    if (_url == '') return -2;

    if (_url.includes('beatsaver.com/beatmap/') || _url.includes('bsaber.com/songs/')) {
        let songID = _url.match(/([^\/]*)\/*$/)[1]; // extract last part of url, for some reason this doesn't like quotes
        console.log(songID);
        if (!validhex.test(songID)) return -1; // key must be valid hex
        _url = 'https://beatsaver.com/api/download/key/' + songID;
    }

    _url = 'https://cors-anywhere.herokuapp.com/' + _url; // fixes cors headers on most urls
    console.log(_url);

    introDiv.classList.add('uploading');

    JSZipUtils.getBinaryContent(_url, function(err, data) { 
        if (err) { throw err; }
        else {
            extractZip(data);
        }
    });
}

function readZip(file) {
    introDiv.classList.add('uploading');
    const fr = new FileReader();

    fr.readAsArrayBuffer(file);
    fr.addEventListener('loadend', function () {
        extractZip(fr.result);
    });
}

var audio;

async function extractZip(data) {
    ready = false;
    zipFile = true;
    let zip = new JSZip();

    zip.loadAsync(data).then(function (unzipped) {
        for (filename in unzipped.files) {
            if (filename.substr(-3) == 'dat') {
                if (filename == 'info.dat' || filename == 'Info.dat') {
                    zip.file(filename).async('text')
                    .then( function (content) {
                        infoDat = JSON.parse(content);
                        bpm = infoDat._beatsPerMinute;
                    });
                }
                else {
                    let name = filename; // async hates me but i think this works
                    zip.file(filename).async('text')
                    .then(function (content) {
                        let parsed = JSON.parse(fr.result);
                        datFiles[name] = [getNotes(parsed), getWalls(parsed)];
                    });
                }
            } else if (filename.substr(-3) == 'egg' || filename.substr(-3) == 'ogg') {
                zip.file(filename).async('blob')
                .then(function (content) {
                    audio = new Audio(window.URL.createObjectURL(content));
                    audio.preload = true
                });
            } 
        }
    });

    await until(_ => Object.keys(datFiles).length != 0, 250); // ie9 doesn't like this but does it really like anything?

    introDiv.classList.remove('uploading');
    introDiv.classList.add('done');

    let fileSelector = document.getElementById('fileSelector');
    fileSelector.removeChild(fileSelector.firstChild);

    let select = document.createElement('select');

    let count = 0;
    for (var key in datFiles) {
        count++;
        let item = document.createElement('option');
        item.value = key;
        item.append(key.slice(0, -4));
        select.append(item);
    };

    select.lastChild.selected = true;

    select.addEventListener('change', function() {
        let select = document.getElementsByTagName('select')[0];
        notesArray = datFiles[select.value][0];
        wallsArray = datFiles[select.value][1];
        getInfo(select.value);
        clear(notesContainer); // avoids errors with selective renderer
        clear(wallsContainer);
        recycledNotes = [];
        recycledWalls = [];
        render(notesArray);
        checkParity();
    });

    if (count > 1) fileSelector.append(select);

    let playback = document.createElement('span');
    playback.append(' \u25B6');

    playback.addEventListener('click', function() {
        if (audio.paused) {
            audio.currentTime = centerBeat * 60 / bpm;
            audio.play(); 
            playback.setAttribute('style', 'color:#00ee55');
            syncPlayback();
        }
        else { 
            audio.pause(); 
            playback.removeAttribute('style')
        }
    });

    fileSelector.append(playback);

    notesArray = datFiles[key][0];
    wallsArray = datFiles[key][1];
    centerBeat = 0;
    
    ready = true;
    
    getInfo(key);
    checkParity();
    render();
}

/**
 * adds highlight tags to errors at the given time, in 3dp for float comparison reasons
 * does some fancy logic to ensure that they make a nice block if multiple selected
 * @param {Number} time - the (float) time at which to round & highlight
 * @returns {void} - outputs to DOM
 */
function highlightElements(time) {
    let timeInd = time.toFixed(3);

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
