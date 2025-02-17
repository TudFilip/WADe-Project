import { useState } from 'react';
import { Typography, Button, Container, Paper, TextField, Link } from '@mui/material';
import { styled, keyframes } from '@mui/system';
import Header from '../../ui-helpers/header/Header';
import { useTranslation } from 'react-i18next';
import { AuthService } from '../../services';
import { useNavigate } from 'react-router-dom';

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

const RegisterPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [fullName, setFullName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');

    const [fullNameError, setFullNameError] = useState<string>('');
    const [emailError, setEmailError] = useState<string>('');
    const [passwordError, setPasswordError] = useState<string>('');
    const [confirmPasswordError, setConfirmPasswordError] = useState<string>('');

    const [registerError, setRegisterError] = useState<string>('');

    const handleCreateAccount = async () => {
        let valid = true;

        if (!fullName) {
            const error = t('FULLNAMEREQUIRED');
            setFullNameError(error);
            valid = false;
        } else {
            setFullNameError('');
        }

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

        if (password) {
            if (password !== confirmPassword) {
                const error = t('PASSWORDMUSTMATCH');
                setPasswordError(error);
                setConfirmPasswordError(error);
                valid = false;
            } else {
                setPasswordError('');
                setConfirmPasswordError('');
            }
        }

        if (valid) {
            console.log('Logging in with', fullName, email, password);
            const registerData = {
                fullname: fullName,
                email: email,
                password: password,
            };
            const response = await AuthService.createAccount(registerData);

            if (response.error) {
                const errorMessage = t('REGISTERERROR');
                setRegisterError(errorMessage);
            } else {
                return navigate('/login');
            }
        }
    };

    return (
        <DynamicBackground>
            {/* Header */}
            <Header />

            {/* Centered Login Form */}
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
                        {t('CREATENEWACCOUNT')}
                    </Typography>

                    <TextField
                        variant="outlined"
                        margin="normal"
                        required
                        fullWidth
                        label={t('FULLNAME')}
                        value={email}
                        onChange={(e) => setFullName(e.target.value)}
                        error={Boolean(fullNameError)}
                        helperText={fullNameError}
                        autoFocus
                    />
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
                    <TextField
                        variant="outlined"
                        margin="normal"
                        required
                        fullWidth
                        label={t('CONFIRMPASSWORD')}
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        error={Boolean(confirmPasswordError)}
                        helperText={confirmPasswordError}
                    />

                    {Boolean(registerError) && (
                        <Typography variant="body1" align="center" color="red">
                            {registerError}
                        </Typography>
                    )}

                    <Button
                        fullWidth
                        variant="contained"
                        sx={{ mt: 2, mb: 2 }}
                        onClick={handleCreateAccount}
                    >
                        {t('CREATEACCOUNT')}
                    </Button>
                </Paper>
            </Container>
        </DynamicBackground>
    );
};

export default RegisterPage;
