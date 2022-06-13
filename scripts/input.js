// input.js:
//  handles all input from mouse and keyboard to ui buttons and sliders

console.log('input js loaded');

closeError.addEventListener('click', function () {
    setIntroDivStatus();
});

renderContainer.addEventListener('wheel', scroll);
renderContainer.addEventListener('mousedown', handleMouseDown);

renderDistanceSlider.addEventListener('input', function () {
    renderDistance = parseFloat(renderDistanceSlider.value);
    renderDistanceSlider.setAttribute('title', parseFloat(renderDistanceSlider.value).toFixed(2) + ' beats');
    render();
});
timeScaleSlider.addEventListener('input', function () {
    timeScale = parseFloat(timeScaleSlider.value);
    timeScaleSlider.setAttribute('title', parseFloat(timeScaleSlider.value).toFixed(2) + 'x');
    render();
});
divisionValueSlider.addEventListener('input', function () {
    divisionValue = parseFloat(divisionValueSlider.value);
    divisionValueSlider.setAttribute('title', '1/' + parseFloat(divisionValueSlider.value).toFixed(0));
    render();
});
perspectiveSlider.addEventListener('input', function () {
    perspectiveMultiplier = parseFloat(perspectiveSlider.value);
    perspectiveSlider.setAttribute('title', parseFloat(perspectiveSlider.value).toFixed(2));
    render();
});

wallsToggle.addEventListener('change', function () {
    readToggle(wallsToggle, gridContainer, 'showWalls');
    render();
});

diffSelect.addEventListener('change', function () {
    loadDifficultyDat(getSelectedDiff().mapString);
});

bookmarksToggle.addEventListener('change', function () { setTransitionDelays('bookmark'); output.classList.toggle('showBookmarks'); highlightElements(centerBeat); });
warningToggle.addEventListener('change', function () { setTransitionDelays('warning'); output.classList.toggle('showWarnings'); highlightElements(centerBeat); });
errorToggle.addEventListener('change', function () { setTransitionDelays('error'); output.classList.toggle('showErrors'); highlightElements(centerBeat); });
statsToggle.addEventListener('change', function () { document.getElementById('statsbox').classList.toggle('hide'); });


sliderPrecisionInput.addEventListener('input', readSliderPrecision);
themeToggle.addEventListener('change', function () {
    readToggle(themeToggle, document.body, 'dark', 'light');
});

/**
 * sets or unsets a CSS class on an element based on a checkbox input state
 * @param {HTMLInputElement} toggle - the checkbox input to read
 * @param {HTMLElement} element - the element to apply the styleClass to
 * @param {String} styleClass - the class to be applied to the element
 * @param {String} [styleClass2] - (optional) the second class to be applied, inverted
 */
function readToggle(toggle, element, styleClass, styleClass2) {
    if (toggle.checked) {
        element.classList.add(styleClass);
        if (styleClass2) {
            element.classList.remove(styleClass2);
        }
    } else {
        element.classList.remove(styleClass);
        if (styleClass2) {
            element.classList.add(styleClass2);
        }
    }
}

/**
 * reads the value of the input sliderPrecision and sets the variable sliderPrecision
 * to the inverse of its value, swapping infinity to zero
 * @returns {void} - runs checkParity again
 */
function readSliderPrecision() {
    sliderPrecision = 1 / parseInt(sliderPrecisionInput.value) || 0;
    sliderPrecision = (sliderPrecision == Infinity) ? 0 : sliderPrecision;
    checkParity();
    render();
}

// fancy click handler
// 
var mouseHandle = false;
var cursorX = -1;
var cursorY = 0;

/**
 * detects middle and right click and assigns them to actions
 * based off of https://jsfiddle.net/KyleMit/1jr12rd3/
 * converted to pure js from jquery and added up/down handlers
 * @param {Event} e - a mouseDown event
 * @returns {void} - will probably lead to a render() call, but no output
 */
