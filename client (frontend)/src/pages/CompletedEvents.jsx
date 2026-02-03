import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Navbar, Nav, Button, Container, Row, Col, Card, Badge, Spinner, Alert } from 'react-bootstrap';

// ... existing imports
import EventReviewsModal from '../components/EventReviewsModal';

const CompletedEvents = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Modal State
    const [showReviewsModal, setShowReviewsModal] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [selectedEventTitle, setSelectedEventTitle] = useState('');

    useEffect(() => {
        const fetchCompletedEvents = async () => {
            try {
                const { data } = await axios.get('http://localhost:5000/api/events?status=completed');

                // Fetch feedback for each event to display ratings and photos
                const eventsWithFeedback = await Promise.all(
                    data.map(async (event) => {
                        try {
                            const feedbackRes = await axios.get(`http://localhost:5000/api/feedback/${event._id}`);
                            const feedbackList = feedbackRes.data;

                            // Calculate average rating
                            const totalRating = feedbackList.reduce((acc, curr) => acc + curr.rating, 0);
                            const avgRating = feedbackList.length ? (totalRating / feedbackList.length).toFixed(1) : 'N/A';

                            // Collect photos from feedback
                            const photos = feedbackList.filter(f => f.imageUrl).map(f => f.imageUrl);

                            return { ...event, avgRating, photos, feedbackCount: feedbackList.length };
                        } catch (err) {
                            console.error(`Failed to fetch feedback for event ${event._id}`, err);
                            return { ...event, avgRating: 'N/A', photos: [], feedbackCount: 0 };
                        }
                    })
                );

                setEvents(eventsWithFeedback);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching completed events:", err);
                setError("Failed to load completed events. Please try again later.");
                setLoading(false);
            }
        };

        fetchCompletedEvents();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('userInfo');
        navigate('/');
    };

    const handleOpenReviews = (e, eventId, eventTitle) => {
        e.stopPropagation(); // Prevent card click
        setSelectedEventId(eventId);
        setSelectedEventTitle(eventTitle);
        setShowReviewsModal(true);
    };

    return (
        <div className="bg-light min-vh-100">
            {/* Navbar */}
            <Navbar bg="white" expand="lg" className="shadow-sm sticky-top py-3 mb-4">
                <Container>
                    <Navbar.Brand as={Link} to="/dashboard">
                        <span className="bg-primary text-white rounded p-2 me-2">L</span>
                        LocalEvents
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="me-auto ms-4">
                            <Nav.Link as={Link} to="/dashboard" className="fw-medium text-secondary">Discover</Nav.Link>
                            <Nav.Link as={Link} to="/my-events" className="fw-medium text-secondary">My Events</Nav.Link>
                            <Nav.Link as={Link} to="/completed-events" className="fw-medium active text-primary">Past Events</Nav.Link>
                            <Nav.Link as={Link} to="/profile" className="fw-medium text-secondary">👤 Profile</Nav.Link>
                            <Nav.Link as={Link} to="/complete-profile" className="fw-medium text-secondary">⚙️ Settings</Nav.Link>
                        </Nav>
                        <Nav className="align-items-center">
                            <Button variant="outline-danger" size="sm" onClick={handleLogout}>Logout</Button>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            <Container className="pb-5">
                <div className="d-flex align-items-center justify-content-between mb-4">
                    <div>
                        <h2 className="fw-bold mb-1">Past Events</h2>
                        <p className="text-muted">Explore events that have already happened and see what people thought.</p>
                    </div>
                    <Button variant="outline-secondary" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
                </div>

                {loading ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-2 text-muted">Loading past events...</p>
                    </div>
                ) : error ? (
                    <Alert variant="danger">{error}</Alert>
                ) : events.length === 0 ? (
                    <div className="text-center py-5">
                        <div className="mb-3 fs-1">📂</div>
                        <h4>No completed events found</h4>
                        <p className="text-muted">Check back later once ongoing events are marked as completed!</p>
                    </div>
                ) : (
                    <Row xs={1} md={2} lg={3} className="g-4">
                        {events.map(event => (
                            <Col key={event._id}>
                                <Card className="h-100 border-0 shadow-sm hover-shadow transition-all">
                                    <div className="position-relative" style={{ height: '200px' }}>
                                        <Card.Img
                                            variant="top"
                                            src={event.imageUrl || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800'}
                                            className="h-100 w-100 object-fit-cover"
                                            alt={event.title}
                                            onError={(e) => e.target.src = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800'}
                                        />
                                        <Badge bg="secondary" className="position-absolute top-0 end-0 m-3">
                                            Completed
                                        </Badge>
                                    </div>
                                    <Card.Body>
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <Badge bg="light" text="dark" className="border">
                                                {event.category}
                                            </Badge>
                                            <div className="d-flex align-items-center">
                                                <span className="text-warning me-1">★</span>
                                                <span className="fw-bold">{event.avgRating}</span>
                                                <span className="text-muted small ms-1">({event.feedbackCount})</span>
                                            </div>
                                        </div>

                                        <Card.Title className="fw-bold text-truncate" title={event.title}>
                                            {event.title}
                                        </Card.Title>

                                        <div className="mb-3 text-muted small">
                                            <div className="mb-1">
                                                📅 {new Date(event.dateTime).toLocaleDateString(undefined, {
                                                    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                                                })}
                                            </div>
                                            <div>
                                                📍 {event.eventType === 'online' ? 'Online Event' : `${event.locality}, ${event.city}`}
                                            </div>
                                            <div className="mt-2 text-success fw-bold">
                                                👥 {event.attendedCount || 0} attended <span className="text-muted fw-normal">out of {event.participantCount || 0} registered</span>
                                            </div>
                                        </div>

                                        {event.photos && event.photos.length > 0 && (
                                            <div className="mb-3">
                                                <small className="text-muted d-block mb-2">User Photos:</small>
                                                <div className="d-flex gap-2 overflow-auto" style={{ scrollbarWidth: 'none' }}>
                                                    {event.photos.slice(0, 4).map((photo, idx) => (
                                                        <img
                                                            key={idx}
                                                            src={photo.startsWith('http') ? photo : `http://localhost:5000${photo.startsWith('/') ? '' : '/'}${photo}`}
                                                            alt="Event memory"
                                                            className="rounded"
                                                            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                                            onError={(e) => {
                                                                e.target.onerror = null;
                                                                e.target.src = 'https://via.placeholder.com/40?text=Err';
                                                            }}
                                                        />
                                                    ))}
                                                    {event.photos.length > 4 && (
                                                        <div className="rounded bg-light d-flex align-items-center justify-content-center text-muted small" style={{ width: '40px', height: '40px', minWidth: '40px' }}>
                                                            +{event.photos.length - 4}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </Card.Body>
                                    <Card.Footer className="bg-white border-top-0 pt-0 d-flex gap-2">
                                        <Button
                                            variant="outline-primary"
                                            className="flex-grow-1"
                                            onClick={() => navigate(`/event/${event._id}`)}
                                        >
                                            View Details
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={(e) => handleOpenReviews(e, event._id, event.title)}
                                            title="See Reviews"
                                        >
                                            User Reviews
                                        </Button>
                                    </Card.Footer>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                )}
            </Container>

            {/* Reviews Modal */}
            <EventReviewsModal
                show={showReviewsModal}
                onHide={() => setShowReviewsModal(false)}
                eventId={selectedEventId}
                eventTitle={selectedEventTitle}
            />
        </div>
    );
};

export default CompletedEvents;
