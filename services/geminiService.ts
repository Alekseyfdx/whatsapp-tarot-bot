import { GoogleGenAI, Modality, LiveServerMessage, Blob } from "@google/genai";
import { MODEL_CHAT, MODEL_IMAGE_GEN, MODEL_TTS, MODEL_LIVE, MODEL_VISION, MODEL_REASONING } from "../constants";
import { GroundingSource } from "../types";

let aiClient: GoogleGenAI | null = null;

const getClient = () => {
  if (!aiClient) {
    if (!process.env.API_KEY) {
      console.error("API Key is missing!");
      throw new Error("API Key is missing in process.env");
    }
    aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiClient;
};

// --- Helpers for Audio Encoding ---

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function addWavHeader(pcmData: Uint8Array, sampleRate: number, numChannels: number = 1, bitDepth: number = 16): Uint8Array {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // File length
  view.setUint32(4, 36 + pcmData.length, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // Format chunk identifier
  writeString(view, 12, 'fmt ');
  // Format chunk length
  view.setUint32(16, 16, true);
  // Sample format (1 is PCM)
  view.setUint16(20, 1, true);
  // Channels
  view.setUint16(22, numChannels, true);
  // Sample rate
  view.setUint32(24, sampleRate, true);
  // Byte rate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  // Block align (NumChannels * BitsPerSample/8)
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  // Bits per sample
  view.setUint16(34, bitDepth, true);
  // Data chunk identifier
  writeString(view, 36, 'data');
  // Data chunk length
  view.setUint32(40, pcmData.length, true);

  const wavBuffer = new Uint8Array(44 + pcmData.length);
  wavBuffer.set(new Uint8Array(header), 0);
  wavBuffer.set(pcmData, 44);
  return wavBuffer;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// --- Text & Vision Chat ---

export const generateResponse = async (
  history: { role: string; parts: { text?: string; inlineData?: any }[] }[],
  newMessage: string,
  systemInstruction: string,
  imageBase64?: string,
  useThinking: boolean = false
): Promise<{ text: string, sources?: GroundingSource[] }> => {
  const client = getClient();
  
  // Construct contents
  const contents = history.map(h => ({
    role: h.role,
    parts: h.parts
  }));

  const userParts: any[] = [{ text: newMessage }];
  
  let model = useThinking ? MODEL_REASONING : MODEL_CHAT;
  let config: any = {
    systemInstruction: systemInstruction,
    temperature: 0.7,
    tools: [{ googleSearch: {} }] // Enable Google Search Grounding
  };

  if (imageBase64) {
    userParts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageBase64
      }
    });
    // Use the powerful vision model if an image is present
    model = MODEL_VISION;
  }

  // Configure Thinking Mode if requested and no image (Thinking doesn't always support multimodal yet in all contexts, 
  // but if it does, the model selection logic might need adjustment. For now, prioritize Vision model for images, Reasoning for text)
  if (useThinking && !imageBase64) {
    config = {
       ...config,
       thinkingConfig: { thinkingBudget: 32768 }, // Max budget for deep reasoning
    };
    // Note: When using thinkingConfig, do not set maxOutputTokens unless you set it very high
  }

  // Add the new message to the ephemeral history we send
  contents.push({
    role: 'user',
    parts: userParts
  });

  try {
    const response = await client.models.generateContent({
      model: model,
      contents: contents,
      config: config
    });

    // Sanitize text to remove hallucinated image tags or links
    let text = response.text || "";
    text = text.replace(/!\[.*?\]\(.*?\)/g, ""); // Remove markdown images
    text = text.replace(/https:\/\/flux-[\w./-]+/g, ""); // Remove common hallucinated placeholder links
    text = text.trim();
    
    // Extract grounding chunks (sources)
    let sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (chunks) {
      sources = chunks
        .filter((c: any) => c.web?.uri && c.web?.title)
        .map((c: any) => ({
          title: c.web.title,
          uri: c.web.uri
        }));
    }

    return { text, sources };
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return { text: "אופס, משהו השתבש לי במחשבות לרגע 😅. בוא ננסה שוב!" };
  }
};

// --- Image Generation ---

