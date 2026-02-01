// src/lib/voice/WinstonVoiceManager.ts
/**
 * WINSTON Voice Conversation Manager
 * Handles continuous voice interaction like WINSTON in Dan Brown's Origin
 * - Proactive greetings
 * - Continuous listening
 * - Natural conversation flow
 * - Context-aware responses
 */

export type VoiceMode = 'dormant' | 'listening' | 'thinking' | 'speaking';

export interface VoiceConfig {
  autoStart?: boolean;
  silenceTimeout?: number; // ms before offering help
  language?: string;
  voice?: string;
}

export interface VoiceEvent {
  type: 'mode-change' | 'speech-detected' | 'speech-end' | 'error';
  data?: any;
}

export class WinstonVoiceManager {
  private mode: VoiceMode = 'dormant';
  private recognition: any = null; // SpeechRecognition
  private synthesis: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  
  private silenceTimer: NodeJS.Timeout | null = null;
  private silenceTimeout: number = 30000; // 30 seconds
  
  private onModeChange?: (mode: VoiceMode) => void;
  private onTranscript?: (text: string, isFinal: boolean) => void;
  private onSpeechEnd?: () => void;
  private onError?: (error: string) => void;
  
  private isInitialized = false;
  private currentArtwork: { id: string; title: string } | null = null;

