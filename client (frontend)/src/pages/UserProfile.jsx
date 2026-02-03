import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Card, Row, Col, Badge, Button, Navbar, Nav, ListGroup } from 'react-bootstrap';
import toast from 'react-hot-toast';

const UserProfile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const userInfo = localStorage.getItem('userInfo');
        if (!userInfo) {
            navigate('/login');
            return;
        }

        const parsedUser = JSON.parse(userInfo);
        setUser(parsedUser);

        const fetchUserData = async () => {
            try {
                const { data } = await axios.get(`http://localhost:5000/api/users/profile/${parsedUser._id}`);
                setUser(data);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching profile", error);
                setLoading(false);
            }
        };

        fetchUserData();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('userInfo');
        navigate('/');
    };

    if (loading && !user) return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>
    );

    if (!user) return null;

    return (
        <div className="bg-light min-vh-100">
            {/* Navbar */}
            <Navbar bg="white" expand="lg" className="shadow-sm sticky-top py-3">
                <Container>
                    <Navbar.Brand as={Link} to="/dashboard">
                        <span className="bg-primary text-white rounded p-2 me-2">L</span>
                        LocalEvents
                    </Navbar.Brand>
                    <Navbar.Toggle />
                    <Navbar.Collapse>
                        <Nav className="me-auto ms-4">
                            <Nav.Link as={Link} to="/dashboard">Discover</Nav.Link>
                            <Nav.Link as={Link} to="/my-events">My Events</Nav.Link>
                            <Nav.Link as={Link} to="/profile" className="active text-primary fw-bold">Profile</Nav.Link>
                        </Nav>
                        <Button variant="outline-danger" size="sm" onClick={handleLogout}>Logout</Button>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            <Container style={{ maxWidth: '800px' }} className="py-5">
                <Card className="p-4 shadow-lg border-0 rounded-4">
                    <Card.Body>
                        <div className="text-center mb-5">
                            <div className="d-inline-block p-1 rounded-circle bg-light mb-3">
                                <div className="rounded-circle bg-white d-flex align-items-center justify-content-center text-primary shadow-sm" style={{ width: '100px', height: '100px', fontSize: '2.5rem', fontWeight: 'bold' }}>
                                    {user.name?.charAt(0) || 'U'}
                                </div>
                            </div>
                            <h2 className="fw-bold text-primary mb-1">{user.name}</h2>
                            <p className="text-muted">{user.email}</p>
                            <div className="d-flex justify-content-center gap-2">
                                <Badge bg="primary" className="bg-opacity-10 text-primary px-3 py-2 rounded-pill">
                                    Member since {user.createdAt ? new Date(user.createdAt).getFullYear() : '2024'}
                                </Badge>
                                <Badge bg="info" className="bg-opacity-10 text-info px-3 py-2 rounded-pill">
                                    📍 {user.locationCity || 'Not Set'}
                                </Badge>
                            </div>
                        </div>

                        <Row className="mb-5">
                            <Col md={12}>
                                <h5 className="fw-bold mb-3 text-primary border-bottom pb-2">Profile Information</h5>
                                <ListGroup variant="flush">
                                    <ListGroup.Item className="px-0 py-3 bg-transparent border-light d-flex justify-content-between align-items-center">
                                        <span className="text-muted fw-medium">Gender</span>
                                        <span className="fw-bold">{user.profile?.gender || 'Not provided'}</span>
                                    </ListGroup.Item>
                                    <ListGroup.Item className="px-0 py-3 bg-transparent border-light d-flex justify-content-between align-items-center">
                                        <span className="text-muted fw-medium">Date of Birth</span>
                                        <span className="fw-bold">{user.profile?.dob ? new Date(user.profile.dob).toLocaleDateString() : 'Not provided'}</span>
                                    </ListGroup.Item>
                                    <ListGroup.Item className="px-0 py-3 bg-transparent border-light d-flex justify-content-between align-items-center">
                                        <span className="text-muted fw-medium">College/University</span>
                                        <span className="fw-bold">{user.profile?.college || 'Not provided'}</span>
                                    </ListGroup.Item>
                                    <ListGroup.Item className="px-0 py-3 bg-transparent border-light d-flex justify-content-between align-items-center">
                                        <span className="text-muted fw-medium">Graduation Year</span>
                                        <span className="fw-bold">{user.profile?.graduationYear || 'Not provided'}</span>
                                    </ListGroup.Item>
                                    <ListGroup.Item className="px-0 py-3 bg-transparent border-light d-flex justify-content-between align-items-center">
                                        <span className="text-muted fw-medium">Occupation</span>
                                        <span className="fw-bold">{user.profile?.occupation || 'Not provided'}</span>
                                    </ListGroup.Item>
                                    <ListGroup.Item className="px-0 py-3 bg-transparent border-light d-flex justify-content-between align-items-center">
                                        <span className="text-muted fw-medium">Phone Number</span>
                                        <span className="fw-bold">{user.profile?.phoneNumber ? `+91 ${user.profile.phoneNumber}` : 'Not linked'}</span>
                                    </ListGroup.Item>
                                    <ListGroup.Item className="px-0 py-3 bg-transparent border-light d-flex justify-content-between align-items-center">
                                        <span className="text-muted fw-medium">Pincode</span>
                                        <span className="fw-bold">{user.profile?.pincode || 'Not provided'}</span>
                                    </ListGroup.Item>
                                    <ListGroup.Item className="px-0 py-3 bg-transparent border-0 mt-2">
                                        <small className="text-muted d-block mb-1 fw-medium">About Me</small>
                                        <p className="text-dark mb-0">{user.profile?.bio || 'No bio shared yet.'}</p>
                                    </ListGroup.Item>
                                </ListGroup>
                            </Col>
                        </Row>

                        <div className="mb-4">
                            <h5 className="fw-bold mb-3 text-primary border-bottom pb-2">Your Skills</h5>
                            <div className="d-flex flex-wrap gap-2">
                                {(user.profile?.skills || []).length > 0 ? (
                                    user.profile.skills.map(skill => (
                                        <Badge key={skill} bg="white" className="text-success border border-success shadow-sm px-3 py-2 rounded-pill fw-medium">
                                            {skill}
                                        </Badge>
                                    ))
                                ) : (
                                    <span className="text-muted small italic">No skills added yet.</span>
                                )}
                            </div>
                        </div>

                        <div className="mb-5">
                            <h5 className="fw-bold mb-3 text-primary border-bottom pb-2">Your Interests</h5>
                            <div className="d-flex flex-wrap gap-2">
                                {(user.interests || []).length > 0 ? (
                                    user.interests.map(interest => (
                                        <Badge key={interest} bg="white" className="text-primary border shadow-sm px-3 py-2 rounded-pill fw-medium">
                                            {interest}
                                        </Badge>
                                    ))
                                ) : (
                                    <span className="text-muted small italic">No interests selected.</span>
                                )}
                            </div>
                        </div>

                        <div className="d-flex gap-2">
                            <Button as={Link} to="/dashboard" variant="outline-secondary" className="px-4 rounded-pill">
                                Discover Events
                            </Button>
                            <Button as={Link} to="/complete-profile" variant="primary" className="flex-grow-1 px-4 rounded-pill shadow-sm">
                                Edit My Profile
                            </Button>
                        </div>
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
};

export default UserProfile;