export const generateImage = async (prompt: string) => {
  const client = getClient();
  try {
    const response = await client.models.generateContent({
      model: MODEL_IMAGE_GEN,
      contents: {
        parts: [{ text: prompt }]
      }
    });

    // Check for inline data (image)
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    return null;
  }
};

// --- Speech Generation (TTS) ---

export const generateSpeech = async (text: string) => {
  const client = getClient();
  try {
    const response = await client.models.generateContent({
      model: MODEL_TTS,
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // 'Kore' is usually a good neutral/friendly voice
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
        // Convert raw PCM to WAV so it can play in the browser
        const pcmBytes = base64ToUint8Array(base64Audio);
        // Gemini TTS uses 24kHz sample rate by default
        const wavBytes = addWavHeader(pcmBytes, 24000, 1, 16);
        return uint8ArrayToBase64(wavBytes);
    }
    return null;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    return null;
  }
};

// --- Audio Input Processing (STT via Multimodal) ---

export const processAudioInput = async (
    audioBase64: string, 
    mimeType: string,
    systemInstruction: string,
    history: { role: string; parts: { text?: string; inlineData?: any }[] }[]
): Promise<{ transcription?: string, text: string, sources?: GroundingSource[] }> => {
    const client = getClient();
    
    const userParts: any[] = [
        {
            inlineData: {
                mimeType: mimeType,
                data: audioBase64
            }
        },
        { text: `
            Please listen to this audio carefully.
            1. Transcribe exactly what the user said in the audio.
            2. Respond to the user in Hebrew based on your persona.
            
            Format your response exactly like this:
            [TRANSCRIPTION]
            (Insert transcription here)
            [RESPONSE]
            (Insert your response here)
            ` 
        }
    ];

    const contents = history.map(h => ({ role: h.role, parts: h.parts }));
    contents.push({ role: 'user', parts: userParts });

    try {
        const response = await client.models.generateContent({
            model: MODEL_CHAT,
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                tools: [{ googleSearch: {} }] // Allow search even for audio queries
            }
        });
        
        let fullText = response.text || "";
        // Sanitize
        fullText = fullText.replace(/!\[.*?\]\(.*?\)/g, ""); 
        fullText = fullText.replace(/https:\/\/flux-[\w./-]+/g, "");
        
        let transcription = "";
        let replyText = fullText;

        // Parse structured response
        const transcriptionMatch = fullText.match(/\[TRANSCRIPTION\]\s*([\s\S]*?)\s*\[RESPONSE\]/i);
        const responseMatch = fullText.match(/\[RESPONSE\]\s*([\s\S]*)/i);

        if (transcriptionMatch && responseMatch) {
            transcription = transcriptionMatch[1].trim();
            replyText = responseMatch[1].trim();
        } else if (responseMatch) {
             replyText = responseMatch[1].trim();
        }
        
        // Handle inaudible/empty result from model despite request
        if (!transcription && (!replyText || replyText.length < 2)) {
             return { text: "לא שמעתי כלום... 🙉 אולי תנסה שוב?", transcription: "" };
        }
        
        // Extract grounding chunks (sources)
        let sources: GroundingSource[] = [];
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        
        if (chunks) {
          sources = chunks
            .filter((c: any) => c.web?.uri && c.web?.title)
            .map((c: any) => ({
              title: c.web.title,
              uri: c.web.uri
            }));
        }

        return { transcription, text: replyText, sources };
    } catch (error) {
        console.error("Gemini Audio Input Error:", error);
        return { text: "רגע, הקול שלך קצת חלש לי היום! 🧐 תנסה/י לכתוב לי את השאלה בבקשה!" };
    }
}

// --- Live API Session (Real-time Audio) ---

export class LiveSession {
    private client: GoogleGenAI;
    private session: any = null;
    private inputContext: AudioContext | null = null;
    private outputContext: AudioContext | null = null;
    private outputNode: GainNode | null = null;
    private nextStartTime: number = 0;
    private activeSources: Set<AudioBufferSourceNode> = new Set();
    private onDisconnectCallback: () => void;
    private stream: MediaStream | null = null;
    private scriptProcessor: ScriptProcessorNode | null = null;
    private source: MediaStreamAudioSourceNode | null = null;

