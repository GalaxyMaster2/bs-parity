class Strings {
    static getParityBreakText(beats) {
        return `Parity break, reset is necessary in ${beats.toFixed(3)} beat${beats === 1 ? '' : 's'}`;
    }

    static getBorderlineHitText() {
        return 'Borderline hit, not all players might read or be able to play this correctly';
    }

    static getNotReadyText() {
        return 'File loading not ready:|Please try again';
    }
}