  constructor(config: VoiceConfig = {}) {
    this.silenceTimeout = config.silenceTimeout || 30000;
    
    // Initialize Web Speech API
    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis;
      
      // Pre-load voices
      this.preloadVoices();
      
      this.initializeSpeechRecognition();
    } else {
      throw new Error('WinstonVoiceManager requires browser environment');
    }
  }

  /**
   * Pre-load voices to ensure they're available when needed
   */
  private preloadVoices(): void {
    // Get voices immediately
    let voices = this.synthesis.getVoices();
    
    if (voices.length > 0) {
      console.log(`[Voice] 🎵 Pre-loaded ${voices.length} voices`);
      voices.forEach((voice, i) => {
        if (i < 3) console.log(`[Voice]   - ${voice.name} (${voice.lang})`);
      });
    } else {
      console.log('[Voice] ⏳ Voices not loaded yet, waiting...');
      // Set up listener for when voices load
      this.synthesis.onvoiceschanged = () => {
        voices = this.synthesis.getVoices();
        console.log(`[Voice] 🎵 Voices loaded: ${voices.length} available`);
        voices.forEach((voice, i) => {
          if (i < 3) console.log(`[Voice]   - ${voice.name} (${voice.lang})`);
        });
      };
    }
  }

  private initializeSpeechRecognition() {
    // @ts-ignore - WebKit prefixes
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true; // Keep listening
    this.recognition.interimResults = true; // Get partial results
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    // Handle speech results
    this.recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const result = event.results[last];
      const transcript = result[0].transcript;
      const isFinal = result.isFinal;

      console.log(`[Voice] ${isFinal ? 'Final' : 'Interim'}: "${transcript}"`);
      
      // INTERRUPTION DETECTION: If we're speaking and user speaks, stop!
      if (this.mode === 'speaking' && transcript.trim().length > 2) {
        console.log('[Voice] 🛑 INTERRUPTION detected while speaking!');
        this.handleInterruption(transcript, isFinal);
        return;
      }
      
      // Reset silence timer when speech detected
      this.resetSilenceTimer();
      
      // Notify listeners
      if (this.onTranscript) {
        this.onTranscript(transcript, isFinal);
      }

      // If final, prepare to respond
      if (isFinal && transcript.trim().length > 0) {
        this.handleUserSpeech(transcript);
      }
    };

    // Handle speech end
    this.recognition.onspeechend = () => {
      console.log('[Voice] Speech ended');
      if (this.onSpeechEnd) {
        this.onSpeechEnd();
      }
    };

    // Handle errors
    this.recognition.onerror = (event: any) => {
      console.error('[Voice] Recognition error:', event.error);
      
      // Don't treat "no-speech" as an error, just continue listening
      if (event.error === 'no-speech') {
        return;
      }
      
      if (this.onError) {
        this.onError(event.error);
      }

      // Restart if needed
      if (this.mode === 'listening' && event.error !== 'aborted') {
        setTimeout(() => this.startListening(), 1000);
      }
    };

    // Auto-restart when recognition ends (for continuous mode)
    this.recognition.onend = () => {
      console.log('[Voice] Recognition ended');
      if (this.mode === 'listening') {
        console.log('[Voice] Auto-restarting recognition...');
        setTimeout(() => this.startListening(), 100);
      }
    };

    this.isInitialized = true;
  }

  /**
   * Start the voice tour
   */
  async startTour(artworkId: string, artworkTitle: string): Promise<void> {
    this.currentArtwork = { id: artworkId, title: artworkTitle };
    
    console.log('[Voice] 🎬 Starting tour...');
    
    // Warm up TTS first (especially important for Windows)
    await this.warmUpTTS();
    
    this.setMode('speaking');

    // Winston's proactive greeting
    const greeting = this.generateGreeting(artworkTitle);
    
    try {
      await this.speak(greeting);
      console.log('[Voice] ✅ Greeting completed');
    } catch (error) {
      console.error('[Voice] ❌ Greeting failed:', error);
      // Continue anyway - don't block the tour
    }

    // After greeting (or if it failed), start listening
    this.startListening();
  }

  /**
   * Warm up TTS engine with a short utterance
   * This helps especially on Windows where first utterance can fail
   */
  private async warmUpTTS(): Promise<void> {
    console.log('[Voice] 🔥 Warming up TTS engine...');
    
    return new Promise((resolve) => {
      // Cancel any stuck speech
      if (this.synthesis.speaking || this.synthesis.pending) {
        this.synthesis.cancel();
      }
      
      const warmUp = new SpeechSynthesisUtterance(' ');
      warmUp.volume = 0.01; // Nearly silent
      warmUp.rate = 2; // Fast
      
      warmUp.onend = () => {
        console.log('[Voice] ✅ TTS warmed up');
        resolve();
      };
      
      warmUp.onerror = () => {
        console.log('[Voice] ⚠️ Warm-up failed (not critical)');
        resolve(); // Continue anyway
      };
      
      // Timeout fallback
      setTimeout(() => {
        console.log('[Voice] ⏰ Warm-up timeout (continuing)');
        resolve();
      }, 500);
      
      this.synthesis.speak(warmUp);
    });
  }

  /**
   * Stop the tour
   */
  stopTour(): void {
    this.stopListening();
    this.stopSpeaking();
    this.clearSilenceTimer();
    this.setMode('dormant');
    this.currentArtwork = null;
  }

  /**
   * Handle artwork transition
   */
  async onArtworkChange(newArtworkId: string, newArtworkTitle: string): Promise<void> {
    // Stop current activities
    this.stopSpeaking();
    
    // Update context
    const previousArtwork = this.currentArtwork;
    this.currentArtwork = { id: newArtworkId, title: newArtworkTitle };

    this.setMode('speaking');

    // Proactive context switch
    const transition = this.generateTransition(previousArtwork?.title, newArtworkTitle);
    await this.speak(transition);

    // Resume listening
    this.startListening();
  }

  /**
   * Start listening for user speech
   */
  private startListening(): void {
    if (!this.recognition || !this.isInitialized) {
      console.error('[Voice] Recognition not initialized');
      return;
    }

    if (this.mode === 'listening') {
      console.log('[Voice] Already listening, skipping start');
      return;
    }

    try {
      console.log('[Voice] Starting recognition...');
      this.recognition.start();
      this.setMode('listening');
      this.resetSilenceTimer();
      console.log('[Voice] ✅ Started listening');
    } catch (error: any) {
      // If already started, just update mode
      if (error.message && error.message.includes('already started')) {
        console.log('[Voice] Recognition already started, just updating mode');
        this.setMode('listening');
        this.resetSilenceTimer();
      } else {
        console.error('[Voice] Failed to start listening:', error);
      }
    }
  }

  /**
   * Start listening in background (while speaking)
   * This allows interruption
   */
  private startBackgroundListening(): void {
    if (!this.recognition || !this.isInitialized) {
      console.error('[Voice] Recognition not initialized');
      return;
    }

    try {
      console.log('[Voice] 🎧 Starting background listening (for interruptions)...');
      this.recognition.start();
      // Don't change mode - stay in 'speaking' mode
      console.log('[Voice] ✅ Background listening active');
    } catch (error: any) {
      // If already started, that's fine
      if (error.message && error.message.includes('already started')) {
        console.log('[Voice] Background listening already active');
      } else {
        console.error('[Voice] Failed to start background listening:', error);
      }
    }
  }

  /**
   * Stop listening
   */
  private stopListening(): void {
    if (this.recognition && this.mode === 'listening') {
      try {
        this.recognition.stop();
        console.log('[Voice] Stopped listening');
      } catch (error) {
        console.error('[Voice] Error stopping recognition:', error);
      }
    }
    this.clearSilenceTimer();
  }

  /**
   * Speak text using TTS
   */
  async speak(text: string): Promise<void> {
    console.log(`[Voice] 🔊 Starting to speak: "${text.substring(0, 50)}..."`);
    
    return new Promise((resolve, reject) => {
      // Stop any current speech
      this.stopSpeaking();

      // IMPORTANT: Ensure voices are loaded
      let voices = this.synthesis.getVoices();
      
      // If no voices loaded yet, wait for them
      if (voices.length === 0) {
        console.log('[Voice] ⏳ Waiting for voices to load...');
        this.synthesis.onvoiceschanged = () => {
          voices = this.synthesis.getVoices();
          console.log(`[Voice] ✅ Loaded ${voices.length} voices`);
          this.doSpeak(text, voices, resolve, reject);
        };
        
        // Timeout fallback
        setTimeout(() => {
          voices = this.synthesis.getVoices();
          if (voices.length === 0) {
            console.warn('[Voice] ⚠️ No voices loaded after timeout, using default');
          }
          this.doSpeak(text, voices, resolve, reject);
        }, 1000);
      } else {
        this.doSpeak(text, voices, resolve, reject);
      }
    });
  }

  /**
   * Speak with interruption support
   * Returns a promise that resolves when speech finishes OR is interrupted
   */
  async speakWithInterruption(text: string): Promise<'completed' | 'interrupted'> {
    console.log(`[Voice] 🔊🎧 Speaking with interruption support: "${text.substring(0, 50)}..."`);
    
    return new Promise(async (resolve) => {
      let wasInterrupted = false;
      let speechStarted = false;

      // CRITICAL: Ensure recognition is actually running
      console.log('[Voice] 🎧 Ensuring recognition is active for interruption detection');
      
      try {
        // If recognition is not running, start it
        if (this.mode !== 'listening') {
          console.log('[Voice] 🔄 Recognition not running, restarting it...');
          try {
            this.recognition.start();
            console.log('[Voice] ✅ Recognition restarted successfully');
          } catch (error: any) {
            if (error.message && error.message.includes('already started')) {
              console.log('[Voice] ✅ Recognition already running');
            } else {
              console.error('[Voice] ❌ Failed to start recognition:', error);
            }
          }
        } else {
          console.log('[Voice] ✅ Recognition already active');
        }
      } catch (error) {
        console.error('[Voice] Error ensuring recognition:', error);
      }

      // Start speaking
      try {
        // Ensure voices loaded
        let voices = this.synthesis.getVoices();
        if (voices.length === 0) {
          console.log('[Voice] ⏳ Waiting for voices...');
          await new Promise(r => setTimeout(r, 500));
          voices = this.synthesis.getVoices();
        }

        // Cancel any existing speech
        if (this.synthesis.speaking || this.synthesis.pending) {
          console.log('[Voice] 🛑 Canceling pending speech');
          this.synthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configure voice
        const preferredVoice = voices.find(v => 
          v.name.includes('Google US English') || 
          v.name.includes('Samantha') ||
          v.name.includes('Microsoft David') ||
          (v.lang.startsWith('en') && v.localService)
        );
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
          console.log(`[Voice] 🎵 Using voice: ${preferredVoice.name}`);
        }

        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.lang = 'en-US';

        // Handle speech events
        utterance.onstart = () => {
          speechStarted = true;
          console.log(`[Voice] ▶️ Speaking started (${text.length} chars) - LISTENING FOR INTERRUPTIONS`);
          this.setMode('speaking');
          
          // Double-check recognition is running
          console.log('[Voice] 🔍 Checking recognition state during speech...');
          setTimeout(() => {
            try {
              // If recognition stopped, restart it
              this.recognition.start();
              console.log('[Voice] ✅ Recognition confirmed active during speech');
            } catch (e: any) {
              if (e.message && e.message.includes('already started')) {
                console.log('[Voice] ✅ Recognition confirmed already running');
              } else {
                console.error('[Voice] ⚠️ Could not confirm recognition state:', e);
              }
            }
          }, 100);
        };

        utterance.onend = () => {
          console.log('[Voice] ✅ Speaking finished');
          if (!wasInterrupted) {
            resolve('completed');
          }
        };

        utterance.onerror = (event: any) => {
          console.error('[Voice] ❌ Speech error:', event.error);
          if (event.error === 'interrupted' || wasInterrupted) {
            resolve('interrupted');
          } else {
            resolve('completed');
          }
        };

        // Set up interruption handler BEFORE speaking
        const checkForInterruption = (event: any) => {
          if (!speechStarted || wasInterrupted) return;
          
          const last = event.results.length - 1;
          const result = event.results[last];
          const transcript = result[0].transcript;
          const isFinal = result.isFinal;
          
          console.log(`[Voice] 🎤 Detected speech during speaking: "${transcript}" (final: ${isFinal})`);
          
          // Check if user is speaking during our speech
          if (isFinal && transcript.trim().length > 3 && this.mode === 'speaking') {
            console.log(`[Voice] 🚨 INTERRUPTION DETECTED: "${transcript}"`);
            wasInterrupted = true;
            
            // Stop speaking immediately
            this.synthesis.cancel();
            console.log('[Voice] 🛑 Cancelled speech due to interruption');
            
            // Process the interruption
            this.setMode('thinking');
            
            // Notify the chat interface
            if (this.onTranscript) {
              console.log('[Voice] 📣 Sending interruption to chat interface');
              this.onTranscript(transcript, true);
            }
            
            // Clean up
            this.recognition.onresult = originalOnResult;
            resolve('interrupted');
          } else if (!isFinal) {
            console.log('[Voice] 👂 Interim speech detected, waiting for final...');
          }
        };

        // Temporarily replace the onresult handler
        const originalOnResult = this.recognition.onresult;
        this.recognition.onresult = (event: any) => {
          console.log('[Voice] 📡 Recognition result received during speech');
          // Check for interruption
          checkForInterruption(event);
          
          // Also call original handler if not interrupted
          if (!wasInterrupted && originalOnResult) {
            originalOnResult.call(this.recognition, event);
          }
        };

        // Start speaking
        console.log('[Voice] 📢 Starting speech synthesis...');
        this.synthesis.speak(utterance);

        // Timeout safety
        setTimeout(() => {
          if (!speechStarted && !wasInterrupted) {
            console.log('[Voice] ⚠️ Speech timeout, resolving as completed');
            this.recognition.onresult = originalOnResult;
            resolve('completed');
          }
        }, 3000);

      } catch (error) {
        console.error('[Voice] Error in speakWithInterruption:', error);
        resolve('interrupted');
      }
    });
  }

  /**
   * Actually perform the speech
   */
  private doSpeak(
    text: string, 
    voices: SpeechSynthesisVoice[], 
    resolve: () => void, 
    reject: (error: any) => void
  ): void {
    // IMPORTANT: Cancel any pending speech first
    if (this.synthesis.speaking || this.synthesis.pending) {
      console.log('[Voice] 🛑 Canceling pending speech');
      this.synthesis.cancel();
    }

    this.currentUtterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice - try multiple options
    console.log(`[Voice] 🎤 Selecting from ${voices.length} available voices`);
    
    const preferredVoice = voices.find(v => 
      v.name.includes('Google US English') || 
      v.name.includes('Samantha') ||
      v.name.includes('Microsoft David') ||
      v.name.includes('Microsoft Zira') ||
      (v.lang.startsWith('en') && v.localService)
    );
    
    if (preferredVoice) {
      console.log(`[Voice] 🎵 Using voice: ${preferredVoice.name}`);
      this.currentUtterance.voice = preferredVoice;
    } else if (voices.length > 0) {
      console.log(`[Voice] 🎵 Using default voice: ${voices[0].name}`);
      this.currentUtterance.voice = voices[0];
    } else {
      console.warn('[Voice] ⚠️ No voices available, using system default');
    }

    this.currentUtterance.rate = 0.95;
    this.currentUtterance.pitch = 1.0;
    this.currentUtterance.volume = 1.0;
    this.currentUtterance.lang = 'en-US';

    let hasStarted = false;
    let safetyTimeout: NodeJS.Timeout;

    this.currentUtterance.onstart = () => {
      clearTimeout(safetyTimeout);
      hasStarted = true;
      console.log(`[Voice] ▶️ Speaking started (${text.length} chars)`);
      this.setMode('speaking');
    };

    this.currentUtterance.onend = () => {
      clearTimeout(safetyTimeout);
      console.log('[Voice] ✅ Speaking finished');
      this.currentUtterance = null;
      resolve();
    };

    this.currentUtterance.onerror = (event: any) => {
      clearTimeout(safetyTimeout);
      console.error('[Voice] ❌ Speech synthesis error:', event.error);
      this.currentUtterance = null;
      
      // Don't reject on cancel errors
      if (event.error === 'canceled' || event.error === 'interrupted') {
        console.log('[Voice] Speech was canceled/interrupted, resolving anyway');
        resolve();
      } else {
        reject(event);
      }
    };

    // Safety timeout - if speech doesn't start in 3 seconds, something is wrong
    safetyTimeout = setTimeout(() => {
      if (!hasStarted) {
        console.error('[Voice] ⚠️ Speech did not start within 3 seconds, forcing completion');
        console.log('[Voice] Speech synthesis state:', {
          speaking: this.synthesis.speaking,
          pending: this.synthesis.pending,
          paused: this.synthesis.paused
        });
        this.synthesis.cancel();
        this.currentUtterance = null;
        resolve();
      }
    }, 3000);

    console.log('[Voice] 📢 Queuing speech...');
    
    // Small delay before speaking (helps with some browsers)
    setTimeout(() => {
      this.synthesis.speak(this.currentUtterance!);
      console.log('[Voice] Speech queued in synthesis');
    }, 50);
  }

  /**
   * Stop current speech
   */
  private stopSpeaking(): void {
    if (this.synthesis.speaking) {
      this.synthesis.cancel();
      this.currentUtterance = null;
    }
  }

  /**
   * Handle user speech input
   */
  private handleUserSpeech(transcript: string): void {
    console.log(`[Voice] Processing user speech: "${transcript}"`);
    
    // Only stop listening if we're NOT in speaking mode (interruption handled separately)
    if (this.mode !== 'speaking') {
      this.stopListening();
    }
    
    this.setMode('thinking');

    // This will be handled by the ChatInterface
    // The transcript is already sent via onTranscript callback
    // After AI responds and speaks, we'll resume listening
  }

  /**
   * Handle interruption while speaking
   */
  private handleInterruption(transcript: string, isFinal: boolean): void {
    console.log(`[Voice] 🚨 User interrupted! Transcript: "${transcript}"`);
    
    // Stop current speech immediately
    this.stopSpeaking();
    
    // If it's a final transcript, process it
    if (isFinal && transcript.trim().length > 0) {
      console.log(`[Voice] Processing interruption: "${transcript}"`);
      
      // Notify listeners
      if (this.onTranscript) {
        this.onTranscript(transcript, true);
      }
      
      // Stop listening and switch to thinking mode
      this.stopListening();
      this.setMode('thinking');
    } else {
      // Just interim, keep listening
      if (this.onTranscript) {
        this.onTranscript(transcript, false);
      }
    }
  }

  /**
   * Resume listening after AI response
   */
  resumeListening(): void {
    console.log('[Voice] Resuming listening after response...');
    
    // Make sure we're not already listening
    if (this.mode === 'listening') {
      console.log('[Voice] Already in listening mode, no need to resume');
      return;
    }
    
    // Small delay to ensure speech synthesis has fully completed
    setTimeout(() => {
      this.startListening();
    }, 300);
  }

  /**
   * Handle silence (proactive help)
   */
  private handleSilence(): void {
    if (this.mode !== 'listening') return;

    console.log('[Voice] Silence detected, offering help...');
    
    const offers = [
      "Feel free to ask me anything when you're ready.",
      "Take your time. I'm here if you have any questions.",
      "Let me know if you'd like to hear more about this piece.",
      "I'm here to help whenever you're ready."
    ];

    const randomOffer = offers[Math.floor(Math.random() * offers.length)];
    
    this.speak(randomOffer).then(() => {
      this.resumeListening();
    });
  }

  /**
   * Silence timer management
   */
  private resetSilenceTimer(): void {
    this.clearSilenceTimer();
    
    if (this.mode === 'listening') {
      this.silenceTimer = setTimeout(() => {
        this.handleSilence();
      }, this.silenceTimeout);
    }
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  /**
   * Generate proactive greeting
   */
  private generateGreeting(artworkTitle: string): string {
    const greetings = [
      `Welcome. I'm here to be your guide. You're viewing "${artworkTitle}." What would you like to know?`,
      `Good to see you. This is "${artworkTitle}." I'd be happy to tell you about it.`,
      `Hello. You're standing before "${artworkTitle}." Feel free to ask me anything about this piece.`
    ];
    
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  /**
   * Generate transition message
   */
  private generateTransition(fromTitle: string | undefined, toTitle: string): string {
    if (!fromTitle) {
      return `Ah, "${toTitle}." This is a wonderful piece. Shall I tell you about it?`;
    }
    
    const transitions = [
      `Ah, I see you've found "${toTitle}." Let me tell you about this one.`,
      `Moving to "${toTitle}." This is quite remarkable. What would you like to know?`,
      `"${toTitle}." An excellent choice. How can I help you explore this piece?`
    ];
    
    return transitions[Math.floor(Math.random() * transitions.length)];
  }

  /**
   * Mode management
   */
  private setMode(mode: VoiceMode): void {
    if (this.mode === mode) return;
    
    console.log(`[Voice] Mode: ${this.mode} → ${mode}`);
    this.mode = mode;
    
    if (this.onModeChange) {
      this.onModeChange(mode);
    }
  }

  getMode(): VoiceMode {
    return this.mode;
  }

  /**
   * Event listeners
   */
  onModeChanged(callback: (mode: VoiceMode) => void): void {
    this.onModeChange = callback;
  }

  onTranscriptReceived(callback: (text: string, isFinal: boolean) => void): void {
    this.onTranscript = callback;
  }

  onSpeechEnded(callback: () => void): void {
    this.onSpeechEnd = callback;
  }

  onErrorOccurred(callback: (error: string) => void): void {
    this.onError = callback;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopTour();
    this.recognition = null;
    this.isInitialized = false;
  }

  /**
   * Check if voice is supported
   */
  static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const hasSynthesis = 'speechSynthesis' in window;
    
    return !!(SpeechRecognition && hasSynthesis);
  }
}