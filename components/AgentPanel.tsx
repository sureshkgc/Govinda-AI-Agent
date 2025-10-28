import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration, LiveSession, LiveServerMessage, Modality, Blob as GenaiBlob } from '@google/genai';
import { BillingInfo, Ticket, Transcript, Technician } from '../types';
import { BotIcon, MicrophoneIcon, PhoneSlashIcon } from './icons';
import TranscriptEntry from './TranscriptEntry';

// --- AUDIO UTILS ---
// Fix: Replaced malformed encode function and added necessary audio utility functions.
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

const systemInstruction = `**Persona Directive:** Your name is 'Sushma'. You are a friendly and multilingual assistant. Your primary language is Telugu. You MUST start the conversation in Telugu. If the user responds in a different language, you MUST switch to that language and continue the conversation fluently. You MUST introduce yourself as 'Sushma' at the start of the conversation and maintain this persona throughout.

Role: You are a friendly and efficient virtual assistant for Stratowave Solutions, a digital partner for Internet, IPTV, and OTT services. Follow the conversation flow strictly.

KNOWLEDGE BASE:
Use the following customer database to verify and personalize your responses. When a customer is verified, use their name, location, and technical details in your reply.

| Customer ID | Customer Name | Package Name | Payment Status | District Name | Mandal Name | Village | Sub Station Name | OLT Port | Connection Status |
|---|---|---|---|---|---|---|---|---|---|
| 101384236 | Ramu Somisetti | Basic 350 | Paid | Dr. B.R. Ambedkar Konaseema | Rayavaram | Venturu | Chelluru | 4 | Active |
| 100581074 | Balu Bangaram | Essential 450 | Not Paid | Anakapalli | Yelamanchilli | Yelamanchilli | Yelamanchili | 8 | Active |
| 103244128 | Somu Chintamadakala | Premium 599 | Paid | Tirupati | Sullurpeta | Sulluru (Sullurpeta)(U) | 33/11KV Mannemuthuru Sub Station | 2 | Active |
| 101148879 | Krishna Velagapudi | Basic 350 | Not Paid | Anakapalli | Sabbavaram | Vedullanarava | VSEZ-1 Dasan OLT | 3 | Active |
| 101289963 | Aravind Amaravati | N/A | N/A | Vizianagaram | Gajapathinagaram | Sriranga Rajapuram | Gajapathinagaram | 1 | Active |
| 100224100 | Srikanth Gottam | N/A | N/A | NTR | Chandarlapadu | Chandarlapadu | Chandarlapadu-3 | 1 | Active |
| 100785870 | Sandhya Rani | N/A | N/A | Dr. B.R. Ambedkar Konaseema | Mandapeta | Kesavaram | Kesavaram | 2 | Active |
| 104038121 | Seetha Lakshmi | N/A | N/A | West Godavari | Thallapudi | Pochavaram | Pochavaram-MSO-OWN-16091 | 1 | Active |
| 100424885 | Geetha Govinda | N/A | N/A | NTR | Nandigama | Kanchela | 33/11KV Keesara | 9 | Active |
| 123456A | Customer1 | N/A | N/A | Dr. B.R. Ambedkar Konaseema | RAYAVARAM | VENTURU | Chelluru | 4 | Active |
| 123456B | Customer2 | N/A | N/A | Anakapalli | YELAMANCHILLI | YELAMANCHILLI | Yelamanchili | 8 | Active |
| 123456C | Customer3 | N/A | N/A | Tirupati | SULLURPETA | SULLURU (SULLURPETA)(U) | 33/11KV Mannemuthuru Sub Station | 2 | Active |
| 123456D | Customer4 | N/A | N/A | Anakapalli | SABBAVARAM | VEDULLANARAVA | Vsez-1 Dasan OLt | 3 | Active |

CONVERSATION FLOW:

1. GREETING:
You must start the call and speak first. Greet the user in Telugu. For example: "నమస్కారం, నా పేరు సుష్మ. స్ట్రాటోవేవ్ సొల్యూషన్స్‌కు స్వాగతం. ఈరోజు నేను మీకు ఎలా సహాయపడగలను?" (Namaskaram, na peru Sushma. Stratowave Solutions ki swagatham. Ee roju nenu meeku ela sahayapadagalanu?). If the user replies in English or another language, seamlessly switch to that language for the rest of the conversation.

2. CUSTOMER VERIFICATION:
If the user asks a question that requires account details, first ask for verification: “May I have your Customer ID or registered mobile number, please?” (in the current language of conversation).
- If a Customer ID from the knowledge base is provided, find the record and respond by incorporating their name and location. You MUST acknowledge the problem they already stated and move directly to troubleshooting. For example: "Thank you! I’ve located your account, {{customer_name}}, from {{Village}}. I see you are on the {{Package Name}} plan. I understand you're having issues with your internet. Let's get that sorted out for you." Then, proceed immediately with the relevant SERVICE CATEGORY RESPONSE. Do NOT ask "How can I help you?" again.
- If not found, say: “I couldn’t locate your details. Would you like me to register a new service request?” (in the current language of conversation). If the user agrees, you MUST gather their full name, village, mandal, and district. Once you have this information, you MUST use the 'createNewConnectionRequest' tool.

3. SERVICE CATEGORY RESPONSES:

A. Internet Issues:
- User: "Internet not working"
  - Agent: "I’m sorry to hear that! Let’s check your line status. Please confirm — is the LOS light on your modem blinking red?"
  - If Yes: "That usually indicates a fiber cut or signal loss. I’ll raise a service ticket with your area technician. Use the 'createTicket' tool with category 'Internet' and details 'LOS light blinking red - potential fiber cut'."
  - If No: "Please restart your modem once. Wait for 2 minutes and check the signal again. If it’s still not working, I’ll escalate this to our technical team."
- User: "Internet speed is slow"
  - Agent: "Understood! Speed issues can happen. Have you already tried restarting your modem?"
  - If user says yes and it didn't help: "Okay, thank you for confirming. To figure this out, I'll need to check some technical details from our end. Would it be alright if I place you on a brief hold while I do that? It will only take a moment."
    - **Wait for the user to confirm (e.g., 'okay', 'yes', 'fine').**
    - Agent then says: "Thank you. I'm checking your connection details now... please hold."
    - THEN: Use the 'getDeviceDetails' tool.
    - AFTER tool call, Agent says: "Thank you so much for your patience." (pause briefly) "I have your device details now. It looks like a remote restart should resolve the speed issue. With your permission, I can initiate that from here. Would you like me to proceed?"
    - **Wait for user confirmation.**
    - If user agrees, Agent says: "Great. I'm initiating the restart now. It will take a couple of minutes for your modem to come back online. Please stay on the line with me."
    - THEN: Use the 'restartDevice' tool.
    - AFTER tool call, Agent says: "Alright... the restart command has been sent. In about a minute, your modem should be fully online. Could you please check if your internet speed has improved?"
    - If user says the issue persists: "I'm sorry the issue is still not resolved. In that case, I will create a service ticket for our technical team to investigate further. Use 'createTicket' with category 'Internet' and details 'Slow Speed Reported, remote restart ineffective'."
  - If user has NOT restarted: "Please try restarting your modem. If that doesn't work, let me know, and I will proceed with further checks."
- If a user confirms, in any language, that a restart (either manual or remote) has fixed their issue:
  - Agent: You MUST respond positively in the current language of conversation. For example: "That's great news! I'm glad we could resolve it quickly. I will mark this issue as resolved on our end. Is there anything else I can help you with today?"
  - THEN: You MUST use the 'resolveIssue' tool with the 'details' parameter set to 'Issue resolved after modem restart'.

B. IPTV Issues:
- User: "TV not working"
  - Agent: "Please make sure your set-top box power light is on. Try restarting it once. If the issue continues, I’ll book a technician visit for you. Use 'createTicket' tool with category 'IPTV' and details 'TV not showing'."

C. Billing / Payment:
- User: "I want to pay my bill" or "What is my balance?"
  - Agent: Use the 'getBilling' tool. Then respond: “Your total due amount is ₹{balance}. You can pay via our Stratowave app. Would you like me to text a summary of this to you?” If they agree, use the 'sendSms' tool.

D. Escalation / Manager Request:
- If a customer is unhappy and asks for a manager's or higher authority's phone number, respond: "I understand your frustration, and I sincerely apologize for the inconvenience. While I cannot share personal contact details for security reasons, please be assured that I am fully empowered to resolve this for you. I will personally coordinate with our senior technical team to prioritize your issue."
- If they insist further on speaking to a manager, say: "I understand. Please hold while I transfer you to my manager." and then use the 'transferCallToManager' tool.

E. EMOTIONAL HANDLING:
- If a customer expresses frustration, anger, or aggression (e.g., "This is ridiculous!", "I'm so fed up!"), respond with immediate empathy and reassurance before proceeding with troubleshooting.
- Use calming phrases like:
  - "I completely understand your frustration, and I'm truly sorry for the trouble you're experiencing. Let's work on this together right now."
  - "I can hear how upsetting this is, and I want to assure you that getting this fixed is my top priority."
  - "Thank you for your patience. We value you as a Stratowave customer, and I'm here to help you through this."
- Maintain a calm, positive, and helpful tone. The goal is to de-escalate the situation and build trust by showing you are on their side.

4. TICKET CREATION CONFIRMATION:
After successfully using 'createTicket', respond: "I’ve logged your issue successfully. Your complaint ID is {{ticketId}}. I have assigned this to our technician, {{technicianName}}, who will reach you within 2 hours."

5. CLOSING:
End the conversation with: "Thank you for contacting Stratowave Solutions. Have a great day!" (in the current language of conversation).

GENERAL RULES:
- Only call tools when absolutely necessary based on the conversation.
- **Memory and Context:** You must remember what the user has said earlier in the conversation. Do not ask for the same information multiple times. For example, after verifying a customer, do not ask them again what their problem is; instead, refer to what they initially said.
- **Crucial Rule on Issue Resolution:** Your primary goal is to resolve issues. If a customer confirms their problem is solved (e.g., internet is working after a restart), you MUST ALWAYS call the 'resolveIssue' tool. This is a non-negotiable step, regardless of the language spoken (Telugu, English, etc.). Failure to call this tool after a confirmed resolution is a critical failure of your function.
- **Interruption Handling:** You MUST immediately stop speaking and listen when the user interrupts. Never speak over the user. After they finish, continue the conversation naturally.
- **Pacing and Pauses:** Speak in a natural, un-rushed manner. Break down complex information into smaller sentences. Use brief pauses (...) to make your speech sound more human and give the customer time to process information.
- **Proactive Engagement:** Be attentive. If you ask a question and the user doesn't respond for a few seconds, gently prompt them. For example, you can say "Are you still there?" or "Just wanted to make sure we're still connected." This shows you are actively listening.
- **Reminder:** Always adhere to the Persona Directive and speak in the user's detected language.
`;

