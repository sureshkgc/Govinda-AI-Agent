import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration, LiveSession, LiveServerMessage, Modality, Blob as GenaiBlob } from '@google/genai';
import { BillingInfo, TicketInfo, OutageInfo, Transcript } from '../types';
import { BotIcon, MicrophoneIcon, PhoneSlashIcon } from './icons';
import TranscriptEntry from './TranscriptEntry';

// --- AUDIO UTILS ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
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

function createBlob(data: Float32Array): GenaiBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const systemInstruction = `**Primary Directive: Your primary function is to be a multilingual assistant. You MUST identify the language the user is speaking (e.g., Telugu, Hindi, English) and respond ONLY in that language for the entire conversation. All subsequent instructions, greetings, and actions must be translated and executed in the user's detected language.**

Role: You are ‘Govinda’, a friendly and efficient virtual assistant for Stratowave Solutions, a digital partner for Internet, IPTV, and OTT services. Follow the conversation flow strictly.

KNOWLEDGE BASE:
Use the following customer database to verify and personalize your responses. When a customer is verified, use their name, location, and technical details in your reply.

| Customer ID | District Name | Mandal Name | Village | Sub Station Name | OLT Port | Connection Status | Customer Name |
|---|---|---|---|---|---|---|---|
| 101384236 | Dr. B.R. Ambedkar Konaseema | Rayavaram | Venturu | Chelluru | 4 | Active | Ramu Somisetti |
| 100581074 | Anakapalli | Yelamanchilli | Yelamanchilli | Yelamanchili | 8 | Active | Balu Bangaram |
| 103244128 | Tirupati | Sullurpeta | Sulluru (Sullurpeta)(U) | 33/11KV Mannemuthuru Sub Station | 2 | Active | Somu Chintamadakala |
| 101148879 | Anakapalli | Sabbavaram | Vedullanarava | VSEZ-1 Dasan OLT | 3 | Active | Krishna Velagapudi |
| 101289963 | Vizianagaram | Gajapathinagaram | Sriranga Rajapuram | Gajapathinagaram | 1 | Active | Aravind Amaravati |
| 100224100 | NTR | Chandarlapadu | Chandarlapadu | Chandarlapadu-3 | 1 | Active | Srikanth Gottam |
| 100785870 | Dr. B.R. Ambedkar Konaseema | Mandapeta | Kesavaram | Kesavaram | 2 | Active | Sandhya Rani |
| 104038121 | West Godavari | Thallapudi | Pochavaram | Pochavaram-MSO-OWN-16091 | 1 | Active | Seetha Lakshmi |
| 100424885 | NTR | Nandigama | Kanchela | 33/11KV Keesara | 9 | Active | Geetha Govinda |

CONVERSATION FLOW:

1. GREETING:
You must start the call and speak first. Greet the user with a culturally appropriate and time-sensitive greeting in their detected language (e.g., "Namaste," "Good Morning," "Suprabhat," "Namaskaram"). Then, introduce yourself and the company: "My name is Govinda. Welcome to Stratowave Solutions — your trusted digital partner for Internet, IPTV, and OTT services. How may I help you today?”

2. CUSTOMER VERIFICATION:
If the user asks a question that requires account details, first ask for verification: “May I have your Customer ID or registered mobile number, please?”
- If a Customer ID from the knowledge base is provided, find the record and respond by incorporating their name and location: “Thank you! I’ve located your account, {{customer_name}}, from {{Village}}, {{Mandal Name}}. Your account status is {{Connection Status}}. How can I assist you today?”
- If not found, say: “I couldn’t locate your details. Would you like me to register a new service request?”

3. SERVICE CATEGORY RESPONSES:

A. Internet Issues:
- User: "Internet not working"
  - Agent: "I’m sorry to hear that! Let’s check your line status. Please confirm — is the LOS light on your modem blinking red?"
  - If Yes: "That usually indicates a fiber cut or signal loss. I’ll raise a service ticket with your area technician. Use the 'createTicket' tool with category 'Internet' and details 'LOS light blinking red - potential fiber cut'."
  - If No: "Please restart your modem once. Wait for 2 minutes and check the signal again. If it’s still not working, I’ll escalate this to our technical team."
- User: "Internet speed is slow"
  - Agent: "Understood! Speed issues can happen. I'll create a ticket to have our team check the backend signals. Use 'createTicket' with category 'Internet' and details 'Slow Speed Reported'."

B. IPTV Issues:
- User: "TV not showing"
  - Agent: "Please make sure your set-top box power light is on. Try restarting it once. If the issue continues, I’ll book a technician visit for you. Use 'createTicket' tool with category 'IPTV' and details 'TV not showing'."

C. Billing / Payment:
- User: "I want to pay my bill" or "What is my balance?"
  - Agent: Use the 'getBilling' tool. Then respond: “Your total due amount is ₹{balance}. You can pay via our Stratowave app. Would you like me to text a summary of this to you?” If they agree, use the 'sendSms' tool.

4. TICKET CREATION CONFIRMATION:
After successfully using 'createTicket', respond: "I’ve logged your issue successfully. Your complaint ID is {{ticketId}}. Our field technician will reach you within 2 hours."

5. CLOSING:
End the conversation with: "Thank you for contacting Stratowave Solutions. Have a great day!"

GENERAL RULES:
- Only call tools when absolutely necessary based on the conversation.
- **Reminder:** Always adhere to the Primary Directive and speak in the user's detected language.
`;

