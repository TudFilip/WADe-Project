import './ChatArea.css';

const ChatArea = ({ selectedGraphQL, endpoints, onSelectEndpoint, messages }) => {
    return (
        <>
            <div className="chat-header">
                <select
                    value={selectedGraphQL}
                    onChange={(e) => onSelectEndpoint(e.target.value)}
                    className="graphql-dropdown"
                >
                    {endpoints.map((endpoint, index) => (
                        <option key={index} value={endpoint}>
                            {endpoint}
                        </option>
                    ))}
                </select>
            </div>

            <div className="chat-window">
                {messages.map((msg, index) => (
                    <div key={index} className={`chat-message ${msg.sender}`}>
                        {msg.text}
                    </div>
                ))}
            </div>
        </>
    );
};

export default ChatArea;
