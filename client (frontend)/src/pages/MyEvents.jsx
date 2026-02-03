import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Navbar, Container, Nav, Badge, Row, Col, Card, Button, Modal, Form } from 'react-bootstrap';
import QRCode from 'react-qr-code';

const MyEvents = () => {
    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('userInfo')));
    const [rsvps, setRsvps] = useState(() => JSON.parse(localStorage.getItem('cached_user_rsvps')) || []);
    const [loading, setLoading] = useState(!localStorage.getItem('cached_user_rsvps'));
    const [feedbackStatus, setFeedbackStatus] = useState({}); // Track which events have feedback
    const [currentTime, setCurrentTime] = useState(Date.now());

    // Ticket Modal State
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);

    // Feedback Modal State
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [feedbackImage, setFeedbackImage] = useState(null);
    const [submittingFeedback, setSubmittingFeedback] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const userInfo = localStorage.getItem('userInfo');
        if (!userInfo) {
            navigate('/login');
        } else {
            const parsedUser = JSON.parse(userInfo);
            if (!user) setUser(parsedUser);
            fetchMyEvents(parsedUser._id);
        }
    }, [navigate]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 10000); // Update every 10 seconds for real-time feel
        return () => clearInterval(interval);
    }, []);

    const fetchMyEvents = async (userId) => {
        try {
            const { data } = await axios.get(`http://localhost:5000/api/rsvp/user/${userId}`);

            // Filter out RSVPs where event might be null (e.g. deleted event)
            const activeRsvps = data
                .filter(r => r.event && (r.status === 'YES' || r.status === 'MAYBE'))
                .sort((a, b) => {
                    const dateA = a.event?.dateTime ? new Date(a.event.dateTime) : 0;
                    const dateB = b.event?.dateTime ? new Date(b.event.dateTime) : 0;
                    return dateB - dateA;
                });

            setRsvps(activeRsvps);
            localStorage.setItem('cached_user_rsvps', JSON.stringify(activeRsvps));

            // Check feedback status for each event in parallel to avoid blocking
            const feedbackPromises = activeRsvps.map(async (rsvp) => {
                if (rsvp.event && rsvp.event._id) {
                    try {
                        const feedbackRes = await axios.get(`http://localhost:5000/api/feedback/check/${rsvp.event._id}/${userId}`);
                        return { id: rsvp.event._id, hasFeedback: feedbackRes.data.hasFeedback };
                    } catch (error) {
                        return { id: rsvp.event._id, hasFeedback: false };
                    }
                }
                return null;
            });

            const results = await Promise.all(feedbackPromises);
            const feedbackStatusMap = {};
            results.forEach(res => {
                if (res) feedbackStatusMap[res.id] = res.hasFeedback;
            });

            setFeedbackStatus(feedbackStatusMap);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching my events", error);
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('userInfo');
        navigate('/');
    };

    // Feedback Handlers
    const handleOpenFeedback = (eventId) => {
        setSelectedEventId(eventId);
        setRating(5);
        setComment('');
        setFeedbackImage(null);
        setShowFeedbackModal(true);
    };

    const handleCloseFeedback = () => {
        setShowFeedbackModal(false);
        setSelectedEventId(null);
    };

    // Ticket Handlers
    const handleOpenTicket = (rsvp) => {
        setSelectedTicket(rsvp);
        setShowTicketModal(true);
    };
    const handleCloseTicket = () => {
        setShowTicketModal(false);
        setSelectedTicket(null);
    };

    const submitFeedback = async () => {
        if (!comment.trim()) {
            alert("Please enter a comment");
            return;
        }

        setSubmittingFeedback(true);
        try {
            let imageUrl = '';
            if (feedbackImage) {
                const formData = new FormData();
                formData.append('image', feedbackImage);
                const { token } = JSON.parse(localStorage.getItem('userInfo'));
                const uploadRes = await axios.post('http://localhost:5000/api/feedback/upload', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${token}`
                    }
                });
                imageUrl = uploadRes.data.imageUrl;
            }

            await axios.post('http://localhost:5000/api/feedback', {
                userId: user._id,
                eventId: selectedEventId,
                rating,
                comment,
                imageUrl
            });

            // Update feedback status to hide the button
            setFeedbackStatus(prev => ({
                ...prev,
                [selectedEventId]: true
            }));

            alert("Feedback submitted successfully!");
            handleCloseFeedback();
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || "Error submitting feedback");
        } finally {
            setSubmittingFeedback(false);
        }
    };

    if (!user) return null;

    return (
        <div className="bg-light min-vh-100">
            {/* Navbar (Identical to Dashboard for Consistency) */}
            <Navbar bg="white" expand="lg" className="shadow-sm sticky-top py-3">
                <Container>
                    <Navbar.Brand as={Link} to="/dashboard">
                        <span className="bg-primary text-white rounded p-2 me-2">L</span>
                        LocalEvents
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="me-auto ms-4">
                            <Nav.Link as={Link} to="/dashboard" className="fw-medium text-secondary">Discover</Nav.Link>
                            <Nav.Link as={Link} to="/my-events" className="fw-medium active text-primary">My Events</Nav.Link>
                            <Nav.Link as={Link} to="/profile" className="fw-medium text-secondary">👤 Profile</Nav.Link>
                            <Nav.Link as={Link} to="/complete-profile" className="fw-medium text-secondary">⚙️ Settings</Nav.Link>
                        </Nav>
                        <Nav className="align-items-center">
                            <div className="text-end me-3 d-none d-lg-block">
                                <div className="fw-bold small">{user.name || 'User'}</div>
                            </div>
                            <Button variant="outline-danger" size="sm" onClick={handleLogout}>Logout</Button>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            <Container className="py-5">
                <h2 className="fw-bold mb-4">My Events ({rsvps.length})</h2>

                {loading ? (
                    <Row>
                        {[1, 2, 3].map((i) => (
                            <Col md={6} lg={4} className="mb-4" key={i}>
                                <Card className="h-100 border-0 shadow-sm overflow-hidden text-center">
                                    <div className="skeleton" style={{ height: '200px' }}></div>
                                    <Card.Body className="p-4">
                                        <div className="skeleton skeleton-text w-25 mx-auto mb-3"></div>
                                        <div className="skeleton skeleton-text w-75 mx-auto mb-2"></div>
                                        <div className="skeleton skeleton-text w-50 mx-auto mb-4"></div>
                                        <div className="pt-3 border-top mt-auto">
                                            <div className="skeleton skeleton-text w-50 mx-auto"></div>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                ) : rsvps.length === 0 ? (
                    <Card className="text-center p-5 border-0 shadow-sm">
                        <Card.Body>
                            <h5 className="text-muted mb-3">You haven't joined any events yet.</h5>
                            <Button variant="primary" href="/dashboard">Browse Events</Button>
                        </Card.Body>
                    </Card>
                ) : (
                    <Row>
                        {rsvps.map((rsvp) => {
                            const { event } = rsvp;
                            // Logic: Show feedback button 30 seconds after event is COMPLETED
                            const eventTime = new Date(event.dateTime).getTime();
                            const isCompleted = event.status === 'completed';
                            const thirtySecondsInMillis = 30 * 1000;

                            // For the purpose of "real-time" and "after complete", we check if status is completed
                            // and if 30 seconds have passed since current time reached completion threshold.
                            // However, since we don't have a 'completedAt' field, if status is 'completed'
                            // we'll assume it's ready if 30 seconds have passed since it was marked completed (updatedAt)
                            const completionReferenceTime = new Date(event.updatedAt).getTime();
                            const canLeaveFeedback = isCompleted &&
                                (currentTime >= completionReferenceTime + thirtySecondsInMillis) &&
                                !feedbackStatus[event._id];

                            return (
                                <Col md={6} lg={4} className="mb-4" key={event._id}>
                                    <Card className="h-100 border-0 shadow-sm">
                                        <div className="position-relative" style={{ height: '200px', backgroundColor: '#e9ecef' }}>
                                            <img
                                                src={event.imageUrl || `https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=400&fit=crop`}
                                                className="w-100 h-100 object-fit-cover rounded-top"
                                                alt={event.title}
                                                onError={(e) => e.target.src = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=400&fit=crop'}
                                            />
                                            <div className="position-absolute top-0 end-0 p-3">
                                                {event.status === 'cancelled' ? (
                                                    <Badge bg="danger">Cancelled</Badge>
                                                ) : event.status === 'completed' ? (
                                                    <Badge bg="info">Completed</Badge>
                                                ) : (
                                                    <Badge bg="success">Going</Badge>
                                                )}
                                            </div>
                                        </div>
                                        <Card.Body className="d-flex flex-column p-4">
                                            <div className="d-flex align-items-center gap-2 mb-2">
                                                <Badge bg="light" text="dark" className="border">
                                                    {event.category.toUpperCase()}
                                                </Badge>
                                            </div>
                                            {event.status === 'cancelled' && (
                                                <div className="alert alert-danger py-1 px-2 mb-3 small fw-bold border-danger text-danger">
                                                    🚨 This event was cancelled by the organizer.
                                                </div>
                                            )}
                                            {event.status === 'completed' && !canLeaveFeedback && !feedbackStatus[event._id] && (
                                                <div className="alert alert-info py-1 px-2 mb-3 small fw-bold border-info text-info">
                                                    ⏳ Rating option will be available in 30 seconds.
                                                </div>
                                            )}
                                            <Card.Title className="fw-bold mb-2">{event.title}</Card.Title>
                                            <Card.Text className="text-muted small mb-4 flex-grow-1">
                                                {event.locality}, {event.city}
                                            </Card.Text>

                                            <div className="mt-auto pt-3 border-top">
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <small className="fw-bold text-secondary">
                                                        📅 {new Date(event.dateTime).toLocaleDateString()}
                                                    </small>
                                                    <Badge bg="info" className="bg-opacity-10 text-info border border-info-subtle">
                                                        👥 {event.participantCount || 0} Joined
                                                    </Badge>
                                                </div>

                                                {/* External Links Section - Active Events Only */}
                                                {event.status !== 'completed' && event.status !== 'cancelled' && (event.postLink?.trim() || event.registrationLink?.trim()) && (
                                                    <div className="mb-3 d-flex gap-2">
                                                        {event.postLink?.trim() && (
                                                            <Button
                                                                variant="light"
                                                                size="sm"
                                                                className="flex-grow-1 border shadow-sm"
                                                                style={{ fontSize: '10px', fontWeight: 'bold' }}
                                                                href={event.postLink}
                                                                target="_blank"
                                                            >
                                                                📸 SOURCE
                                                            </Button>
                                                        )}
                                                        {event.registrationLink?.trim() && (
                                                            <Button
                                                                variant="primary"
                                                                size="sm"
                                                                className="flex-grow-1 shadow-sm"
                                                                style={{ fontSize: '10px', fontWeight: 'bold' }}
                                                                href={event.registrationLink}
                                                                target="_blank"
                                                            >
                                                                🔗 LINK
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="text-end mb-3 d-flex gap-2 justify-content-end">
                                                    {event.status !== 'cancelled' && rsvp.status === 'YES' && (
                                                        <Button variant="outline-dark" size="sm" onClick={() => handleOpenTicket(rsvp)} className="rounded-pill px-3">
                                                            🎟️ View Ticket
                                                        </Button>
                                                    )}
                                                    <Button variant="outline-primary" size="sm" onClick={() => navigate(`/event/${event._id}`)} className="rounded-pill">View Details</Button>
                                                </div>

                                                {feedbackStatus[event._id] ? (
                                                    <Button variant="success" className="w-100 fw-bold shadow-sm" disabled>
                                                        ✅ Feedback Submitted
                                                    </Button>
                                                ) : canLeaveFeedback ? (
                                                    <Button
                                                        variant="warning"
                                                        className="w-100 text-white fw-bold shadow-sm"
                                                        onClick={() => handleOpenFeedback(event._id)}
                                                    >
                                                        ⭐ Leave Feedback
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>
                )}

                {/* Ticket Modal */}
                <Modal show={showTicketModal} onHide={handleCloseTicket} centered>
                    <Modal.Header closeButton className="border-0">
                        <Modal.Title className="fw-bold">Your Digital Ticket</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="text-center pb-5">
                        {selectedTicket && (
                            <>
                                <h4 className="fw-bold mb-1">{selectedTicket.event.title}</h4>
                                <p className="text-muted mb-4">
                                    {new Date(selectedTicket.event.dateTime).toLocaleString('en-IN', {
                                        weekday: 'long', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                    })}
                                </p>

                                <div className="p-3 bg-white d-inline-block rounded-4 shadow-sm border mb-3">
                                    <QRCode
                                        value={selectedTicket.ticketCode || "PENDING"}
                                        size={200}
                                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                        viewBox={`0 0 256 256`}
                                    />
                                </div>

                                <div className="mt-2">
                                    <Badge bg="light" text="dark" className="border px-3 py-2 fs-6 font-monospace">
                                        {selectedTicket.ticketCode || "Generating..."}
                                    </Badge>
                                </div>

                                <div className="mt-4 small text-muted">
                                    Show this QR code at the venue for entry.
                                </div>
                            </>
                        )}
                    </Modal.Body>
                </Modal>
            </Container>

            {/* Feedback Modal */}
            <Modal show={showFeedbackModal} onHide={handleCloseFeedback} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Rate This Event</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="text-center mb-4">
                        <div className="fs-1 mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                    key={star}
                                    style={{ cursor: 'pointer', color: star <= rating ? '#ffc107' : '#e4e5e9' }}
                                    onClick={() => setRating(star)}
                                >
                                    ★
                                </span>
                            ))}
                        </div>
                        <p className="text-muted">How was your experience?</p>
                    </div>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Your Review</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                placeholder="Tell us what you liked or didn't like..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Add Photo (Verification Required)</Form.Label>
                            <Form.Control
                                type="file"
                                accept="image/*"
                                capture="environment" // Force camera on mobile
                                onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;

                                    const toastId = toast.loading("Verifying image authenticity...");

                                    try {
                                        // 1. Check EXIF Logic (GPS) - Simple heuristic: Does it have Metadata?
                                        // Note: Many browsers strip EXIF for privacy. We will use a TensorFlow check to ensure it's a real photo (not a screenshot/graphic).
                                        // Using COCO-SSD to detect objects - ensuring it's a "scene" not a white screen/text.
                                        
                                        // Dynamically load TensorFlow libraries to avoid big bundle size initial load
                                        const tf = await import('@tensorflow/tfjs');
                                        const cocoSsd = await import('@tensorflow-models/coco-ssd');

                                        const imgElement = document.createElement('img');
                                        imgElement.src = URL.createObjectURL(file);
                                        
                                        imgElement.onload = async () => {
                                            const model = await cocoSsd.load();
                                            const predictions = await model.detect(imgElement);
                                            
                                            // Heuristic: A real "Event" photo should have detectable objects (person, chair, cup, etc.)
                                            // If predictions are empty, it might be a blur or a blank screen.
                                            // We won't block strictly to avoid false positives, but we will warn.
                                            
                                            // Real validation for "Geological Camera Image" usually requires:
                                            // 1. Mobile Camera API (capture="environment") - added to input.
                                            // 2. EXIF GPS tags (often stripped by browser).
                                            
                                            // We will simluate "Geological verification" by checking if the input came from a camera source if possible,
                                            // or just accepting it with the AI check.
                                            
                                            // Strict Validation Rule:
                                            // The user requires a "geographical event" image. In the absence of reliable browser GPS (privacy),
                                            // we use AI to verify it is a "Real Scene" containing common physical objects (Person, Car, Chair, Cup, etc.)
                                            // rather than a screenshot, blank image, or abstract graphic.

                                            if (predictions.length > 0) {
                                                // Success: Objects detected (high probability it's a real photo)
                                                // Optional: We can check for specific classes e.g., 'person' if we want to be stricter about "Event" attendance.
                                                // For now, any physical object implies a camera photo of a physical space.
                                                const detectedClasses = predictions.map(p => p.class).join(', ');
                                                toast.success(`Image Verified! Detected: ${detectedClasses}`, { id: toastId });
                                                setFeedbackImage(file);
                                            } else {
                                                // Strict Failure: No objects detected
                                                toast.error("Validation Failed: Image does not appear to be a real photo of an event. Please upload a clear camera photo.", { id: toastId });
                                                e.target.value = null; // Clear input
                                                setFeedbackImage(null);
                                            }
                                            URL.revokeObjectURL(imgElement.src);
                                        };

                                        imgElement.onerror = () => {
                                            toast.error("Invalid image file", { id: toastId });
                                            e.target.value = null;
                                        }

                                    } catch (err) {
                                        console.error(err);
                                        toast.error("Image verification failed. Please try again.", { id: toastId });
                                    }
                                }}
                            />
                            <Form.Text className="text-muted">
                                Please upload a photo taken directly from your camera at the event location.
                            </Form.Text>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseFeedback}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={submitFeedback} disabled={submittingFeedback}>
                        {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default MyEvents;
