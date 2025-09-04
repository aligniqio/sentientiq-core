export function useChime() {
  // Simple sine wave beeps - replace with actual sound files if desired
  const createBeep = (frequency: number, duration: number) => {
    return () => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    };
  };
  
  return {
    go: createBeep(880, 0.15),   // High A note for success
    nope: createBeep(220, 0.2)   // Low A note for error
  };
}