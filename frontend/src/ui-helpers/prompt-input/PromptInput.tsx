import { useState } from 'react';

// Styles
import './PromptInput.css';

const PromptInput = ({ onSend }) => {
    const [input, setInput] = useState('');

    const handleSend = () => {
        onSend(input);
        setInput('');
    };

    // Also send on Enter key press
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    return (
        <div className="chat-input-container">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                onKeyDown={handleKeyDown}
                className="chat-input"
            />
            <button onClick={handleSend} className="send-button">
                Send
            </button>
        </div>
    );
};

export default PromptInput;
