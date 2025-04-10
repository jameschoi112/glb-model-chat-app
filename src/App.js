import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import ModelViewer from './components/ModelViewer';
import ChatInterface from './components/ChatInterface';
// import DateTimeDisplay from './components/DateTimeDisplay';
import AdminPanel from './components/AdminPanel';
import WelcomePopup from './components/WelcomePopup';
import useLipSync from './components/LipSync';
import { initializeSession, sendMessageStream, resetSession } from './services/customChatService';
import { speakText } from './services/openaiVoiceService';
import { startSpeechRecognition, stopSpeechRecognition } from './services/speechRecognitionService';
import { X, Maximize2, Minimize2, Move, MessageSquare, Menu, ChevronLeft, Search } from 'lucide-react';
import './App.css';


// Sample chat history data
const DUMMY_CHAT_HISTORY = [
  {
    id: 'chat-1',
    title: 'Project Planning Assistant',
    snippet: 'I can help you create a project timeline...',
    timestamp: '10 min ago',
    active: true
  },
  {
    id: 'chat-2',
    title: 'Travel Recommendations',
    snippet: 'Here are some great places to visit in Japan...',
    timestamp: '2 hours ago',
    active: false
  },
  {
    id: 'chat-3',
    title: 'Coding Help',
    snippet: 'The error in your React component is...',
    timestamp: '5 hours ago',
    active: false
  },
  {
    id: 'chat-4',
    title: 'Recipe Ideas',
    snippet: 'Try this delicious pasta recipe with...',
    timestamp: 'Yesterday',
    active: false
  },
  {
    id: 'chat-5',
    title: 'Workout Plan',
    snippet: 'Here\'s a 4-week training plan to...',
    timestamp: '2 days ago',
    active: false
  }
];

