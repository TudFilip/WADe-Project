import React, { useContext } from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Button,
    Box,
    Select,
    MenuItem,
} from '@mui/material';
import { GitHub, Brightness7, Brightness4, Image } from '@mui/icons-material';
import { AppContext } from '../../store/app-context';
import { useTranslation } from 'react-i18next';

import logoLight from '../../assets/icons/gait-icon-small-light.png';
import logoDark from '../../assets/icons/gait-icon-small-dark.png';

import romanianFlag from '../../assets/icons/romania.png';
import englishFlag from '../../assets/icons/united-kingdom.png';

const Header = () => {
    const { themeMode: mode, toggleColorScheme, language, changeLanguage } = useContext(AppContext);
    const { t } = useTranslation();

    return (
        <AppBar position="sticky" color="transparent" elevation={0}>
            <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <img
                        src={mode === 'dark' ? logoDark : logoLight}
                        alt="Project Logo"
                        style={{ height: '40px' }}
                    />
                    <Typography variant="h6" fontWeight={700}>
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

                    <Button color="inherit">{t('TUTORIAL')}</Button>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Header;
