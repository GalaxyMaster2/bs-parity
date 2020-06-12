// ui javascript

// todo: feature detection for drag and drop?
//       although tbf the overlap between transform 3d and drag/drop is probably pretty big

// drop handler based off of bit.ly/37mgISu and mzl.la/2UAdYvA

console.log("ui js loaded");
var file = null;

let dropArea = document.getElementById("drag-file");
let introDiv = document.getElementById("intro")

;['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
})

;['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
})

;['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
})

function highlight(e) {
    dropArea.classList.add('highlight');
}

function unhighlight(e) {
    dropArea.classList.remove('highlight');
}

dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
  let dt = e.dataTransfer;
  let files = dt.files;

  readDropFile(files); // in main.js
}

function preventDefaults (e) {
    e.preventDefault();
    e.stopPropagation();
}