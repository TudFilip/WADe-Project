const API__CONSTANTS = {
    PROTOCOL: import.meta.env.VITE_API_PROTOCOL || 'http',
    HOSTNAME: import.meta.env.VITE_API_HOSTNAME || '127.0.0.1',
    PORT: import.meta.env.VITE_API_PORT || 8080,
};

const API__BASE_URL = `${API__CONSTANTS.PROTOCOL}://${API__CONSTANTS.HOSTNAME}:${API__CONSTANTS.PORT}`;
export { API__BASE_URL, API__CONSTANTS };
