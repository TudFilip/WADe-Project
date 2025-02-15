import { useState } from 'react';
import AppService from '../../services/AppService';

// Components
import Sidebar from '../../ui-helpers/sidebar/Sidebar';
import ChatArea from '../../ui-helpers/chat-area/ChatArea';
import PromptInput from '../../ui-helpers/prompt-input/PromptInput';

//Styles
import './MainPage.css';

const MainPage = () => {
    const graphqlEndpoints = ['GitHub GraphQL API', 'Other GraphQL API'];

    const [selectedGraphQL, setSelectedGraphQL] = useState(graphqlEndpoints[0]);

    const [conversations, setConversations] = useState([
        { id: 1, title: 'Conversation 1', messages: [] },
    ]);

    const [activeConversationId, setActiveConversationId] = useState(1);

    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);

    const createNewConversation = () => {
        const newId = conversations.length ? Math.max(...conversations.map((c) => c.id)) + 1 : 1;
        const newConversation = { id: newId, title: `Conversation ${newId}`, messages: [] };
        setConversations([newConversation, ...conversations]);
        setActiveConversationId(newId);
    };

    const sendPrompt = async (promptText) => {
        if (!promptText.trim()) return;
        await AppService.sendPrompt(promptText);
        const simulatedResponse = `Response from ${selectedGraphQL} to: "${promptText}"`;

        setConversations((prev) =>
            prev.map((conv) =>
                conv.id === activeConversationId
                    ? {
                          ...conv,
                          messages: [
                              ...conv.messages,
                              { sender: 'user', text: promptText },
                              { sender: 'bot', text: simulatedResponse },
                          ],
                      }
                    : conv,
            ),
        );
    };

    const activeConversation = conversations.find((c) => c.id === activeConversationId);

    return (
        <div className="main-container">
            {isSidebarOpen && (
                <Sidebar
                    conversations={conversations}
                    activeConversationId={activeConversationId}
                    onSelectConversation={setActiveConversationId}
                    onNewConversation={createNewConversation}
                />
            )}

            <div className="chat-container">
                <ChatArea
                    selectedGraphQL={selectedGraphQL}
                    endpoints={graphqlEndpoints}
                    onSelectEndpoint={setSelectedGraphQL}
                    messages={activeConversation ? activeConversation.messages : []}
                    onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
                />

                <PromptInput onSend={sendPrompt} />
            </div>
        </div>
    );
};

export default MainPage;
