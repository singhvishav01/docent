// // src/lib/voice/DocentVoiceManager.ts
// /**
//  * Docent Voice Conversation Manager
//  * Handles continuous voice interaction for the Docent AI guide
//  * - Proactive greetings
//  * - Continuous listening
//  * - Natural conversation flow
//  * - Context-aware responses
//  */

 import { Public } from "@prisma/client/runtime/library";
 function forceInitializeSpeechSynthesis(): Promise<void> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    
    // Cancel any stuck speech
    synth.cancel();
    
    // Get voices (this wakes up the engine)
    let voices = synth.getVoices();
    
    if (voices.length > 0) {
      console.log('[Voice] 🔧 Speech engine already initialized');
      resolve();
      return;
    }
    
    // Wait for voices to load
    console.log('[Voice] 🔧 Initializing speech engine...');
    
    let attempts = 0;
    const checkVoices = setInterval(() => {
      voices = synth.getVoices();
      attempts++;
      
      if (voices.length > 0) {
        console.log(`[Voice] ✅ Speech engine initialized (${voices.length} voices)`);
        clearInterval(checkVoices);
        resolve();
      } else if (attempts > 20) { // 2 seconds max
        console.warn('[Voice] ⚠️ Could not load voices, continuing anyway');
        clearInterval(checkVoices);
        resolve();
      }
    }, 100);
    
    // Trigger voice loading
    synth.onvoiceschanged = () => {
      voices = synth.getVoices();
      if (voices.length > 0) {
        console.log(`[Voice] ✅ Voices loaded via event (${voices.length})`);
      }
    };
  });
}

/**
 * Speak with REAL verification that audio is playing
 * Uses polling to verify speech is actually happening
 */
function speakWithVerification(
  synthesis: SpeechSynthesis,
  utterance: SpeechSynthesisUtterance,
  text: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    let hasStarted = false;
    let keepAliveInterval: NodeJS.Timeout;
    let safetyTimeout: NodeJS.Timeout;

    utterance.onstart = () => {
      console.log('[Voice] ▶️ Speech started');
      hasStarted = true;
      // Keep-alive ping every 10s to prevent Chrome's 15-second TTS cutoff bug
      keepAliveInterval = setInterval(() => {
        if (synthesis.speaking) {
          synthesis.pause();
          synthesis.resume();
        }
      }, 10000);
    };

    utterance.onend = () => {
      console.log('[Voice] ✅ Speech completed');
      clearInterval(keepAliveInterval);
      clearTimeout(safetyTimeout);
      resolve();
    };

    utterance.onerror = (event: any) => {
      clearInterval(keepAliveInterval);
      clearTimeout(safetyTimeout);
      // 'canceled' and 'interrupted' are not real errors — the caller handles them
      if (event.error === 'canceled' || event.error === 'interrupted') {
        console.log(`[Voice] Speech ${event.error} (not an error)`);
        resolve();
      } else {
        console.error('[Voice] ❌ Speech error:', event.error);
        reject(new Error(event.error));
      }
    };

    // Safety timeout — estimate ~80ms per character, minimum 5s, max 60s
    const estimatedMs = Math.min(60000, Math.max(5000, text.length * 80));
    safetyTimeout = setTimeout(() => {
      console.warn('[Voice] ⚠️ Speech safety timeout, resolving');
      clearInterval(keepAliveInterval);
      if (!hasStarted) synthesis.cancel();
      resolve();
    }, estimatedMs + 5000);

    console.log(`[Voice] 📢 Queuing speech (${text.length} chars)...`);
    synthesis.speak(utterance);
  });
}

// export type VoiceMode = 'dormant' | 'listening' | 'thinking' | 'speaking';

// export interface VoiceConfig {
//   autoStart?: boolean;
//   silenceTimeout?: number; // ms before offering help
//   language?: string;
//   voice?: string;
// }

// export interface VoiceEvent {
//   type: 'mode-change' | 'speech-detected' | 'speech-end' | 'error';
//   data?: any;
// }

// export class DocentVoiceManager {
//   private mode: VoiceMode = 'dormant';
//   private recognition: any = null; // SpeechRecognition
//   private synthesis: SpeechSynthesis;
//   private currentUtterance: SpeechSynthesisUtterance | null = null;
  
//   private silenceTimer: NodeJS.Timeout | null = null;
//   private silenceTimeout: number = 30000; // 30 seconds
  
//   private onModeChange?: (mode: VoiceMode) => void;
//   private onTranscript?: (text: string, isFinal: boolean) => void;
//   private onSpeechEnd?: () => void;
//   private onError?: (error: string) => void;
  
//   private isInitialized = false;
//   private currentArtwork: { id: string; title: string } | null = null;

//   constructor(config: VoiceConfig = {}) {
//     this.silenceTimeout = config.silenceTimeout || 30000;
    
//     // Initialize Web Speech API
//     if (typeof window !== 'undefined') {
//       this.synthesis = window.speechSynthesis;
      
//       // Pre-load voices
//       this.preloadVoices();
      
//       this.initializeSpeechRecognition();
//     } else {
//       throw new Error('DocentVoiceManager requires browser environment');
//     }
//   }

//   /**
//    * Pre-load voices to ensure they're available when needed
//    */
//   private preloadVoices(): void {
//     // Get voices immediately
//     let voices = this.synthesis.getVoices();
    
//     if (voices.length > 0) {
//       console.log(`[Voice] 🎵 Pre-loaded ${voices.length} voices`);
//       voices.forEach((voice, i) => {
//         if (i < 3) console.log(`[Voice]   - ${voice.name} (${voice.lang})`);
//       });
//     } else {
//       console.log('[Voice] ⏳ Voices not loaded yet, waiting...');
//       // Set up listener for when voices load
//       this.synthesis.onvoiceschanged = () => {
//         voices = this.synthesis.getVoices();
//         console.log(`[Voice] 🎵 Voices loaded: ${voices.length} available`);
//         voices.forEach((voice, i) => {
//           if (i < 3) console.log(`[Voice]   - ${voice.name} (${voice.lang})`);
//         });
//       };
//     }
//   }

