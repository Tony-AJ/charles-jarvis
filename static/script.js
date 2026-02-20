const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

let history = [];

function addMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender);
    msgDiv.innerText = text;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    userInput.value = '';
    
    // Add "Jarvis is thinking" animation or placeholder if needed
    
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

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});
