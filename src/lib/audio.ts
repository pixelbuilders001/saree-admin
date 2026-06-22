/**
 * Utility to play a professional POS-style beep sound.
 * Uses the custom sound.wav file provided in the public folder.
 */
export function playBeep() {
    try {
        const audio = new Audio('/sound.wav');
        audio.volume = 0.5; // Adjust volume as needed
        audio.play().catch(error => {
            console.warn("Audio playback failed (usually due to user interaction requirement):", error);
        });
    } catch (error) {
        console.error("Failed to initialize beep sound:", error);
    }
}
