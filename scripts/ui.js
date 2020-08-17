// ui.js:
//  handles fancy ui elements and interactive inputs including but
//  not limited to drag-drop file imports, sliders and toggles, and
//  file handling

console.log('ui js loaded');

const pageTitle = document.getElementById('title');

const loadError = document.getElementById('load-error-text');

const renderContainer = document.getElementById('render-container');
const markerContainer = document.getElementById('marker-container');
const notesContainer = document.getElementById('note-container');
const wallsContainer = document.getElementById('wall-container');
const gridContainer = document.getElementById('grid-container');
const output = document.getElementById('output');

const diffSelect = document.getElementById('diff-select');
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
const playbackToggle = document.getElementById('playback');

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
 * reads selected file and calls functions based on file extension
 * @param {Array} files - uploaded files
 * @returns {void} - will lead to parity/render calls
 */
function readFile(files) {
    introDiv.classList.add('uploading');
    let file = files[0];
    const fr = new FileReader();
    if (file.name.substr(-4) === '.dat') {
        fr.readAsText(file);
        fr.addEventListener('load', function () {
            try {
                loadDifficultyDat(fr.result);
            } catch (error) {
                displayLoadError('unable to load difficulty.dat file');
                console.error(error);
                return;
            }
            fileLoaded();
        });
    } else if (file.name.substr(-4) === '.zip') {
        fr.readAsArrayBuffer(file);
        fr.addEventListener('load', extractZip);
    } else {
        // an unsupported file was selected
        displayLoadError('unsupported file format');
    }
}

/**
 * extracts a map zip and attempts to load all present difficulties
 * @param {ProgressEvent} event - a load event
 */
async function extractZip(event) {
    let zip;
    try {
        zip = await JSZip.loadAsync(event.target.result);
    } catch (error) {
        displayLoadError('unable to extract zip file');
        console.error(error);
        return;
    }

    let infoFile = zip.file('Info.dat') || zip.file('info.dat');
    if (infoFile) {
        let mapInfo = await infoFile.async('string');
        loadMapInfo(mapInfo);

        // prune unavailable difficulties
        for (let i = mapDifficultySets.length - 1; i >= 0; i--) {
            let beatmaps = mapDifficultySets[i]._difficultyBeatmaps;

            for (let j = beatmaps.length - 1; j >= 0; j--) {
                let difficulty = beatmaps[j];
                let difficultyFile = zip.file(difficulty._beatmapFilename);
                if (difficultyFile) {
                    difficulty.mapString = await difficultyFile.async('string');
                } else {
                    // difficulty file doesn't exist
                    outputUI(false, -1, 'difficulty file ' + difficulty._beatmapFilename +
                        ' does not exist in zip|but is referenced in Info.dat', 'error', true);
                    beatmaps.splice(j, 1);
                }
            }

            // remove set if empty
            if (beatmaps.length === 0) {
                mapDifficultySets.splice(i, 1);
            }
        }

        if (mapDifficultySets.length > 0) {
            populateDiffSelect();
            loadDifficultyDat(getSelectedDiff().mapString);
            fileLoaded();
        } else {
            // no available difficulties
            displayLoadError('no difficulty files available to load');
        }

        if (songFilename != '') {
            try {
                zip.file(songFilename).async('blob').then(function (content) {
                    audio = new Audio(window.URL.createObjectURL(content));
                    audio.preload = true;

                    playbackToggle.append(' \u25B6');
                
                    playbackToggle.addEventListener('click', function() {
                        if (audio.paused) {
                            audio.currentTime = centerBeat * 60 / bpm;
                            audio.play(); 
                            highlightElements(-1); // un-highlight elements
                            playbackToggle.classList.add('playing');
                            syncPlayback();
                        }
                        else {
                            audio.pause(); 
                            playbackToggle.classList.remove('playing');
                        }
                    });

                    audio.onloadedmetadata = function () {
                        duration = audio.duration * bpm / 60;
                    }
                });
            } catch (error) {
                outputUI(false, -1, 'error loading song file, playback will not be available', 'error', true);
            }
        }
    } else {
        // no info.dat present
        displayLoadError('no Info.dat present in zip, cannot load map');
    }
}

/**
 * displays an error message in the intro screen
 * @param {String} message - the error message to display
 */
function displayLoadError(message) {
    loadError.textContent = message;
    introDiv.classList.remove('uploading');
    introDiv.classList.add('error');
}

