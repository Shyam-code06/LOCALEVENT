import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Container, Card, Form, Button, Row, Col } from 'react-bootstrap';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', locationCity: '', interests: ''
    });
    const [stage, setStage] = useState('form'); // 'form' or 'otp'
    const [otp, setOtp] = useState('');
    const [sendingOtp, setSendingOtp] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSendingOtp(true);
            const interestsArray = formData.interests.split(',').map(i => i.trim());
            await axios.post('http://localhost:5000/api/auth/register/request-otp', {
                ...formData, interests: interestsArray
            });
            toast.success('OTP sent to your email. Enter it to complete registration.');
            setStage('otp');
        } catch (error) {
            toast.error(error.response?.data?.message || "Registration OTP request failed");
        } finally {
            setSendingOtp(false);
        }
    };

    const handleResend = async () => {
        try {
            setSendingOtp(true);
            const interestsArray = formData.interests.split(',').map(i => i.trim());
            await axios.post('http://localhost:5000/api/auth/register/request-otp', {
                ...formData, interests: interestsArray
            });
            toast.success('OTP resent to your email.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Resend failed');
        } finally {
            setSendingOtp(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        try {
            const { data } = await axios.post('http://localhost:5000/api/auth/register/verify-otp', {
                email: formData.email,
                otp
            });
            localStorage.setItem('userInfo', JSON.stringify(data));
            toast.success('Registration complete — please setup your profile');
            navigate('/complete-profile');
        } catch (error) {
            toast.error(error.response?.data?.message || 'OTP verification failed');
        }
    };

    return (
        <div className="login-container">
            <Container style={{ maxWidth: '600px' }}>
                <Card className="p-4 shadow-lg border-0">
                    <Card.Body>
                        <div className="text-center mb-4">
                            <h2 className="fw-bold text-primary">Join LocalEvents</h2>
                            <p className="text-muted">Start your journey of local discovery</p>
                        </div>
                        <Form onSubmit={stage === 'form' ? handleSubmit : handleVerify}>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Full Name</Form.Label>
                                        <Form.Control name="name" onChange={handleChange} required placeholder="John Doe" />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>City</Form.Label>
                                        <Form.Control name="locationCity" onChange={handleChange} required placeholder="Mumbai" />
                                    </Form.Group>
                                </Col>
                            </Row>

                            {stage === 'form' && (
                                <>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Email address</Form.Label>
                                        <Form.Control name="email" type="email" onChange={handleChange} required placeholder="name@example.com" />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Password</Form.Label>
                                        <Form.Control name="password" type="password" onChange={handleChange} required placeholder="Create password" />
                                    </Form.Group>

                                    <Form.Group className="mb-4">
                                        <Form.Label>Interests (comma separated)</Form.Label>
                                        <Form.Control name="interests" onChange={handleChange} placeholder="Music, Startup, Food" />
                                    </Form.Group>

                                    <Button variant="primary" type="submit" className="w-100 btn-lg mb-3" disabled={sendingOtp}>
                                        {sendingOtp ? 'Sending OTP...' : 'Request OTP & Continue'}
                                    </Button>
                                </>
                            )}

                            {stage === 'otp' && (
                                <>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Enter OTP</Form.Label>
                                        <Form.Control value={otp} onChange={e => setOtp(e.target.value)} required placeholder="6-digit code" />
                                    </Form.Group>

                                    <div className="d-grid gap-2">
                                        <Button variant="primary" type="submit" className="w-100 btn-lg mb-2">
                                            Verify OTP & Complete Registration
                                        </Button>
                                        <Button variant="secondary" type="button" disabled={sendingOtp} onClick={handleResend}>
                                            {sendingOtp ? 'Resending...' : 'Resend OTP'}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Form>
                        <div className="text-center">
                            <p className="mb-0 text-muted">Already have an account? <Link to="/login" className="text-decoration-none fw-bold">Sign In</Link></p>
                            <p className="mb-0 text-muted mt-2">Want to host events? <Link to="/register-organizer" className="text-decoration-none fw-bold text-success">Register as Organizer</Link></p>
                        </div>
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
};

export default Register;
