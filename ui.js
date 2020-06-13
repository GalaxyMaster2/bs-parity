// ui javascript

// todo: feature detection for drag and drop?
//       although tbf the overlap between transform 3d and drag/drop is probably pretty big

// drop handler based off of bit.ly/37mgISu and mzl.la/2UAdYvA

console.log('ui js loaded');
var file = null;

let dropArea = document.getElementById('drag-file');
let introDiv = document.getElementById('intro');
let themeBut = document.getElementById('theme');

let warn = document.getElementById('warnings');
let err = document.getElementById('errors');

let rdSlide = document.getElementById('renderDistance');
let tsSlide = document.getElementById('timeScale');
let piSlide = document.getElementById('perspectiveIntensity')

themeBut.addEventListener('click', changeTheme);
warn.addEventListener('click', toggleWarn);
err.addEventListener('click', toggleErr);

rdSlide.addEventListener('change', function () {
    renderDistance = parseFloat(rdSlide.value);
    render(notesArray, centerBeat);
});
tsSlide.addEventListener('change', function () {
    timeScale = parseFloat(tsSlide.value)
    render(notesArray, centerBeat);
});
piSlide.addEventListener('change', function () {
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

;['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
})
    ;['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    })
    ;['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    })

dropArea.addEventListener('drop', handleDrop, false);

function highlight(e) {
    dropArea.classList.add('highlight');
}

function unhighlight(e) {
    dropArea.classList.remove('highlight');
}


function handleDrop(e) {
    let dt = e.dataTransfer;
    let files = dt.files;

    readDropFile(files); // in main.js
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}