//   private initializeSpeechRecognition() {
//     // @ts-ignore - WebKit prefixes
//     const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
//     if (!SpeechRecognition) {
//       console.error('Speech recognition not supported in this browser');
//       return;
//     }

//     this.recognition = new SpeechRecognition();
//     this.recognition.continuous = true; // Keep listening
//     this.recognition.interimResults = true; // Get partial results
//     this.recognition.lang = 'en-US';
//     this.recognition.maxAlternatives = 1;

//     // Handle speech results
//     this.recognition.onresult = (event: any) => {
//       const last = event.results.length - 1;
//       const result = event.results[last];
//       const transcript = result[0].transcript;
//       const isFinal = result.isFinal;

//       console.log(`[Voice] ${isFinal ? 'Final' : 'Interim'}: "${transcript}"`);
      
//       // INTERRUPTION DETECTION: If we're speaking and user speaks, stop!
//       if (this.mode === 'speaking' && transcript.trim().length > 2) {
//         console.log('[Voice] 🛑 INTERRUPTION detected while speaking!');
//         this.handleInterruption(transcript, isFinal);
//         return;
//       }
      
//       // Reset silence timer when speech detected
//       this.resetSilenceTimer();
      
//       // Notify listeners
//       if (this.onTranscript) {
//         this.onTranscript(transcript, isFinal);
//       }

//       // If final, prepare to respond
//       if (isFinal && transcript.trim().length > 0) {
//         this.handleUserSpeech(transcript);
//       }
//     };

//     // Handle speech end
//     this.recognition.onspeechend = () => {
//       console.log('[Voice] Speech ended');
//       if (this.onSpeechEnd) {
//         this.onSpeechEnd();
//       }
//     };

//     // Handle errors
//     this.recognition.onerror = (event: any) => {
//       console.error('[Voice] Recognition error:', event.error);
      
//       // Don't treat "no-speech" as an error, just continue listening
//       if (event.error === 'no-speech') {
//         return;
//       }
      
//       if (this.onError) {
//         this.onError(event.error);
//       }

//       // Restart if needed
//       if (this.mode === 'listening' && event.error !== 'aborted') {
//         setTimeout(() => this.startListening(), 1000);
//       }
//     };

//     // Auto-restart when recognition ends (for continuous mode)
//     this.recognition.onend = () => {
//       console.log('[Voice] Recognition ended');
//       if (this.mode === 'listening') {
//         console.log('[Voice] Auto-restarting recognition...');
//         setTimeout(() => this.startListening(), 100);
//       }
//     };

//     this.isInitialized = true;
//   }

//   /**
//    * Start the voice tour
//    */
//   async startTour(artworkId: string, artworkTitle: string): Promise<void> {
//     this.currentArtwork = { id: artworkId, title: artworkTitle };
    
//     console.log('[Voice] 🎬 Starting tour...');
    
//     // Warm up TTS first (especially important for Windows)
//     await this.warmUpTTS();
    
//     this.setMode('speaking');

//     // Winston's proactive greeting
//     const greeting = this.generateGreeting(artworkTitle);
    
//     try {
//       await this.speak(greeting);
//       console.log('[Voice] ✅ Greeting completed');
//     } catch (error) {
//       console.error('[Voice] ❌ Greeting failed:', error);
//       // Continue anyway - don't block the tour
//     }

//     // After greeting (or if it failed), start listening
//     this.startListening();
//   }

//   /**
//    * Warm up TTS engine with a short utterance
//    * This helps especially on Windows where first utterance can fail
//    */
//   private async warmUpTTS(): Promise<void> {
//     console.log('[Voice] 🔥 Warming up TTS engine...');
    
//     return new Promise((resolve) => {
//       // Cancel any stuck speech
//       if (this.synthesis.speaking || this.synthesis.pending) {
//         this.synthesis.cancel();
//       }
      
//       const warmUp = new SpeechSynthesisUtterance(' ');
//       warmUp.volume = 0.01; // Nearly silent
//       warmUp.rate = 2; // Fast
      
//       warmUp.onend = () => {
//         console.log('[Voice] ✅ TTS warmed up');
//         resolve();
//       };
      
//       warmUp.onerror = () => {
//         console.log('[Voice] ⚠️ Warm-up failed (not critical)');
//         resolve(); // Continue anyway
//       };
      
//       // Timeout fallback
//       setTimeout(() => {
//         console.log('[Voice] ⏰ Warm-up timeout (continuing)');
//         resolve();
//       }, 500);
      
//       this.synthesis.speak(warmUp);
//     });
//   }

//   /**
//    * Stop the tour
//    */
//   stopTour(): void {
//     this.stopListening();
//     this.stopSpeaking();
//     this.clearSilenceTimer();
//     this.setMode('dormant');
//     this.currentArtwork = null;
//   }

//   /**
//    * Handle artwork transition
//    */
//   async onArtworkChange(newArtworkId: string, newArtworkTitle: string): Promise<void> {
//     // Stop current activities
//     this.stopSpeaking();
    
//     // Update context
//     const previousArtwork = this.currentArtwork;
//     this.currentArtwork = { id: newArtworkId, title: newArtworkTitle };

//     this.setMode('speaking');

//     // Proactive context switch
//     const transition = this.generateTransition(previousArtwork?.title, newArtworkTitle);
//     await this.speak(transition);

//     // Resume listening
//     this.startListening();
//   }

//   /**
//    * Start listening for user speech
//    */
//   private startListening(): void {
//     if (!this.recognition || !this.isInitialized) {
//       console.error('[Voice] Recognition not initialized');
//       return;
//     }

//     if (this.mode === 'listening') {
//       console.log('[Voice] Already listening, skipping start');
//       return;
//     }