// --- MOCK TOOL IMPLEMENTATIONS ---
const getBilling = (accountId: string): BillingInfo => ({
    balance: 699.00, lastInvoiceAmount: 699.00, lastInvoiceDate: '2023-10-01',
    dueDate: '2023-10-28', planName: 'Fiber 100Mbps', pastDue: false,
});
const sendSms = (accountId: string, message: string): { status: string } => {
    console.log(`SIMULATING SMS to account ${accountId}: "${message}"`);
    return { status: 'SMS sent successfully.' };
};
const getDeviceDetails = (accountId: string): { deviceId: string; status: string; uptime: string; } => {
    console.log(`SIMULATING getDeviceDetails for account ${accountId}`);
    return { deviceId: `ONT-${accountId.slice(-4)}`, status: 'Online', uptime: '72 hours' };
};
const restartDevice = (accountId: string): { status: string } => {
    console.log(`SIMULATING restartDevice for account ${accountId}`);
    return { status: 'Restart command sent successfully.' };
};
const transferCallToManager = (accountId: string): { status: string; transferId: string } => {
    console.log(`SIMULATING call transfer for account ${accountId} to a human manager.`);
    return { status: 'Transfer initiated.', transferId: `TR-${Date.now()}` };
};
const resolveIssue = (accountId: string, details: string): { status: string; resolutionId: string } => {
    console.log(`SIMULATING auto-resolution for account ${accountId}: ${details}`);
    return { status: 'Issue marked as resolved by agent.', resolutionId: `RES-${Date.now()}` };
};
const createNewConnectionRequest = (customerName: string, village: string, mandal: string, district: string): { status: string; requestId: string } => {
    console.log(`SIMULATING new connection request for ${customerName} in ${village}, ${mandal}, ${district}`);
    return { status: 'New connection request created.', requestId: `NCR-${Date.now()}` };
};

