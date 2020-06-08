# bs-parity
A simple parity checking tool for Beat Saber maps

# What it does
This tool attempts to catch all parity issues present in the given map. Unlike other tools, this tool keeps track of parity (rather than solely relying on note cut direction), leading to significantly increased accuracy. Due to some limitations though, there will be some cases in which it can give false-positives or false-negatives (see [Limitations](#Limitations)).

# How to use
Visit [the github.io page](https://galaxymaster2.github.io/bs-parity/) to access this tool, or download a copy to run locally. Use the file input to select the difficulty file you would like to check, and set the lowest precision used for sliders in the map in the slider precision box. If you don't have sliders in your chosen difficulty you can leave it empty. A more proper user interface is coming soon™.

# Supports
- Single directional notes
- Doubles
- Dot notes
- Stacks
- Towers
- Sliders (exception below)
- Windows (no angle snapping)
- Bomb resets (exception below)

# Limitations
- Doesn't take into account angle snapping on windows
- First note parity always assumes forehand for dot notes
- Only looks at cut direction, not note position
- Doesn't take arm rotation into account, always assumes the player can rotate their arm/wrist in time for the next note
- Doesn't work when the minimum slider precision is less than or equal to the minimum non-slider precision for a given color (e.g. 1/8th slider and 1/16th burst stream in the same map)
- Doesn't work with dot spam
- Might not work with unconventional (e.g. horizontal, corner) bomb resets

# Goal of this project
The end goal of this project is to provide a tool to easily check whether or not a given map can be played without violating parity, giving warnings when that would be uncomfortable or infeasible to do.

# Planned for future
- Better ui
- ~Bomb reset detection~✅
- Keeping track of arm rotations with warnings if it's uncomfortable or infeasible to play
- Detection of improper stacks/windows/sliders etc.
- (Possibly) map zip extraction

# Currently not planned
- Detection of 'cursed patterns' like handclaps, arm tangles, hitbox abuse, etc.
- Vision block detection (walls included)
