// ui.js:
//  handles fancy ui elements and interactive inputs including but
//  not limited to drag-drop file imports, sliders and toggles, and
//  file handling

console.log('ui js loaded');

const renderContainer = document.getElementById('render-container');
const markerContainer = document.getElementById('marker-container');
const notesContainer = document.getElementById('note-container');
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
// zip handler from jsZip - https://bit.ly/3f0LpQn is a good reference
// todo: feature detection for drag and drop?
//  although tbf the overlap between transform 3d and drag/drop is probably pretty big
var zipFile = false;
var datFiles = {};
var infoDat;
var file = null;

function handleDrop(e) {
    let dt = e.dataTransfer;
    let file = dt.files[0];
    if (files.name.substr(-3) == "dat") {
        readFile(file);
    } else {
        readZip(file);
    }
}

function handleFileInput(e) {
    let file = this.files[0];
    if (file.name.substr(-3) == "dat") {
        readFile(file);
    } else {
        readZip(file);
    }
}

function readFile(file) {
    ready = false;
    introDiv.classList.add('uploading');
    const fr = new FileReader();
    fr.readAsText(file);
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

async function readZip(file) {
    ready = false;
    zipFile = true;
    introDiv.classList.add('uploading');
    let zip = new JSZip();
    const fr = new FileReader();
    fr.readAsArrayBuffer(file);

    fr.addEventListener('load', function () {
        zip.loadAsync(fr.result) // there is no semicolon here intentionally
        .then(function (unzipped) {
            for (filename in unzipped.files) {
                if (filename.substr(-3) == "dat") {
                    if (filename == "info.dat" || filename == "Info.dat") {
                        zip.file(filename).async("text")
                        .then( function (content) {
                            infoDat = JSON.parse(content);
                            bpm = infoDat._beatsPerMinute;
                        });
                    }
                    else {
                        let name = filename; // async hates me but i think this works
                        zip.file(filename).async("text")
                        .then(function (content) {
                            datFiles[name] = getNotes(JSON.parse(content));
                        });
                    }
                }
            }
        });
    });

    await until(_ => Object.keys(datFiles).length != 0); // ie9 doesn't like this but does it really like anything?

    introDiv.classList.remove('uploading');
    introDiv.classList.add('done');
    ready = true;

    let fileSelector = document.getElementById("fileSelector");
    fileSelector.removeChild(fileSelector.firstChild);

    let select = document.createElement("select");

    for (var key in datFiles) {
        let item = document.createElement("option");
        item.value = key;
        item.append(key.slice(0, -4));
        select.append(item);
    };

    select.lastChild.selected = true;

    select.addEventListener('change', function() {
        let select = document.getElementsByTagName("select")[0];
        notesArray = datFiles[select.value];
        getInfoDat(select.value);
        render(notesArray);
        checkParity();
    });
        
    fileSelector.append(select);

    notesArray = datFiles[key];
    centerBeat = 0;
    
    getInfo(key);
    checkParity();
    render();
}

function highlightElements(time) {
    let timeInd = time.toFixed(3);

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