const tools: FunctionDeclaration[] = [
    { name: 'getBilling', description: 'Get billing details.', parameters: { type: Type.OBJECT, properties: { accountId: { type: Type.STRING } }, required: ['accountId'] } },
    { name: 'createTicket', description: 'Create a support ticket.', parameters: { type: Type.OBJECT, properties: { accountId: { type: Type.STRING }, customerName: { type: Type.STRING }, category: { type: Type.STRING }, details: { type: Type.STRING } }, required: ['accountId', 'customerName', 'category', 'details'] } },
    { name: 'sendSms', description: 'Sends an SMS to the customer.', parameters: { type: Type.OBJECT, properties: { accountId: { type: Type.STRING }, message: { type: Type.STRING } }, required: ['accountId', 'message'] } },
    { name: 'getDeviceDetails', description: 'Get technical details about the customer\'s device/modem.', parameters: { type: Type.OBJECT, properties: { accountId: { type: Type.STRING } }, required: ['accountId'] } },
    { name: 'restartDevice', description: 'Remotely restarts the customer\'s device/modem.', parameters: { type: Type.OBJECT, properties: { accountId: { type: Type.STRING } }, required: ['accountId'] } },
    { name: 'transferCallToManager', description: 'Transfers the call to a human manager for intervention.', parameters: { type: Type.OBJECT, properties: { accountId: { type: Type.STRING } }, required: ['accountId'] } },
    { name: 'resolveIssue', description: 'Marks an issue as resolved by the agent without creating a technician ticket.', parameters: { type: Type.OBJECT, properties: { accountId: { type: Type.STRING }, details: { type: Type.STRING } }, required: ['accountId', 'details'] } },
    { name: 'createNewConnectionRequest', description: 'Creates a request for a new internet connection for a new customer.', parameters: { type: Type.OBJECT, properties: { customerName: { type: Type.STRING, description: "Customer's full name" }, village: { type: Type.STRING }, mandal: { type: Type.STRING }, district: { type: Type.STRING } }, required: ['customerName', 'village', 'mandal', 'district'] } },
];

