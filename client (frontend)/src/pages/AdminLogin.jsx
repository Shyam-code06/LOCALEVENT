import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Container, Card, Form, Button } from 'react-bootstrap';

const AdminLogin = () => {
    const [email, setEmail] = useState('teamgatherx@gmail.com');
    const [password, setPassword] = useState('12345');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await axios.post('http://localhost:5000/api/admin/login', { email, password });
            localStorage.setItem('adminInfo', JSON.stringify(data));
            toast.success("Admin login successful!");
            navigate('/admin-dashboard');
        } catch (error) {
            toast.error(error.response?.data?.message || "Invalid admin credentials");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-light min-vh-100 d-flex align-items-center">
            <Container style={{ maxWidth: '400px' }}>
                <Card className="p-4 shadow-lg border-0">
                    <Card.Body>
                        <div className="text-center mb-4">
                            <h2 className="fw-bold text-danger">🔐 Admin Portal</h2>
                            <p className="text-muted">LocalEvents Administration</p>
                        </div>
                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3">
                                <Form.Label>Email</Form.Label>
                                <Form.Control
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    size="lg"
                                    required
                                    readOnly
                                    style={{ backgroundColor: '#f8f9fa' }}
                                />
                                <Form.Text className="text-muted">Default admin email</Form.Text>
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <Form.Label>Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    size="lg"
                                    required
                                    readOnly
                                    style={{ backgroundColor: '#f8f9fa' }}
                                />
                                <Form.Text className="text-muted">Default admin password</Form.Text>
                            </Form.Group>

                            <Button variant="danger" type="submit" className="w-100 btn-lg" disabled={loading}>
                                {loading ? 'Logging in...' : 'Login as Admin'}
                            </Button>
                        </Form>
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
};

export default AdminLogin;