//     try {
//       console.log('[Voice] Starting recognition...');
//       this.recognition.start();
//       this.setMode('listening');
//       this.resetSilenceTimer();
//       console.log('[Voice] ✅ Started listening');
//     } catch (error: any) {
//       // If already started, just update mode
//       if (error.message && error.message.includes('already started')) {
//         console.log('[Voice] Recognition already started, just updating mode');
//         this.setMode('listening');
//         this.resetSilenceTimer();
//       } else {
//         console.error('[Voice] Failed to start listening:', error);
//       }
//     }
//   }

//   /**
//    * Start listening in background (while speaking)
//    * This allows interruption
//    */
//   private startBackgroundListening(): void {
//     if (!this.recognition || !this.isInitialized) {
//       console.error('[Voice] Recognition not initialized');
//       return;
//     }

//     try {
//       console.log('[Voice] 🎧 Starting background listening (for interruptions)...');
//       this.recognition.start();
//       // Don't change mode - stay in 'speaking' mode
//       console.log('[Voice] ✅ Background listening active');
//     } catch (error: any) {
//       // If already started, that's fine
//       if (error.message && error.message.includes('already started')) {
//         console.log('[Voice] Background listening already active');
//       } else {
//         console.error('[Voice] Failed to start background listening:', error);
//       }
//     }
//   }

//   /**
//    * Stop listening
//    */
//   public stopListening(): void {
//     if (this.recognition && this.mode === 'listening') {
//       try {
//         this.recognition.stop();
//         console.log('[Voice] Stopped listening');
//       } catch (error) {
//         console.error('[Voice] Error stopping recognition:', error);
//       }
//     }
//     this.clearSilenceTimer();
//   }

//   /**
//    * Speak text using TTS
//    */
//   async speak(text: string): Promise<void> {
//     console.log(`[Voice] 🔊 Starting to speak: "${text.substring(0, 50)}..."`);
    
//     return new Promise((resolve, reject) => {
//       // Stop any current speech
//       this.stopSpeaking();

//       // IMPORTANT: Ensure voices are loaded
//       let voices = this.synthesis.getVoices();
      
//       // If no voices loaded yet, wait for them
//       if (voices.length === 0) {
//         console.log('[Voice] ⏳ Waiting for voices to load...');
//         this.synthesis.onvoiceschanged = () => {
//           voices = this.synthesis.getVoices();
//           console.log(`[Voice] ✅ Loaded ${voices.length} voices`);
//           this.doSpeak(text, voices, resolve, reject);
//         };
        
//         // Timeout fallback
//         setTimeout(() => {
//           voices = this.synthesis.getVoices();
//           if (voices.length === 0) {
//             console.warn('[Voice] ⚠️ No voices loaded after timeout, using default');
//           }
//           this.doSpeak(text, voices, resolve, reject);
//         }, 1000);
//       } else {
//         this.doSpeak(text, voices, resolve, reject);
//       }
//     });
//   }

//   /**
//    * Speak with interruption support
//    * Returns a promise that resolves when speech finishes OR is interrupted
//    */
//   async speakWithInterruption(text: string): Promise<'completed' | 'interrupted'> {
//     console.log(`[Voice] 🔊🎧 Speaking with interruption support: "${text.substring(0, 50)}..."`);
    
//     return new Promise(async (resolve) => {
//       let wasInterrupted = false;
//       let speechStarted = false;

//       // CRITICAL: Ensure recognition is actually running
//       console.log('[Voice] 🎧 Ensuring recognition is active for interruption detection');
      
//       try {
//         // If recognition is not running, start it
//         if (this.mode !== 'listening') {
//           console.log('[Voice] 🔄 Recognition not running, restarting it...');
//           try {
//             this.recognition.start();
//             console.log('[Voice] ✅ Recognition restarted successfully');
//           } catch (error: any) {
//             if (error.message && error.message.includes('already started')) {
//               console.log('[Voice] ✅ Recognition already running');
//             } else {
//               console.error('[Voice] ❌ Failed to start recognition:', error);
//             }
//           }
//         } else {
//           console.log('[Voice] ✅ Recognition already active');
//         }
//       } catch (error) {
//         console.error('[Voice] Error ensuring recognition:', error);
//       }

//       // Start speaking
//       try {
//         // Ensure voices loaded
//         let voices = this.synthesis.getVoices();
//         if (voices.length === 0) {
//           console.log('[Voice] ⏳ Waiting for voices...');
//           await new Promise(r => setTimeout(r, 500));
//           voices = this.synthesis.getVoices();
//         }

//         // Cancel any existing speech
//         if (this.synthesis.speaking || this.synthesis.pending) {
//           console.log('[Voice] 🛑 Canceling pending speech');
//           this.synthesis.cancel();
//         }

//         const utterance = new SpeechSynthesisUtterance(text);
        
//         // Configure voice
//         const preferredVoice = voices.find(v => 
//           v.name.includes('Google US English') || 
//           v.name.includes('Samantha') ||
//           v.name.includes('Microsoft David') ||
//           (v.lang.startsWith('en') && v.localService)
//         );
        
//         if (preferredVoice) {
//           utterance.voice = preferredVoice;
//           console.log(`[Voice] 🎵 Using voice: ${preferredVoice.name}`);
//         }

//         utterance.rate = 0.95;
//         utterance.pitch = 1.0;
//         utterance.volume = 1.0;
//         utterance.lang = 'en-US';

//         // Handle speech events
//         utterance.onstart = () => {
//           speechStarted = true;
//           console.log(`[Voice] ▶️ Speaking started (${text.length} chars) - LISTENING FOR INTERRUPTIONS`);
//           this.setMode('speaking');
          
