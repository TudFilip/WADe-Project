// HomePage.tsx
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
    ListItemButton,
    ListItemText,
    Divider,
    Drawer,
    useMediaQuery,
    IconButton,
    CircularProgress,
} from '@mui/material';
import { styled, keyframes } from '@mui/system';
import DeleteIcon from '@mui/icons-material/Delete';
import Header from '../../ui-helpers/header/Header'; // Adjust path as needed

// Animated gradient background (similar to Login/Register style)
const gradientAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

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

interface Conversation {
    prompt: string;
    answer: string;
    date: string; // e.g., "2/24/2025, 3:15 PM"
}

const HomePage = () => {
    // Manage whether we show the mobile drawer
    const isMobile = useMediaQuery((theme: any) => theme.breakpoints.down('sm'));
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Current prompt/answer
    const [promptText, setPromptText] = useState('');
    const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);

    // Keep a history of all past prompts/answers
    const [history, setHistory] = useState<Conversation[]>([]);

    // Loading state to simulate an async server call
    const [isLoading, setIsLoading] = useState(false);

    const toggleDrawer = () => {
        setDrawerOpen(!drawerOpen);
    };

    // Send the prompt to the "server"
    const handleSend = () => {
        if (!promptText.trim()) return; // Do nothing if prompt is empty

        // Show a loading spinner
        setIsLoading(true);

        // Create a new conversation with no answer yet
        const newConv: Conversation = {
            prompt: promptText,
            answer: '',
            date: new Date().toLocaleString(), // Store the date/time
        };

        // Display the user's prompt in the main area
        setCurrentConversation(newConv);

        // Simulate a 2-second server response delay
        setTimeout(() => {
            const simulatedAnswer = `Answer to: ${promptText}`;
            const updatedConv = { ...newConv, answer: simulatedAnswer };

            // Update the main area and push the conversation into history
            setCurrentConversation(updatedConv);
            setHistory((prev) => [updatedConv, ...prev]);

            // Clear prompt field and stop loading
            setPromptText('');
            setIsLoading(false);
        }, 2000);
    };

    // Load a conversation from history into the main area
    const handleHistoryClick = (conv: Conversation) => {
        setCurrentConversation(conv);
        setPromptText(conv.prompt);
        if (isMobile) {
            setDrawerOpen(false);
        }
    };

    // Remove a conversation from history
    const handleDeleteHistoryItem = (index: number) => {
        setHistory((prev) => {
            const newHistory = [...prev];
            newHistory.splice(index, 1);
            return newHistory;
        });
        // Optional: if this was the currently displayed conversation, clear it
    };

    // Sidebar content: minimalistic prompt list
    const sidebarContent = (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="h6" sx={{ p: 2 }}>
                History
            </Typography>
            <Divider />
            <Box sx={{ overflowY: 'auto', flex: 1 }}>
                <List>
                    {history.map((conv, index) => (
                        <ListItem
                            disablePadding
                            key={index}
                            secondaryAction={
                                <IconButton
                                    edge="end"
                                    aria-label="delete"
                                    onClick={() => handleDeleteHistoryItem(index)}
                                >
                                    <DeleteIcon />
                                </IconButton>
                            }
                        >
                            <ListItemButton onClick={() => handleHistoryClick(conv)}>
                                <ListItemText
                                    primary={
                                        conv.prompt.length > 20
                                            ? conv.prompt.slice(0, 20) + '...'
                                            : conv.prompt
                                    }
                                    secondary={conv.date}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Box>
        </Box>
    );

    return (
        <DynamicBackground>
            <Header toggleSidebar={toggleDrawer} />

            <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Sidebar: permanent on desktop, drawer on mobile */}
                {isMobile ? (
                    <>
                        <Drawer
                            anchor="left"
                            open={drawerOpen}
                            onClose={toggleDrawer}
                            variant="temporary"
                            PaperProps={{ sx: { width: 250 } }}
                        >
                            {sidebarContent}
                        </Drawer>
                    </>
                ) : (
                    <Drawer
                        variant="permanent"
                        open
                        PaperProps={{ sx: { width: 250, position: 'relative' } }}
                    >
                        {sidebarContent}
                    </Drawer>
                )}

                {/* Main content area */}
                <Container
                    component="main"
                    sx={{
                        flexGrow: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        p: 2,
                    }}
                >
                    <Box
                        sx={{
                            width: '100%',
                            maxWidth: 600,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                            mt: 2,
                        }}
                    >
                        {/* Show current conversation (prompt & answer) */}
                        {currentConversation ? (
                            <>
                                {/* Prompt box with distinct background color */}
                                <Paper
                                    elevation={3}
                                    sx={{
                                        p: 2,
                                        backgroundColor: 'primary.main',
                                        color: 'primary.contrastText',
                                    }}
                                >
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        You:
                                    </Typography>
                                    <Typography variant="body1">
                                        {currentConversation.prompt}
                                    </Typography>
                                </Paper>

                                {/* Answer box with different color & spinner if loading */}
                                <Paper
                                    elevation={3}
                                    sx={{
                                        p: 2,
                                        backgroundColor: 'secondary.main',
                                        color: 'secondary.contrastText',
                                    }}
                                >
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        Server:
                                    </Typography>
                                    {isLoading ? (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <CircularProgress size={20} />
                                            <Typography variant="body2">Processing...</Typography>
                                        </Box>
                                    ) : (
                                        <Typography variant="body1">
                                            {currentConversation.answer}
                                        </Typography>
                                    )}
                                </Paper>
                            </>
                        ) : (
                            <Paper elevation={3} sx={{ p: 2, textAlign: 'center', minHeight: 150 }}>
                                <Typography variant="body1">
                                    Send a prompt to get started.
                                </Typography>
                            </Paper>
                        )}

                        {/* Prompt input & send button */}
                        <Box sx={{ display: 'flex', gap: 1 }}>
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
                    </Box>
                </Container>
            </Box>
        </DynamicBackground>
    );
};

export default HomePage;