// --- MOCK TOOL IMPLEMENTATIONS ---
const getBilling = (accountId: string): BillingInfo => ({
    balance: 699.00, lastInvoiceAmount: 699.00, lastInvoiceDate: '2023-10-01',
    dueDate: '2023-10-28', planName: 'Fiber 100Mbps', pastDue: false,
});
const createTicket = (accountId: string, customerName: string, category: string, details: string): TicketInfo => ({
    ticketId: `TCK-DUMMY`, priority: 'Normal', eta: '2 hours',
});
const sendSms = (accountId: string, message: string): { status: string } => {
    console.log(`SIMULATING SMS to account ${accountId}: "${message}"`);
    return { status: 'SMS sent successfully.' };
};
const tools: FunctionDeclaration[] = [
    { name: 'getBilling', description: 'Get billing details.', parameters: { type: Type.OBJECT, properties: { accountId: { type: Type.STRING } }, required: ['accountId'] } },
    { name: 'createTicket', description: 'Create a support ticket.', parameters: { type: Type.OBJECT, properties: { accountId: { type: Type.STRING }, customerName: { type: Type.STRING }, category: { type: Type.STRING }, details: { type: Type.STRING } }, required: ['accountId', 'customerName', 'category', 'details'] } },
    { name: 'sendSms', description: 'Sends an SMS to the customer.', parameters: { type: Type.OBJECT, properties: { accountId: { type: Type.STRING }, message: { type: Type.STRING } }, required: ['accountId', 'message'] } },
];

interface AgentPanelProps {
    onTicketCreated: (ticketInfo: { customerId: string; customerName: string; category: string; details: string; }) => void;
}

