import axios from 'axios';

const setupAxios = () => {
    axios.interceptors.request.use(
        (config) => {
            const userInfo = localStorage.getItem('userInfo');
            if (userInfo) {
                try {
                    const parsedUser = JSON.parse(userInfo);
                    // Support both structure: { token: '...' } or { data: { token: '...' } } just in case
                    const token = parsedUser.token || parsedUser.accessToken;
                    if (token) {
                        config.headers.Authorization = `Bearer ${token}`;
                    }
                } catch (error) {
                    console.error("Error parsing user info for token", error);
                }
            }
            return config;
        },
        (error) => Promise.reject(error)
    );
};

export default setupAxios;