//           // Double-check recognition is running
//           console.log('[Voice] 🔍 Checking recognition state during speech...');
//           setTimeout(() => {
//             try {
//               // If recognition stopped, restart it
//               this.recognition.start();
//               console.log('[Voice] ✅ Recognition confirmed active during speech');
//             } catch (e: any) {
//               if (e.message && e.message.includes('already started')) {
//                 console.log('[Voice] ✅ Recognition confirmed already running');
//               } else {
//                 console.error('[Voice] ⚠️ Could not confirm recognition state:', e);
//               }
//             }
//           }, 100);
//         };

//         utterance.onend = () => {
//           console.log('[Voice] ✅ Speaking finished');
//           if (!wasInterrupted) {
//             resolve('completed');
//           }
//         };

//         utterance.onerror = (event: any) => {
//           console.error('[Voice] ❌ Speech error:', event.error);
//           if (event.error === 'interrupted' || wasInterrupted) {
//             resolve('interrupted');
//           } else {
//             resolve('completed');
//           }
//         };

//         // Set up interruption handler BEFORE speaking
//         const checkForInterruption = (event: any) => {
//           if (!speechStarted || wasInterrupted) return;
          
//           const last = event.results.length - 1;
//           const result = event.results[last];
//           const transcript = result[0].transcript;
//           const isFinal = result.isFinal;
          
//           console.log(`[Voice] 🎤 Detected speech during speaking: "${transcript}" (final: ${isFinal})`);
          
//           // Check if user is speaking during our speech
//           if (isFinal && transcript.trim().length > 3 && this.mode === 'speaking') {
//             console.log(`[Voice] 🚨 INTERRUPTION DETECTED: "${transcript}"`);
//             wasInterrupted = true;
            
//             // Stop speaking immediately
//             this.synthesis.cancel();
//             console.log('[Voice] 🛑 Cancelled speech due to interruption');
            
//             // Process the interruption
//             this.setMode('thinking');
            
//             // Notify the chat interface
//             if (this.onTranscript) {
//               console.log('[Voice] 📣 Sending interruption to chat interface');
//               this.onTranscript(transcript, true);
//             }
            
//             // Clean up
//             this.recognition.onresult = originalOnResult;
//             resolve('interrupted');
//           } else if (!isFinal) {
//             console.log('[Voice] 👂 Interim speech detected, waiting for final...');
//           }
//         };

//         // Temporarily replace the onresult handler
//         const originalOnResult = this.recognition.onresult;
//         this.recognition.onresult = (event: any) => {
//           console.log('[Voice] 📡 Recognition result received during speech');
//           // Check for interruption
//           checkForInterruption(event);
          
//           // Also call original handler if not interrupted
//           if (!wasInterrupted && originalOnResult) {
//             originalOnResult.call(this.recognition, event);
//           }
//         };

//         // Start speaking
//         console.log('[Voice] 📢 Starting speech synthesis...');
//         this.synthesis.speak(utterance);

//         // Timeout safety
//         setTimeout(() => {
//           if (!speechStarted && !wasInterrupted) {
//             console.log('[Voice] ⚠️ Speech timeout, resolving as completed');
//             this.recognition.onresult = originalOnResult;
//             resolve('completed');
//           }
//         }, 3000);

//       } catch (error) {
//         console.error('[Voice] Error in speakWithInterruption:', error);
//         resolve('interrupted');
//       }
//     });
//   }

//   /**
//    * Actually perform the speech
//    */
//   private doSpeak(
//     text: string, 
//     voices: SpeechSynthesisVoice[], 
//     resolve: () => void, 
//     reject: (error: any) => void
//   ): void {
//     // IMPORTANT: Cancel any pending speech first
//     if (this.synthesis.speaking || this.synthesis.pending) {
//       console.log('[Voice] 🛑 Canceling pending speech');
//       this.synthesis.cancel();
//     }

//     this.currentUtterance = new SpeechSynthesisUtterance(text);
    
//     // Configure voice - try multiple options
//     console.log(`[Voice] 🎤 Selecting from ${voices.length} available voices`);
    
//     const preferredVoice = voices.find(v => 
//       v.name.includes('Google US English') || 
//       v.name.includes('Samantha') ||
//       v.name.includes('Microsoft David') ||
//       v.name.includes('Microsoft Zira') ||
//       (v.lang.startsWith('en') && v.localService)
//     );
    
//     if (preferredVoice) {
//       console.log(`[Voice] 🎵 Using voice: ${preferredVoice.name}`);
//       this.currentUtterance.voice = preferredVoice;
//     } else if (voices.length > 0) {
//       console.log(`[Voice] 🎵 Using default voice: ${voices[0].name}`);
//       this.currentUtterance.voice = voices[0];
//     } else {
//       console.warn('[Voice] ⚠️ No voices available, using system default');
//     }

//     this.currentUtterance.rate = 0.95;
//     this.currentUtterance.pitch = 1.0;
//     this.currentUtterance.volume = 1.0;
//     this.currentUtterance.lang = 'en-US';

//     let hasStarted = false;
//     let safetyTimeout: NodeJS.Timeout;

//     this.currentUtterance.onstart = () => {
//       clearTimeout(safetyTimeout);
//       hasStarted = true;
//       console.log(`[Voice] ▶️ Speaking started (${text.length} chars)`);
//       this.setMode('speaking');
//     };

//     this.currentUtterance.onend = () => {
//       clearTimeout(safetyTimeout);
//       console.log('[Voice] ✅ Speaking finished');
//       this.currentUtterance = null;
//       resolve();
//     };

//     this.currentUtterance.onerror = (event: any) => {
//       clearTimeout(safetyTimeout);
//       console.error('[Voice] ❌ Speech synthesis error:', event.error);
//       this.currentUtterance = null;
      
//       // Don't reject on cancel errors
//       if (event.error === 'canceled' || event.error === 'interrupted') {
//         console.log('[Voice] Speech was canceled/interrupted, resolving anyway');
//         resolve();
//       } else {
//         reject(event);
//       }
//     };

