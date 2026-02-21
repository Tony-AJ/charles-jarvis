const voiceToggleBtn = document.getElementById('voice-toggle-btn');
const videoCallBtn = document.getElementById('video-call-btn');
const videoOverlay = document.getElementById('video-overlay');
const localVideo = document.getElementById('local-video');
const endCallBtn = document.getElementById('end-call-btn');
const muteBtn = document.getElementById('mute-btn');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const chatBox = document.getElementById('chat-box');

let history = [];
let isVoiceEnabled = false;
let isVideoCallActive = false;
let recognition = null;
let stream = null;

// Initialize Speech Recognition
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    console.log("Speech Recognition API found.");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log("Speech Recognition Result:", transcript);
        userInput.value = transcript;
        sendMessage();
    };

    recognition.onstart = () => {
        console.log("Speech Recognition started.");
    };

    recognition.onend = () => {
        console.log("Speech Recognition ended.");
        if (isVoiceEnabled || isVideoCallActive) {
            // Restart if still in voice mode
            setTimeout(() => {
                if (isVoiceEnabled || isVideoCallActive) {
                    console.log("Restarting Speech Recognition...");
                    try { recognition.start(); } catch(e) { console.error("Restart error:", e); }
                }
            }, 500);
        }
    };

    recognition.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === 'not-allowed') {
            isVoiceEnabled = false;
            updateVoiceUI();
        }
    };
} else {
    console.warn("Speech Recognition API NOT supported in this browser.");
}

function speak(text) {
    if (!window.speechSynthesis) {
        console.warn("Speech Synthesis NOT supported.");
        return;
    }
    
    console.log("Jarvis is speaking:", text);
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Jarvis-like parameters
    utterance.rate = 1.05; // Slightly faster, crisp
    utterance.pitch = 0.85; // Slightly deeper, sophisticated
    utterance.volume = 1.0;
    
    // Find a good voice (prioritize British Male)
    const voices = window.speechSynthesis.getVoices();
    console.log(`System has ${voices.length} voices available.`);
    
    // Specific targets for Jarvis vibe
    const targetVoices = [
        'Google UK English Male',
        'Microsoft George - English (United Kingdom)',
        'Microsoft Hazel - English (United Kingdom)',
        'en-GB',
        'Male'
    ];

    let selectedVoice = null;
    for (const target of targetVoices) {
        selectedVoice = voices.find(v => v.name.includes(target) || v.lang.includes(target));
        if (selectedVoice) {
            console.log("Selected voice:", selectedVoice.name);
            break;
        }
    }

    if (selectedVoice) {
        utterance.voice = selectedVoice;
    } else {
        // Fallback to any British voice
        selectedVoice = voices.find(v => v.lang.startsWith('en-GB')) || voices[0];
        if (selectedVoice) {
            console.log("Fallback voice:", selectedVoice.name);
            utterance.voice = selectedVoice;
        }
    }

    window.speechSynthesis.speak(utterance);
}

function addMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender);
    msgDiv.innerText = text;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    if (sender === 'jarvis') {
        speak(text);
    }
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    userInput.value = '';
    
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: text,
                history: history
            })
        });

        const data = await response.json();
        
        if (data.response) {
            addMessage(data.response, 'jarvis');
            if (data.history) {
                history = data.history;
            }
        } else {
            addMessage("Systems failure. Unable to process command.", 'jarvis');
        }
    } catch (error) {
        console.error("Error:", error);
        addMessage("Communication link severed. Please check backend status.", 'jarvis');
    }
}

// Voice Toggle Logic
function updateVoiceUI() {
    voiceToggleBtn.classList.toggle('active', isVoiceEnabled);
    if (isVoiceEnabled) {
        recognition && recognition.start();
    } else {
        recognition && recognition.stop();
    }
}

voiceToggleBtn.addEventListener('click', () => {
    isVoiceEnabled = !isVoiceEnabled;
    updateVoiceUI();
});

// Video Call Logic
async function startVideoCall() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = stream;
        videoOverlay.classList.remove('hidden');
        isVideoCallActive = true;
        
        // Auto-enable voice recognition for seamless interaction
        if (recognition) recognition.start();
        
        addMessage("Video link established. I'm seeing you now, Tony.", 'jarvis');
    } catch (err) {
        console.error("Camera Access Error:", err);
        addMessage("Camera access denied. Video protocol aborted.", 'jarvis');
    }
}

function endVideoCall() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    videoOverlay.classList.add('hidden');
    isVideoCallActive = false;
    if (!isVoiceEnabled) recognition && recognition.stop();
    addMessage("Video link terminated.", 'jarvis');
}

videoCallBtn.addEventListener('click', startVideoCall);
endCallBtn.addEventListener('click', endVideoCall);

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Ensure voices are loaded
window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
};