const AgentPanel: React.FC<AgentPanelProps> = ({ onTicketCreated }) => {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isLive, setIsLive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transcript, setTranscript] = useState<Transcript[]>([]);
    const sessionPromise = useRef<Promise<LiveSession> | null>(null);
    const mediaStream = useRef<MediaStream | null>(null);
    const audioContext = useRef<AudioContext | null>(null);
    const scriptProcessor = useRef<ScriptProcessorNode | null>(null);
    const outputAudioContext = useRef<AudioContext | null>(null);
    const nextStartTime = useRef(0);
    const sources = useRef(new Set<AudioBufferSourceNode>());

    const transcriptEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [transcript]);


    const startCall = async () => {
        setIsConnecting(true);
        setError(null);
        setTranscript([]);
        
        try {
            if (!process.env.API_KEY) throw new Error("API_KEY not set.");
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            outputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            sessionPromise.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    tools: [{ functionDeclarations: tools }],
                    systemInstruction,
                },
                callbacks: {
                    onopen: async () => {
                        console.log('Session opened.');
                        setIsConnecting(false);
                        setIsLive(true);
                        setTranscript([{ speaker: 'system', text: "Call connected. Waiting for agent..." }]);

                        // Proactively trigger the agent's greeting by sending a short silent audio chunk.
                        // This signals the start of the conversation and prompts the agent to speak first.
                        const silentChunk = new Float32Array(1024).fill(0); // A small buffer of silence
                        const silentBlob = createBlob(silentChunk);
                        if (sessionPromise.current) {
                            sessionPromise.current.then((session) => {
                                session.sendRealtimeInput({ media: silentBlob });
                            });
                        }

                        // Start streaming microphone audio
                        mediaStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        const source = audioContext.current.createMediaStreamSource(mediaStream.current);
                        scriptProcessor.current = audioContext.current.createScriptProcessor(4096, 1, 1);
                        
                        scriptProcessor.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            if (sessionPromise.current) {
                                sessionPromise.current.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
                            }
                        };
                        
                        source.connect(scriptProcessor.current);
                        scriptProcessor.current.connect(audioContext.current.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        handleServerMessage(message);
                    },
                    onclose: () => {
                        console.log('Session closed.');
                        cleanup();
                    },
                    onerror: (e) => {
                        console.error('Session error:', e);
                        setError('A connection error occurred.');
                        cleanup();
                    },
                }
            });

        } catch (e: any) {
            console.error(e);
            setError(`Failed to start call: ${e.message}`);
            cleanup();
        }
    };
    
    const handleServerMessage = useCallback(async (message: LiveServerMessage) => {
        if (message.serverContent) {
            // Handle transcriptions
            if (message.serverContent.inputTranscription) {
                const text = message.serverContent.inputTranscription.text;
                setTranscript(prev => {
                    const last = prev[prev.length - 1];
                    if (last?.speaker === 'user') {
                        const newLast = { ...last, text: last.text + text };
                        return [...prev.slice(0, -1), newLast];
                    }
                    return [...prev, { speaker: 'user', text }];
                });
            }
            if (message.serverContent.outputTranscription) {
                const text = message.serverContent.outputTranscription.text;
                setTranscript(prev => {
                    const last = prev[prev.length - 1];
                    if (last?.speaker === 'model') {
                        const newLast = { ...last, text: last.text + text };
                        return [...prev.slice(0, -1), newLast];
                    }
                    return [...prev, { speaker: 'model', text }];
                });
            }
            if (message.serverContent.turnComplete) {
                setTranscript(prev => prev.map(t => ({...t})));
            }

            // Handle audio playback
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputAudioContext.current) {
                const outCtx = outputAudioContext.current;
                nextStartTime.current = Math.max(nextStartTime.current, outCtx.currentTime);
                const audioBuffer = await decodeAudioData(decode(audioData), outCtx, 24000, 1);
                const source = outCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outCtx.destination);
                source.addEventListener('ended', () => { sources.current.delete(source); });
                source.start(nextStartTime.current);
                nextStartTime.current += audioBuffer.duration;
                sources.current.add(source);
            }
        }
        
        // Handle tool calls
        if (message.toolCall?.functionCalls) {
            for (const fc of message.toolCall.functionCalls) {
                try {
                    let toolResult;
                    if (fc.name === 'getBilling') {
                        toolResult = getBilling(fc.args.accountId);
                    } else if (fc.name === 'createTicket') {
                        toolResult = createTicket(fc.args.accountId, fc.args.customerName, fc.args.category, fc.args.details);
                        onTicketCreated({
                            customerId: fc.args.accountId,
                            customerName: fc.args.customerName,
                            category: fc.args.category,
                            details: fc.args.details
                        });
                    } else if (fc.name === 'sendSms') {
                         toolResult = sendSms(fc.args.accountId, fc.args.message);
                    } else {
                        throw new Error(`Unknown function: ${fc.name}`);
                    }

                    if (sessionPromise.current) {
                        const session = await sessionPromise.current;
                        session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: JSON.stringify(toolResult) } }});
                    }
                } catch (e: any) {
                    if (sessionPromise.current) {
                        const session = await sessionPromise.current;
                        session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { error: e.message } } });
                    }
                }
            }
        }

    }, [onTicketCreated]);


    const cleanup = () => {
        setIsConnecting(false);
        setIsLive(false);
        if (scriptProcessor.current) {
            scriptProcessor.current.disconnect();
            scriptProcessor.current = null;
        }
        if (mediaStream.current) {
            mediaStream.current.getTracks().forEach(track => track.stop());
            mediaStream.current = null;
        }
        if (audioContext.current) {
            audioContext.current.close();
            audioContext.current = null;
        }
        if (outputAudioContext.current) {
            outputAudioContext.current.close();
            outputAudioContext.current = null;
        }
        sources.current.forEach(source => source.stop());
        sources.current.clear();
        nextStartTime.current = 0;
        sessionPromise.current = null;
    };

    const endCall = async () => {
        if (sessionPromise.current) {
            try {
                const session = await sessionPromise.current;
                session.close();
            } catch (e) {
                console.error("Error closing session", e);
            }
        }
        cleanup();
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <BotIcon className="w-6 h-6 text-blue-500" />
                <h2 className="text-lg font-semibold">Live Agent: Govinda</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {transcript.map((t, i) => <TranscriptEntry key={i} entry={t} />)}
                <div ref={transcriptEndRef} />
            </div>
             {error && <p className="text-red-500 text-sm text-center p-2">{error}</p>}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                {!isLive && !isConnecting && (
                    <button 
                        onClick={startCall}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors"
                    >
                        <MicrophoneIcon className="w-6 h-6" /> Start Call
                    </button>
                )}
                {isConnecting && (
                    <div className="text-center text-slate-500">Connecting...</div>
                )}
                {isLive && (
                    <button 
                        onClick={endCall}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors"
                    >
                        <PhoneSlashIcon className="w-6 h-6" /> End Call
                    </button>
                )}
            </div>
        </div>
    );
};

export default AgentPanel;