//     // Safety timeout - if speech doesn't start in 3 seconds, something is wrong
//     safetyTimeout = setTimeout(() => {
//       if (!hasStarted) {
//         console.error('[Voice] ⚠️ Speech did not start within 3 seconds, forcing completion');
//         console.log('[Voice] Speech synthesis state:', {
//           speaking: this.synthesis.speaking,
//           pending: this.synthesis.pending,
//           paused: this.synthesis.paused
//         });
//         this.synthesis.cancel();
//         this.currentUtterance = null;
//         resolve();
//       }
//     }, 3000);

//     console.log('[Voice] 📢 Queuing speech...');
    
//     // Small delay before speaking (helps with some browsers)
//     setTimeout(() => {
//       this.synthesis.speak(this.currentUtterance!);
//       console.log('[Voice] Speech queued in synthesis');
//     }, 50);
//   }

//   /**
//    * Stop current speech
//    */
//   public stopSpeaking(): void {
//     if (this.synthesis.speaking) {
//       this.synthesis.cancel();
//       this.currentUtterance = null;
//     }
//   }

//   /**
//    * Handle user speech input
//    */
//   private handleUserSpeech(transcript: string): void {
//     console.log(`[Voice] Processing user speech: "${transcript}"`);
    
//     // Only stop listening if we're NOT in speaking mode (interruption handled separately)
//     if (this.mode !== 'speaking') {
//       this.stopListening();
//     }
    
//     this.setMode('thinking');

//     // This will be handled by the ChatInterface
//     // The transcript is already sent via onTranscript callback
//     // After AI responds and speaks, we'll resume listening
//   }

//   /**
//    * Handle interruption while speaking
//    */
//   private handleInterruption(transcript: string, isFinal: boolean): void {
//     console.log(`[Voice] 🚨 User interrupted! Transcript: "${transcript}"`);
    
//     // Stop current speech immediately
//     this.stopSpeaking();
    
//     // If it's a final transcript, process it
//     if (isFinal && transcript.trim().length > 0) {
//       console.log(`[Voice] Processing interruption: "${transcript}"`);
      
//       // Notify listeners
//       if (this.onTranscript) {
//         this.onTranscript(transcript, true);
//       }
      
//       // Stop listening and switch to thinking mode
//       this.stopListening();
//       this.setMode('thinking');
//     } else {
//       // Just interim, keep listening
//       if (this.onTranscript) {
//         this.onTranscript(transcript, false);
//       }
//     }
//   }

//   /**
//    * Resume listening after AI response
//    */
//   resumeListening(): void {
//     console.log('[Voice] Resuming listening after response...');
    
//     // Make sure we're not already listening
//     if (this.mode === 'listening') {
//       console.log('[Voice] Already in listening mode, no need to resume');
//       return;
//     }
    
//     // Small delay to ensure speech synthesis has fully completed
//     setTimeout(() => {
//       this.startListening();
//     }, 300);
//   }

//   /**
//    * Handle silence (proactive help)
//    */
//   private handleSilence(): void {
//     if (this.mode !== 'listening') return;

//     console.log('[Voice] Silence detected, offering help...');
    
//     const offers = [
//       "Feel free to ask me anything when you're ready.",
//       "Take your time. I'm here if you have any questions.",
//       "Let me know if you'd like to hear more about this piece.",
//       "I'm here to help whenever you're ready."
//     ];

//     const randomOffer = offers[Math.floor(Math.random() * offers.length)];
    
//     this.speak(randomOffer).then(() => {
//       this.resumeListening();
//     });
//   }

//   /**
//    * Silence timer management
//    */
//   private resetSilenceTimer(): void {
//     this.clearSilenceTimer();
    
//     if (this.mode === 'listening') {
//       this.silenceTimer = setTimeout(() => {
//         this.handleSilence();
//       }, this.silenceTimeout);
//     }
//   }

//   private clearSilenceTimer(): void {
//     if (this.silenceTimer) {
//       clearTimeout(this.silenceTimer);
//       this.silenceTimer = null;
//     }
//   }

//   /**
//    * Generate proactive greeting
//    */
//   private generateGreeting(artworkTitle: string): string {
//     const greetings = [
//       `Welcome. I'm here to be your guide. You're viewing "${artworkTitle}." What would you like to know?`,
//       `Good to see you. This is "${artworkTitle}." I'd be happy to tell you about it.`,
//       `Hello. You're standing before "${artworkTitle}." Feel free to ask me anything about this piece.`
//     ];
    
//     return greetings[Math.floor(Math.random() * greetings.length)];
//   }

//   /**
//    * Generate transition message
//    */
//   private generateTransition(fromTitle: string | undefined, toTitle: string): string {
//     if (!fromTitle) {
//       return `Ah, "${toTitle}." This is a wonderful piece. Shall I tell you about it?`;
//     }
    
//     const transitions = [
//       `Ah, I see you've found "${toTitle}." Let me tell you about this one.`,
//       `Moving to "${toTitle}." This is quite remarkable. What would you like to know?`,
//       `"${toTitle}." An excellent choice. How can I help you explore this piece?`
//     ];
    
//     return transitions[Math.floor(Math.random() * transitions.length)];
//   }

//   /**
//    * Mode management
//    */
//   private setMode(mode: VoiceMode): void {
//     if (this.mode === mode) return;
    
//     console.log(`[Voice] Mode: ${this.mode} → ${mode}`);
//     this.mode = mode;
    
//     if (this.onModeChange) {
//       this.onModeChange(mode);
//     }
//   }

//   getMode(): VoiceMode {
//     return this.mode;
//   }

//   /**
//    * Event listeners
//    */
//   onModeChanged(callback: (mode: VoiceMode) => void): void {
//     this.onModeChange = callback;
//   }

//   onTranscriptReceived(callback: (text: string, isFinal: boolean) => void): void {
//     this.onTranscript = callback;
//   }

