# bs-parity
A simple parity checking tool for Beat Saber maps

# What it does
This tool attempts to catch all parity issues present in the given map. Unlike other tools, this tool keeps track of parity (rather than solely relying on note cut direction), leading to significantly increased accuracy. Due to some limitations though, there will be some cases in which it can give false-positives or false-negatives (see [Limitations](#Limitations)).

# How to use
Visit [the github.io page](https://galaxymaster2.github.io/bs-parity/) to access this tool, or download a copy to run locally. Use the file input to select the difficulty file you would like to check, and set the lowest precision used for sliders in the map in the slider precision box. If you don't have sliders in your chosen difficulty you can leave it empty. Currently all output is in the developer console of your browser, which can be accessed by pressing F12. A more proper user interface is coming soon™.

# Supports
- Single directional notes
- Doubles
- Dot notes
- Stacks
- Towers
- Sliders (exception below)
- Windows (no angle snapping)

# Limitations
- Doesn't take into account angle snapping on windows
- First note parity always assumes forehand for dot notes
- Doesn't take bombs into account
- Only looks at cut direction, not note position
- Doesn't take arm rotation into account, always assumes the player can rotate their arm/wrist in time for the next note
- Doesn't work when the minimum slider precision is less than or equal to the minimum non-slider precision for a given color (e.g. 1/8th slider and 1/16th burst stream in the same map)
- Doesn't work with dot spam
