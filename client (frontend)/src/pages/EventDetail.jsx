import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Navbar, Container, Nav, Badge, Row, Col, Card, Button, Spinner, Alert } from 'react-bootstrap';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import QRCode from 'react-qr-code';
import { calculateSuitability } from '../utils/calculateSuitability';
import EventReviewsModal from '../components/EventReviewsModal';

const EventDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [event, setEvent] = useState(null);
    const [organizer, setOrganizer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [rsvpStatus, setRsvpStatus] = useState(null);
    const [organizerPastEvents, setOrganizerPastEvents] = useState([]);
    const [pastEventsLoading, setPastEventsLoading] = useState(false);
    const [qrStats, setQrStats] = useState(0);
    const [distInfo, setDistInfo] = useState(null);

    // Reviews Modal State
    const [showReviewsModal, setShowReviewsModal] = useState(false);
    const [selectedPastEventId, setSelectedPastEventId] = useState(null);
    const [selectedPastEventTitle, setSelectedPastEventTitle] = useState('');

    useEffect(() => {
        const fetchEvent = async () => {
            if (!id) return;
            try {
                const { data } = await axios.get(`http://localhost:5000/api/events/${id}`);
                setEvent(data);
                // Set organizer details (populated from backend)
                if (data.organizerId && typeof data.organizerId === 'object') {
                    setOrganizer(data.organizerId);
                }
            } catch (error) {
                console.error("Error fetching event", error);
                toast.error("Failed to load event details");
            } finally {
                setLoading(false);
            }
        };

        const fetchUserRSVP = async () => {
            const userInfo = localStorage.getItem('userInfo');
            if (userInfo) {
                const u = JSON.parse(userInfo);
                setUser(u);
                try {
                    // Optimized to check RSVP for THIS specific event
                    const { data } = await axios.get(`http://localhost:5000/api/rsvp/user/${u._id}`);
                    const match = data.find(r => r.event && (r.event._id === id || r.event === id));
                    if (match) {
                        setRsvpStatus(match.status);
                    }
                } catch (error) {
                    console.error("RSVP check failed", error);
                }
            } else {
                navigate('/login');
            }
        };


        fetchEvent();
        fetchUserRSVP();
    }, [id, navigate]);

    useEffect(() => {
        const fetchOrganizerPastEvents = async () => {
            if (!organizer || !organizer._id) return;

            setPastEventsLoading(true);
            try {
                // Fetch all events by this organizer
                const { data } = await axios.get(`http://localhost:5000/api/events?organizerId=${organizer._id}`);

                // Filter: exclude current event, include only past/completed
                const now = new Date();
                const past = data.filter(e =>
                    e._id !== id &&
                    (e.status === 'completed' || new Date(e.dateTime) < now)
                );

                // Fetch feedback for each
                const eventsWithFeedback = await Promise.all(
                    past.map(async (event) => {
                        try {
                            const feedbackRes = await axios.get(`http://localhost:5000/api/feedback/${event._id}`);
                            const feedbackList = feedbackRes.data;
                            const totalRating = feedbackList.reduce((acc, curr) => acc + curr.rating, 0);
                            const avgRating = feedbackList.length ? (totalRating / feedbackList.length).toFixed(1) : 'N/A';
                            const photos = feedbackList.filter(f => f.imageUrl).map(f => f.imageUrl);
                            return { ...event, avgRating, photos, feedbackCount: feedbackList.length };
                        } catch (err) {
                            return { ...event, avgRating: 'N/A', photos: [], feedbackCount: 0 };
                        }
                    })
                );

                setOrganizerPastEvents(eventsWithFeedback);
            } catch (error) {
                console.error("Error fetching organizer past events", error);
            } finally {
                setPastEventsLoading(false);
            }
        };

        fetchOrganizerPastEvents();
    }, [organizer, id]);

    // Fetch QR Stats for Organizer
    useEffect(() => {
        const fetchQrStats = async () => {
            // Only fetch if user is the organizer of this event
            if (user && organizer && user._id === organizer._id) {
                try {
                    // We need an endpoint to get RSVPs with source.
                    // The existing /api/rsvp/event/:eventId might filter or return all.
                    // Assuming we have or can use a generic get.
                    // Let's check `rsvpController.getEventRSVPs` (not visible in previous read but likely exists or we use `getEvents` population).
                    // Actually, we can just hit the generic RSVP list endpoint if it exists, or add a specific one.
                    // Given constraints, I'll assume we might need to add a small feature to backend OR filter clientside if we can get all RSVPs.
                    // A safe bet is to assume we can get all RSVPs for an event if we are the organizer.
                    // Let's try `GET /api/rsvp/event/${id}` if it exists.
                    // If not, I'll implement a simple fetch here.
                    // Wait, `getEvents` returns participantCount but not details.
                    // I'll check if I need to add a backend route for this stats.
                    // Let's assume I need to fetch all RSVPs for this event.
                    // Checking rsvpController again... `getUserRSVPs` exists. `createRSVP` exists.
                    // Is there `getEventRSVPs`? I missed checking previously.
                    // I will try to fetch from `/api/rsvp/${id}` (common pattern).
                    const { data } = await axios.get(`http://localhost:5000/api/rsvp/event/${id}`);
                    const qrCount = data.filter(r => r.source === 'qr' && r.status === 'YES').length;
                    setQrStats(qrCount);
                } catch (e) {
                    console.log("Could not fetch QR stats");
                }
            }
        };
        fetchQrStats();
    }, [user, organizer, id]);


    const handleRSVP = async (status, source = 'web') => {
        if (!user) {
            // Store intended action if user needs to login
            if (status === 'YES' && source === 'qr') {
                localStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
            }
            toast.error("Please login to join");
            if (source === 'qr') navigate('/login');
            return;
        }
        try {
            await axios.post('http://localhost:5000/api/rsvp', {
                userId: user._id,
                eventId: id,
                status,
                source
            });
            setRsvpStatus(status);
            toast.success(source === 'qr' ? "Successfully checked in via QR!" : "RSVP updated!");

        } catch (error) {
            toast.error(error.response?.data?.message || "RSVP failed");
        }
    };

    // Auto-Join Logic (QR Code / Link)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        const source = params.get('source');

        if (action === 'join' && user && id && rsvpStatus !== 'YES') {
            // Automatically join if param present
            handleRSVP('YES', source || 'web');
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [user, id, rsvpStatus]);

    const calculateRealDistance = async () => {
        if (!user?.profile?.coordinates?.lat || (!event?.eventAddress?.location?.coordinates && !event?.eventAddress?.coordinates?.lat)) {
            toast.error("Please set your address in Profile to use this feature");
            return;
        }

        const uLat = user.profile.coordinates.lat;
        const uLng = user.profile.coordinates.lng;

        let eLat, eLng;
        // Check both possible coordinate structures
        if (event.eventAddress?.coordinates?.lat) {
            eLat = event.eventAddress.coordinates.lat;
            eLng = event.eventAddress.coordinates.lng;
        } else if (event.eventAddress?.location?.coordinates) {
            eLng = event.eventAddress.location.coordinates[0];
            eLat = event.eventAddress.location.coordinates[1];
        }

        if (!eLat || !eLng) {
            toast.error("Event location coordinates not found");
            return;
        }

        try {
            toast.loading("Finding real distance...", { id: 'dist-load' });
            // Using OSRM for real road distance
            const { data } = await axios.get(`https://router.project-osrm.org/route/v1/driving/${uLng},${uLat};${eLng},${eLat}?overview=false`);

            if (data.routes && data.routes.length > 0) {
                const distanceKm = (data.routes[0].distance / 1000).toFixed(1);
                const d = parseFloat(distanceKm);

                let bracket = "";
                let variant = "info";

                if (d < 2) {
                    bracket = "< 2 km";
                    variant = "success";
                } else if (d <= 5) {
                    bracket = "2 to 5 km";
                    variant = "primary";
                } else if (d > 10) {
                    bracket = "Far (> 10 km)";
                    variant = "danger";
                } else {
                    bracket = "Moderate (~5-10km)";
                    variant = "warning";
                }

                setDistInfo({ km: distanceKm, bracket, variant });
                toast.success("Distance calculated!", { id: 'dist-load' });
            }
        } catch (error) {
            console.error("OSRM failed, using Leaflet fallback", error);
            // Fallback to Leaflet (Geometric Distance)
            try {
                const from = L.latLng(uLat, uLng);
                const to = L.latLng(eLat, eLng);
                const dist = (from.distanceTo(to) / 1000).toFixed(1);
                const d = parseFloat(dist);

                let bracket = "";
                let variant = "info";
                if (d < 2) { bracket = "< 2 km"; variant = "success"; }
                else if (d <= 5) { bracket = "2 to 5 km"; variant = "primary"; }
                else if (d > 10) { bracket = "Far (> 10 km)"; variant = "danger"; }
                else { bracket = "Moderate (~5-10km)"; variant = "warning"; }

                setDistInfo({ km: dist, bracket, variant, fallback: true });
                toast.success("Straight-line distance calculated", { id: 'dist-load' });
            } catch (e) {
                toast.error("Distance calculation failed", { id: 'dist-load' });
            }
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('userInfo');
        navigate('/');
    };

    const handleOpenReviews = (e, eventId, eventTitle) => {
        e.stopPropagation();
        setSelectedPastEventId(eventId);
        setSelectedPastEventTitle(eventTitle);
        setShowReviewsModal(true);
    };

    if (loading) {
        return (
            <div className="bg-light min-vh-100 d-flex align-items-center justify-content-center">
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="bg-light min-vh-100">
                <Container className="py-5">
                    <Alert variant="danger">Event not found</Alert>
                    <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
                </Container>
            </div>
        );
    }

    const isEventOver = event.status === 'completed' || new Date(event.dateTime) < new Date();

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
                            <Nav.Link as={Link} to="/dashboard" className="text-secondary fw-medium">Discover</Nav.Link>
                            <Nav.Link as={Link} to="/my-events" className="text-secondary fw-medium">My Events</Nav.Link>
                            <Nav.Link as={Link} to="/profile" className="text-secondary fw-medium">👤 Profile</Nav.Link>
                            <Nav.Link as={Link} to="/complete-profile" className="text-secondary fw-medium">⚙️ Settings</Nav.Link>
                        </Nav>
                        <Nav className="align-items-center">
                            <div className="text-end me-3 d-none d-lg-block">
                                <div className="fw-bold small">{user?.name || 'User'}</div>
                            </div>
                            <Button variant="outline-danger" size="sm" onClick={handleLogout}>Logout</Button>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            <Container className="py-5">
                <Button variant="outline-secondary" className="mb-4" onClick={() => navigate('/dashboard')}>
                    ← Back to Events
                </Button>

                <Row>
                    {/* Event Details */}
                    <Col lg={8}>
                        {/* Cancellation Alert */}
                        {event.status === 'cancelled' && (
                            <Alert variant="danger" className="mb-4 d-flex align-items-center shadow-sm">
                                <div className="fs-1 me-4">🚨</div>
                                <div className="flex-grow-1">
                                    <h4 className="alert-heading fw-bold mb-1">Event Cancelled</h4>
                                    <p className="mb-0">This event has been cancelled by the organizer. RSVPs are no longer accepted.</p>
                                </div>
                            </Alert>
                        )}


                        {/* AI Prediction Card */}
                        {user && event && (
                            <Card className="border-0 shadow-sm mb-4 overflow-hidden" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f1f3f5 100%)' }}>
                                <div className="bg-primary p-1"></div>
                                <Card.Body className="p-4">
                                    <div className="d-flex align-items-center mb-4">
                                        <div className="bg-primary text-white rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: 45, height: 45, fontSize: '1.2rem' }}>
                                            🤖
                                        </div>
                                        <div>
                                            <h5 className="fw-bold mb-0">Smart Match Analysis</h5>
                                            <small className="text-muted">AI-powered suitability score for you</small>
                                        </div>
                                        <div className="ms-auto text-end">
                                            <div className={`h2 fw-bold mb-0 ${calculateSuitability(user, event).score >= 80 ? 'text-success' : calculateSuitability(user, event).score >= 50 ? 'text-primary' : 'text-warning'}`}>
                                                {calculateSuitability(user, event).score}%
                                            </div>
                                            <small className="text-muted fw-bold">MATCH SCORE</small>
                                        </div>
                                    </div>

                                    <div className="progress mb-4 rounded-pill" style={{ height: '12px', backgroundColor: 'rgba(0,0,0,0.05)' }}>
                                        <div
                                            className={`progress-bar progress-bar-striped progress-bar-animated ${calculateSuitability(user, event).score >= 80 ? 'bg-success' : calculateSuitability(user, event).score >= 50 ? 'bg-primary' : 'bg-warning'}`}
                                            role="progressbar"
                                            style={{ width: `${calculateSuitability(user, event).score}%` }}
                                        ></div>
                                    </div>

                                    <div className="bg-white rounded-4 p-3 border shadow-sm">
                                        <Row className="g-3">
                                            {calculateSuitability(user, event).reasons.map((reason, idx) => (
                                                <Col xs={12} key={idx} className="d-flex align-items-center">
                                                    <Badge pill bg={reason.type} className="me-2 p-1">
                                                        <div style={{ width: 8, height: 8 }}></div>
                                                    </Badge>
                                                    <span className="fw-semibold text-dark">{reason.text}</span>
                                                </Col>
                                            ))}
                                        </Row>
                                    </div>
                                </Card.Body>
                            </Card>
                        )}


                        <Card className="border-0 shadow-sm mb-4">
                            <div className="position-relative" style={{ height: '400px', backgroundColor: '#e9ecef' }}>
                                <img
                                    src={event.imageUrl?.startsWith('http') ? event.imageUrl : `http://localhost:5000${event.imageUrl?.startsWith('/') ? '' : '/'}${event.imageUrl || ''}`}
                                    className="w-100 h-100 object-fit-cover rounded-top"
                                    alt={event.title}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=600&fit=crop';
                                    }}
                                />

                                <div className="position-absolute top-0 end-0 p-3">
                                    {event.trustScore > 80 ? (
                                        <Badge bg="success" className="fs-6 px-3 py-2 shadow-sm">★ Trusted Event</Badge>
                                    ) : (
                                        <Badge bg="primary" className="fs-6 px-3 py-2 shadow-sm">New Event</Badge>
                                    )}
                                </div>
                            </div>

                            <Card.Body className="p-4">
                                <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
                                    <Badge bg="light" text="dark" className="border fs-6 px-3 py-2">
                                        {event.category.toUpperCase()}
                                    </Badge>
                                    {event.eventType === 'online' ? (
                                        <Badge bg="info" className="fs-6 px-3 py-2">🌐 Online Event</Badge>
                                    ) : (
                                        <Badge bg="secondary" className="fs-6 px-3 py-2">📍 Offline Event</Badge>
                                    )}
                                    {event.eventType === 'offline' && (
                                        <small className="text-muted">• 📍 {event.locality}, {event.city}</small>
                                    )}
                                </div>
                                <h1 className="fw-bold mb-3">{event.title}</h1>
                                <p className="lead text-muted mb-4">{event.description}</p>

                                {/* Show cancellation alert if user RSVP'd */}
                                {event.status === 'cancelled' && rsvpStatus === 'YES' && (
                                    <Alert variant="danger" className="mb-4">
                                        <div className="d-flex align-items-center">
                                            <span className="fs-3 me-3">⚠️</span>
                                            <div>
                                                <h5 className="fw-bold mb-1">Event Cancelled</h5>
                                                <p className="mb-0">This event has been cancelled by the organizer. You were registered for this event.</p>
                                            </div>
                                        </div>
                                    </Alert>
                                )}

                                {/* Show cancellation notice for all users */}
                                {event.status === 'cancelled' && rsvpStatus !== 'YES' && (
                                    <Alert variant="warning" className="mb-4">
                                        <strong>⚠️ This event has been cancelled.</strong>
                                    </Alert>
                                )}

                                {/* Skills Gained Section */}
                                {event.skills && event.skills.length > 0 && (
                                    <div className="mb-4">
                                        <h6 className="fw-bold mb-2">💡 Skills You Will Gain</h6>
                                        <div className="d-flex flex-wrap gap-2">
                                            {event.skills.map((skill, index) => (
                                                <Badge key={index} bg="secondary" className="px-3 py-2 fw-normal">
                                                    {skill}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <Row className="mb-4">
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <strong>📅 Date & Time</strong>
                                            <p className="mb-2">
                                                {new Date(event.dateTime).toLocaleString(undefined, {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                            {!isEventOver && event.status !== 'cancelled' && (
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    onClick={() => {
                                                        if (!event) return;
                                                        const startTime = new Date(event.dateTime);
                                                        const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours duration

                                                        const formatTime = (date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");

                                                        const details = encodeURIComponent(`${event.description}\n\nEvent Link: ${window.location.href}`);
                                                        const location = encodeURIComponent(event.eventType === 'online' ? event.onlineLink : (event.eventAddress?.fullAddress || `${event.locality}, ${event.city}`));
                                                        const title = encodeURIComponent(event.title);

                                                        const calendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatTime(startTime)}/${formatTime(endTime)}&details=${details}&location=${location}&sf=true&output=xml`;

                                                        window.open(calendarUrl, '_blank');
                                                    }}
                                                >
                                                    📅 Add to Calendar
                                                </Button>
                                            )}
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <strong>👥 Capacity</strong>
                                            <p className="mb-0">
                                                <span className="fw-bold text-primary">{event.participantCount || 0}</span>
                                                <span className="text-muted"> / {event.capacity} Joined</span>
                                            </p>
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <strong>
                                                {event.eventType === 'online' ? '🌐 Event Type' : '📍 Location'}
                                            </strong>
                                            <p className="mb-0">
                                                {event.eventType === 'online' ? (
                                                    <>
                                                        <Badge bg="info" className="me-2">Online Event</Badge>
                                                        {event.onlineLink && (
                                                            <a href={event.onlineLink} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                                                                Join Link →
                                                            </a>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="d-flex flex-column gap-2">
                                                        <a
                                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.eventAddress?.fullAddress || (event.locality + " " + event.city))}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-decoration-none text-dark d-flex align-items-center"
                                                            title="View on Google Maps"
                                                        >
                                                            <span className="me-2 fs-5 text-danger">📍</span>
                                                            {event.eventAddress?.fullAddress ? (
                                                                <span className="text-decoration-underline">{event.eventAddress.fullAddress}</span>
                                                            ) : (
                                                                <span className="text-decoration-underline">{event.locality}, {event.city}</span>
                                                            )}
                                                        </a>
                                                    </div>
                                                )}
                                            </p>
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <strong>🎯 Trust Score</strong>
                                            <p className="mb-0">
                                                <Badge bg={event.trustScore > 80 ? 'success' : event.trustScore > 60 ? 'warning' : 'secondary'}>
                                                    {event.trustScore}/100
                                                </Badge>
                                            </p>
                                        </div>
                                    </Col>
                                </Row>

                                {/* Show detailed address for offline events */}
                                {event.eventType === 'offline' && event.eventAddress?.fullAddress && (
                                    <div className="mb-4 p-3 bg-light rounded border">
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.eventAddress.fullAddress)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-decoration-none text-dark"
                                        >
                                            <strong className="d-flex align-items-center mb-2 text-primary">
                                                <span className="me-2 fs-4">📍</span>
                                                <span className="text-decoration-underline">Event Venue Address (Open in Maps)</span>
                                            </strong>
                                            <p className="mb-0 fw-bold">{event.eventAddress.fullAddress}</p>
                                            {event.eventAddress.street && (
                                                <p className="mb-0 small text-muted">
                                                    {event.eventAddress.street}
                                                    {event.eventAddress.city && `, ${event.eventAddress.city}`}
                                                    {event.eventAddress.state && `, ${event.eventAddress.state}`}
                                                    {event.eventAddress.pincode && ` - ${event.eventAddress.pincode}`}
                                                </p>
                                            )}
                                        </a>
                                    </div>
                                )}

                                {/* Show online link for online events */}
                                {event.eventType === 'online' && event.onlineLink && (
                                    <div className="mb-4 p-3 bg-info bg-opacity-10 rounded">
                                        <strong className="d-flex align-items-center mb-2">
                                            <span className="me-2">🌐</span> Online Event Link
                                        </strong>
                                        <p className="mb-2">
                                            <a href={event.onlineLink} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                                                {event.onlineLink}
                                            </a>
                                        </p>
                                        <Button variant="info" size="sm" href={event.onlineLink} target="_blank">
                                            Join Online Event →
                                        </Button>
                                    </div>
                                )}

                                {/* Registration & Social Links - Only for Active Events */}
                                {event.status !== 'completed' && event.status !== 'cancelled' && (
                                    <>
                                        {event.registrationLink?.trim() && (
                                            <div className="mb-4 p-3 bg-primary bg-opacity-10 rounded shadow-sm border border-primary-subtle animate__animated animate__fadeIn">
                                                <strong className="d-flex align-items-center mb-2 text-primary">
                                                    <span className="me-2">📝</span> Registration / External Form
                                                </strong>
                                                <p className="mb-2 small text-muted">Register via an external form provided by the organizer.</p>
                                                <Button variant="primary" size="sm" href={event.registrationLink} target="_blank" className="shadow-sm">
                                                    Open Registration Form →
                                                </Button>
                                            </div>
                                        )}

                                        {event.postLink?.trim() && (
                                            <div className="mb-4 p-3 bg-light rounded shadow-sm border animate__animated animate__fadeIn">
                                                <strong className="d-flex align-items-center mb-2">
                                                    <span className="me-2">📸</span> Source Post (Instagram / Social)
                                                </strong>
                                                <p className="mb-2 small text-muted">View the original post for more photos and updates.</p>
                                                <Button variant="outline-dark" size="sm" href={event.postLink} target="_blank">
                                                    View Source Post →
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* RSVP Buttons */}
                                <div className="d-flex gap-2 mt-4">
                                    {isEventOver ? (
                                        <div className="alert alert-secondary w-100 text-center">
                                            <strong>🏁 This event has ended.</strong>
                                        </div>
                                    ) : rsvpStatus === 'YES' ? (
                                        <div className="w-100 text-center">
                                            <Button variant="success" size="lg" className="w-100 mb-2" disabled>
                                                ✅ Already Registered
                                            </Button>
                                            {event.status !== 'cancelled' && (
                                                <Button
                                                    variant="link"
                                                    size="sm"
                                                    className="text-danger text-decoration-none"
                                                    onClick={() => handleRSVP('NO')}
                                                >
                                                    Cancel Registration
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="d-grid gap-2 w-100">
                                            <Button
                                                variant="primary"
                                                size="lg"
                                                onClick={() => handleRSVP('YES')}
                                                disabled={event.status === 'cancelled'}
                                            >
                                                {event.status === 'cancelled' ? 'Event Cancelled' : 'Join Event'}
                                            </Button>
                                            <Button
                                                variant="outline-secondary"
                                                onClick={() => handleRSVP('MAYBE')}
                                                disabled={event.status === 'cancelled'}
                                            >
                                                Maybe
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </Card.Body>
                        </Card>

                    </Col>

                    {/* Event QR & Share Sidebar */}
                    <Col lg={4} className="order-lg-1 mb-4">
                        {!isEventOver && event.status !== 'cancelled' && (
                            <Card className="border-0 shadow-sm mb-4 bg-white text-center overflow-hidden">
                                <Card.Header className="bg-dark text-white py-2">
                                    <small className="fw-bold">⚡ QUICK ACCESS</small>
                                </Card.Header>
                                <Card.Body className="p-3">
                                    <div id="qr-export-node" className="bg-white p-4 rounded-4 shadow-sm text-center mb-3" style={{ border: '1px solid #eee' }}>
                                        <h5 className="fw-bold text-dark mb-3">{event.title}</h5>
                                        <div className="d-inline-block p-2 bg-light rounded-3 mb-3">
                                            <QRCode
                                                value={`${window.location.protocol}//${window.location.host}/event/${id}?action=join&source=qr`}
                                                size={200}
                                                level="H"
                                            />
                                        </div>
                                        <div className="small text-muted fw-bold">
                                            📅 {new Date(event.dateTime).toDateString()}<br />
                                            ⏰ {new Date(event.dateTime).toLocaleTimeString()}<br />
                                            📍 {event.eventType === 'online' ? 'Online Event' : event.city}
                                        </div>
                                    </div>

                                    <div className="d-grid gap-2 mt-3 p-2">
                                        <Button
                                            variant="primary"
                                            className="py-3 rounded-pill d-flex align-items-center justify-content-center gap-2 shadow-sm border-0 w-100 fw-bold"
                                            style={{ fontSize: '16px' }}
                                            onClick={async () => {
                                                const node = document.querySelector("#qr-export-node");
                                                if (!node) return;

                                                try {
                                                    const canvas = document.createElement("canvas");
                                                    const ctx = canvas.getContext("2d");
                                                    canvas.width = 400;
                                                    canvas.height = 500;

                                                    ctx.fillStyle = "white";
                                                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                                                    ctx.fillStyle = "#333";
                                                    ctx.font = "bold 20px Outfit";
                                                    ctx.textAlign = "center";
                                                    ctx.fillText(event.title.substring(0, 30), canvas.width / 2, 40);

                                                    const svg = node.querySelector("svg");
                                                    const svgData = new XMLSerializer().serializeToString(svg);
                                                    const img = new Image();

                                                    img.onload = async () => {
                                                        ctx.drawImage(img, 100, 70, 200, 200);
                                                        ctx.fillStyle = "#666";
                                                        ctx.font = "16px Outfit";
                                                        ctx.fillText(`📅 ${new Date(event.dateTime).toDateString()}`, canvas.width / 2, 310);
                                                        ctx.fillText(`⏰ ${new Date(event.dateTime).toLocaleTimeString()}`, canvas.width / 2, 340);
                                                        ctx.fillText(`📍 ${event.eventType === 'online' ? 'Online' : event.city}`, canvas.width / 2, 370);

                                                        ctx.fillStyle = "#0d6efd";
                                                        ctx.font = "bold 14px Outfit";
                                                        ctx.fillText("Scan to Join • LocalEvents", canvas.width / 2, 420);

                                                        canvas.toBlob(async (blob) => {
                                                            const file = new File([blob], `event-invite.png`, { type: 'image/png' });
                                                            const shareText = `🔥 Join me for *${event.title}*!\n\nDetails are in the card above.\n\n👉 *Join here:* \n${window.location.origin}/event/${id}?source=invite`;

                                                            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                                                                await navigator.share({
                                                                    files: [file],
                                                                    title: event.title,
                                                                    text: shareText
                                                                });
                                                            } else {
                                                                // Fallback
                                                                const url = URL.createObjectURL(blob);
                                                                const a = document.createElement('a');
                                                                a.href = url;
                                                                a.download = `event-invite.png`;
                                                                a.click();
                                                                toast.success("Image saved to gallery!");
                                                            }
                                                        }, 'image/png');
                                                    };
                                                    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
                                                } catch (e) {
                                                    toast.error("Process failed.");
                                                }
                                            }}
                                        >
                                            📤 Share
                                        </Button>

                                        <div className="d-flex gap-2">
                                            <Button
                                                variant="outline-secondary"
                                                className="flex-grow-1 py-2 rounded-3 border-light shadow-xs fw-semibold"
                                                style={{ fontSize: '13px' }}
                                                onClick={() => {
                                                    navigator.clipboard.writeText(window.location.href);
                                                    toast.success("Link copied!");
                                                }}
                                            >
                                                🔗 Copy Link
                                            </Button>
                                            <Button
                                                variant="outline-secondary"
                                                className="flex-grow-1 py-2 rounded-3 border-light shadow-xs fw-semibold"
                                                style={{ fontSize: '13px' }}
                                                onClick={() => {
                                                    const svg = document.querySelector("#qr-export-node svg");
                                                    const svgData = new XMLSerializer().serializeToString(svg);
                                                    const canvas = document.createElement("canvas");
                                                    const ctx = canvas.getContext("2d");
                                                    const img = new Image();
                                                    img.onload = () => {
                                                        canvas.width = img.width; canvas.height = img.height;
                                                        ctx.drawImage(img, 0, 0);
                                                        const link = document.createElement("a");
                                                        link.download = "qr.png";
                                                        link.href = canvas.toDataURL();
                                                        link.click();
                                                    };
                                                    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
                                                }}
                                            >
                                                💾 Save QR
                                            </Button>
                                        </div>
                                    </div>




                                    {/* Organizer Stats View */}
                                    {user && organizer && user._id === organizer._id && (
                                        <div className="mt-3 pt-2 border-top">
                                            <Badge bg="info" pill className="px-3 py-1">
                                                📊 {qrStats} joined via QR
                                            </Badge>
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        )}

                        <Card className="border-0 shadow-sm mb-4">

                            <Card.Header className="bg-primary text-white">
                                <h5 className="mb-0 fw-bold">Organizer Information</h5>
                            </Card.Header>
                            <Card.Body>
                                {organizer ? (
                                    <>
                                        <div className="text-center mb-4">
                                            <div className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>
                                                {organizer.organizerProfile?.organizationName?.charAt(0) || organizer.name?.charAt(0) || 'O'}
                                            </div>
                                            <h5 className="fw-bold mb-1">
                                                {organizer.organizerProfile?.organizationName || organizer.name}
                                            </h5>
                                            {organizer.organizerProfile?.verified ? (
                                                <Badge bg="success" className="mb-2">✓ Verified Organizer</Badge>
                                            ) : (
                                                <Badge bg="warning" className="mb-2">⏳ Verification Pending</Badge>
                                            )}
                                        </div>

                                        {/* Organization Type */}
                                        {organizer.organizerProfile?.organizationType && (
                                            <div className="mb-3 pb-3 border-bottom">
                                                <small className="text-muted d-block mb-1">Organization Type</small>
                                                <strong>{organizer.organizerProfile.organizationType}</strong>
                                            </div>
                                        )}

                                        {/* Contact Information */}
                                        {organizer.organizerProfile?.contactPhone && (
                                            <div className="mb-3 pb-3 border-bottom">
                                                <small className="text-muted d-block mb-1">Contact</small>
                                                <strong>📞 {organizer.organizerProfile.contactPhone}</strong>
                                            </div>
                                        )}

                                        {organizer.organizerProfile?.contactEmail && (
                                            <div className="mb-3 pb-3 border-bottom">
                                                <small className="text-muted d-block mb-1">Email</small>
                                                <strong>✉️ {organizer.organizerProfile.contactEmail}</strong>
                                            </div>
                                        )}

                                        {/* Address */}
                                        {organizer.organizerProfile?.address && (
                                            <div className="mb-3 pb-3 border-bottom">
                                                <small className="text-muted d-block mb-1">Address</small>
                                                <strong>
                                                    📍 {organizer.organizerProfile.address.street && `${organizer.organizerProfile.address.street}, `}
                                                    {organizer.organizerProfile.address.city && `${organizer.organizerProfile.address.city}, `}
                                                    {organizer.organizerProfile.address.state && `${organizer.organizerProfile.address.state} `}
                                                    {organizer.organizerProfile.address.pincode && `- ${organizer.organizerProfile.address.pincode}`}
                                                </strong>
                                            </div>
                                        )}

                                        {/* Verification Details */}
                                        <div className="mb-3">
                                            <h6 className="fw-bold mb-3">Verification Details</h6>

                                            {organizer.organizerProfile?.gstNumber && (
                                                <div className="mb-2">
                                                    <small className="text-muted d-block">GST Number</small>
                                                    <strong className="text-success">✓ {organizer.organizerProfile.gstNumber}</strong>
                                                </div>
                                            )}

                                            {organizer.organizerProfile?.panNumber && (
                                                <div className="mb-2">
                                                    <small className="text-muted d-block">PAN Number</small>
                                                    <strong className="text-success">✓ {organizer.organizerProfile.panNumber}</strong>
                                                </div>
                                            )}

                                            {organizer.organizerProfile?.companyRegistrationNumber && (
                                                <div className="mb-2">
                                                    <small className="text-muted d-block">Registration Number</small>
                                                    <strong className="text-success">✓ {organizer.organizerProfile.companyRegistrationNumber}</strong>
                                                </div>
                                            )}

                                            {!organizer.organizerProfile?.gstNumber && !organizer.organizerProfile?.panNumber && !organizer.organizerProfile?.companyRegistrationNumber && (
                                                <p className="text-muted small mb-0">No verification documents provided</p>
                                            )}
                                        </div>

                                        {/* Bio */}
                                        {organizer.organizerProfile?.bio && (
                                            <div className="mt-3 pt-3 border-top">
                                                <small className="text-muted d-block mb-2">About</small>
                                                <p className="small mb-0">{organizer.organizerProfile.bio}</p>
                                            </div>
                                        )}

                                        {/* Website */}
                                        {organizer.organizerProfile?.website && (
                                            <div className="mt-3">
                                                <Button variant="outline-primary" size="sm" href={organizer.organizerProfile.website} target="_blank" className="w-100">
                                                    Visit Website
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center text-muted">
                                        <p>Organizer information not available</p>
                                        <p className="small">{event.organizerName}</p>
                                    </div>
                                )}
                            </Card.Body>
                        </Card>

                        {/* Trust Indicators */}
                        <Card className="border-0 shadow-sm">
                            <Card.Body>
                                <h6 className="fw-bold mb-3">Trust Indicators</h6>
                                <div className="mb-2">
                                    <small className="text-muted">Event Trust Score</small>
                                    <div className="mt-1">
                                        <Badge bg={event.trustScore > 80 ? 'success' : event.trustScore > 60 ? 'warning' : 'secondary'} className="fs-6">
                                            {event.trustScore}/100
                                        </Badge>
                                    </div>
                                </div>
                                {organizer?.organizerProfile?.trustRating && (
                                    <div className="mb-2">
                                        <small className="text-muted">Organizer Trust Rating</small>
                                        <div className="mt-1">
                                            <Badge bg={organizer.organizerProfile.trustRating > 80 ? 'success' : organizer.organizerProfile.trustRating > 60 ? 'warning' : 'secondary'} className="fs-6">
                                                {organizer.organizerProfile.trustRating}/100
                                            </Badge>
                                        </div>
                                    </div>
                                )}
                                {organizer?.organizerProfile?.eventsHosted !== undefined && (
                                    <div>
                                        <small className="text-muted">Events Hosted</small>
                                        <div className="mt-1">
                                            <strong>{organizer.organizerProfile.eventsHosted}</strong>
                                        </div>
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* Organizer's Past Events Section */}
                <div className="mt-5 pt-4 border-top">
                    <h3 className="fw-bold mb-4">Past Events by {organizer?.organizerProfile?.organizationName || organizer?.name || 'Organizer'}</h3>

                    {pastEventsLoading ? (
                        <div className="text-center py-4">
                            <Spinner animation="border" variant="primary" />
                        </div>
                    ) : organizerPastEvents.length === 0 ? (
                        <div className="alert alert-light border text-center py-4">
                            <h5 className="text-muted mb-0">No events conducted in past</h5>
                        </div>
                    ) : (
                        <Row xs={1} md={2} lg={3} className="g-4">
                            {organizerPastEvents.map(pastEvent => (
                                <Col key={pastEvent._id}>
                                    <Card className="h-100 border-0 shadow-sm">
                                        <div className="position-relative" style={{ height: '180px' }}>
                                            <Card.Img
                                                variant="top"
                                                src={pastEvent.imageUrl || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800'}
                                                className="h-100 w-100 object-fit-cover"
                                                alt={pastEvent.title}
                                                onError={(e) => e.target.src = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800'}
                                            />
                                            <Badge bg="secondary" className="position-absolute top-0 end-0 m-2">
                                                Completed
                                            </Badge>
                                        </div>
                                        <Card.Body>
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <Badge bg="light" text="dark" className="border">
                                                    {pastEvent.category}
                                                </Badge>
                                                <div className="d-flex align-items-center">
                                                    <span className="text-warning me-1">★</span>
                                                    <span className="fw-bold">{pastEvent.avgRating}</span>
                                                </div>
                                            </div>

                                            <Card.Title className="fw-bold h6 text-truncate" title={pastEvent.title}>
                                                {pastEvent.title}
                                            </Card.Title>

                                            <div className="mb-3 text-muted small">
                                                <div className="mb-1">
                                                    📅 {new Date(pastEvent.dateTime).toLocaleDateString()}
                                                </div>
                                                <div>
                                                    📍 {pastEvent.eventType === 'online' ? 'Online' : pastEvent.city}
                                                </div>
                                            </div>

                                            {pastEvent.photos && pastEvent.photos.length > 0 && (
                                                <div className="d-flex gap-1 overflow-hidden mb-3">
                                                    {pastEvent.photos.slice(0, 3).map((photo, idx) => (
                                                        <img
                                                            key={idx}
                                                            src={photo}
                                                            alt="Memory"
                                                            className="rounded"
                                                            style={{ width: '30px', height: '30px', objectFit: 'cover' }}
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            <Button
                                                variant="outline-secondary"
                                                size="sm"
                                                className="w-100 mt-2"
                                                onClick={(e) => handleOpenReviews(e, pastEvent._id, pastEvent.title)}
                                            >
                                                See Reviews
                                            </Button>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    )}
                </div>

                {/* Reviews Modal */}
                <EventReviewsModal
                    show={showReviewsModal}
                    onHide={() => setShowReviewsModal(false)}
                    eventId={selectedPastEventId}
                    eventTitle={selectedPastEventTitle}
                />
            </Container>
        </div>
    );
};

export default EventDetail;