//   onSpeechEnded(callback: () => void): void {
//     this.onSpeechEnd = callback;
//   }

//   onErrorOccurred(callback: (error: string) => void): void {
//     this.onError = callback;
//   }

//   /**
//    * Cleanup
//    */
//   destroy(): void {
//     this.stopTour();
//     this.recognition = null;
//     this.isInitialized = false;
//   }

//   /**
//    * Check if voice is supported
//    */
//   static isSupported(): boolean {
//     if (typeof window === 'undefined') return false;
    
//     // @ts-ignore
//     const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
//     const hasSynthesis = 'speechSynthesis' in window;
    
//     return !!(SpeechRecognition && hasSynthesis);
//   }
// }

// src/lib/voice/DocentVoiceManager.ts
/**
 * Docent Voice Manager - FULLY FIXED VERSION
 * Handles Windows/Chrome speech synthesis issues
 */



export type VoiceMode = 'dormant' | 'listening' | 'thinking' | 'speaking';

export interface VoiceConfig {
  autoStart?: boolean;
  silenceTimeout?: number;
  language?: string;
  voice?: string;
}

// ============================================================================
// MAIN CLASS
// ============================================================================

export class DocentVoiceManager {
  private mode: VoiceMode = 'dormant';
  private recognition: any = null;
  private synthesis: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;

  private silenceTimer: NodeJS.Timeout | null = null;
  private silenceTimeout: number = 30000;
  
  private onModeChange?: (mode: VoiceMode) => void;
  private onTranscript?: (text: string, isFinal: boolean) => void;
  private onSpeechEnd?: () => void;
  private onError?: (error: string) => void;
  
  private isInitialized = false;
  private currentArtwork: { id: string; title: string } | null = null;

  // Sentence queue — enables speaking sentence-by-sentence as text streams in
  private sentenceQueue: string[] = [];
  private isProcessingQueue = false;
  private queueFinalized = false;

  // Prevent the silence-offer from looping until the user actually speaks
  private silenceOffered = false;

  constructor(config: VoiceConfig = {}) {
  this.silenceTimeout = config.silenceTimeout || 30000;
  
  if (typeof window !== 'undefined') {
    this.synthesis = window.speechSynthesis;
    
    // CRITICAL: Force initialize the speech engine
    forceInitializeSpeechSynthesis().then(() => {
      console.log('[Voice] 🎤 Speech synthesis ready');
    });
    
    this.initializeSpeechRecognition();
  } else {
    throw new Error('DocentVoiceManager requires browser environment');
  }
}
  private initializeSpeechRecognition() {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const result = event.results[last];
      const transcript = result[0].transcript;
      const isFinal = result.isFinal;

      console.log(`[Voice] ${isFinal ? 'Final' : 'Interim'}: "${transcript}"`);
      
      if (this.mode === 'speaking' && transcript.trim().length > 2) {
        console.log('[Voice] 🛑 INTERRUPTION!');
        this.handleInterruption(transcript, isFinal);
        return;
      }

      // User is speaking — reset the silence-offer gate so it can fire again later
      if (transcript.trim().length > 0) {
        this.silenceOffered = false;
      }

      this.resetSilenceTimer();
      
      if (this.onTranscript) {
        this.onTranscript(transcript, isFinal);
      }

      if (isFinal && transcript.trim().length > 0) {
        this.handleUserSpeech(transcript);
      }
    };

    this.recognition.onspeechend = () => {
      console.log('[Voice] Speech ended');
      if (this.onSpeechEnd) {
        this.onSpeechEnd();
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('[Voice] Recognition error:', event.error);
      
      if (event.error === 'no-speech') {
        return;
      }
      
      if (this.onError) {
        this.onError(event.error);
      }

      if (this.mode === 'listening' && event.error !== 'aborted') {
        setTimeout(() => this.startListening(), 1000);
      }
    };

    this.recognition.onend = () => {
      console.log('[Voice] Recognition ended');
      if (this.mode === 'listening') {
        console.log('[Voice] Restarting...');
        setTimeout(() => this.startListening(), 100);
      }
      // Note: 'speaking' mode restart is handled inside speakWithInterruption
      // via its own overridden onend, so we don't restart here.
    };

    this.isInitialized = true;
  }

  async startTour(artworkId: string, artworkTitle: string, visitorName?: string | null): Promise<void> {
    this.currentArtwork = { id: artworkId, title: artworkTitle };
    this.silenceOffered = false; // Reset for new tour session

    console.log('[Voice] 🎬 Starting tour...');

    await this.warmUpTTS();

    this.setMode('speaking');

    const greeting = this.generateGreeting(artworkTitle, visitorName);
    
    try {
      await this.speak(greeting);
      console.log('[Voice] ✅ Greeting done');
    } catch (error) {
      console.error('[Voice] ❌ Greeting failed:', error);
    }

    this.startListening();
  }

  private async warmUpTTS(): Promise<void> {
  console.log('[Voice] 🔥 Warming up TTS engine...');
  
  // Force initialize first
  await forceInitializeSpeechSynthesis();
  
  return new Promise((resolve) => {
    if (this.synthesis.speaking || this.synthesis.pending) {
      this.synthesis.cancel();
    }
    
    const warmUp = new SpeechSynthesisUtterance('test');
    warmUp.volume = 0.01;
    warmUp.rate = 2;
    
    let completed = false;
    
    warmUp.onend = () => {
      if (!completed) {
        completed = true;
        console.log('[Voice] ✅ TTS warmed up successfully');
        resolve();
      }
    };
    
    warmUp.onerror = () => {
      if (!completed) {
        completed = true;
        console.log('[Voice] ⚠️ Warm-up had error (not critical)');
        resolve();
      }
    };
    
    setTimeout(() => {
      if (!completed) {
        completed = true;
        console.log('[Voice] ⏰ Warm-up timeout (continuing)');
        resolve();
      }
    }, 1000);
    
    // Actually speak
    this.synthesis.speak(warmUp);
    
    // Verify it started
    setTimeout(() => {
      console.log('[Voice] 🔍 Warm-up check:', {
        speaking: this.synthesis.speaking,
        pending: this.synthesis.pending
      });
    }, 50);
  });
}