/**
 * parses an Info.dat string and extracts the useful properties into global variables
 * @param {Object} datString - the parsed contents of an Info.dat file
 */
function loadMapInfo(datString) {
    let parsed = JSON.parse(datString);
    mapDifficultySets = parsed._difficultyBeatmapSets;
    globalOffset = parsed._songTimeOffset;
    songFilename = parsed._songFilename;
    bpm = parsed._beatsPerMinute;
    songTitle = ' - ' + parsed._songName;
    if (songTitle != ' - ') {
        pageTitle.textContent += songTitle;
        document.getElementsByTagName('title')[0].textContent = "map inspector" + songTitle;
    }
}

/**
 * gets the local time offset of the map and converts it to beats
 * @param {Object} songInfo - the parsed contents of a difficulty.dat file
 */
function getLocalOffset(songInfo) {
    try {
        songInfo = getSelectedDiff();
        localOffset = songInfo["_customData"]._editorOffset;
    } catch {
        localOffset = 0;
    } // not all files have this defined
    offset = -0.001 * (localOffset + globalOffset) * bpm / 60;
    if (Math.abs(notesArray[0] + offset) < comparisonTolerance) { // support for people who offset first note to 0 mark - makes it exact instead of floating point errors
        offset = notesArray[0];
    }
}

/**
 * parses and loads a difficulty.dat string
 * @param {Object} datString - the parsed contents of a difficulty.dat file
 */
function loadDifficultyDat(datString) {
    ready = false;
    let parsed = JSON.parse(datString);
    notesArray = getNotes(parsed);
    wallsArray = getWalls(parsed);
    getLocalOffset();

    ready = true;
    centerBeat = 0;
    olaPosition = Ola(0);
    clearRenderedElements();
    checkParity();
    render();
}

/**
 * populates the difficulty selection input with all difficulties in the active set
 */
function populateDiffSelect() {
    while (diffSelect.lastChild) {
        diffSelect.removeChild(diffSelect.lastChild);
    }

    for (let [index, set] of mapDifficultySets.entries()) {
        for (let [index2, difficulty] of set._difficultyBeatmaps.entries()) {
            let option = document.createElement('option');

            let diffName, setName = set._beatmapCharacteristicName.replace(/([A-Z])/g, ' $1').trim();
            if (difficulty._customData?._difficultyLabel) {
                diffName = difficulty._customData._difficultyLabel.trim();
            } else {
                diffName = difficulty._difficulty.replace(/([A-Z])/g, ' $1').trim();
            }

            option.textContent = setName + ' - ' + diffName;
            option.value = index + ' ' + index2;

            // select the last difficulty of the first set
            if (index === 0 && index2 === set._difficultyBeatmaps.length - 1) {
                option.selected = true;
            }

            diffSelect.appendChild(option);
        }
        let gap = document.createElement('option');
        gap.disabled = true;
        gap.textContent = "---------";
        diffSelect.appendChild(gap);
    }
    diffSelect.removeChild(diffSelect.lastChild); // remove trailing ----

    if (diffSelect.childElementCount > 1) {
        diffSelect.parentElement.classList.add('enabled');
    }

    // only style on Chromium-based browsers, excluding Opera
    if (!!window.chrome && !window.opr) {
        diffSelect.classList.add('style');
    }
}

/**
 * returns the currently selected difficulty
 * @param {HTMLSelectElement} input - the select element from which to read the selected difficulty
 * @returns {Object} - the currently selected difficulty
 */
function getSelectedDiff(input = diffSelect) {
    let arr = input.value.split(' ');
    return mapDifficultySets[arr[0]]._difficultyBeatmaps[arr[1]];
}

/**
 * triggers the transition to the main screen -
 * should be called when the selected files have been loaded successfully
 */
function fileLoaded() {
    introDiv.classList.remove('uploading');
    introDiv.classList.add('done');
    console.log('successful read!');

    // disable the intro screen after animation
    // unfortunately this doesn't seem to be possible in pure CSS
    setTimeout(function () {
        introDiv.style.setProperty('display', 'none');
    }, 1000);
}

function getRenderContainerHeight() {
    return renderContainer.offsetHeight;
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
    pageTitle.textContent = easterEggTitles[Math.floor(Math.random() * easterEggTitles.length)] + songTitle;
}
