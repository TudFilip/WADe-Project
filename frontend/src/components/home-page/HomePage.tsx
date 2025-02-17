import React, { useState } from 'react';
import {
    Box,
    Container,
    Paper,
    TextField,
    Button,
    Typography,
    List,
    ListItem,
    ListItemText,
    Divider,
    Drawer,
    useMediaQuery,
    IconButton,
    ListItemButton,
} from '@mui/material';
import { styled, keyframes } from '@mui/system';
import MenuIcon from '@mui/icons-material/Menu';
import Header from '../../ui-helpers/header/Header';

const gradientAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// Dynamic background similar to the login/register style
const DynamicBackground = styled('div')(({ theme }) => ({
    minHeight: '100vh',
    background:
        theme.palette.mode === 'light'
            ? 'linear-gradient(45deg, #7928CA, #FF0080, #7928CA)'
            : 'linear-gradient(45deg, #221C35, #3A2B5F, #221C35)',
    backgroundSize: '400% 400%',
    animation: `${gradientAnimation} 15s ease infinite`,
    display: 'flex',
    flexDirection: 'column',
}));

// Define conversation type
interface Conversation {
    prompt: string;
    answer: string;
}

const HomePage = () => {
    const [promptText, setPromptText] = useState('');
    const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
    const [history, setHistory] = useState<Conversation[]>([]);

    // Responsive sidebar: on mobile use a Drawer
    const isMobile = useMediaQuery((theme: any) => theme.breakpoints.down('sm'));
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // When user sends a prompt, simulate server answer and update conversation
    const handleSend = () => {
        if (!promptText.trim()) return;

        // Simulated server response – replace with real API call as needed
        const simulatedAnswer = `Answer to: ${promptText}`;

        const newConversation: Conversation = {
            prompt: promptText,
            answer: simulatedAnswer,
        };

        setCurrentConversation(newConversation);
        setHistory((prev) => [newConversation, ...prev]); // Add to history (latest on top)
        setPromptText('');
    };

    // When clicking a history item, load its conversation into the main chat area
    const handleHistoryClick = (conv: Conversation) => {
        setCurrentConversation(conv);
        setPromptText(conv.prompt);
        if (isMobile) setSidebarOpen(false);
    };

    // Sidebar content: minimalistic list showing a snippet of each prompt
    const sidebarContent = (
        <Box sx={{ width: 250, padding: 2 }}>
            <Typography variant="h6">History</Typography>
            <Divider sx={{ my: 1 }} />
            <List>
                {history.map((conv, index) => (
                    <ListItem key={index} disablePadding>
                        <ListItemButton onClick={() => handleHistoryClick(conv)}>
                            <ListItemText
                                primary={
                                    conv.prompt.length > 20
                                        ? conv.prompt.slice(0, 20) + '...'
                                        : conv.prompt
                                }
                            />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
        </Box>
    );

    return (
        <DynamicBackground>
            {/* Persistent header */}
            <Header />

            {/* Main layout: Sidebar and Chat area */}
            <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Sidebar: Permanent on desktop, Drawer on mobile */}
                {isMobile ? (
                    <>
                        <IconButton
                            onClick={() => setSidebarOpen(true)}
                            sx={{
                                position: 'absolute',
                                top: 80,
                                left: 10,
                                zIndex: 1300,
                                color: 'white',
                            }}
                        >
                            <MenuIcon />
                        </IconButton>
                        <Drawer
                            anchor="left"
                            open={sidebarOpen}
                            onClose={() => setSidebarOpen(false)}
                        >
                            {sidebarContent}
                        </Drawer>
                    </>
                ) : (
                    <Box
                        sx={{
                            width: 250,
                            borderRight: '1px solid rgba(255,255,255,0.2)',
                            overflowY: 'auto',
                        }}
                    >
                        {sidebarContent}
                    </Box>
                )}

                {/* Main chat area */}
                <Container
                    component="main"
                    sx={{
                        flexGrow: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 2,
                    }}
                >
                    <Paper
                        elevation={3}
                        sx={{
                            width: '100%',
                            maxWidth: 600,
                            padding: 3,
                            marginBottom: 2,
                            minHeight: 200,
                        }}
                    >
                        {currentConversation ? (
                            <>
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle1" color="textSecondary">
                                        You:
                                    </Typography>
                                    <Typography variant="body1">
                                        {currentConversation.prompt}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="subtitle1" color="textSecondary">
                                        Server:
                                    </Typography>
                                    <Typography variant="body1">
                                        {currentConversation.answer}
                                    </Typography>
                                </Box>
                            </>
                        ) : (
                            <Typography variant="body1" align="center">
                                Send a prompt to get started.
                            </Typography>
                        )}
                    </Paper>
                    <Box sx={{ width: '100%', maxWidth: 600, display: 'flex', gap: 1 }}>
                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="Type your prompt..."
                            value={promptText}
                            onChange={(e) => setPromptText(e.target.value)}
                        />
                        <Button variant="contained" onClick={handleSend}>
                            Send
                        </Button>
                    </Box>
                </Container>
            </Box>
        </DynamicBackground>
    );
};

export default HomePage;