  async onArtworkChange(newArtworkId: string, newArtworkTitle: string): Promise<void> {
    this.stopSpeaking();
    
    const previousArtwork = this.currentArtwork;
    this.currentArtwork = { id: newArtworkId, title: newArtworkTitle };

    this.setMode('speaking');

    const transition = this.generateTransition(previousArtwork?.title, newArtworkTitle);
    await this.speak(transition);

    this.startListening();
  }

  private startListening(): void {
    if (!this.recognition || !this.isInitialized) {
      console.error('[Voice] Not initialized');
      return;
    }

    // Never restart if the tour has been stopped
    if (this.mode === 'dormant') {
      console.log('[Voice] Tour dormant, not starting recognition');
      return;
    }

    if (this.mode === 'listening') {
      console.log('[Voice] Already listening');
      return;
    }

    try {
      console.log('[Voice] Starting recognition...');
      this.recognition.start();
      this.setMode('listening');
      this.resetSilenceTimer();
      console.log('[Voice] ✅ Listening');
    } catch (error: any) {
      if (error.message && error.message.includes('already started')) {
        console.log('[Voice] Already started');
        this.setMode('listening');
        this.resetSilenceTimer();
      } else {
        console.error('[Voice] Start failed:', error);
      }
    }
  }

  public stopListening(): void {
    if (this.recognition && this.mode === 'listening') {
      try {
        this.recognition.stop();
        console.log('[Voice] Stopped');
      } catch (error) {
        console.error('[Voice] Stop error:', error);
      }
    }
    this.clearSilenceTimer();
  }

