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
const urlInput = document.getElementById('url');

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
urlInput.addEventListener('focusout', readUrl);
urlInput.addEventListener('keyup', function(event) {
    console.log(event);
    if (event.key == 'Enter') {
        readUrl();
    }
});

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

async function readUrl() {
    const validurl = new RegExp('^(https?:\\/\\/)?'+ // protocol
                                '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
                                '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
                                '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
                                '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
                                '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
    if (!validurl.test(urlInput.value)) return;
    if (urlInput.value == '') return;

    let url = 'https://cors-anywhere.herokuapp.com/' + urlInput.value; // fixes cors headers on most urls

    introDiv.classList.add('uploading');

    JSZipUtils.getBinaryContent(url, async function(err, data) { 
        if (err) { throw err; }
        else {
            extractZip(data);
        }
    });
}

async function readZip(file) {
    introDiv.classList.add('uploading');
    const fr = new FileReader();
    fr.readAsArrayBuffer(file);

    fr.addEventListener('load', function () {
        extractZip(fr.result);
    });
}

async function extractZip(data) {
    ready = false;
    zipFile = true;
    let zip = new JSZip();

    zip.loadAsync(data).then(function (unzipped) {
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

    await until(_ => Object.keys(datFiles).length != 0); // ie9 doesn't like this but does it really like anything?

    introDiv.classList.remove('uploading');
    introDiv.classList.add('done');

    ready = true;

    let fileSelector = document.getElementById("fileSelector");
    fileSelector.removeChild(fileSelector.firstChild);

    let select = document.createElement("select");

    let count = 0;
    for (var key in datFiles) {
        count++;
        let item = document.createElement("option");
        item.value = key;
        item.append(key.slice(0, -4));
        select.append(item);
    };

    select.lastChild.selected = true;

    select.addEventListener('change', function() {
        let select = document.getElementsByTagName("select")[0];
        notesArray = datFiles[select.value];
        getInfo(select.value);
        while (notesContainer.childNodes.length != 0) {
            notesContainer.removeChild(notesContainer.childNodes[0]);
        } // clear to avoid errors with selective renderer
        render(notesArray);
        checkParity();
    });
        
    if (count > 1) fileSelector.append(select);

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
                if (i == 0) {
                    element.scrollIntoView({behavior: "smooth"});
                    element.classList.add('firstSelected');
                }
                if (i == QScount - 1) element.classList.add('lastSelected');
                i++;
            } else {
                element.scrollIntoView({behavior: "smooth"});
                element.classList.add('selected');
            }
        }
    );
}
