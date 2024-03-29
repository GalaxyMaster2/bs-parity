// ui.js:
//  handles fancy ui elements and interactive inputs including but
//  not limited to drag-drop file imports, sliders and toggles, and
//  file handling

console.log('ui js loaded');

const topbar = document.getElementById('topbar');
const pageTitle = document.getElementById('title');
const themeToggle = document.getElementById('theme');

const loadError = document.getElementById('load-error-text');
const closeError = document.getElementById('close-error');

const renderContainer = document.getElementById('render-container');
const markerContainer = document.getElementById('marker-container');
const notesContainer = document.getElementById('note-container');
const wallsContainer = document.getElementById('wall-container');
const gridContainer = document.getElementById('grid-container');
const output = document.getElementById('output');

const diffSelect = document.getElementById('diff-select');
const sliderPrecisionInput = document.getElementById('slider-precision');
const fileInput = document.getElementById('file');
const urlInput = document.getElementById('url');

const dropArea = document.getElementById('drop-overlay');
const introDiv = document.getElementById('intro');
const downloadProgress = document.getElementById('download-progress');

const bookmarksToggle = document.getElementById('bookmarks');
const warningToggle = document.getElementById('warnings');
const errorToggle = document.getElementById('errors');
const statsToggle = document.getElementById('stats');
const infoToggle = document.getElementById('info');

const perspectiveSlider = document.getElementById('perspectiveIntensity');
const renderDistanceSlider = document.getElementById('renderDistance');
const divisionValueSlider = document.getElementById('divisionValue');
const timeScaleSlider = document.getElementById('timeScale');

const wallsToggle = document.getElementById('toggleWalls');
const playbackToggle = document.getElementById('playback');

fileInput.addEventListener('change', handleFileInput);
dropArea.addEventListener('drop', handleDrop, false);

document.addEventListener('dragenter', function () { dropArea.classList.add('visible'); });

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});
['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, function () { dropArea.classList.remove('visible'); }, false);
});

urlInput.addEventListener('keydown', function (event) {
    if (event.key == 'Enter') {
        parseUrlInput(urlInput.value);
    }
});

/**
 * parses and validates a given string as either a url or beatsaver key and downloads the map if the input is valid
 * @param {String} input - user input entered in the url input box
 */