    constructor(onDisconnectCallback: () => void) {
        this.client = getClient();
        this.onDisconnectCallback = onDisconnectCallback;
    }

    async connect(systemInstruction: string) {
        // Initialize Audio Contexts
        this.inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        this.outputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        // Setup Output
        this.outputNode = this.outputContext.createGain();
        this.outputNode.connect(this.outputContext.destination);

        // Get User Media
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Connect to Gemini Live
        const sessionPromise = this.client.live.connect({
            model: MODEL_LIVE,
            callbacks: {
                onopen: () => {
                    console.log("Live Session Connected");
                    this.startAudioInput(sessionPromise);
                },
                onmessage: (msg: LiveServerMessage) => this.handleMessage(msg),
                onclose: () => {
                    console.log("Live Session Closed");
                    this.cleanup();
                    this.onDisconnectCallback();
                },
                onerror: (err) => {
                    console.error("Live Session Error", err);
                    this.cleanup();
                    this.onDisconnectCallback();
                }
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } // Friendly voice for kids
                },
                systemInstruction: systemInstruction,
            }
        });
        
        this.session = sessionPromise;
    }

    private startAudioInput(sessionPromise: Promise<any>) {
        if (!this.inputContext || !this.stream) return;

        this.source = this.inputContext.createMediaStreamSource(this.stream);
        this.scriptProcessor = this.inputContext.createScriptProcessor(4096, 1, 1);
        
        this.scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBlob = this.createBlob(inputData);
            
            sessionPromise.then((session) => {
                 session.sendRealtimeInput({ media: pcmBlob });
            });
        };

        this.source.connect(this.scriptProcessor);
        this.scriptProcessor.connect(this.inputContext.destination);
    }

    private async handleMessage(message: LiveServerMessage) {
        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64Audio && this.outputContext && this.outputNode) {
            this.nextStartTime = Math.max(this.nextStartTime, this.outputContext.currentTime);
            
            const audioBytes = this.decode(base64Audio);
            const audioBuffer = await this.decodeAudioData(audioBytes, this.outputContext, 24000, 1);
            
            const source = this.outputContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.outputNode);
            source.addEventListener('ended', () => {
                this.activeSources.delete(source);
            });
            
            source.start(this.nextStartTime);
            this.nextStartTime += audioBuffer.duration;
            this.activeSources.add(source);
        }

        if (message.serverContent?.interrupted) {
             this.stopAllAudio();
        }
    }

    private stopAllAudio() {
        for (const source of this.activeSources) {
            source.stop();
        }
        this.activeSources.clear();
        this.nextStartTime = 0;
    }

    public disconnect() {
        // We cannot explicitly close the session object in the SDK yet for all cases, 
        // but we can stop our processing and audio.
        // Assuming session.close() exists or we just cut the stream.
        if (this.session) {
             this.session.then((s: any) => {
                 if(s.close) s.close();
             });
        }
        this.cleanup();
        this.onDisconnectCallback();
    }

    private cleanup() {
        this.stopAllAudio();
        
        if (this.scriptProcessor) {
            this.scriptProcessor.disconnect();
            this.scriptProcessor = null;
        }
        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.inputContext) {
            this.inputContext.close();
            this.inputContext = null;
        }
        if (this.outputContext) {
            this.outputContext.close();
            this.outputContext = null;
        }
    }

    // --- Helpers ---

    private createBlob(data: Float32Array): Blob {
        const l = data.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) {
            int16[i] = data[i] * 32768;
        }
        // Helper to encode Uint8Array to base64
        const encode = (bytes: Uint8Array) => {
            let binary = '';
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        };

        return {
            data: encode(new Uint8Array(int16.buffer)),
            mimeType: 'audio/pcm;rate=16000',
        };
    }

    private decode(base64: string) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    private async decodeAudioData(
        data: Uint8Array,
        ctx: AudioContext,
        sampleRate: number,
        numChannels: number,
    ): Promise<AudioBuffer> {
        const dataInt16 = new Int16Array(data.buffer);
        const frameCount = dataInt16.length / numChannels;
        const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

        for (let channel = 0; channel < numChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            for (let i = 0; i < frameCount; i++) {
                channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
            }
        }
        return buffer;
    }
}