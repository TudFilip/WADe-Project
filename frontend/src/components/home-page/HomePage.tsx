import { useContext, useState } from 'react';
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
    CircularProgress,
} from '@mui/material';
import { styled, keyframes } from '@mui/system';
import Header from '../../ui-helpers/header/Header';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../../store/app-context';
import { HistoryPromptItem } from '../../constants';
import { AppService } from '../../services';

const gradientAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const DynamicBackground = styled('div')(({ theme }) => ({
    height: '100vh',
    background:
        theme.palette.mode === 'light'
            ? 'linear-gradient(45deg, #7928CA, #FF0080, #7928CA)'
            : 'linear-gradient(45deg, #221C35, #3A2B5F, #221C35)',
    backgroundSize: '400% 400%',
    animation: `${gradientAnimation} 15s ease infinite`,
    display: 'flex',
    flexDirection: 'column',
}));

type Stage = 'initial' | 'conversation';

const HomePage = () => {
    const { promptHistory, addPromptIntoHistory } = useContext(AppContext);
    const { t } = useTranslation();

    const isMobile = useMediaQuery((theme: any) => theme.breakpoints.down('sm'));

    const [isLoading, setIsLoading] = useState(false);
    const [stage, setStage] = useState<Stage>('initial');
    const [loadedFromHistory, setLoadedFromHistory] = useState(false);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [promptText, setPromptText] = useState('');
    const [currentConversation, setCurrentConversation] = useState<HistoryPromptItem | null>(null);

    const toggleDrawer = () => {
        setDrawerOpen(!drawerOpen);
    };

    const handleSend = async () => {
        if (!promptText.trim()) return;

        setLoadedFromHistory(false);
        setStage('conversation');
        setIsLoading(true);

        const currentDate = new Date().toLocaleString();

        const newConv: HistoryPromptItem = {
            prompt: promptText,
            answer: '',
            createdAt: currentDate,
        };

        setCurrentConversation(newConv);

        const serverResponse = await AppService.sendPrompt(promptText.trim());

        const answer = serverResponse.response;
        const updatedConv = { ...newConv, answer: answer };
        setCurrentConversation(updatedConv);

        const newPromptHistoryItem: HistoryPromptItem = {
            prompt: promptText.trim(),
            answer: answer,
            createdAt: currentDate,
        };
        addPromptIntoHistory(newPromptHistoryItem);

        setPromptText('');
        setIsLoading(false);
    };

    const handleNewQuestion = () => {
        setCurrentConversation(null);
        setPromptText('');
        setStage('initial');
    };

    const handleRedoPrompt = () => {
        setCurrentConversation(null);
        setStage('initial');
    };

    const handleHistoryClick = (conv: HistoryPromptItem) => {
        setCurrentConversation(conv);
        setPromptText(conv.prompt);
        setStage('conversation');
        setLoadedFromHistory(true);

        if (isMobile) {
            setDrawerOpen(false);
        }
    };

    const sidebarContent = (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '100vh',
                overflow: 'hidden',
                scrollbarWidth: 'thin',
            }}
        >
            <Typography variant="h6" sx={{ p: 2 }}>
                {t('HOMEPAGE.HISTORY')}
            </Typography>
            <Divider />
            <Box sx={{ overflowY: 'auto', flex: 1 }}>
                <List>
                    {promptHistory.map((conv, index) => (
                        <ListItem disablePadding key={index}>
                            <ListItemButton onClick={() => handleHistoryClick(conv)}>
                                <ListItemText
                                    primary={
                                        conv.prompt.length > 20
                                            ? conv.prompt.slice(0, 20) + '...'
                                            : conv.prompt
                                    }
                                    secondary={conv.createdAt}
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

                <Container
                    component="main"
                    sx={{
                        flexGrow: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: stage === 'initial' ? 'center' : 'flex-end',
                        alignItems: 'center',
                        p: 2,
                    }}
                >
                    {stage === 'initial' ? (
                        <Box sx={{ width: '100%', maxWidth: 600, textAlign: 'center' }}>
                            <Typography variant="h3" gutterBottom>
                                {t('HOMEPAGE.WELCOME')}
                            </Typography>
                            <Typography variant="body1" sx={{ mb: 3 }}>
                                {t('HOMEPAGE.WELCOMESUBTITLE')}
                            </Typography>

                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <TextField
                                    fullWidth
                                    variant="outlined"
                                    placeholder={t('HOMEPAGE.TYPEPROMPT')}
                                    value={promptText}
                                    onChange={(e) => setPromptText(e.target.value)}
                                />
                                <Button
                                    variant="contained"
                                    disabled={!promptText.trim() || isLoading}
                                    onClick={handleSend}
                                >
                                    {t('HOMEPAGE.SENDBUTTON')}
                                </Button>
                            </Box>
                        </Box>
                    ) : (
                        <Box
                            sx={{
                                width: '100%',
                                maxWidth: 600,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2,
                                mb: 2,
                            }}
                        >
                            {currentConversation && (
                                <>
                                    <Paper
                                        elevation={3}
                                        sx={{
                                            p: 2,
                                            backgroundColor: 'primary.main',
                                            color: 'primary.contrastText',
                                        }}
                                    >
                                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                            {t('HOMEPAGE.YOU')}:
                                        </Typography>
                                        <Typography variant="body1">
                                            {currentConversation.prompt}
                                        </Typography>
                                    </Paper>

                                    <Paper
                                        elevation={3}
                                        sx={{
                                            p: 2,
                                            backgroundColor: 'secondary.main',
                                            color: 'secondary.contrastText',
                                        }}
                                    >
                                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                            {t('HOMEPAGE.GAITSERVER')}:
                                        </Typography>
                                        {isLoading ? (
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                }}
                                            >
                                                <CircularProgress size={20} />
                                                <Typography variant="body2">
                                                    {t('HOMEPAGE.PROCESSING')}
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <pre
                                                style={{
                                                    whiteSpace: 'pre-wrap',
                                                    wordBreak: 'break-word',
                                                }}
                                            >
                                                {JSON.stringify(
                                                    currentConversation.answer,
                                                    null,
                                                    2,
                                                )}
                                            </pre>
                                        )}
                                    </Paper>
                                </>
                            )}

                            {!isLoading && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                    {loadedFromHistory ? (
                                        <Button variant="contained" onClick={handleRedoPrompt}>
                                            {t('HOMEPAGE.REDO')}
                                        </Button>
                                    ) : (
                                        <Button variant="contained" onClick={handleNewQuestion}>
                                            {t('HOMEPAGE.NEWQUESTION')}
                                        </Button>
                                    )}
                                </Box>
                            )}
                        </Box>
                    )}
                </Container>
            </Box>
        </DynamicBackground>
    );
};

export default HomePage;