function parseUrlInput(input) {
    let result = validateMapKey(input); // try validating map key

    if (typeof result === 'string') {
        downloadFromKey(result); // valid key
    } else {
        result = validateUrl(input); // try validating url

        if (typeof result === 'string') {
            downloadFromUrl(result); // valid url
            setUrlParam('url', result);
        }

        if (result === -3) {
            // url is link to beatsaver map
            input = input.match(/([^\/]*)\/*$/)[1]; // extract beatsaver key
            result = validateMapKey(input);
            if (typeof result === 'string') {
                downloadFromKey(result);
            }
        }
    }
}

/**
 * resets enviroment back to default state to prepare for new file to be loaded in
 */
function resetUI() {
    while (playbackToggle.lastChild) {
        playbackToggle.removeChild(playbackToggle.lastChild);
    }
    notesArray = undefined;
    wallsArray = undefined;
    bookmarksArray = undefined;
    mapDifficultySets = undefined;
    songFilename = undefined;
    sliderPrecision = 1 / 8;
    if (audio !== undefined && !audio.paused) {
        audio.pause();
    }
    audio = undefined;
    duration = undefined;
}

/**
 * detects files dropped on start page and changes type so it can be read the same as an uploaded file
 * drop handler based off of bit.ly/37mgISu and mzl.la/2UAdYvA
 * todo: feature detection for drag and drop? (although tbf the overlap between transform 3d and drag/drop is probably pretty big)
 * @param {*} e - a drop event
 */
function handleDrop(e) {
    let dt = e.dataTransfer;
    let files = dt.files;
    if (ready == true) { // file has already been loaded
        scrollTo(0);
        resetUI();
    }
    if (files.length != 0) {
        readFile(files);
    } else {
        parseUrlInput(dt.getData('Text'));
    }
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
    setIntroDivStatus('uploading');
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
        fr.addEventListener('load', function (e) {
            extractZip(e.target.result);
        });
    } else {
        // an unsupported file was selected
        displayLoadError('unsupported file format');
    }
}

/**
 * if beatsaver id or zip url in query, load the file
 */
function readQuery() {
    let urlParams = new URLSearchParams(window.location.search);
    let id;

    if (urlParams.has('url')) {
        let url = urlParams.get('url');
        let result = validateUrl(url);
        switch (result) {
            case -1:
                displayLoadError('url input is empty');
                return;
            case -2:
                displayLoadError('invalid url');
                return;
            case -3:
                id = url.match(/([^\/]*)\/*$/)[1];
                break;
            default:
                urlInput.value = result;
                return;
        }
    }

    if (urlParams.has('id')) {
        id = urlParams.get('id');
    }

    if (id !== undefined) {
        let result = validateMapKey(id);
        switch (result) {
            case -1:
                displayLoadError('beatsaver key input is empty');
                break;
            case -2:
                displayLoadError('invalid beatsaver key');
                break;
            default:
                urlInput.value = result;
                break;
        }
    }
}
readQuery();

/**
 * attempts to download a map from beatsaver with the given key
 * @param {String} key - a beatsaver key of a map to download
 */
async function downloadFromKey(key) {
    console.log('downloading map #' + key);
    let apiUrl = 'https://api.beatsaver.com/maps/id/' + key;

    setIntroDivStatus('downloading');

    let response = await fetch(apiUrl);
    if (!response.ok) {
        let errorMessage = `unable to download map ${key} from beatsaver`;
        if (response.status === 404) {
            errorMessage = `map ${key} does not exist on beatsaver`;
        }
        displayLoadError(errorMessage);

        return;
    }
    let downloadUrl = (await response.json()).versions[0].downloadURL;

    try {
        let response = await download(downloadUrl);
        extractZip(response);
        setUrlParam('id', key);
    } catch (e) {
        console.error(e);
        let errorMessage = `unable to download map ${key} from beatsaver`;
        if (typeof e === 'string') {
            switch (e) {
                case 'response 404':
                    errorMessage = `map ${key} does not exist on beatsaver`;
                case 'connection timeout':
                    errorMessage = 'connection timeout';
            }
        }
        displayLoadError(errorMessage);
    }
}

/**
 * attempts to download a map from the given url
 * @param {String} url - a url from which to download a map
 */
async function downloadFromUrl(url) {
    console.log(`downloading map from url: ${url}`);
    const corsProxy = 'http://cors.bsmg.dev/';

    setIntroDivStatus('downloading');

    try {
        let response = await download(url);
        extractZip(response);
        return;
    } catch (e) {
        // AFAIK it's impossible to tell a CORS error apart from other network errors
        // so we have to try it either way
        console.warn(e);
        console.log('download failed, trying with CORS proxy');
    }

    try {
        let response = await download(corsProxy + url);
        extractZip(response);
        return;
    } catch (e) {
        console.error(e);
        let errorMessage = 'error downloading map, is the url correct? try manually uploading it instead';
        if (typeof e === 'string') {
            switch (e) {
                case 'response 404':
                    errorMessage = 'map zip at url does not exist (404)';
                case 'connection timeout':
                    errorMessage = 'connection timeout';
            }
        }
        displayLoadError(errorMessage);
    }
    return;
}

/**
 * downloads from the given url, returning a promise that resolves to an ArrayBuffer
 * @param {String} url - the url from which to download
 * @returns {Promise} - returns a promise that resolves to the fetched data as an ArrayBuffer, or rejects on error
 */
function download(url) {
    return new Promise(function (resolve, reject) {
        clearProgress();
        let xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.responseType = 'arraybuffer';
        xhr.timeout = 5000;
        let startTime = Date.now();
        xhr.addEventListener('progress', function (e) {
            xhr.timeout += Date.now() - startTime; // reset timeout on progress

            if (e.lengthComputable) {
                updateProgress(e.loaded, e.total);
            } else {
                updateProgress(e.loaded, 0);
            }
        });
        xhr.addEventListener('error', function () {
            reject('error downloading map');
        });
        xhr.addEventListener('timeout', function () {
            reject('connection timeout');
        });
        xhr.addEventListener('load', function () {
            if (xhr.status !== 200) {
                reject('response ' + xhr.status);
            } else {
                resolve(xhr.response);
            }
        });
        xhr.send();
    });
}

/**
 * sets the current search params to the given param and value, discarding everything else
 * @param {String} param - the url param to set
 * @param {String} value - the value to set it to
 */
function setUrlParam(param, value) {
    let params = new URLSearchParams();
    params.set(param, value);
    history.pushState(null, '', `?${params.toString()}`);
}

/**
 * updates the progress indicator with the given values
 * @param {Number} loaded - the amount of bytes downloaded so far
 * @param {Number} total - the total bytes being downloaded
 */
function updateProgress(loaded, total) {
    let loadedText = (loaded / 1024 / 1024).toFixed(1);
    let totalText = ((total === 0) ? '' : (' / ' + (total / 1024 / 1024).toFixed(1)));
    downloadProgress.textContent = ': ' + loadedText + totalText + ' MB';
}

/**
 * clears the progress indicator
 */
function clearProgress() {
    downloadProgress.textContent = '';
}

/**
 * validates a given url
 * @param {String} url - the url to be validated
 * @returns {String|Number} - a validated url or an error code
 */
function validateUrl(url) {
    const validurl = new RegExp('^(https?:\\/\\/)?' + // protocol
        '(([a-z\\d]([a-z\\d-]*[a-z\\d])?\\.)*([a-z\\d]([a-z\\d-]*[a-z\\d])?)|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator

    url = url.trim();

    if (url === '') {
        return -1; // url is empty
    }
    if (!validurl.test(url)) {
        return -2; // url is invalid
    }
    if (url.includes('beatsaver.com/maps/') || url.includes('bsaber.com/songs/')) {
        return -3; // should be downloaded using map key
    }

    return url;
}

/**
 * validates a given map id and returns a validated beatsaver key
 * @param {String} id - a map id to be validated
 * @returns {String|Number} - a validated beatsaver key or an error code
 */
function validateMapKey(id) {
    const validhex = /^[0-9a-fA-F]+$/; // non-empty string only made of 0-9, a-f and A-F

    id = id.trim().replace(/^(!bsr\s+)/, ''); // remove !bsr prefix if it exists

    if (id === '') {
        return -1; // id is empty
    }
    if (!validhex.test(id)) {
        return -2; // id is invalid
    }

    return id.toLowerCase();
}

/**
 * extracts a map zip and attempts to load all present difficulties
 * @param {ProgressEvent} event - a load event
 */
async function extractZip(event) {
    let zip;
    try {
        zip = await JSZip.loadAsync(event);
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
                zip.file(songFilename).async('blob').then(createPlayback);
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
    setIntroDivStatus('error');
}

/**
 * creates a playback button and associated components
 * @param {*} audioBlob - unzipped audio file
 */
function createPlayback(audioBlob) {
    audio = new Audio(window.URL.createObjectURL(audioBlob));
    audio.preload = true;

    let playbackElement = document.createElement('span');
    playbackElement.innerHTML = ' \u25B6';

    function playbackToggleFunction() {
        if (audio.paused) {
            audio.currentTime = centerBeat * 60 / bpm;
            audio.play();
            highlightElements(-1); // un-highlight elements
            playbackElement.classList.add('playing');
            syncPlayback();
        }
        else {
            audio.pause();
            playbackElement.classList.remove('playing');
        }
    }

    playbackElement.addEventListener('click', playbackToggleFunction);
    playbackToggle.appendChild(playbackElement);

    audio.onloadedmetadata = function () {
        duration = audio.duration * bpm / 60;
    };
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
    songTitle = parsed._songName;
    if (songTitle != '' && songTitle !== undefined && songTitle !== null) {
        pageTitle.textContent = "beat saber map inspector - " + songTitle;
        document.getElementsByTagName('title')[0].textContent = 'map inspector - ' + songTitle;
    }
}

/**
 * gets the local time offset of the map and converts it to beats
 * @param {Object} songInfo - the parsed contents of a difficulty.dat file
 */
function getLocalOffset(songInfo) {
    try {
        songInfo = getSelectedDiff();
        localOffset = songInfo['_customData']._editorOffset;
        if (isNaN(localOffset)) {
            localOffset = 0;
        }
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
    bookmarksArray = getBookmarks(parsed);
    notesArray = getNotes(parsed);
    wallsArray = getWalls(parsed);
    bookmarks = getBookmarks(parsed);
    getLocalOffset();

    ready = true;
    centerBeat = 0;
    olaPosition = Ola(0);
    clearRenderedElements();
    checkParity();
    getStats();
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
        gap.textContent = '---------';
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
    setIntroDivStatus('done');
    topbar.classList.add('done');
    document.addEventListener('keydown', handleKeyDown);
    console.log('successful read!');

    // set properties after transition is over
    // for things that are not possible with pure CSS
    setTimeout(function () {
        introDiv.style.setProperty('display', 'none');
        topbar.style.setProperty('transition', 'none');
    }, 1000);
}

/**
 * sets the status of the intro screen
 * @param {String} [status] - (optional) the status to be set, should be one of 'uploading', 'downloading', 'error', 'done'
 */
function setIntroDivStatus(status) {
    introDiv.classList.remove('uploading', 'downloading', 'error');
    if (status) {
        introDiv.classList.add(status);
    }
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

    output.querySelectorAll('.selected').forEach(
        (element) => { element.classList.remove('selected', 'multiSelected', 'firstSelected', 'lastSelected'); }
    );

    let selector = '.showWarnings [data-time="' + timeInd + '"].warning, .showErrors [data-time="' + timeInd + '"].error, .showBookmarks [data-time="' + timeInd + '"].bookmark';
    let QScount = document.querySelectorAll(selector).length;
    let i = 0;

    output.querySelectorAll(selector).forEach(
        (element) => {
            if (QScount > 1) {
                element.classList.add('selected', 'multiSelected');
                if (i == 0) {
                    element.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('firstSelected');
                }
                if (i == QScount - 1) element.classList.add('lastSelected');
                i++;
            } else {
                element.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('selected');
            }
        }
    );
}

/**
 * checks for errors in parity within the notes
 * @param {Array} notePos - number of notes in a given position, separated by note type
 * @param {Array} noteRot - number of notes in a given rotation, separated by note type
 * @param {Array} noteTyp - number of notes, separated by note type
 * @returns {void} - outputs to DOM
 */
function printStats(notePos, noteRot, noteTyp) {
    const rotTransposeInv = [4, 0, 5, 2, 8, 3, 6, 1, 7];

    const blockType = ['all', 'red', 'blue', 'bomb'];
    const blockName = ['', 'red ', 'blue ', 'bomb'];
    const blockNameAppend = ['note', 'note', 'note', ''];
    const niceCutDirections = ['up', 'down', 'left', 'right', 'up-left', 'up-right', 'down-left', 'down-right', 'dot']; // while aB works well for class names it looks a bit off in text

    let out = document.getElementById('statsbox');
    for (let i = out.childNodes.length - 1; i >= 0; i--) { // empty current statsbox, if present
        out.removeChild(out.childNodes[i]);
    }

    // create top line
    let line = document.createElement('div');

    let label = document.createElement('span');
    label.append('block positioning');
    let label2 = document.createElement('span');
    label2.append('note rotation');

    line.append(label, label2);
    out.append(line);

    function createTile(count, blockTypeID, rotationMode = null) {
        let tile = document.createElement('span');
        tile.classList.add('tile');
        tile.classList.add(blockType[blockTypeID]); // determines tile colour
        let max = Math.max(...notePos[blockTypeID][0], ...notePos[blockTypeID][1], ...notePos[blockTypeID][2]); // get most common direction/rotation for colour reference 
        let opacity = (noteTyp[blockTypeID] == 0) ? 0.05 : (0.05 + 0.95 * Math.pow(count / max, 0.75)); // convert to percentages of largest value, capped 5% and up
        tile.style = '--opacity: ' + opacity + ';';
        let title = count + ' '; // mouseover text
        if (rotationMode != null) {
            title += blockName[blockTypeID];
            title += niceCutDirections[rotationMode];
            title += (count == 1) ? ' note' : ' notes';
        } else {
            title += blockName[blockTypeID] + blockNameAppend[blockTypeID];
            title += (count == 1) ? '' : 's';
            title += ' in this position';
        }

        if (noteTyp[blockTypeID] != 0) title += ' (' + (100 * count / noteTyp[blockTypeID]).toFixed(1) + '% of ' + blockName[blockTypeID] + blockNameAppend[blockTypeID] + 's)';
        tile.title = title;
        return tile;
    }

    // create additional elements to show statistics
    for (let i = 0; i < 3; i++) {
        let line = document.createElement('div');

        line.classList.add('line');

        for (let j = 0; j < 4; j++) { // position
            notePos[j][i].forEach(item => {
                line.append(createTile(item, j));
            });

            // template spacer
            let spacer = document.createElement('span');
            spacer.classList.add('tile', 'spacer');
            spacer.style = '--opacity: 0;';
            line.append(spacer);
        }

        for (let j = 0; j < 3; j++) { // rotation
            if (noteTyp[j] == 0) continue;

            let spacer = document.createElement('span');
            spacer.classList.add('tile', 'spacer');
            spacer.style = '--opacity: 0;';

            for (let k = 0; k < 3; k++) {
                direction = rotTransposeInv[3 * i + k]; // map bsaber positions to html positions
                line.append(createTile(noteRot[j][direction], j, direction));
            }
            line.append(spacer);
        }

        if (i == 0) { line.append('red:blue:'); } // note ratio
        else if (i == 1) { line.append((noteTyp[2] / noteTyp[1]).toFixed(2) + ":1"); }

        out.append(line);
    }
}

/*
 * adds a little animation when items get hidden or shown, limited to under 60 items for now for performance reasons
 * @param {Number} time - the (float) time at which to round & highlight
 * @returns {void} - outputs to DOM
 */
function setTransitionDelays(toChange = '', edge = true) {
    let query = '.parent.' + toChange;
    let visible = Array.from(output.querySelectorAll(query)); // convert nodelist to array so .includes can be used
    let count = visible.length;

    for (let i = 0; i < count; i++) { // you'd hope that there'd be a better way to iteratively assign transition delays in 2020 but no
        let delay = 0.5 * i / count;
        visible[i].style.transitionDelay = '0s, 0s, 0s, 0s, ' + (delay).toFixed(3) + 's, ' + delay.toFixed(3) + 's';
    }
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
    if (songTitle !== '') {
        pageTitle.textContent = easterEggTitles[Math.floor(Math.random() * easterEggTitles.length)] + " - " + songTitle;
    } else {
        pageTitle.textContent = easterEggTitles[Math.floor(Math.random() * easterEggTitles.length)];
    }
}

// read all toggles on page load
window.addEventListener('load', function () {
    readToggle(wallsToggle, gridContainer, 'showWalls');
    readToggle(warningToggle, output, 'showWarnings');
    readToggle(errorToggle, output, 'showErrors');
    readToggle(themeToggle, document.body, 'dark', 'light');
});
