# bs-parity
a.k.a. map inspector  
An in-development error checking tool for custom Beat Saber maps

# What it does
Currently this tool only checks for parity issues present in a map, with other forms of error checking being planned or in development. Unlike other tools, this tool keeps track of parity (rather than solely relying on note cut direction), leading to significantly increased accuracy. There are still some limitations with the parity algorithm, some of which will be addressed in the future (see [Limitations](#Limitations)).

# How to use
Visit [the github.io page](https://galaxymaster2.github.io/bs-parity/), or download a copy to run locally. Select the difficulty file you would like to check and optionally adjust the slider precision setting (see [explanation below](#Slider-precision-setting)).

# Slider precision setting
In most cases you won't have to adjust this setting from the default value of 1/8. The value of this setting needs to be between the lowest slider precision used (usually no lower than 1/12 or 1/8) and the highest precision used for consecutive non-slider notes of a single color (for example, 2 blue notes 1/4 apart, equivalent to a 1/8 stream). Therefore you only need to adjust this setting if you use sliders with a precision lower than 1/8 or if you use consecutive non-slider notes of a single color less than 1/8 apart.

# Map visualizer controls
- **Rotation**: WASD or hold right click and drag
- **Scrolling**: scroll with mousewheel
- **Continuous scrolling**: hold middle mouse button and move cursor vertically
- **Scroll to note**: click on the note or beat number to scroll to that location

# Limitations
- Doesn't take into account angle snapping on windows
- First note parity always assumes forehand for dot notes
- Only looks at cut direction, not note position
- Doesn't take arm rotation into account, always assumes the player can rotate their arm/wrist in time for the next note
- Doesn't work when the minimum slider precision is less than or equal to the minimum non-slider precision for a given color (e.g. 1/8th slider and 1/16th burst stream in the same map)
- Doesn't work reliably with dot spam
- Doesn't work reliably with bomb tunnels (spirals are fine)
- Might not work with unconventional (e.g. horizontal, corner) bomb resets

# Goal of this project
The end goal of this project is to provide a tool to easily check a map for common errors, such as parity errors and vision blocks.

# Currently implemented
- [x] Basic parity algorithm
- [x] Bomb reset detection
- [x] Better ui
- [x] Map visualizer
- [x] Rendering walls in map visualizer
- [x] Map zip support
- [x] Handclap detection
- [x] Hammer hit detection

# Planned for future
- [ ] Downloading map from url
- [ ] Arm rotation support in parity algorithm
- [ ] Vision block detection
- [ ] Help page

# Under consideration
- [ ] Detection of improper stacks/windows/sliders etc.
- [ ] Support for angle snapping on windows
- [ ] 3-wide wall detection
- [ ] Audio playback for map visualizer
- [ ] Support for BPM changes
- [ ] Downloading map from beatsaver id

# Currently not planned
- Detection of other cursed patterns such as arm tangles and hitbox abuse
- Any map editing capabilities

# Known issues
- Due to a bug in Chromium (used in Chrome, Edge, Opera, etc.) walls can render incorrectly for some camera angles, especially with higher perspective intensity settings. Due to this, wall rendering is disabled by default.
- A bug in Firefox causes rendering problems when hiding overflowed elements in a container with rounded corners. As a result of a workaround rendered elements will overflow the rounded corners in Firefox.
