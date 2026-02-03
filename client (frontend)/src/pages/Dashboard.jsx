import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Container, Nav, Badge, Row, Col, Card, Button, Form, Spinner, Dropdown, Modal, Alert } from 'react-bootstrap';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import HypeFeed from '../components/HypeFeed';
import { calculateSuitability } from '../utils/calculateSuitability';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AIRecommendationModal from '../components/AIRecommendationModal';

const Dashboard = () => {
    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('userInfo')));
    const [events, setEvents] = useState(() => JSON.parse(localStorage.getItem('cached_events')) || []);
    const [recommendations, setRecommendations] = useState(() => JSON.parse(localStorage.getItem('cached_recommendations')) || []);
    const [loading, setLoading] = useState(!localStorage.getItem('cached_events'));
    const [recommendationsLoading, setRecommendationsLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [distanceFilter, setDistanceFilter] = useState('Any'); // Any, <2km, 2-5km, >5km
    const [rsvps, setRsvps] = useState({});
    const [notifications, setNotifications] = useState([]);
    const [liveLocation, setLiveLocation] = useState(null);
    const [locError, setLocError] = useState(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [showMainFeed, setShowMainFeed] = useState(true);
    const [useLiveGPS, setUseLiveGPS] = useState(() => {
        const saved = localStorage.getItem('location_preference');
        return saved === 'GPS'; // Defaults to false (Pincode) if not set
    });
    const navigate = useNavigate();

    // Modals Local State
    const [showFeedback, setShowFeedback] = useState(false);
    const [showInterestDashboard, setShowInterestDashboard] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');

    useEffect(() => {
        const userInfo = localStorage.getItem('userInfo');
        if (!userInfo) {
            navigate('/login');
        } else {
            const parsedUser = JSON.parse(userInfo);
            // Redirect if profile is incomplete (must have DOB, Gender, Pincode for analytics/distance)
            if (parsedUser.role === 'user' && !parsedUser.profile?.profileCompleted) {
                navigate('/complete-profile');
                return;
            }
            // Don't disturb state if already set via lazy initializer
            if (!user) setUser(parsedUser);

            // Perform silent background location check ONLY if user preferred GPS
            if (useLiveGPS) {
                requestLiveLocation(true);
            }
            fetchInitialData(parsedUser._id);
            setNotifications([
                { id: 1, message: "Welcome to LocalEvents! We use your location to show nearby events.", type: "SYSTEM" }
            ]);
        }
    }, [navigate]);

    const requestLiveLocation = (silent = false) => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            return;
        }

        setUseLiveGPS(true); // Explicitly turning it on if requested

        if (!silent) {
            toast.loading("Locating you (High Accuracy)...", { id: 'loc-toast', duration: 2000 });
            setLocationLoading(true);
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const newLoc = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                setLiveLocation(newLoc);
                setLocError(null);
                setLocationLoading(false);
                if (!silent) toast.success("Live GPS Location Active!", { id: 'loc-toast' });
                // Refetch with new coordinates
                fetchRecommendations(user._id, newLoc.lat, newLoc.lng);
                fetchEvents(user._id);
            },
            (error) => {
                console.warn("Location error:", error);
                setLocationLoading(false);
                if (!silent) {
                    toast.error("Weak GPS signal. Using profile city.", { id: 'loc-toast' });
                }
                setLocError(error.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 1000
            }
        );
    };

    const fetchInitialData = async (userId) => {
        // Use profile coordinates if live location isn't ready yet
        const uLat = user.profile?.location?.coordinates?.[1] || user.profile?.coordinates?.lat || user.profile?.lat;
        const uLng = user.profile?.location?.coordinates?.[0] || user.profile?.coordinates?.lng || user.profile?.lng;

        // Parallel fetch for speed
        await Promise.all([
            fetchUserRSVPs(userId),
            fetchRecommendations(userId, uLat, uLng),
            fetchEvents(userId)
        ]);
        setLoading(false);
    };

    const fetchUserRSVPs = async (userId) => {
        try {
            const { data } = await axios.get(`http://localhost:5000/api/rsvp/user/${userId}`);
            const rsvpMap = {};
            data.forEach(r => {
                if (r.event && r.event._id) {
                    rsvpMap[r.event._id] = r.status;
                }
            });
            setRsvps(rsvpMap);
        } catch (error) {
            console.error("Error fetching RSVPs", error);
        }
    };

    const fetchRecommendations = async (userId, lat, lng) => {
        setRecommendationsLoading(true);
        try {
            const coords = lat && lng ? `?lat=${lat}&lng=${lng}` : '';
            const { data } = await axios.get(`http://localhost:5000/api/events/recommendations/${userId}${coords}`);
            setRecommendations(data);
            localStorage.setItem('cached_recommendations', JSON.stringify(data));
        } catch (error) {
            console.error("Error fetching recommendations", error);
        } finally {
            setRecommendationsLoading(false);
        }
    };

    const [showingAllEvents, setShowingAllEvents] = useState(false);

    const fetchEvents = async (uid) => {
        const targetId = uid || user?._id;
        if (!targetId) return;

        try {
            let url = `http://localhost:5000/api/events?userId=${targetId}`;
            const { data } = await axios.get(url);
            setEvents(data);
            localStorage.setItem('cached_events', JSON.stringify(data));
        } catch (error) {
            console.error("Error fetching events", error);
            if (events.length === 0) toast.error("Failed to load events");
        } finally {
            setLoading(false);
        }
    };


    const handleRSVP = async (eventId, status) => {
        try {
            await axios.post('http://localhost:5000/api/rsvp', {
                userId: user._id,
                eventId,
                status
            });
            setRsvps(prev => ({ ...prev, [eventId]: status }));
            toast.success(`RSVP updated: ${status}`);
            fetchEvents();
        } catch (error) {
            toast.error(error.response?.data?.message || "RSVP failed");
        }
    };

    const handleFeedbackOpen = (event) => {
        setSelectedEvent(event);
        setShowFeedback(true);
    };

    const submitFeedback = async () => {
        try {
            await axios.post('http://localhost:5000/api/feedback', {
                userId: user._id,
                eventId: selectedEvent._id,
                rating,
                comment
            });
            toast.success("Feedback submitted! Recommendation engine updated.");
            setShowFeedback(false);
            setRating(5);
            setComment('');
            fetchRecommendations(user._id);
        } catch (error) {
            toast.error(error.response?.data?.message || "Feedback failed");
        }
    };

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
        try {
            const R = 6371;
            const dLat = (parseFloat(lat2) - parseFloat(lat1)) * Math.PI / 180;
            const dLon = (parseFloat(lon2) - parseFloat(lon1)) * Math.PI / 180;
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(parseFloat(lat1) * Math.PI / 180) * Math.cos(parseFloat(lat2) * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        } catch (e) {
            return null;
        }
    };

    const uniqueEvents = [];
    const seenContent = new Set();
    const seenIds = new Set();

    events.forEach(e => {
        const titleKey = (e.title || "").trim().toLowerCase();
        const locKey = (e.locality || "").trim().toLowerCase();
        const timeKey = e.dateTime ? Math.floor(new Date(e.dateTime).getTime() / 60000) : 0;
        const contentKey = `${titleKey}-${locKey}-${timeKey}`;
        if (!seenIds.has(e._id) && !seenContent.has(contentKey)) {
            uniqueEvents.push(e);
            seenIds.add(e._id);
            seenContent.add(contentKey);
        }
    });

    const baseFiltered = uniqueEvents.filter(event =>
        rsvps[event._id] !== 'YES' &&
        event.status !== 'completed' &&
        event.status !== 'cancelled' &&
        (selectedCategory === 'All' || event.category === selectedCategory)
    );

    const uLat = (useLiveGPS && liveLocation) ? liveLocation.lat :
        (user.profile?.location?.coordinates?.[1] || user.profile?.coordinates?.lat || user.profile?.lat || user.lat || null);

    const uLng = (useLiveGPS && liveLocation) ? liveLocation.lng :
        (user.profile?.location?.coordinates?.[0] || user.profile?.coordinates?.lng || user.profile?.lng || user.lng || null);

    const isLocationActive = uLat !== null && uLng !== null;

    useEffect(() => {
        const repairLocation = async () => {
            if (!useLiveGPS && !isLocationActive && user.profile?.pincode) {
                try {
                    const { data } = await axios.get(`http://localhost:5000/api/users/geocode?address=${user.profile.pincode}`);
                    if (data && data.lat) {
                        const updatedUser = { ...user };
                        if (!updatedUser.profile) updatedUser.profile = {};
                        updatedUser.profile.coordinates = { lat: data.lat, lng: data.lng };
                        setUser(updatedUser);
                        localStorage.setItem('userInfo', JSON.stringify(updatedUser));
                    }
                } catch (err) {
                    console.warn("Auto-geocode repair failed:", err);
                }
            }
        };
        repairLocation();
    }, [useLiveGPS, isLocationActive, user.profile?.pincode, user._id]);

    const eventsWithDistance = baseFiltered.map(event => {
        const eLat = event.eventAddress?.location?.coordinates?.[1] || event.eventAddress?.coordinates?.lat || event.lat;
        const eLng = event.eventAddress?.location?.coordinates?.[0] || event.eventAddress?.coordinates?.lng || event.lng;
        let dist = calculateDistance(uLat, uLng, eLat, eLng);
        const uPincode = String(user.profile?.pincode || "").trim();
        const ePincode = String(event.eventAddress?.pincode || "").trim();
        if (uPincode && ePincode && uPincode === ePincode) {
            if (dist === null || dist > 2) dist = 0.5;
        }
        return { ...event, calculatedDistance: dist };
    });

    const exploreEvents = eventsWithDistance
        .filter(event => {
            if (distanceFilter === 'Any') return true;
            const dist = event.calculatedDistance;
            if (dist === null) return false;
            if (distanceFilter === '< 2km') return dist <= 2.2;
            if (distanceFilter === '2-5km') return dist > 2.2 && dist <= 5.5;
            if (distanceFilter === '> 10km') return dist > 10;
            return true;
        })
        .sort((a, b) => {
            const scoreA = (a.recommendationScore * 100) || 0;
            const scoreB = (b.recommendationScore * 100) || 0;
            if (scoreA !== scoreB) return scoreB - scoreA;
            return new Date(a.dateTime) - new Date(b.dateTime);
        });

    if (!user) return null;

    return (
        <div className="bg-light min-vh-100">
            <Header />

            <Container className="py-5">
                <div className="position-fixed bottom-0 end-0 p-4" style={{ zIndex: 1050 }}>
                    <Button
                        variant="success"
                        className="rounded-circle shadow-lg d-flex align-items-center justify-content-center p-0"
                        style={{ width: '56px', height: '56px', background: 'var(--accent-gradient)', border: '3px solid white' }}
                        onClick={() => setShowInterestDashboard(true)}
                    >
                        <span style={{ fontSize: '24px' }}>✨</span>
                    </Button>
                </div>

                <Card className="border-0 shadow-sm mb-5 bg-white overflow-hidden" style={{ borderRadius: '24px' }}>
                    <Card.Body className="p-5 position-relative">
                        <Row className="align-items-center position-relative" style={{ zIndex: 1 }}>
                            <Col md={12}>
                                <h1 className="display-4 fw-bold text-dark">Hello, {user.name}! 👋</h1>
                                <p className="lead text-muted mb-0">Ready to explore what's happening in <strong className="text-primary">{user.locationCity || 'your city'}</strong> today?</p>
                            </Col>
                        </Row>
                        <div className="position-absolute top-0 end-0 opacity-10" style={{ width: '300px', height: '300px', transform: 'translate(30%, -30%)', background: 'radial-gradient(circle, var(--accent-blue) 0%, transparent 70%)' }}></div>
                    </Card.Body>
                </Card>

                <Row>
                    <Col lg={3} className="mb-4">
                        <div
                            className="mb-4 d-flex align-items-center justify-content-between p-3 shadow-sm border-0 position-relative overflow-hidden"
                            style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', borderRadius: '14px', cursor: 'pointer', height: '64px', border: '1px solid rgba(0,0,0,0.05)' }}
                            onClick={() => setShowInterestDashboard(true)}
                        >
                            <div className="d-flex align-items-center gap-2">
                                <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>🎯</div>
                                <div><h6 className="fw-bold mb-0 text-dark" style={{ fontSize: '13px' }}>Recommended</h6></div>
                            </div>
                            <div className="text-primary small fw-bold">View ✨</div>
                        </div>

                        <Card className="mb-4 border-0 shadow-sm rounded-4">
                            <Card.Body>
                                <h6 className="fw-bold mb-3">Location Mode</h6>
                                <div className="d-flex flex-column gap-2 mb-4">
                                    <Button variant={useLiveGPS ? 'success' : 'outline-secondary'} onClick={() => requestLiveLocation(false)}>📡 GPS Mode</Button>
                                    <Button variant={!useLiveGPS ? 'primary' : 'outline-secondary'} onClick={() => setUseLiveGPS(false)}>🏠 Pincode Area</Button>
                                </div>
                                <h6 className="fw-bold mb-3">Distance</h6>
                                <div className="d-flex flex-column gap-2">
                                    {['Any', '< 2km', '2-5km', '> 10km'].map((range) => (
                                        <Button
                                            key={range}
                                            variant={distanceFilter === range ? 'primary' : 'light'}
                                            className={`rounded-3 ${distanceFilter === range ? 'shadow-sm' : 'text-secondary bg-light border-0'}`}
                                            size="sm"
                                            onClick={() => setDistanceFilter(range)}
                                        >
                                            {range}
                                        </Button>
                                    ))}
                                </div>
                            </Card.Body>
                        </Card>

                        <Card className="border-0 shadow-sm rounded-4">
                            <Card.Body>
                                <h6 className="fw-bold mb-3">Categories</h6>
                                <Nav className="flex-column gap-2">
                                    {['All', 'Workshop', 'Meetup', 'Music', 'Food', 'Tech'].map(cat => (
                                        <Nav.Link
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`px-3 py-2 rounded-3 mb-1 border-0 ${selectedCategory === cat ? 'bg-primary bg-opacity-10 text-primary fw-bold' : 'text-secondary'}`}
                                            style={{ transition: 'all 0.2s' }}
                                        >
                                            {cat}
                                        </Nav.Link>
                                    ))}
                                </Nav>
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col lg={9}>
                        <HypeFeed user={user} />
                        <h4 className="fw-bold mb-4">Discover Events</h4>
                        {loading ? <Spinner animation="border" /> : (
                            <Row>
                                {exploreEvents.map(event => (
                                    <Col md={6} className="mb-4" key={event._id}>
                                        <Card className="h-100 border-0 shadow-sm rounded-4 overflow-hidden event-card-hover mt-0">
                                            <div style={{ height: '180px', background: '#eee' }}>
                                                <img
                                                    src={event.imageUrl?.startsWith('http') ? event.imageUrl : `http://localhost:5000${event.imageUrl?.startsWith('/') ? '' : '/'}${event.imageUrl || ''}`}
                                                    className="w-100 h-100 object-fit-cover"
                                                    alt={event.title}
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = 'https://via.placeholder.com/400x200?text=Event';
                                                    }}
                                                />
                                            </div>
                                            <Card.Body className="p-4 d-flex flex-column">
                                                <div className="d-flex gap-2 mb-2">
                                                    <Badge bg="primary">{event.category}</Badge>
                                                    {event.calculatedDistance && <Badge bg="success">{event.calculatedDistance.toFixed(1)} km</Badge>}
                                                </div>
                                                <Card.Title className="fw-bold">{event.title}</Card.Title>
                                                <Card.Text className="text-muted small flex-grow-1">{event.description?.substring(0, 100)}...</Card.Text>
                                                <Button className="btn-premium btn-premium-primary w-100 mt-3" onClick={() => navigate(`/event/${event._id}`)}>View Event</Button>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        )}
                    </Col>
                </Row>

                {/* Modals placeholders */}
                <AIRecommendationModal
                    show={showInterestDashboard}
                    onHide={() => setShowInterestDashboard(false)}
                    recommendations={recommendations}
                    user={user}
                />
            </Container>
            <Footer />
        </div>
    );
};

export default Dashboard;
