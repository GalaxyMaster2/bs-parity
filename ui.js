// ui.js:
//  handles fancy ui elements and interactive inputs including but
//  not limited to drag-drop file imports, sliders and toggles, and
//  file handling

// todo: feature detection for drag and drop?
//  although tbf the overlap between transform 3d and drag/drop is probably pretty big

console.log('ui js loaded');
var file = null;

const bezierLut_old = [0, 0.0072564057811261105, 0.016502234897185466, 0.027936819176243296, 0.04178781400927524, 0.05831534448530133, 0.07781612851976319, 0.10062685254912386, 0.12712533983044808, 0.15772673158123052, 0.1928696520040952, 0.232983827059035, 0.2784261318503915, 0.3293690107687303, 0.3856314611255836, 0.4464733735454691, 0.5104391465906857, 0.5753995419474659, 0.638893517804059, 0.6986623556222522, 0.7530880701591078, 0.8013320046700174, 0.8432099794198935, 0.8789652874242738, 0.9090634268717853, 0.9340518341238436, 0.9544795406023789, 0.9708577903565768, 0.9836446524208822, 0.9932422576751736, 1];
const bezierLut = [0, 0.01644358864383059, 0.03503534699700188, 0.05598035758796653, 0.07950836213565632, 0.10587498337946702, 0.13536109092951693, 0.16826851449178193, 0.2049090562734064, 0.24558189140422804, 0.2905320875754143, 0.33988112525103314, 0.3935221089312413, 0.4509844271541633, 0.5113026054570521, 0.5729668989695741, 0.6340485747232117, 0.6925207121247794, 0.7466524851413876, 0.7952832782345066, 0.8378757119787953, 0.8743968888860167, 0.9051396737791836, 0.9305647696585208, 0.9511917571122064, 0.9675354406953123, 0.9800739805820939, 0.9892362308203032, 0.9953995086370173, 0.998892454767435, 1];
// lut_old is the same transition used in css, it looks a litte strange slow so i have made an alternate

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
const dvSlide = document.getElementById('divisionValue');

fileInput.addEventListener('change', handleFileInput);
sliderPrecisionInput.addEventListener('change', readSliderPrecision);
// submit.addEventListener('click', checkParity);

themeBut.addEventListener('click', changeTheme);
warn.addEventListener('click', function() { document.getElementById('output').classList.toggle('warning'); });
err.addEventListener('click', function()  { document.getElementById('output').classList.toggle('error');   });
inf.addEventListener('click', function()  { document.getElementById('output').classList.toggle('info');    });

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
dvSlide.addEventListener('input', function () {
    divisionValue = parseFloat(dvSlide.value);
    render(notesArray, centerBeat);
});

function changeTheme() {
    let body = document.getElementsByTagName('body');
    let current = (body[0].classList[0] === 'dark');
    body[0].classList.remove(current ? 'dark' : 'light');
    body[0].classList.add(current ? 'light' : 'dark');
}

function highlightErr(target) {
    if (document.getElementsByClassName('selected').length != 0) {
        document.getElementsByClassName('selected')[0].classList.remove('selected');
    }

    target.classList.add('selected')
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
        checkParity();
    });
}

function readSliderPrecision() {
    sliderPrecision = parseInt(sliderPrecisionInput.value) || Infinity;
    checkParity();
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