async function handleMouseDown(e) {
    if (mouseHandle == true) { return; }
    if (e.which == 3) {
        preventDefaults(e);
        mouseHandle = true;

        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('contextmenu', preventDefaults, { once: true });
        document.addEventListener('mousemove', mouseRotate);

        renderContainer.classList.add('rotating');
    }
    if (e.which === 2) {
        preventDefaults(e);
        mouseHandle = true;
        cursorX = -1;

        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('mousemove', getMousePos);

        renderContainer.classList.add('scrolling');

        await until(_ => cursorX != -1);

        let initialY = cursorY;
        let lastTimestamp;
        function mouseScrollStep(timestamp) {
            wheelScrolling = false;
            if (lastTimestamp === undefined) {
                lastTimestamp = timestamp;
            }
            let deltaTime = timestamp - lastTimestamp;

            let deltaScroll = (initialY - cursorY) * deltaTime / 10000;
            centerBeat = Math.min((duration == null) ? Infinity : duration, Math.max(0, olaPosition.value + deltaScroll));
            olaPosition = Ola(centerBeat);

            highlightElements(centerBeat);
            render();

            if (mouseHandle) {
                lastTimestamp = timestamp;
                window.requestAnimationFrame(mouseScrollStep);
            }
        }
        window.requestAnimationFrame(mouseScrollStep);
    }
}

/**
 * disables scrolling and/or rotating when the relevant buttons are lifted
 * @param {Event} e - a mouseUp event
 */
function handleMouseUp(e) {
    preventDefaults(e);

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

/**
 * sets the variables cursorX and cursorY to the position of the mouse inside the page
 * @param {Event} e - a mouseMove event
 */
function getMousePos(e) {
    cursorX = e.clientX;
    cursorY = e.clientY;
}

/**
 * function for async stuff, repeatedly polls a boolean condition until met
 * @param {boolean} condition - the boolean condition to be met
 * @param {Number} interval - the time between polls
 * @returns {Promise} - lets program continue
 */
function until(condition, interval = 1000 / 30) {
    const poll = resolve => {
        if (condition()) resolve();
        else setTimeout(_ => poll(resolve), interval);
    }

    return new Promise(poll);
}

/**
 * keyboard rotation function
 * @param {Event} event - a keyDown event 
 * @returns {void} - will lead to render call if w/a/s/d pressed
 */
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

/**
 * mouse rotation function
 * @param {Event} event - a mouseMove event 
 * @returns {void} - will lead to render call if mouse has moved more than one ulp
 */
function mouseRotate(e) {
    angleX = mod(angleX - e.movementY * 0.5, 360);
    angleY = mod(angleY + e.movementX * 0.5, 360);
    render();
}

let wheelScrolling = false;
let oldTarget = 0;
let lastScrollTime = Date.now();

/**
 * converts each scroll tick into an entire beat of movement, uses ola to keep speed of smooth scrolling roughly consistent
 * @param {Event} event - a scroll event
 * @returns {void} - will lead to render call if
 */
function scroll(event) {
    preventDefaults(event);

    if (audio != null && !audio.paused) { // pause music and stop scrolling when the user intervenes
        playbackToggle.click();
    }

    delta = event.deltaY;
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
        delta *= scrollLineHeight;
    }

    if (!wheelScrolling) {
        oldTarget = olaPosition.value;
        wheelScrolling = true;
    }

    let target = Math.min((duration == null) ? Infinity : duration, Math.max(0, oldTarget + delta / -100));
    oldTarget = target;
    highlightElements(target);

    let now = Date.now();
    olaPosition.set({ value: target }, Math.max(Math.abs(delta) * Math.min((now - lastScrollTime) / 200, 1), Number.EPSILON));

    if (animationFrameId === undefined) {
        animationFrameId = window.requestAnimationFrame(renderTransition);
    }

    lastScrollTime = now;
}
