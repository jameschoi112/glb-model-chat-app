const startSpeechRecognition = (onResult, onEnd, onError) => {
  // Check if browser supports speech recognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (onError) {
      onError(new Error('Speech recognition is not supported in this browser'));
    }
    return null;
  }

  try {
    // Create speech recognition instance
    const recognition = new SpeechRecognition();

    // Configure options
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'ko-KR'; // Korean language support

    // Set up event handlers
    recognition.onresult = (event) => {
      const result = event.results[0];
      const transcript = result[0].transcript;
      const isFinal = result.isFinal;

      if (onResult) {
        onResult(transcript, isFinal);
      }
    };

    recognition.onend = () => {
      if (onEnd) {
        onEnd();
      }
    };

    recognition.onerror = (event) => {
      if (onError) {
        onError(new Error(`Speech recognition error: ${event.error}`));
      }
    };

    // Start recognition
    recognition.start();

    return recognition;

  } catch (error) {
    if (onError) {
      onError(error);
    }
    return null;
  }
};

const stopSpeechRecognition = (recognitionInstance) => {
  if (recognitionInstance) {
    try {
      recognitionInstance.stop();
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  }
};

export { startSpeechRecognition, stopSpeechRecognition };