import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Container, Card, Form, Button, Row, Col } from 'react-bootstrap';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [useOtp, setUseOtp] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let data;
            // Conditional hardcoded admin credentials
            const ADMIN_EMAIL = 'teamgatherx@gmail.com';
            const ADMIN_PASSWORD = '12345';

            if (!useOtp && email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
                // Authenticate via admin endpoint to get a valid admin token
                const res = await axios.post('http://localhost:5000/api/admin/login', { email, password });
                // Store admin session separately so admin routes use `adminInfo`
                localStorage.setItem('adminInfo', JSON.stringify(res.data));
                toast.success('Admin login successful');
                navigate('/admin-dashboard');
                return;
            }
            if (useOtp) {
                if (otpSent) {
                    // Verify OTP
                    const res = await axios.post('http://localhost:5000/api/auth/verify-otp', { email, otp });
                    data = res.data;
                } else {
                    // Send OTP
                    try {
                        setSendingOtp(true);
                        await axios.post('http://localhost:5000/api/auth/send-otp', { email });
                        setOtpSent(true);
                        toast.success("OTP sent to your email");
                    } finally {
                        setSendingOtp(false);
                    }
                    return;
                }
            } else {
                // Password Login
                const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
                data = res.data;
            }

            localStorage.setItem('userInfo', JSON.stringify(data));
            toast.success("Welcome back!");

            if (data.role === 'organizer') {
                navigate('/organizer-dashboard');
            } else if (!data.profile?.profileCompleted) {
                // If profile is not completed, redirect to complete profile page
                navigate('/complete-profile');
            } else {
                navigate('/dashboard');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Login Failed");
        }
    };

    return (
        <div className="login-container">
            <Container style={{ maxWidth: '400px' }}>
                <Card className="p-4 shadow-lg border-0">
                    <Card.Body>
                        <div className="text-center mb-4">
                            <h2 className="fw-bold text-primary">LocalEvents</h2>
                            <p className="text-muted">Discover events happening around you</p>
                        </div>
                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3" controlId="formBasicEmail">
                                <Form.Label>Email address</Form.Label>
                                <Form.Control
                                    type="email"
                                    placeholder="Enter email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    size="lg"
                                    required
                                    disabled={otpSent}
                                />
                            </Form.Group>

                            {!useOtp && (
                                <Form.Group className="mb-4" controlId="formBasicPassword">
                                    <Form.Label>Password</Form.Label>
                                    <Form.Control
                                        type="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        size="lg"
                                        required={!useOtp}
                                    />
                                </Form.Group>
                            )}

                            {useOtp && otpSent && (
                                <Form.Group className="mb-4" controlId="formBasicOtp">
                                    <Form.Label>Enter OTP</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Enter 6-digit OTP"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        size="lg"
                                        required
                                    />
                                </Form.Group>
                            )}

                            <div className="d-grid gap-2 mb-3">
                                <Button variant="primary" type="submit" className="w-100 btn-lg" disabled={sendingOtp && !otpSent}>
                                    {useOtp ? (otpSent ? "Verify & Login" : (sendingOtp ? 'Sending OTP...' : 'Send OTP')) : "Sign In"}
                                </Button>
                                {useOtp && otpSent && (
                                    <Button variant="secondary" type="button" disabled={sendingOtp} onClick={async () => {
                                        try {
                                            setSendingOtp(true);
                                            await axios.post('http://localhost:5000/api/auth/send-otp', { email });
                                            toast.success('OTP resent to your email');
                                        } catch (error) {
                                            toast.error(error.response?.data?.message || 'Resend failed');
                                        } finally {
                                            setSendingOtp(false);
                                        }
                                    }}>
                                        {sendingOtp ? 'Resending...' : 'Resend OTP'}
                                    </Button>
                                )}
                            </div>

                            <div className="text-center mb-3">
                                <Button
                                    variant="link"
                                    onClick={() => {
                                        setUseOtp(!useOtp);
                                        setOtpSent(false);
                                        setOtp('');
                                        setPassword('');
                                    }}
                                    className="text-decoration-none"
                                >
                                    {useOtp ? "Login with Password" : "Login with OTP"}
                                </Button>
                            </div>
                        </Form>
                        <div className="text-center">
                            <p className="mb-0 text-muted">Don't have an account? <Link to="/register" className="text-decoration-none fw-bold">Register</Link></p>
                        </div>
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
};

export default Login;
