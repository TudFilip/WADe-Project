import './Sidebar.css';

const Sidebar = ({
    conversations,
    activeConversationId,
    onSelectConversation,
    onNewConversation,
}) => {
    return (
        <div className="sidebar">
            <button onClick={onNewConversation} className="new-conversation-button">
                + New Conversation
            </button>
            <ul className="conversation-list">
                {conversations.map((conv) => (
                    <li
                        key={conv.id}
                        className={`'conversation-item' ${conv.id === activeConversationId ? 'active' : ''}`}
                        onClick={() => onSelectConversation(conv.id)}
                    >
                        {conv.title}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Sidebar;