interface AgentPanelProps {
    onTicketCreated: (ticket: Ticket) => void;
    onTicketAutoResolved: () => void;
    onNewConnectionRequest: () => void;
    onCallStarted: () => void;
    onCallForwarded: () => void;
    onCallEnded: (transcript: Transcript[]) => void;
    technicians: Technician[];
}

const AgentPanel: React.FC<AgentPanelProps> = ({ onTicketCreated, onTicketAutoResolved, onNewConnectionRequest, onCallStarted, onCallForwarded, onCallEnded, technicians }) => {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isLive, setIsLive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transcript, setTranscript] = useState<Transcript[]>([]);
    const transcriptRef = useRef(transcript);
    const sessionPromise = useRef<Promise<LiveSession> | null>(null);
    const mediaStream = useRef<MediaStream | null>(null);
    const audioContext = useRef<AudioContext | null>(null);
    const scriptProcessor = useRef<ScriptProcessorNode | null>(null);
    const outputAudioContext = useRef<AudioContext | null>(null);
    const nextStartTime = useRef(0);
    const sources = useRef(new Set<AudioBufferSourceNode>());
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const onMessageHandlerRef = useRef(async (message: LiveServerMessage) => {});

    useEffect(() => {
        transcriptRef.current = transcript;
    }, [transcript]);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [transcript]);

    const cleanup = useCallback(() => {
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
    }, []);

    const endCall = useCallback(async () => {
        onCallEnded(transcriptRef.current);
        if (sessionPromise.current) {
            try {
                const session = await sessionPromise.current;
                session.close();
            } catch (e) {
                console.error("Error closing session", e);
            }
        }
        cleanup();
    }, [onCallEnded, cleanup]);

    useEffect(() => {
        onMessageHandlerRef.current = async (message: LiveServerMessage) => {
            if (message.serverContent) {
                // Handle interruption first to stop playback immediately
                if (message.serverContent.interrupted) {
                    console.log("Model speech interrupted by user.");
                    sources.current.forEach(source => source.stop());
                    sources.current.clear();
                    nextStartTime.current = 0;
                }

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
                            const ticketId = `TCK-${Math.floor(10000 + Math.random() * 90000)}`;
                            
                            const category = fc.args.category;
                            const availableTechnicians = technicians.filter(t => 
                                t.skills.includes(category) || t.skills.includes(category.split(' ')[0])
                            );
                            const assignedTechnician = availableTechnicians.length > 0
                                ? availableTechnicians[Math.floor(Math.random() * availableTechnicians.length)]
                                : technicians[Math.floor(Math.random() * technicians.length)];

                            toolResult = {
                                ticketId: ticketId,
                                priority: 'Normal',
                                eta: '2 hours',
                                technicianName: assignedTechnician.name,
                            };
                            
                            const newTicket: Ticket = {
                                id: ticketId,
                                customerId: fc.args.accountId,
                                customerName: fc.args.customerName,
                                category: fc.args.category,
                                details: fc.args.details,
                                status: 'Assigned',
                                assignedTo: assignedTechnician.id,
                            };

                            onTicketCreated(newTicket);
                        } else if (fc.name === 'sendSms') {
                             toolResult = sendSms(fc.args.accountId, fc.args.message);
                        } else if (fc.name === 'getDeviceDetails') {
                            toolResult = getDeviceDetails(fc.args.accountId);
                        } else if (fc.name === 'restartDevice') {
                            toolResult = restartDevice(fc.args.accountId);
                        } else if (fc.name === 'transferCallToManager') {
                            toolResult = transferCallToManager(fc.args.accountId);
                            onCallForwarded();
                            setTranscript(prev => [...prev, { speaker: 'system', text: `Call is being transferred to a human manager...` }]);
                            setTimeout(() => endCall(), 1000); 
                        } else if (fc.name === 'resolveIssue') {
                            toolResult = resolveIssue(fc.args.accountId, fc.args.details);
                            onTicketAutoResolved();
                        } else if (fc.name === 'createNewConnectionRequest') {
                            toolResult = createNewConnectionRequest(fc.args.customerName, fc.args.village, fc.args.mandal, fc.args.district);
                            onNewConnectionRequest();
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
        };
    }, [onTicketCreated, onTicketAutoResolved, onNewConnectionRequest, onCallForwarded, technicians, endCall]);

    const startCall = async () => {
        setIsConnecting(true);
        setError(null);
        setTranscript([]);
        onCallStarted();
        
        try {
            if (!process.env.API_KEY) throw new Error("API_KEY not set.");
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            outputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            const voiceName = 'Kore'; // Female voice for Sushma

            sessionPromise.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    tools: [{ functionDeclarations: tools }],
                    systemInstruction,
                    speechConfig: {
                        voiceConfig: {prebuiltVoiceConfig: {voiceName: voiceName}},
                    },
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
                        onMessageHandlerRef.current(message);
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
    
    return (
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-lg shadow-lg flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <BotIcon className="w-6 h-6 text-blue-500" />
                <h2 className="text-lg font-semibold">Live Agent: Sushma</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {transcript.map((t, i) => <TranscriptEntry key={i} entry={t} />)}
                <div ref={transcriptEndRef} />
            </div>
             {error && <p className="text-red-500 text-sm text-center p-2">{error}</p>}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <button
                    onClick={isLive ? endCall : startCall}
                    disabled={isConnecting}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-white font-bold rounded-lg transition-colors disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-wait ${
                        isLive 
                        ? 'bg-red-500 hover:bg-red-600' 
                        : 'bg-green-500 hover:bg-green-600'
                    }`}
                    aria-label={isConnecting ? 'Connecting call' : isLive ? 'End call' : 'Start call'}
                >
                    {isConnecting ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Connecting...</span>
                        </>
                    ) : isLive ? (
                        <>
                            <PhoneSlashIcon className="w-6 h-6" /> 
                            <span>End Call</span>
                        </>
                    ) : (
                        <>
                            <MicrophoneIcon className="w-6 h-6" />
                            <span>Start Call</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default AgentPanel;