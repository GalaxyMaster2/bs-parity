# bs-parity
A simple parity checking tool for Beat Saber maps

# What it does
This tool attempts to catch all parity issues present in the given map. Unlike other tools, this tool keeps track of parity (rather than solely relying on note cut direction), leading to significantly increased accuracy. Due to some limitations though, there will be some cases in which it can give false-positives or false-negatives (see [Limitations](#Limitations)).

# Supports
- Single directional notes
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
