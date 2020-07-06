// input.js:
//  handles all input from mouse and keyboard to ui buttons and sliders

console.log('input js loaded');

renderContainer.addEventListener('wheel', scroll);
renderContainer.addEventListener('mousedown', handleMouseDown);
document.addEventListener('keydown', handleKeyDown);

rdSlide.addEventListener('input', function () {
    renderDistance = parseFloat(rdSlide.value);
    render();
});
tsSlide.addEventListener('input', function () {
    timeScale = parseFloat(tsSlide.value);
    render();
});
piSlide.addEventListener('input', function () {
    perspectiveMultiplier = parseFloat(piSlide.value);
    render();
});
dvSlide.addEventListener('input', function () {
    divisionValue = parseFloat(dvSlide.value);
    render();
});

warn.addEventListener('click', function () { output.classList.toggle('showWarnings'); });
err.addEventListener('click', function () { output.classList.toggle('showErrors'); });

sliderPrecisionInput.addEventListener('change', readSliderPrecision);
themeBut.addEventListener('click', changeTheme);

function readSliderPrecision() {
    sliderPrecision = 1 / parseInt(sliderPrecisionInput.value) || 0;
    checkParity();
}

function changeTheme() {
    let body = document.getElementsByTagName('body')[0];
    body.classList.toggle('dark');
    body.classList.toggle('light');
}

// fancy click handler based off of https://jsfiddle.net/KyleMit/1jr12rd3/
// converted to pure js from jquery and added up/down handlers
var mouseHandle = false;
var cursorX = -1;
var cursorY = 0;

async function handleMouseDown(e) {
    if (mouseHandle == true) { return; }
    if (e.which == 3) {
        mouseHandle = true;

        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('contextmenu', preventDefaults, { once: true });
        document.addEventListener('mousemove', mouseRotate);

        renderContainer.classList.add('rotating');
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
            centerBeat = Math.max(0, centerBeat + (initialY - cursorY) / 300);
            highlightElements(centerBeat);
            render();
        }
    }
}

function handleMouseUp(e) {
    e.preventDefault();
    e.stopPropagation();

    mouseHandle = false;

    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('mousemove', mouseRotate);
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

function until(condition) {
    const poll = resolve => {
        if (condition()) resolve();
        else setTimeout(_ => poll(resolve), 67);
    }

    return new Promise(poll);
}

function handleKeyDown(event) {
    switch (event.key) {
        case 'w':
            angleX -= 10;
            break;
        case 'a':
            angleY += 10;
            break;
        case 's':
            angleX += 10;
            break;
        case 'd':
            angleY -= 10;
            break;
    }
    angleX = mod(angleX, 360);
    angleY = mod(angleY, 360);
    render();
}

function mouseRotate(e) {
    angleX = mod(angleX - e.movementY * 0.5, 360);
    angleY = mod(angleY + e.movementX * 0.5, 360);
    render();
}

function scroll(event) {
    event.preventDefault();
    delta = event.deltaY;
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
        delta *= scrollLineHeight;
    }
    centerBeat = Math.max(0, centerBeat + delta / -100);
    highlightElements(centerBeat);

    render();
}
