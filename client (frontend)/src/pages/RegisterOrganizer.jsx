import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Container, Card, Form, Button, Row, Col, Tabs, Tab } from 'react-bootstrap';
import { createWorker } from 'tesseract.js';

const RegisterOrganizer = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        locationCity: '', // No default value - user must enter manually
        organizationName: '',
        bio: ''
    });
    const [stage, setStage] = useState('form'); // 'form' or 'otp'
    const [otp, setOtp] = useState('');
    const [sendingOtp, setSendingOtp] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Handle OCR file upload and extract city name
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const toastId = toast.loading("Scanning document for city...");
        try {
            const worker = await createWorker('eng');
            const { data: { text } } = await worker.recognize(file);
            await worker.terminate();

            // Simple heuristic: look for a line that matches a known city (example list)
            const knownCities = ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Mumbai', 'Delhi', 'Bengaluru'];
            const found = knownCities.find(city => text.includes(city));

            if (found) {
                setFormData(prev => ({ ...prev, locationCity: found }));
                toast.success(`Detected city: ${found}`, { id: toastId });
            } else {
                toast.error('Could not detect city from image', { id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error("OCR Failed", { id: toastId });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSendingOtp(true);
            await axios.post('http://localhost:5000/api/auth/register-organizer/request-otp', formData);
            toast.success('OTP sent to your email. Enter it to complete registration.');
            setStage('otp');
        } catch (error) {
            toast.error(error.response?.data?.message || "Registration OTP request failed");
        } finally {
            setSendingOtp(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        try {
            const { data } = await axios.post('http://localhost:5000/api/auth/register-organizer/verify-otp', { email: formData.email, otp });
            localStorage.setItem('userInfo', JSON.stringify(data));
            toast.success('Registration complete — logged in');
            navigate('/organizer-dashboard');
        } catch (error) {
            toast.error(error.response?.data?.message || 'OTP verification failed');
        }
    };

    const handleResend = async () => {
        try {
            setSendingOtp(true);
            await axios.post('http://localhost:5000/api/auth/register-organizer/request-otp', formData);
            toast.success('OTP resent to your email.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Resend failed');
        } finally {
            setSendingOtp(false);
        }
    };

    return (
        <div className="login-container">
            <Container style={{ maxWidth: '700px' }}>
                <Card className="p-4 shadow-lg border-0">
                    <Card.Body>
                        <div className="text-center mb-4">
                            <h2 className="fw-bold text-primary">Register as Event Organizer</h2>
                            <p className="text-muted">Create and manage community events</p>
                        </div>

                        <Form onSubmit={stage === 'form' ? handleSubmit : handleVerify}>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Your Name</Form.Label>
                                        <Form.Control name="name" onChange={handleChange} required placeholder="John Doe" />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>City</Form.Label>
                                        <Form.Control name="locationCity" onChange={handleChange} required placeholder="Enter city" value={formData.locationCity} />
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Upload City Document (OCR)</Form.Label>
                                        <Form.Control type="file" accept="image/*" onChange={handleFileUpload} />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Form.Group className="mb-3">
                                <Form.Label>Email address</Form.Label>
                                <Form.Control name="email" type="email" onChange={handleChange} required placeholder="organizer@example.com" />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Password</Form.Label>
                                <Form.Control name="password" type="password" onChange={handleChange} required placeholder="Create password" />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Organization Name</Form.Label>
                                <Form.Control name="organizationName" onChange={handleChange} required placeholder="Your Organization/Community" />
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <Form.Label>Bio / Description</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    name="bio"
                                    onChange={handleChange}
                                    placeholder="Tell us about your organization and events you host..."
                                />
                            </Form.Group>

                            <div className="alert alert-info small">
                                <strong>📋 Verification Required:</strong> Your account will be reviewed by our team. You can create events immediately, but verified organizers get higher trust scores.
                            </div>

                            {stage === 'form' && (
                                <>
                                    <div className="alert alert-info small">
                                        <strong>📋 Verification Required:</strong> Your account will be reviewed by our team. You can create events immediately, but verified organizers get higher trust scores.
                                    </div>

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
                            <p className="mb-0 text-muted">
                                Regular user? <Link to="/register" className="text-decoration-none fw-bold">Register here</Link> |
                                Already have an account? <Link to="/login" className="text-decoration-none fw-bold">Sign In</Link>
                            </p>
                        </div>
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
};

export default RegisterOrganizer;
