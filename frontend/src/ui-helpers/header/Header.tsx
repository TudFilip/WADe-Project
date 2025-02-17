import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Button,
    Box,
    Select,
    MenuItem,
    useMediaQuery,
} from '@mui/material';
import {
    GitHub,
    Brightness7,
    Brightness4,
    Menu as MenuIcon,
    QuestionMark,
    Logout,
} from '@mui/icons-material';
import { AppContext } from '../../store/app-context';
import { useTranslation } from 'react-i18next';

import logoLight from '../../assets/icons/gait-icon-small-light.png';
import logoDark from '../../assets/icons/gait-icon-small-dark.png';

import romanianFlag from '../../assets/icons/romania.png';
import englishFlag from '../../assets/icons/united-kingdom.png';

interface HeaderProps {
    toggleSidebar?: () => void;
}

const Header = ({ toggleSidebar }: HeaderProps) => {
    const navigate = useNavigate();
    const {
        themeMode: mode,
        toggleColorScheme,
        language,
        changeLanguage,
        isLoggedIn,
        logoutUser,
    } = useContext(AppContext);
    const { t } = useTranslation();

    const isMobile = useMediaQuery((theme: any) => theme.breakpoints.down('sm'));

    const handleLogout = () => {
        logoutUser();
        navigate('/login', { replace: true });
    };

    return (
        <AppBar position="sticky" color="secondary" elevation={1}>
            <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    {isMobile && (
                        <IconButton color="inherit" onClick={toggleSidebar}>
                            <MenuIcon />
                        </IconButton>
                    )}
                    <img
                        src={mode === 'dark' ? logoDark : logoLight}
                        alt="Project Logo"
                        style={{ height: '30px' }}
                    />
                    <Typography
                        variant="h6"
                        fontWeight={700}
                        sx={{ display: !isMobile ? 'block' : 'none' }}
                    >
                        GAIT
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Select
                        value={language}
                        onChange={(e) => changeLanguage(e.target.value)}
                        variant="outlined"
                        size="small"
                        sx={{
                            display: 'flex',
                            alignContent: 'center',
                            justifyContent: 'center',
                            color: 'inherit',
                            borderColor: 'inherit',
                            marginRight: 1,
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'inherit' },
                        }}
                    >
                        <MenuItem
                            value="ro"
                            sx={{
                                display: 'flex',
                                alignContent: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <img
                                src={romanianFlag}
                                alt="ro-lng"
                                width={20}
                                loading="lazy"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            />
                        </MenuItem>
                        <MenuItem
                            value="en"
                            sx={{
                                display: 'flex',
                                alignContent: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <img src={englishFlag} alt="en-lng" width={20} loading="lazy" />
                        </MenuItem>
                    </Select>

                    <IconButton onClick={toggleColorScheme} color="inherit">
                        {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
                    </IconButton>

                    <IconButton
                        component="a"
                        href="https://github.com/TudFilip/WADe-Project"
                        color="inherit"
                        target="_blank"
                    >
                        <GitHub />
                    </IconButton>

                    {isMobile ? (
                        <IconButton color="inherit">
                            <QuestionMark />
                        </IconButton>
                    ) : (
                        <Button color="inherit">{t('TUTORIAL')}</Button>
                    )}

                    {isLoggedIn && (
                        <IconButton color="inherit" onClick={handleLogout}>
                            <Logout />
                        </IconButton>
                    )}
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Header;
