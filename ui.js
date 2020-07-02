// ui.js:
//  handles fancy ui elements and interactive inputs including but
//  not limited to drag-drop file imports, sliders and toggles, and
//  file handling

console.log('ui js loaded');
var file = null;

const bezierLut_old = [0, 0.0072564057811261105, 0.016502234897185466, 0.027936819176243296, 0.04178781400927524, 0.05831534448530133, 0.07781612851976319, 0.10062685254912386, 0.12712533983044808, 0.15772673158123052, 0.1928696520040952, 0.232983827059035, 0.2784261318503915, 0.3293690107687303, 0.3856314611255836, 0.4464733735454691, 0.5104391465906857, 0.5753995419474659, 0.638893517804059, 0.6986623556222522, 0.7530880701591078, 0.8013320046700174, 0.8432099794198935, 0.8789652874242738, 0.9090634268717853, 0.9340518341238436, 0.9544795406023789, 0.9708577903565768, 0.9836446524208822, 0.9932422576751736, 1];
const bezierLut = [0, 0.01644358864383059, 0.03503534699700188, 0.05598035758796653, 0.07950836213565632, 0.10587498337946702, 0.13536109092951693, 0.16826851449178193, 0.2049090562734064, 0.24558189140422804, 0.2905320875754143, 0.33988112525103314, 0.3935221089312413, 0.4509844271541633, 0.5113026054570521, 0.5729668989695741, 0.6340485747232117, 0.6925207121247794, 0.7466524851413876, 0.7952832782345066, 0.8378757119787953, 0.8743968888860167, 0.9051396737791836, 0.9305647696585208, 0.9511917571122064, 0.9675354406953123, 0.9800739805820939, 0.9892362308203032, 0.9953995086370173, 0.998892454767435, 1];
// lut_old is the same transition used in css, it looks a litte strange slow so i have made an alternate

/*
    generated using pomax.github.io/bezierjs/ in chrome dev console:
        let curve = new Bezier(0,0, 0.58,0.11, 0.51,0.92, 1,1);
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

const renderContainer = document.getElementById('render-container');
const gridContainer = document.getElementById('grid-container');
const output = document.getElementById('output');

const sliderPrecisionInput = document.getElementById('slider-precision');
const fileInput = document.getElementById('file');

const dropArea = document.getElementById('drag-file');
const introDiv = document.getElementById('intro');
const themeBut = document.getElementById('theme');

const warn = document.getElementById('warnings');
const err = document.getElementById('errors');
const inf = document.getElementById('info');

const piSlide = document.getElementById('perspectiveIntensity');
const rdSlide = document.getElementById('renderDistance');
const dvSlide = document.getElementById('divisionValue');
const tsSlide = document.getElementById('timeScale');

warn.addEventListener('click', function () { output.classList.toggle('warning'); });
err.addEventListener('click', function () { output.classList.toggle('error'); });
inf.addEventListener('click', function () { output.classList.toggle('info'); });

sliderPrecisionInput.addEventListener('change', readSliderPrecision);
renderContainer.addEventListener('mousedown', handleMouseDown);
fileInput.addEventListener('change', handleFileInput);
dropArea.addEventListener('drop', handleDrop, false);
themeBut.addEventListener('click', changeTheme);

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});
['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, function() {
        dropArea.classList.add('highlight');
    }, false);
});
['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, function() {
        dropArea.classList.remove('highlight');
    }, false);
});

rdSlide.addEventListener('input', function () {
    renderDistance = parseFloat(rdSlide.value);
    render(notesArray);
});
tsSlide.addEventListener('input', function () {
    timeScale = parseFloat(tsSlide.value);
    render(notesArray);
});
piSlide.addEventListener('input', function () {
    perspectiveMultiplier = parseFloat(piSlide.value);
    render(notesArray);
});
dvSlide.addEventListener('input', function () {
    divisionValue = parseFloat(dvSlide.value);
    render(notesArray);
});

function changeTheme() {
    let body = document.getElementsByTagName('body')[0];
    body.classList.toggle('dark');
    body.classList.toggle('light');
}

// fancy click handler based off of https://jsfiddle.net/KyleMit/1jr12rd3/
// converted to pure js from jquery and added up/down handlers
// should this be in ui or render?
var mouseHandle = false;

var cursorX = -1;
var cursorY = 0;

async function handleMouseDown(e) {
    if (mouseHandle == true) { return; }
    if (e.which == 3) {
        mouseHandle = true;
        cursorX = -1;

        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('contextmenu', preventDefaults, { once: true });
        document.addEventListener('mousemove', getMousePos);

        let initialRotX = angleX;
        let initialRotY = angleY;

        renderContainer.classList.add('rotating');

        await until(_ => cursorX != -1);
        let initialX = cursorX;
        let initialY = cursorY;

        while (mouseHandle == true) {
            await new Promise(r => setTimeout(r, 1000 / 30));
            mouseRotate(initialRotY + 0.5 * (cursorX - initialX), initialRotX + -0.5 * (cursorY - initialY));
        }
    }
    if (e.which === 2) {
        mouseHandle = true;
        cursorX = -1;

        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('mousemove', getMousePos);

        renderContainer.classList.add('scrolling');

        await until(_ => cursorX != -1);
        initialY = cursorY;

        while (mouseHandle == true) {
            await new Promise(r => setTimeout(r, 1000 / 30));
            scrollDelta((initialY - cursorY) / 300);
        }
    }
}
function handleMouseUp(e) {
    e.preventDefault();
    e.stopPropagation();

    mouseHandle = false;

    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('mousemove', getMousePos);
    if (e.which == 3) {
        renderContainer.classList.remove('rotating');
    }
    if (e.which == 2) {
        renderContainer.classList.remove('scrolling');
    }
}
function getMousePos(e) {
    cursorX = e.clientX;
    cursorY = e.clientY;
}

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
        render(notesArray);
        checkParity();
    });
}

function readSliderPrecision() {
    sliderPrecision = 1 / parseInt(sliderPrecisionInput.value) || 0;
    checkParity();
}

function highlightElements(time) {
    let timeInd = time.toFixed(3);

    document.querySelectorAll('.selected').forEach(
        (element) => { element.classList.remove('selected') }
    )
    document.querySelectorAll('.partialSelected').forEach(
        (element) => { element.classList.remove('partialSelected') }
    )

    document.querySelectorAll('[data-time="' + timeInd + '"]').forEach(
        (element) => { element.classList.add('selected'); }
    )
    document.querySelectorAll('[data-time2="' + timeInd + '"]').forEach(
        (element) => { element.classList.add('partialSelected'); }
    )
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

// used to detect the scroll line height in FireFox
// graciously provided by StackOverflow: https://stackoverflow.com/a/57788612
function getScrollLineHeight() {
    const el = document.createElement('div');
    el.style.fontSize = 'initial';
    el.style.display = 'none';
    document.body.appendChild(el);
    const fontSize = window.getComputedStyle(el).fontSize;
    document.body.removeChild(el);
    return fontSize ? window.parseInt(fontSize) : 16;
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function until(condition) {
    const poll = resolve => {
        if (condition()) resolve();
        else setTimeout(_ => poll(resolve), 67);
    }

    return new Promise(poll);
}