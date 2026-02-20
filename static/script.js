const voiceToggleBtn = document.getElementById('voice-toggle-btn');
const videoCallBtn = document.getElementById('video-call-btn');
const videoOverlay = document.getElementById('video-overlay');
const localVideo = document.getElementById('local-video');
const endCallBtn = document.getElementById('end-call-btn');
const muteBtn = document.getElementById('mute-btn');

let history = [];
let isVoiceEnabled = false;
let isVideoCallActive = false;
let recognition = null;
let stream = null;

// Initialize Speech Recognition
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
        sendMessage();
    };

    recognition.onend = () => {
        if (isVoiceEnabled || isVideoCallActive) {
            // Restart if still in voice mode
            setTimeout(() => {
                if (isVoiceEnabled || isVideoCallActive) recognition.start();
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
}

function speak(text) {
    if (!window.speechSynthesis) return;
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 0.9; // Slightly deeper for Jarvis
    
    // Find a good voice (preferably male/UK if available)
    const voices = window.speechSynthesis.getVoices();
    const jarvisVoice = voices.find(v => v.name.includes('Google UK English Male') || v.name.includes('Male'));
    if (jarvisVoice) utterance.voice = jarvisVoice;

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