function App() {
  // Existing states
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [messageHistory, setMessageHistory] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [background, setBackground] = useState('default');
  const [currentModel, setCurrentModel] = useState('model1');
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [microphoneAccess, setMicrophoneAccess] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [sessionInitialized, setSessionInitialized] = useState(false);

  // Model viewer related states
  const [modelViewerExpanded, setModelViewerExpanded] = useState(false);
  const [modelViewerVisible, setModelViewerVisible] = useState(true);

  // Drag related states
  const [modelViewerPosition, setModelViewerPosition] = useState({ x: 20, y: 70 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const modelViewerRef = useRef(null);

  // Chat history sidebar states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatHistory, setChatHistory] = useState(DUMMY_CHAT_HISTORY);
  const [activeChatId, setActiveChatId] = useState('chat-1');

  // Search functionality states
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredChatHistory, setFilteredChatHistory] = useState(DUMMY_CHAT_HISTORY);
  const searchInputRef = useRef(null);

  // Current active streaming connection reference
  const activeStreamRef = useRef(null);

  // Speech recognition instance reference
  const recognitionRef = useRef(null);

  // Pass isSpeaking state to the lipSync hook
  const { lipSyncData } = useLipSync(currentMessage, isSpeaking);

  const audioRef = useRef(null);
  const welcomeMessageRef = useRef('Hello! I\'m your AI assistant. How can I help you today?');

  // Search animation
  const toggleSearch = () => {
    setIsSearching(!isSearching);

    // When opening search, animate and focus input
    if (!isSearching) {
      // Use GSAP for animation
      gsap.fromTo(".search-input-container",
        { width: 0, opacity: 0 },
        { width: "100%", opacity: 1, duration: 0.3, ease: "power2.out", onComplete: () => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
          }
        }
      });
    } else {
      // Clear search when closing
      setSearchQuery('');
      setFilteredChatHistory(chatHistory);

      // Animate closing
      gsap.to(".search-input-container", {
        width: 0, opacity: 0, duration: 0.3, ease: "power2.in"
      });
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim() === '') {
      setFilteredChatHistory(chatHistory);
    } else {
      const filtered = chatHistory.filter(
        chat => chat.title.toLowerCase().includes(query.toLowerCase()) ||
                chat.snippet.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredChatHistory(filtered);
    }
  };

  // Drag start handler
  const handleDragStart = (e) => {
    if (modelViewerExpanded) return; // No dragging in expanded mode

    // Mouse event case
    if (e.type === 'mousedown') {
      e.preventDefault();
      const containerRect = modelViewerRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - containerRect.left,
        y: e.clientY - containerRect.top
      });
    }
    // Touch event case
    else if (e.type === 'touchstart' && e.touches.length === 1) {
      const touch = e.touches[0];
      const containerRect = modelViewerRef.current.getBoundingClientRect();
      setDragOffset({
        x: touch.clientX - containerRect.left,
        y: touch.clientY - containerRect.top
      });
    }

    setIsDragging(true);
  };

  // Drag handler
  const handleDrag = (e) => {
    if (!isDragging) return;

    let clientX, clientY;

    // Mouse event case
    if (e.type === 'mousemove') {
      e.preventDefault();
      clientX = e.clientX;
      clientY = e.clientY;
    }
    // Touch event case
    else if (e.type === 'touchmove' && e.touches.length === 1) {
      const touch = e.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      return;
    }

    // Prevent moving outside screen boundaries
    const viewerWidth = modelViewerRef.current.offsetWidth;
    const viewerHeight = modelViewerRef.current.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let newX = clientX - dragOffset.x;
    let newY = clientY - dragOffset.y;

    // X-axis restriction
    if (newX < 0) newX = 0;
    if (newX + viewerWidth > windowWidth) newX = windowWidth - viewerWidth;

    // Y-axis restriction
    if (newY < 0) newY = 0;
    if (newY + viewerHeight > windowHeight) newY = windowHeight - viewerHeight;

    setModelViewerPosition({ x: newX, y: newY });
  };

  // Drag end handler
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Global event listeners setup
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDrag, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDrag);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging]);

  // Initialize filtered chat history
  useEffect(() => {
    setFilteredChatHistory(chatHistory);
  }, [chatHistory]);

  // Environment change command detection
  const detectEnvironmentChangeCommand = (userMessage, aiResponse) => {
    // Check for background change intent in user message
    const backgroundChangeRequests = {
      'night': /night.*change|change.*night|background.*night|dark mode|darker/i,
      'sunset': /sunset.*change|change.*sunset|background.*sunset/i,
      'dawn': /dawn.*change|change.*dawn|background.*dawn|morning/i,
      'default': /default.*change|change.*default|background.*default|light mode|lighter/i
    };

    // Check for background change request in user message
    let requestedBackground = null;
    for (const [bgType, pattern] of Object.entries(backgroundChangeRequests)) {
      if (pattern.test(userMessage.toLowerCase())) {
        requestedBackground = bgType;
        break;
      }
    }

    // Check for positive response in AI reply (approving the change)
    const positiveResponse = /yes|sure|done|changed|applied|completed|here you go|I've|I have/i.test(aiResponse);

    // If there's a background change request and AI responded positively, change background
    if (requestedBackground && positiveResponse) {
      console.log(`Background change request detected: ${requestedBackground}`);

      // Apply the actual background change
      handleChangeBackground(requestedBackground);
    }
  };

  // Page load initialization
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const mobileRegex = /android|iphone|ipad|ipod|blackberry|kindle|silk|opera mini/i;
      setIsMobile(mobileRegex.test(userAgent) || window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Session initialization and model loading simulation
    const setupApp = async () => {
      try {
        // Try to initialize chatbot session
        const sessionId = await initializeSession();
        console.log('App initialization - Session ID acquired:', sessionId);
        setSessionInitialized(true);

        // Model loading simulation
        setTimeout(() => {
          setIsLoading(false);
          // Show welcome popup after loading
          setShowWelcomePopup(true);
        }, 2000);
      } catch (error) {
        console.error('Error during app initialization:', error);
        // Show UI anyway even if there's an error
        setTimeout(() => {
          setIsLoading(false);
          setShowWelcomePopup(true);
        }, 2000);
      }
    };

    setupApp();

    return () => {
      window.removeEventListener('resize', checkMobile);

      // Clean up audio
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
        audioRef.current = null;
      }

      // End any ongoing streaming connection
      if (activeStreamRef.current) {
        activeStreamRef.current.close();
        activeStreamRef.current = null;
      }

      // Clean up speech recognition
      stopSpeechRecognition(recognitionRef.current);
    };
  }, []);

  // Session reset function
  const handleResetSession = async () => {
    try {
      if (activeStreamRef.current) {
        activeStreamRef.current.close();
        activeStreamRef.current = null;
      }

      const sessionId = await resetSession();
      console.log('Session reset complete:', sessionId);
      setSessionInitialized(true);
      return true;
    } catch (error) {
      console.error('Session reset failed:', error);
      setSessionInitialized(false);
      return false;
    }
  };

  // Start voice recognition
  const startVoiceRecognition = () => {
    // Stop if already listening
    if (isListening) {
      stopSpeechRecognition(recognitionRef.current);
      setIsListening(false);
      setTranscript('');
      return;
    }

    // Mobile environment detection
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Special handling for mobile
    if (isMobile) {
      // Instruct user first
      if (!microphoneAccess) {
        alert("Starting voice recognition. Please tap 'Allow' when prompted for microphone access.");
      }

      // Slight delay for more stable handling on mobile
      setTimeout(() => {
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          .then(() => {
            setMicrophoneAccess(true);

            // Small delay after permission success
            setTimeout(() => {
              initializeVoiceRecognition();
            }, 300);
          })
          .catch(error => {
            console.error('Mobile microphone access denied:', error);
            alert('Microphone access is required for voice recognition. Please enable it in your browser settings.');
          });
      }, 300);
    } else {
      // Standard approach for desktop
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          setMicrophoneAccess(true);
          initializeVoiceRecognition();
        })
        .catch(error => {
          console.error('Microphone access denied:', error);
          alert('Microphone access is required for voice recognition.');
        });
    }
  };

  // Voice recognition initialization
  const initializeVoiceRecognition = () => {
    // Stop if already listening
    if (isListening) {
      stopSpeechRecognition(recognitionRef.current);
      setIsListening(false);
      setTranscript('');
      return;
    }

    setIsListening(true);
    setTranscript('');

    // Result handling callback
    const handleResult = (text, isFinal) => {
      setTranscript(text);

      // Continue listening if not final
      if (!isFinal) return;

      // Process message when final result is ready
      if (text.trim()) {
        handleSendMessage(text.trim());
      }

      stopSpeechRecognition(recognitionRef.current);
      setIsListening(false);
      setTranscript('');
    };

    // End handling callback
    const handleEnd = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    // Error handling callback
    const handleError = (error) => {
      console.error('Voice recognition error:', error);
      setIsListening(false);
      setTranscript('');
    };

    // Start speech recognition
    recognitionRef.current = startSpeechRecognition(
      handleResult,
      handleEnd,
      handleError
    );
  };

  // Microphone access allowed after welcome
  const handleActivateVoice = () => {
    setMicrophoneAccess(true);
    setShowWelcomePopup(false);

    // Add initial welcome message
    const welcomeMessage = welcomeMessageRef.current;
    setCurrentMessage(welcomeMessage);

    setMessageHistory([
      {
        role: 'assistant',
        content: welcomeMessage
      }
    ]);

    // Play welcome message as speech
    handleSpeech(welcomeMessage);
  };

  // Close welcome popup (continue without microphone)
  const handleCloseWelcomePopup = () => {
    setShowWelcomePopup(false);

    // Still show initial message even when using text only
    const welcomeMessage = welcomeMessageRef.current;
    setCurrentMessage(welcomeMessage);

    setMessageHistory([
      {
        role: 'assistant',
        content: welcomeMessage
      }
    ]);
  };

  // Text-to-speech function
  const handleSpeech = async (text) => {
    try {
      // Stop previous audio if playing
      if (audioRef.current) {
        const currentAudio = audioRef.current;
        const currentSrc = currentAudio.src;

        // Stop it first
        currentAudio.pause();

        // Only revoke valid URLs
        if (currentSrc && currentSrc.startsWith('blob:')) {
          URL.revokeObjectURL(currentSrc);
        }

        audioRef.current = null;
      }

      // Set message but don't enable lip sync yet
      setCurrentMessage(text);
      setIsSpeaking(false); // Initially lip sync disabled

      console.log("Starting speech synthesis:", text);

      // Create audio object for speech playback
      const voice = 'onyx'; // Male voice
      audioRef.current = await speakText(text, voice);
      const audio = audioRef.current; // Store in local var for safe reference in event handlers

      // Audio loading state events
      audio.addEventListener('canplay', () => {
        console.log("Audio ready for playback");
      });

      // Audio playback start event - enable lip sync now
      audio.addEventListener('play', () => {
        console.log("Audio playback started - lip sync activated");
        setIsSpeaking(true); // Activate lip sync when audio actually starts
      });

      // Audio completion event
      audio.addEventListener('ended', () => {
        console.log("Speech playback complete");
        setIsSpeaking(false); // Disable lip sync

        // Check if audio.src exists before revoking
        if (audio.src && audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(audio.src);
        }

        // Only set audioRef to null if it still references this audio object
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
      });

      // Audio error handling
      audio.addEventListener('error', (error) => {
        console.error('Audio playback error:', error);
        setIsSpeaking(false); // Disable lip sync

        // Check if audio.src exists before revoking
        if (audio.src && audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(audio.src);
        }

        // Only set audioRef to null if it still references this audio object
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
      });

      // Audio pause event
      audio.addEventListener('pause', () => {
        console.log("Audio paused");
        setIsSpeaking(false); // Disable lip sync
      });

      // Start audio playback after setting up event listeners
      // Actual playback begins after browser prepares the audio
      audio.play().catch(error => {
        console.error('Error starting audio playback:', error);
        setIsSpeaking(false);
      });
    } catch (error) {
      console.error('Error during speech playback:', error);
      setIsSpeaking(false);
    }
  };

  // Send message using custom API and handle response
  const handleSendMessage = async (message) => {
  try {
    // Try to reset session if not initialized
    if (!sessionInitialized) {
      console.log('Session not initialized, attempting reset');
      const resetSuccess = await handleResetSession();
      if (!resetSuccess) {
        throw new Error('Could not initialize session. Please refresh the page.');
      }
    }

    // Stop speech recognition if active
    if (isListening) {
      stopSpeechRecognition(recognitionRef.current);
      setIsListening(false);
    }

    // Stop previous speech if playing
    if (audioRef.current) {
      const currentAudio = audioRef.current;
      const currentSrc = currentAudio.src;

      currentAudio.pause();

      if (currentSrc && currentSrc.startsWith('blob:')) {
        URL.revokeObjectURL(currentSrc);
      }

      audioRef.current = null;
      setIsSpeaking(false);
    }

    // End any ongoing streaming connection
    if (activeStreamRef.current) {
      activeStreamRef.current.close();
      activeStreamRef.current = null;
    }

    // Add user message to history
    const userMessage = { role: 'user', content: message };
    const updatedHistory = [...messageHistory, userMessage];
    setMessageHistory(updatedHistory);

    // Show "generating response" placeholder
    setCurrentMessage('Generating response...');

    // Add loading state message
    const loadingMessage = { role: 'assistant', content: 'Generating response...' };
    setMessageHistory([...updatedHistory, loadingMessage]);

    // Response accumulation variables
    let accumulatedResponse = '';
    // 음성 합성 플래그 제거 - 응답이 완료된 후에만 음성 재생
    let botResponseAdded = true; // Already added initial loading message

    console.log('Starting message send:', message);

    // Begin streaming response handling
    const eventSource = await sendMessageStream(
      message,
      // Content chunk handling callback
      (chunk, accumulated) => {
        console.log('Chunk received:', chunk);
        accumulatedResponse = accumulated;

        // Update the last item in message history
        const assistantMessage = { role: 'assistant', content: accumulated };
        setMessageHistory(prev => {
          const newHistory = [...prev];
          newHistory[newHistory.length - 1] = assistantMessage;
          return newHistory;
        });

        // Update current message (for lip sync)
        setCurrentMessage(accumulated);

        // Detect and handle environment change commands
        detectEnvironmentChangeCommand(message, accumulated);

        // 스트리밍 중에는 음성 합성 시작하지 않음 - 이 부분 제거
      },
      // Suggested questions callback
      (questions) => {
        console.log('Suggested questions received:', questions);
        setSuggestedQuestions(questions);
      },
      // Completion callback - 응답이 완료된 후에만 음성 합성 시작
      (finalResponse) => {
        // Handle final response
        console.log('Response complete:', finalResponse);

        // 전체 응답이 완료된 후 한 번에 음성 합성 시작
        handleSpeech(finalResponse);

        // Remove streaming reference
        activeStreamRef.current = null;
      },
      // Error callback
      (error) => {
        console.error('Error during response generation:', error);
        const errorMessage = 'Sorry, there was a problem generating a response.';

        // Add error message to history
        const errorResponse = { role: 'assistant', content: errorMessage };
        setMessageHistory(prev => {
          const newHistory = [...prev];
          newHistory[newHistory.length - 1] = errorResponse;
          return newHistory;
        });

        setCurrentMessage(errorMessage);

        // Convert error message to speech too
        handleSpeech(errorMessage);

        // Remove streaming reference
        activeStreamRef.current = null;
      }
    );

    // Store active streaming reference
    activeStreamRef.current = eventSource;

    // Return response object for ChatInterface
    return {
      id: `bot-response-${updatedHistory.length}`,
      text: 'Generating response...',
      sender: 'bot'
    };
  } catch (error) {
    console.error('Error during message processing:', error);
    const errorMessage = 'Sorry, there was a problem generating a response.';

    // Add error message to history
    const errorResponse = { role: 'assistant', content: errorMessage };
    setMessageHistory([...messageHistory, { role: 'user', content: message }, errorResponse]);

    setCurrentMessage(errorMessage);

    // Convert error message to speech
    handleSpeech(errorMessage);

    return {
      id: `error-response-${messageHistory.length}`,
      text: errorMessage,
      sender: 'bot'
    };
  }
};

  // Handle suggested question click
  const handleSuggestedQuestionClick = (question) => {
    // Send the suggested question as a message
    handleSendMessage(question);
    // Clear suggested questions
    setSuggestedQuestions([]);
  };

  // Change background handler
  const handleChangeBackground = (newBackground) => {
    console.log('Changing background:', newBackground);
    setBackground(newBackground);
  };

  // Change model handler
  const handleChangeModel = (newModel) => {
    console.log('Changing model:', newModel);
    setCurrentModel(newModel);
  };

  // Toggle model viewer expanded/collapsed
  const toggleModelViewerExpanded = () => {
    setModelViewerExpanded(!modelViewerExpanded);
  };

  // Close model viewer
  const handleCloseModelViewer = () => {
    setModelViewerVisible(false);
  };

  // Show model viewer
  const handleShowModelViewer = () => {
    setModelViewerVisible(true);
  };

  // Toggle chat history sidebar
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Select a chat from history
  const handleSelectChat = (chatId) => {
    setActiveChatId(chatId);

    // Update active state in chat history
    setChatHistory(prev =>
      prev.map(chat => ({
        ...chat,
        active: chat.id === chatId
      }))
    );

    // Close sidebar on mobile after selection
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  };

  return (
    <div className={`app background-${background} ${modelViewerExpanded ? 'model-expanded' : ''}`}>
      {isLoading ? (
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <div className="loading-message">
            Loading AI capabilities...
          </div>
        </div>
      ) : (
        <>
          {showWelcomePopup && (
            <WelcomePopup
              onActivate={handleActivateVoice}
              onClose={handleCloseWelcomePopup}
            />
          )}

          <div className="main-content">
            {/* Model viewer (draggable container) */}
            {modelViewerVisible && (
              <div
                ref={modelViewerRef}
                className={`model-viewer-container ${modelViewerExpanded ? 'expanded' : ''} ${isDragging ? 'dragging' : ''}`}
                style={
                  modelViewerExpanded
                    ? {} // Centered when expanded
                    : { top: `${modelViewerPosition.y}px`, left: `${modelViewerPosition.x}px`, position: 'absolute' }
                }
              >
                <div
                  className="model-viewer-header"
                  onMouseDown={!modelViewerExpanded ? handleDragStart : undefined}
                  onTouchStart={!modelViewerExpanded ? handleDragStart : undefined}
                >
                  <div className="model-viewer-drag-handle">

                    <span>My Avatar</span>
                  </div>
                  <div className="model-viewer-controls">
                    {modelViewerExpanded ? (
                      <button className="model-control-btn" onClick={toggleModelViewerExpanded}>
                        <Minimize2 size={16} />
                      </button>
                    ) : (
                      <button className="model-control-btn" onClick={toggleModelViewerExpanded}>
                        <Maximize2 size={16} />
                      </button>
                    )}
                    <button className="model-control-btn" onClick={handleCloseModelViewer}>
                      <X size={16} />
                    </button>
                  </div>
                </div>
                <div
                  className="model-viewer-content"
                  onDoubleClick={!modelViewerExpanded ? toggleModelViewerExpanded : undefined}
                >
                  <ModelViewer
                    lipSyncData={lipSyncData}
                    background={background}
                    modelPath={`/models/${currentModel}.glb`}
                    isSpeaking={isSpeaking}
                  />
                </div>
              </div>
            )}

            {/* Chat layout with sidebar */}
            <div className="chat-layout">
              {/* Main chat area */}
              <div className="chat-content">
                {!modelViewerVisible && (
                  <button className="show-model-btn" onClick={handleShowModelViewer}>
                    Show AI Model
                  </button>
                )}


                {/*
                <AdminPanel
                  onChangeBackground={handleChangeBackground}
                  onChangeModel={handleChangeModel}
                />
                */}

                {/* Sidebar toggle button */}
                <button
                  className="sidebar-toggle"
                  onClick={toggleSidebar}
                  aria-label="Toggle chat history"
                >
                  {sidebarCollapsed ? <MessageSquare size={16} /> : <ChevronLeft size={16} />}
                </button>

                <ChatInterface
                  onSendMessage={handleSendMessage}
                  onStartVoiceInput={startVoiceRecognition}
                  isSpeaking={isSpeaking}
                  isListening={isListening}
                  initialMessages={messageHistory.map((msg, index) => ({
                    id: `${msg.role}-${index}`,
                    text: msg.content,
                    sender: msg.role === 'assistant' ? 'bot' : 'user'
                  }))}
                />

                {/* Suggested questions UI */}
                {suggestedQuestions.length > 0 && (
                  <div className="suggested-questions">
                    {suggestedQuestions.map((question, index) => (
                      <button
                        key={index}
                        className="suggested-question-btn"
                        onClick={() => handleSuggestedQuestionClick(question)}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Chat history sidebar */}
              <div className={`chat-sidebar ${sidebarCollapsed ? 'chat-sidebar-collapsed' : ''}`}>
                <div className="sidebar-header">
                  {!isSearching ? (
                    <>
                      <span>Chat History</span>
                      <div className="sidebar-header-controls">
                        <button
                          className="sidebar-search-btn"
                          onClick={toggleSearch}
                          aria-label="Search chat history"
                        >
                          <Search size={16} />
                        </button>
                        <button className="sidebar-close-btn" onClick={toggleSidebar}>
                          <X size={16} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="search-container">
                      <div className="search-input-container">
                        <Search size={16} className="search-icon" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          className="search-input"
                          placeholder="Search chat history..."
                          value={searchQuery}
                          onChange={handleSearchChange}
                        />
                      </div>
                      <button className="search-close-btn" onClick={toggleSearch}>
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="chat-history-list">
                  {filteredChatHistory.map(chat => (
                    <div
                      key={chat.id}
                      className={`history-item ${chat.active ? 'active' : ''}`}
                      onClick={() => handleSelectChat(chat.id)}
                    >
                      <div className="history-title">{chat.title}</div>
                      <div className="history-snippet">{chat.snippet}</div>
                      <div className="history-time">{chat.timestamp}</div>
                    </div>
                  ))}
                  {filteredChatHistory.length === 0 && (
                    <div className="no-results">No matching chats found</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Voice recognition transcript display */}
          {isListening && transcript && (
            <div className="transcript-container">
              <p>{transcript}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;