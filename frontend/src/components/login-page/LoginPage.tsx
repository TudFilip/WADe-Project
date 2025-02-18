import { useContext, useState } from 'react';
import { Typography, Button, Container, Paper, TextField, Link } from '@mui/material';
import { styled, keyframes } from '@mui/system';
import Header from '../../ui-helpers/header/Header';
import { useTranslation } from 'react-i18next';
import { AuthService } from '../../services';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../store/app-context';

const gradientAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const DynamicBackground = styled('div')(({ theme }) => ({
    minHeight: '100vh',
    background:
        theme.palette.mode === 'light'
            ? 'linear-gradient(45deg, #7928CA, #a62bc5, #7928CA)'
            : 'linear-gradient(45deg, #221C35, #3A2B5F, #221C35)',
    backgroundSize: '400% 400%',
    animation: `${gradientAnimation} 5s ease infinite`,
    display: 'flex',
    flexDirection: 'column',
}));

const LoginPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { setIsLoggedIn } = useContext(AppContext);

    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');

    const [emailError, setEmailError] = useState<string>('');
    const [passwordError, setPasswordError] = useState<string>('');

    const [loginError, setLoginError] = useState<string>('');

    const handleLogin = async () => {
        let valid = true;
        if (!email) {
            const error = t('EMAILREQUIRED');
            setEmailError(error);
            valid = false;
        } else {
            setEmailError('');
        }

        if (!password) {
            const error = t('PASSWORDREQUIRED');
            setPasswordError(error);
            valid = false;
        } else {
            setPasswordError('');
        }

        if (valid) {
            console.log('Logging in with', email, password);
            const loginData = {
                email: email,
                password: password,
            };
            const response = await AuthService.login(loginData);

            if (response.error) {
                const errorMessage = t('FAILEDLOGIN');
                setLoginError(errorMessage);
            } else {
                setIsLoggedIn(true);
                return navigate('/home');
            }
        }
    };

    return (
        <DynamicBackground>
            <Header />

            <Container
                component="main"
                maxWidth="xs"
                sx={{
                    flexGrow: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
                    <Typography variant="h5" align="center" gutterBottom>
                        {t('LOGIN')}
                    </Typography>

                    <TextField
                        variant="outlined"
                        margin="normal"
                        required
                        fullWidth
                        label={t('EMAIL')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        error={Boolean(emailError)}
                        helperText={emailError}
                        autoFocus
                    />
                    <TextField
                        variant="outlined"
                        margin="normal"
                        required
                        fullWidth
                        label={t('PASSWORD')}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        error={Boolean(passwordError)}
                        helperText={passwordError}
                    />

                    {Boolean(loginError) && (
                        <Typography variant="body1" align="center" color="red">
                            {loginError}
                        </Typography>
                    )}

                    <Button
                        fullWidth
                        variant="contained"
                        sx={{ mt: 2, mb: 2 }}
                        onClick={handleLogin}
                    >
                        {t('LOGIN')}
                    </Button>

                    <Typography variant="body2" align="center">
                        {t('DONTHAVEACCOUNT')}{' '}
                        <Link href="/register" underline="hover">
                            {t('CREATEACCOUNT')}
                        </Link>
                    </Typography>
                </Paper>
            </Container>
        </DynamicBackground>
    );
};

export default LoginPage;