 async speak(text: string): Promise<void> {
  console.log(`[Voice] Speaking via OpenAI TTS: "${text.substring(0, 50)}..."`);
  this.stopSpeaking();
  this.setMode('speaking');
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error(`TTS API error: ${response.status}`);
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        console.log('[Voice] TTS completed');
        resolve();
      };
      audio.onerror = (err) => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        console.error('[Voice] Audio playback error:', err);
        reject(err);
      };
      await audio.play();
    } catch (error) {
      console.error('[Voice] TTS fetch failed:', error);
      reject(error);
    }
  });
}
  async speakWithInterruption(text: string): Promise<'completed' | 'interrupted'> {
    console.log(`[Voice] 🔊🎧 With interruption: "${text.substring(0, 50)}..."`);

    return new Promise(async (resolve) => {
      let wasInterrupted = false;
      let speechComplete = false;

      const originalOnResult = this.recognition.onresult;
      const originalOnEnd = this.recognition.onend;

      // Barge-in handler — applied fresh after every Chrome-forced restart
      const bargeinOnResult = (event: any) => {
        if (speechComplete || wasInterrupted) return;

        const last = event.results.length - 1;
        const result = event.results[last];
        const transcript = result[0].transcript;
        const isFinal = result.isFinal;

        if (isFinal && transcript.trim().length > 3 && this.mode === 'speaking') {
          console.log(`[Voice] 🚨 INTERRUPTION: "${transcript}"`);
          wasInterrupted = true;

          this.synthesis.cancel();
          this.setMode('thinking');

          if (this.onTranscript) {
            this.onTranscript(transcript, true);
          }

          this.recognition.onresult = originalOnResult;
          this.recognition.onend = originalOnEnd;
          resolve('interrupted');
        }
      };

      // Override onend so Chrome's forced restart during TTS re-applies barge-in handler
      this.recognition.onend = () => {
        if (speechComplete || wasInterrupted) {
          // Speech done — hand back to the regular onend
          this.recognition.onend = originalOnEnd;
          originalOnEnd?.call(this.recognition);
          return;
        }

        if (this.mode === 'speaking') {
          // Chrome aborted recognition mid-speech — restart with barge-in handler intact
          setTimeout(() => {
            if (this.mode === 'speaking' && !speechComplete && !wasInterrupted) {
              console.log('[Voice] Restarting recognition during speech for barge-in...');
              this.recognition.onresult = bargeinOnResult;
              try {
                this.recognition.start();
              } catch (e: any) {
                if (!e.message?.includes('already started')) {
                  console.warn('[Voice] Barge-in restart failed:', e);
                }
              }
            }
          }, 150);
        } else {
          this.recognition.onend = originalOnEnd;
          originalOnEnd?.call(this.recognition);
        }
      };

      // Start recognition and set barge-in handler
      this.recognition.onresult = bargeinOnResult;
      try {
        if (this.mode !== 'listening') {
          this.recognition.start();
        }
      } catch (error: any) {
        if (!error.message?.includes('already started')) {
          console.error('[Voice] Recognition start failed:', error);
        }
      }

      try {
        await this.speak(text);
        speechComplete = true;
        this.recognition.onresult = originalOnResult;
        this.recognition.onend = originalOnEnd;
        if (!wasInterrupted) {
          console.log('[Voice] ✅ Completed');
          resolve('completed');
        }
      } catch (error) {
        console.error('[Voice] Error during speak:', error);
        this.recognition.onresult = originalOnResult;
        this.recognition.onend = originalOnEnd;
        resolve('completed');
      }
    });
  }

  public stopSpeaking(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    if (this.synthesis?.speaking) {
      this.synthesis.cancel();
    }
    this.currentUtterance = null;
  }

  private handleUserSpeech(transcript: string): void {
    console.log(`[Voice] Processing: "${transcript}"`);
    
    if (this.mode !== 'speaking') {
      this.stopListening();
    }
    
    this.setMode('thinking');
  }

  private handleInterruption(transcript: string, isFinal: boolean): void {
    console.log(`[Voice] 🚨 Interrupted: "${transcript}"`);

    this.stopSpeaking();
    this.sentenceQueue = []; // Drop all pending sentences
    
    if (isFinal && transcript.trim().length > 0) {
      console.log(`[Voice] Processing`);
      
      if (this.onTranscript) {
        this.onTranscript(transcript, true);
      }
      
      this.stopListening();
      this.setMode('thinking');
    } else {
      if (this.onTranscript) {
        this.onTranscript(transcript, false);
      }
    }
  }

  // ── Sentence queue API ──────────────────────────────────────────────────────

  /**
   * Add one sentence to the TTS queue. Starts processing immediately if idle.
   * Call this for each sentence as it arrives from the streaming API response.
   */
  enqueueSentence(text: string): void {
    if (this.mode === 'dormant') return;
    const trimmed = text.trim();
    if (!trimmed) return;
    this.queueFinalized = false;
    this.sentenceQueue.push(trimmed);
    if (!this.isProcessingQueue) {
      this.runSentenceQueue();
    }
  }

  /**
   * Signal that no more sentences are coming for this response.
   * The queue will resume listening once it empties.
   */
  finalizeQueue(): void {
    this.queueFinalized = true;
    if (!this.isProcessingQueue && this.sentenceQueue.length === 0 && this.mode === 'speaking') {
      this.resumeListening();
    }
  }

  /**
   * Drop all pending sentences but let the current one finish naturally.
   * Use this for graceful artwork transitions.
   */
  clearQueueKeepCurrent(): void {
    this.sentenceQueue = [];
  }

  /**
   * Wait for the currently-playing sentence to end (or timeout).
   */
  waitForCurrentSentence(maxMs = 4000): Promise<void> {
    return new Promise(resolve => {
      if (!this.synthesis.speaking) { resolve(); return; }
      const deadline = setTimeout(() => {
        clearInterval(poll);
        this.synthesis.cancel();
        resolve();
      }, maxMs);
      const poll = setInterval(() => {
        if (!this.synthesis.speaking) {
          clearInterval(poll);
          clearTimeout(deadline);
          resolve();
        }
      }, 80);
    });
  }

  private async runSentenceQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;
    this.setMode('speaking');

    while (this.sentenceQueue.length > 0) {
      if (this.mode === 'dormant' || this.mode === 'thinking') break;
      const sentence = this.sentenceQueue.shift()!;
      try {
        await this.speak(sentence);
      } catch {
        this.sentenceQueue = [];
        break;
      }
      // Short natural breath between sentences
      if (this.sentenceQueue.length > 0 && this.mode === 'speaking') {
        await new Promise(r => setTimeout(r, 80));
      }
    }

    this.isProcessingQueue = false;
    if (this.queueFinalized && this.mode === 'speaking') {
      this.resumeListening();
    }
    // If not finalized, more sentences may still arrive — stay in speaking mode
  }

  // ── End sentence queue ───────────────────────────────────────────────────────

  stopTour(): void {
    this.stopListening();
    this.stopSpeaking();
    this.sentenceQueue = [];
    this.isProcessingQueue = false;
    this.queueFinalized = false;
    this.clearSilenceTimer();
    this.setMode('dormant');
    this.currentArtwork = null;
  }

  resumeListening(): void {
    // Don't resume if the tour has been explicitly stopped
    if (this.mode === 'dormant') {
      console.log('[Voice] Tour dormant, not resuming');
      return;
    }

    console.log('[Voice] Resuming...');

    if (this.mode === 'listening') {
      console.log('[Voice] Already listening');
      return;
    }

    setTimeout(() => {
      this.startListening();
    }, 300);
  }

  private handleSilence(): void {
    if (this.mode !== 'listening') return;

    console.log('[Voice] Silence...');

    // Mark that we've already offered help — don't repeat until user speaks
    this.silenceOffered = true;

    const offers = [
      "Feel free to ask me anything when you're ready.",
      "Take your time. I'm here if you have any questions.",
      "Let me know if you'd like to hear more.",
      "I'm here to help whenever you're ready."
    ];

    const randomOffer = offers[Math.floor(Math.random() * offers.length)];

    this.speak(randomOffer).then(() => {
      // Only resume if the tour is still active — prevents the greeting loop
      // after stopTour() has been called while speak() was in flight
      if (this.mode !== 'dormant') {
        this.resumeListening();
      }
    });
  }

  private resetSilenceTimer(): void {
    this.clearSilenceTimer();

    // Don't reschedule if we've already offered help and the user hasn't spoken yet
    if (this.silenceOffered) return;

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

  private generateGreeting(artworkTitle: string, visitorName?: string | null): string {
    // Dynamic greeting — imported lazily to avoid circular deps at module load
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { generateVoiceGreeting } = require('@/lib/ai/greeting-generator');
      return generateVoiceGreeting(visitorName ?? null, artworkTitle);
    } catch {
      // Fallback if module isn't available (e.g., during SSR)
      return visitorName
        ? `Welcome, ${visitorName}. You are looking at ${artworkTitle}. What would you like to know?`
        : `Welcome. You are looking at ${artworkTitle}. What would you like to know?`;
    }
  }

  private generateTransition(fromTitle: string | undefined, toTitle: string): string {
    if (!fromTitle) {
      return `Ah, "${toTitle}." This is wonderful. Shall I tell you about it?`;
    }
    
    const transitions = [
      `Moving to "${toTitle}." Let me tell you about this one.`,
      `"${toTitle}." This is remarkable. What would you like to know?`,
      `Ah, "${toTitle}." An excellent choice. How can I help?`
    ];
    
    return transitions[Math.floor(Math.random() * transitions.length)];
  }

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

  destroy(): void {
    this.stopTour();
    this.recognition = null;
    this.isInitialized = false;
  }

  static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const hasSynthesis = 'speechSynthesis' in window;
    
    return !!(SpeechRecognition && hasSynthesis);
  }
}