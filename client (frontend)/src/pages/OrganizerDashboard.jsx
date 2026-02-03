import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Navbar, Container, Nav, Badge, Row, Col, Card, Button, Form, Modal, Alert } from 'react-bootstrap';
import { createWorker } from 'tesseract.js';
import { Html5QrcodeScanner } from 'html5-qrcode';
import * as XLSX from 'xlsx';
import AnalyticsModal from '../components/AnalyticsModal'; // Import Component

const OrganizerDashboard = () => {
    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('userInfo')));
    const [loading, setLoading] = useState(!localStorage.getItem('cached_organizer_events'));
    const [stats, setStats] = useState(() => JSON.parse(localStorage.getItem('cached_organizer_stats')));
    const [myEvents, setMyEvents] = useState(() => JSON.parse(localStorage.getItem('cached_organizer_events')) || []);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Analytics State
    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
    const [analyticsEvent, setAnalyticsEvent] = useState(null); // { id, title }

    const [eventForm, setEventForm] = useState({
        title: '',
        description: '',
        category: 'Meetup',
        locality: '',
        dateTime: '',
        capacity: 50,
        sourcePlatform: 'Manual',
        eventType: 'offline',
        eventAddress: {
            street: '',
            city: '',
            state: '',
            pincode: '',
            fullAddress: ''
        },
        coordinates: { lat: null, lng: null },
        onlineLink: '',
        postLink: '',
        registrationLink: '',
        posterImageUrl: ''
    });

    // Scanning State
    const [showScanModal, setShowScanModal] = useState(false);
    const [scanningEventId, setScanningEventId] = useState(null);
    const [scanResult, setScanResult] = useState(null); // { status: 'success'|'error', message: '', rsvp: {} }
    const [manualCode, setManualCode] = useState('');
    const [attendanceList, setAttendanceList] = useState([]);
    const [activeTab, setActiveTab] = useState('scan'); // 'scan' | 'list'
    const navigate = useNavigate();

    // Define fetch functions first or use function keyword to hoist.
    // Better to define them before useEffect or inside if specific.
    // Moving fetchInitialOrganizerData up or using function.

    const fetchOrganizerProfile = async (userId) => {
        try {
            const { data } = await axios.get(`http://localhost:5000/api/auth/organizer-profile/${userId}`);
            // Update user state with latest profile data
            setUser(data);
            // Update localStorage with latest data
            const currentUserInfo = JSON.parse(localStorage.getItem('userInfo'));
            const updatedUserInfo = { ...currentUserInfo, ...data };
            localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
        } catch (error) {
            console.error("Error fetching organizer profile", error);
        }
    };
    const fetchStats = async (userId) => {
        try {
            const { data } = await axios.get(`http://localhost:5000/api/auth/organizer-stats/${userId}`);
            setStats(data);
            localStorage.setItem('cached_organizer_stats', JSON.stringify(data));
        } catch (error) {
            console.error("Error fetching stats", error);
        }
    };

    const fetchMyEvents = async (userId) => {
        try {
            const { data } = await axios.get(`http://localhost:5000/api/events?organizerId=${userId}`);
            setMyEvents(data);
            localStorage.setItem('cached_organizer_events', JSON.stringify(data));
        } catch (error) {
            console.error("Error fetching events", error);
        }
    };

    const fetchInitialOrganizerData = async (userId) => {
        await Promise.all([
            fetchOrganizerProfile(userId),
            fetchStats(userId),
            fetchMyEvents(userId)
        ]);
        setLoading(false);
    };

    useEffect(() => {
        const userInfo = localStorage.getItem('userInfo');
        if (!userInfo) {
            navigate('/login');
        } else {
            const parsedUser = JSON.parse(userInfo);
            if (!user) setUser(parsedUser);

            fetchInitialOrganizerData(parsedUser._id);
        }
    }, [navigate]);



    const handleEventPincodeBlur = async () => {
        if (!eventForm.eventAddress.pincode || eventForm.eventAddress.pincode.length !== 6) return;

        const tid = toast.loading("Verifying event pincode...");
        try {
            const response = await axios.get(`http://localhost:5000/api/users/geocode?address=${encodeURIComponent(eventForm.eventAddress.pincode)}`);
            if (response.data) {
                const { lat, lng } = response.data;
                setEventForm(prev => ({
                    ...prev,
                    coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) }
                }));
                toast.success("Event location pinned to pincode!", { id: tid });
            }
        } catch (error) {
            console.error("Geocoding failed", error);
            toast.dismiss(tid);
        }
    };

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        if (!user.locationCity) {
            toast.error("Please set your city in your profile first");
            return;
        }
        if (eventForm.eventType === 'offline' && !eventForm.eventAddress.fullAddress) {
            toast.error("Please provide event address for offline events");
            return;
        }
        if (eventForm.eventType === 'online' && !eventForm.onlineLink) {
            toast.error("Please provide online event link");
            return;
        }
        try {
            const eventData = {
                ...eventForm,
                city: user.locationCity || 'Unknown',
                organizerId: user._id,
                organizerName: user.organizerProfile?.organizationName || user.name || 'Organizer'
            };

            // If offline, ensure address is properly formatted
            if (eventForm.eventType === 'offline') {
                eventData.eventAddress = {
                    ...eventForm.eventAddress,
                    city: eventForm.eventAddress.city || user.locationCity
                };
            }

            const token = JSON.parse(localStorage.getItem('userInfo')).token;
            await axios.post('http://localhost:5000/api/events', eventData, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success("Event created successfully!");
            setShowCreateModal(false);
            setEventForm({
                title: '',
                description: '',
                category: 'Meetup',
                locality: '',
                dateTime: '',
                capacity: 50,
                sourcePlatform: 'Manual',
                eventType: 'offline',
                eventAddress: {
                    street: '',
                    city: '',
                    state: '',
                    pincode: '',
                    fullAddress: ''
                },
                coordinates: { lat: null, lng: null },
                onlineLink: '',
                postLink: '',
                registrationLink: '',
                posterImageUrl: ''
            });
            fetchMyEvents(user._id);
            fetchStats(user._id);
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Failed to create event";
            toast.error(errorMessage);

            // If limit reached, show special message
            if (error.response?.data?.limitReached || errorMessage.includes('Limit Reached')) {
                toast.error("Please complete profile verification to post more events", { duration: 5000 });
            }

            // If account deactivated
            if (error.response?.status === 403 && errorMessage.includes('deactivated')) {
                toast.error("Your account has been deactivated. Please contact admin.", { duration: 5000 });
            }
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('userInfo');
        navigate('/');
    };

    // OCR file upload to detect city and update user location
    const handleCityUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const toastId = toast.loading("Analysing document for city name...");
        try {
            const worker = await createWorker('eng');
            const { data: { text } } = await worker.recognize(file);
            await worker.terminate();

            const knownCities = ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Mumbai', 'Delhi', 'Bengaluru'];
            const found = knownCities.find(city => text.includes(city));

            if (found) {
                setUser(prev => ({ ...prev, locationCity: found }));
                toast.success(`Detected city: ${found}`, { id: toastId });
            } else {
                toast.error('Could not detect city from image', { id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error("OCR Failed", { id: toastId });
        }
    };

    // --- Scanning & Attendance Logic ---

    const handleOpenScan = (eventId) => {
        setScanningEventId(eventId);
        setScanResult(null);
        setManualCode('');
        setActiveTab('scan');
        fetchAttendanceList(eventId);
        setShowScanModal(true);
        // Scanner initialization is handled in useEffect inside the Modal or we can trigger it
    };

    const handleCloseScan = () => {
        setShowScanModal(false);
        setScanningEventId(null);
        setScanResult(null);
        // Ensure scanner is cleared if it was running (handled by library usually if component unmounts, but better safe)
        const element = document.getElementById('reader');
        if (element) element.innerHTML = '';
    };

    const fetchAttendanceList = async (eventId) => {
        try {
            const { data } = await axios.get(`http://localhost:5000/api/rsvp/event/${eventId}`);
            setAttendanceList(data);
        } catch (error) {
            console.error("Error fetching attendance", error);
        }
    };

    const verifyTicket = async (code) => {
        try {
            const { data } = await axios.post('http://localhost:5000/api/rsvp/verify', {
                ticketCode: code,
                eventId: scanningEventId
            });
            setScanResult({ status: 'success', message: 'Check-in Successful!', rsvp: data.rsvp });
            toast.success(`Welcome, ${data.rsvp.user.name}!`);
            fetchAttendanceList(scanningEventId); // Refresh list
        } catch (error) {
            setScanResult({
                status: 'error',
                message: error.response?.data?.message || 'Invalid Ticket',
                rsvp: error.response?.data?.rsvp
            });
            toast.error(error.response?.data?.message || 'Check-in Failed');
        }
    };

    const onScanSuccess = (decodedText, decodedResult) => {
        // Prevent multiple calls for same code quickly
        if (scanResult?.status === 'success' && scanResult?.rsvp?.ticketCode === decodedText) return;

        console.log(`Scan result: ${decodedText}`, decodedResult);
        verifyTicket(decodedText);

        // Optional: Pause scanner or show result overlay
    };

    const onScanFailure = (error) => {
        // console.warn(`Code scan error = ${error}`);
    };

    // Initialize Scanner when Modal is open and tab is scan
    useEffect(() => {
        let scanner = null;
        if (showScanModal && activeTab === 'scan' && scanningEventId) {
            // Include a small delay to ensure DOM is ready
            setTimeout(() => {
                if (!document.getElementById('reader')) return;

                scanner = new Html5QrcodeScanner(
                    "reader",
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    /* verbose= */ false
                );
                scanner.render(onScanSuccess, onScanFailure);
            }, 100);
        }

        return () => {
            if (scanner) {
                scanner.clear().catch(error => console.error("Failed to clear scanner", error));
            }
        };
    }, [showScanModal, activeTab, scanningEventId]);

    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (!manualCode.trim()) return;
        verifyTicket(manualCode.trim());
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // html5-qrcode can scan files too
        const html5QrCode = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
        // Actually Html5QrcodeScanner is for UI. For file, we might use Html5Qrcode class directly or just letting the UI handle it?
        // The default UI has file upload! But let's verify.
        // If we want a custom file input:
        try {
            // We can reuse the same verifyTicket logic
            // But let's stick to the camera UI which usually has "Upload Image" built-in or we add a helper
            // For simplicity, let's assume the user uses the camera UI or inputs code manually.
            // If we really want file upload separately:
            // const html5QrCode = new Html5Qrcode("reader"); ...
            // Let's rely on manual code entry as backup for now, or the library's file support if enabled.
        } catch (err) { }
    };

    const exportAttendance = () => {
        const dataToExport = attendanceList.map(item => ({
            'Name': item.user?.name || 'Unknown',
            'Email': item.user?.email || 'Unknown',
            'Ticket Code': item.ticketCode || 'N/A',
            'Status': item.attendanceStatus,
            'Check-in Time': item.checkInTime ? new Date(item.checkInTime).toLocaleString() : '-'
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Attendance");
        XLSX.writeFile(wb, `Attendance_${scanningEventId}.xlsx`);
    };

    // For Organizer Dashboard, we show the navbar immediately and only skeleton the content
    const renderStatsSkeleton = () => (
        <Row className="mb-5">
            {[1, 2, 3, 4].map(i => (
                <Col md={3} key={i}>
                    <Card className="border-0 shadow-sm text-center p-4">
                        <div className="skeleton skeleton-text w-50 mx-auto mb-2" style={{ height: '2rem' }}></div>
                        <div className="skeleton skeleton-text w-75 mx-auto"></div>
                    </Card>
                </Col>
            ))}
        </Row>
    );

    if (!user && loading) {
        return (
            <div className="bg-light min-vh-100 d-flex align-items-center justify-content-center">
                <div className="text-center">
                    <div className="skeleton skeleton-card mb-3" style={{ width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto' }}></div>
                    <p className="text-muted">Loading Portal...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="bg-light min-vh-100">
            {/* Navbar */}
            <Navbar bg="white" expand="lg" className="shadow-sm sticky-top py-3">
                <Container>
                    <Navbar.Brand href="/organizer-dashboard">
                        <span className="bg-success text-white rounded p-2 me-2">O</span>
                        Organizer Portal
                    </Navbar.Brand>

                    <Navbar.Toggle />
                    <Navbar.Collapse>
                        <Nav className="ms-auto align-items-center">
                            <Nav.Link as={Link} to="/organizer-dashboard" className="me-3">Dashboard</Nav.Link>
                            <Nav.Link as={Link} to="/organizer-profile" className="me-3">Profile</Nav.Link>
                            <div className="text-end me-3">
                                <div className="fw-bold small">{user.organizerProfile?.organizationName || user.name}</div>
                                <div className="text-muted small">
                                    {user.organizerProfile?.verified ? (
                                        <span className="text-success">✓ Verified</span>
                                    ) : (
                                        <span className="text-warning">⏳ Pending Verification</span>
                                    )}
                                </div>
                            </div>
                            <Button variant="outline-danger" size="sm" onClick={handleLogout}>Logout</Button>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            <Container className="py-5">
                {/* Verification Status Banner */}
                {user.organizerProfile?.verified ? (
                    <Alert variant="success" className="mb-4 shadow-sm border-0">
                        <Row className="align-items-center">
                            <Col md={8}>
                                <div className="d-flex align-items-center">
                                    <div className="bg-success text-white rounded-circle p-3 me-3 d-flex align-items-center justify-content-center" style={{ width: 60, height: 60, fontSize: '1.5rem' }}>
                                        ✓
                                    </div>
                                    <div>
                                        <h5 className="fw-bold mb-1 text-success">🎉 Your Organization is Verified!</h5>
                                        <p className="mb-0 text-muted">
                                            Congratulations! Your organizer account has been verified by our admin team.
                                            You can now create events with full credibility.
                                        </p>
                                    </div>
                                </div>
                            </Col>
                            <Col md={4} className="text-md-end mt-3 mt-md-0">
                                <div className="d-inline-block bg-white rounded p-3 shadow-sm">
                                    <small className="text-muted d-block mb-1">Your Trust Score</small>
                                    <h3 className="fw-bold mb-0 text-success">{stats?.trustRating || 50}/100</h3>
                                </div>
                            </Col>
                        </Row>
                    </Alert>
                ) : (
                    <Alert variant="warning" className="mb-4 shadow-sm border-0">
                        <Row className="align-items-center">
                            <Col md={8}>
                                <div className="d-flex align-items-center">
                                    <div className="bg-warning text-white rounded-circle p-3 me-3 d-flex align-items-center justify-content-center" style={{ width: 60, height: 60, fontSize: '1.5rem' }}>
                                        ⏳
                                    </div>
                                    <div>
                                        <h5 className="fw-bold mb-1 text-warning">Verification Pending</h5>
                                        <p className="mb-0">
                                            Your organizer profile is under review by our admin team.
                                            Please complete your profile with all required documents for faster verification.
                                        </p>
                                    </div>
                                </div>
                            </Col>
                            <Col md={4} className="text-md-end mt-3 mt-md-0">
                                <Button variant="outline-warning" href="/organizer-profile">
                                    Complete Profile →
                                </Button>
                            </Col>
                        </Row>
                    </Alert>
                )}

                {/* Rules & Guidelines Section */}
                <Card className="border-0 shadow-sm mb-4">
                    <Card.Body>
                        <h5 className="fw-bold mb-3">📋 Account Rules & Guidelines</h5>
                        <Row>
                            <Col md={6}>
                                <div className="mb-3">
                                    <h6 className="fw-bold text-primary">Event Posting Limits</h6>
                                    <ul className="mb-0">
                                        <li><strong>Unverified Organizers:</strong> Can post only <strong>3 events</strong></li>
                                        <li><strong>Verified Organizers:</strong> Unlimited event posting</li>
                                        <li>Complete profile verification to unlock unlimited posting</li>
                                    </ul>
                                </div>
                            </Col>
                            <Col md={6}>
                                <div className="mb-3">
                                    <h6 className="fw-bold text-danger">Account Deactivation Rules</h6>
                                    <p className="small mb-2">Your account may be deactivated by admin for:</p>
                                    <ul className="mb-0 small">
                                        <li><strong>Scam or Fraudulent Activity:</strong> Misleading event information, fake events, or financial scams</li>
                                        <li><strong>Policy Violations:</strong> Violating community guidelines or terms of service</li>
                                        <li><strong>User Reports:</strong> Multiple valid complaints from users</li>
                                        <li><strong>Security Concerns:</strong> Suspicious account activity or security breaches</li>
                                    </ul>
                                </div>
                            </Col>
                        </Row>
                        <Alert variant="info" className="mb-0 mt-3">
                            <strong>💡 Tip:</strong> Maintain high trust scores, respond to user feedback, and follow community guidelines to keep your account active and verified.
                        </Alert>
                    </Card.Body>
                </Card>

                {/* Stats Cards */}
                {loading ? renderStatsSkeleton() : (
                    <Row className="mb-5">
                        <Col md={3}>
                            <Card className="border-0 shadow-sm text-center p-4">
                                <h3 className="display-4 text-primary fw-bold">{stats?.eventsHosted || 0}</h3>
                                <p className="text-muted mb-0">Events Hosted</p>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="border-0 shadow-sm text-center p-4">
                                <h3 className="display-4 text-success fw-bold">{stats?.trustRating || 50}</h3>
                                <p className="text-muted mb-0">Trust Score</p>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="border-0 shadow-sm text-center p-4">
                                <h3 className="display-4 text-warning fw-bold">{myEvents.length}</h3>
                                <p className="text-muted mb-0">Active Events</p>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="border-0 shadow-sm text-center p-4">
                                <Button variant="primary" className="w-100" onClick={() => setShowCreateModal(true)}>
                                    + Create Event
                                </Button>
                            </Card>
                        </Col>
                    </Row>
                )}

                {/* My Events */}
                <h4 className="fw-bold mb-4">My Events</h4>
                {loading ? (
                    <Row>
                        {[1, 2, 3].map(i => (
                            <Col md={4} key={i} className="mb-4">
                                <Card className="h-100 border-0 shadow-sm overflow-hidden">
                                    <div className="skeleton" style={{ height: '150px' }}></div>
                                    <Card.Body>
                                        <div className="skeleton skeleton-text w-25 mb-2"></div>
                                        <div className="skeleton skeleton-text w-75 mb-3"></div>
                                        <div className="skeleton skeleton-text w-50 mb-3"></div>
                                        <div className="pt-2 border-top">
                                            <div className="skeleton skeleton-text w-50"></div>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                ) : myEvents.length === 0 ? (
                    <Card className="text-center p-5 border-0 shadow-sm">
                        <Card.Body>
                            <h5 className="text-muted mb-3">No events created yet</h5>
                            <Button variant="primary" onClick={() => setShowCreateModal(true)}>Create Your First Event</Button>
                        </Card.Body>
                    </Card>
                ) : (
                    <Row>
                        {myEvents.map(event => (
                            <Col md={4} key={event._id} className="mb-4">
                                <Card className={`h-100 border-0 shadow-sm ${event.isDeleted ? 'border border-danger' : ''}`}>
                                    <Card.Body className="d-flex flex-column">
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <Badge bg="light" text="dark">{event.category}</Badge>
                                            <div className="d-flex gap-1">
                                                {event.isDeleted && <Badge bg="danger">Deleted</Badge>}
                                                {event.eventType === 'online' && <Badge bg="info">Online</Badge>}
                                            </div>
                                        </div>
                                        <h5 className={`fw-bold ${event.isDeleted ? 'text-muted text-decoration-line-through' : ''}`}>{event.title}</h5>
                                        <p className="text-muted small mb-2">{event.locality}</p>

                                        {/* Event Description Preview */}
                                        <p className="text-secondary small mb-3" style={{
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden'
                                        }}>
                                            {event.description}
                                        </p>

                                        {event.status === 'cancelled' && (
                                            <div className="alert alert-danger py-1 px-2 mb-3 text-center">
                                                <small className="fw-bold">🚨 EVENT CANCELLED</small>
                                            </div>
                                        )}

                                        {event.isDeleted && (
                                            <div className="alert alert-danger py-2 mt-2">
                                                <small className="fw-bold d-block">Deleted by Admin:</small>
                                                <small>{event.deletionReason || 'Violation of policies'}</small>
                                            </div>
                                        )}

                                        {/* Trust Score */}
                                        <div className="mb-3">
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <small className="text-muted" style={{ fontSize: '10px' }}>Trust Score</small>
                                                <small className={`fw-bold ${event.trustScore > 80 ? 'text-success' : 'text-primary'}`} style={{ fontSize: '10px' }}>
                                                    {event.trustScore}%
                                                </small>
                                            </div>
                                            <div className="progress" style={{ height: '4px' }}>
                                                <div
                                                    className={`progress-bar ${event.trustScore > 80 ? 'bg-success' : 'bg-primary'}`}
                                                    style={{ width: `${event.trustScore}%` }}
                                                ></div>
                                            </div>
                                        </div>


                                        {/* External Links Section - Only show if event is active */}
                                        {event.status !== 'completed' && event.status !== 'cancelled' && (event.postLink?.trim() || event.registrationLink?.trim()) && (
                                            <div className="mb-3 d-flex gap-2">
                                                {event.postLink?.trim() && (
                                                    <Button
                                                        variant="light"
                                                        size="sm"
                                                        className="flex-grow-1 py-1 border shadow-sm"
                                                        style={{ fontSize: '10px', fontWeight: '600', borderRadius: '6px' }}
                                                        href={event.postLink}
                                                        target="_blank"
                                                    >
                                                        📸 SOURCE POST
                                                    </Button>
                                                )}
                                                {event.registrationLink?.trim() && (
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        className="flex-grow-1 py-1 shadow-sm"
                                                        style={{ fontSize: '10px', fontWeight: '600', borderRadius: '6px' }}
                                                        href={event.registrationLink}
                                                        target="_blank"
                                                    >
                                                        🔗 REGISTRATION
                                                    </Button>
                                                )}
                                            </div>
                                        )}

                                        <div className="d-flex justify-content-between align-items-center pt-2 border-top mt-auto">
                                            <small className="text-secondary fw-bold">
                                                📅 {new Date(event.dateTime).toLocaleDateString()}
                                            </small>
                                            <Badge bg="success" className="bg-opacity-10 text-success border border-success-subtle">
                                                👥 {event.participantCount || 0} / {event.capacity}
                                            </Badge>
                                        </div>

                                        {/* Event Action Buttons */}
                                        <div className="mt-3 d-flex flex-column gap-2">
                                            {event.status === 'upcoming' && !event.isDeleted && (
                                                <Button
                                                    variant="dark"
                                                    size="sm"
                                                    className="w-100 fw-bold py-2 shadow-sm"
                                                    onClick={() => handleOpenScan(event._id)}
                                                >
                                                    📷 Scan Entry
                                                </Button>
                                            )}

                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                className="w-100 fw-bold py-2 shadow-sm"
                                                onClick={() => {
                                                    setAnalyticsEvent({ id: event._id, title: event.title });
                                                    setShowAnalyticsModal(true);
                                                }}
                                            >
                                                📊 Show Analytics
                                            </Button>

                                            <div className="d-flex gap-2">
                                                {event.status === 'upcoming' && !event.isDeleted && (
                                                    <>
                                                        <Button variant="success" size="sm" className="flex-grow-1"
                                                            onClick={async () => {
                                                                if (window.confirm(`Mark "${event.title}" as completed?`)) {
                                                                    try {
                                                                        const token = JSON.parse(localStorage.getItem('userInfo')).token;
                                                                        await axios.put(`http://localhost:5000/api/events/${event._id}/complete`, {}, { headers: { Authorization: `Bearer ${token}` } });
                                                                        toast.success("Event marked as completed!");
                                                                        fetchMyEvents(user._id);
                                                                    } catch (error) { toast.error(error.response?.data?.message || "Failed to update event"); }
                                                                }
                                                            }}
                                                        >✅ Complete</Button>
                                                        <Button variant="outline-danger" size="sm" className="flex-grow-1"
                                                            onClick={async () => {
                                                                if (window.confirm(`Are you sure you want to cancel "${event.title}"?`)) {
                                                                    try {
                                                                        const token = JSON.parse(localStorage.getItem('userInfo')).token;
                                                                        await axios.put(`http://localhost:5000/api/events/${event._id}/cancel`, {}, { headers: { Authorization: `Bearer ${token}` } });
                                                                        toast.success("Event cancelled successfully");
                                                                        fetchMyEvents(user._id);
                                                                    } catch (error) { toast.error(error.response?.data?.message || "Failed to cancel event"); }
                                                                }
                                                            }}
                                                        >❌ Cancel</Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {event.status === 'completed' && (
                                            <div className="mt-3">
                                                <Badge bg="info" className="w-100 p-2 text-white">✨ Event Completed</Badge>
                                            </div>
                                        )}

                                        {event.status === 'cancelled' && (
                                            <div className="mt-3">
                                                <Badge bg="danger" className="w-100 p-2">⚠️ Event Cancelled</Badge>
                                            </div>
                                        )}
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                )}

                {/* Create Event Modal */}
                <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg" centered backdrop="static" className="premium-modal">
                    <Modal.Header closeButton className="border-0 pb-0">
                        <Modal.Title className="fw-bold fs-3">
                            <span className="text-primary">✨ Create</span> New Event
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="pt-3 px-4 pb-4">


                        <Form onSubmit={handleCreateEvent}>
                            <Row className="g-4">
                                {/* Basic Info Section */}
                                <Col md={12}>
                                    <h6 className="fw-bold text-secondary mb-3 pb-2 border-bottom">BASIC INFORMATION</h6>
                                </Col>

                                {eventForm.posterImageUrl ? (
                                    <Col md={12} className="text-center mb-3">
                                        <div className="position-relative d-inline-block">
                                            <img
                                                src={eventForm.posterImageUrl}
                                                alt="Event Poster"
                                                className="img-fluid rounded-3 shadow-sm"
                                                style={{ maxHeight: '200px' }}
                                            />
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                className="position-absolute top-0 end-0 m-2 rounded-circle"
                                                onClick={() => setEventForm({ ...eventForm, posterImageUrl: '' })}
                                            >✕</Button>
                                        </div>
                                    </Col>
                                ) : (
                                    <Col md={12} className="mb-3">
                                        <Form.Group>
                                            <Form.Label className="small fw-bold text-muted">EVENT POSTER</Form.Label>
                                            <div
                                                className="border-2 border-dashed rounded-3 p-4 text-center bg-light"
                                                style={{ borderStyle: 'dashed', cursor: 'pointer' }}
                                                onClick={() => document.getElementById('manualPosterUpload').click()}
                                            >
                                                <span className="fs-2 mb-2 d-block">🖼️</span>
                                                <p className="mb-0 text-muted small">Click to upload event flyer/poster</p>
                                                <input
                                                    type="file"
                                                    id="manualPosterUpload"
                                                    hidden
                                                    accept="image/*"
                                                    onChange={async (e) => {
                                                        const file = e.target.files[0];
                                                        if (!file) return;
                                                        const formData = new FormData();
                                                        formData.append('image', file);
                                                        const token = JSON.parse(localStorage.getItem('userInfo')).token;
                                                        const tid = toast.loading("Uploading poster...");
                                                        try {
                                                            const { data } = await axios.post('http://localhost:5000/api/upload', formData, {
                                                                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
                                                            });
                                                            setEventForm({ ...eventForm, posterImageUrl: data.imageUrl });
                                                            toast.success("Poster uploaded!", { id: tid });
                                                        } catch (err) {
                                                            toast.error("Upload failed", { id: tid });
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </Form.Group>
                                    </Col>
                                )}

                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted">EVENT TITLE</Form.Label>
                                        <Form.Control
                                            required
                                            className="bg-light border-0 p-3 rounded-3"
                                            value={eventForm.title}
                                            onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                                            placeholder="Give your event a catchy name..."
                                        />
                                    </Form.Group>
                                </Col>

                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted">DESCRIPTION</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={4}
                                            required
                                            className="bg-light border-0 p-3 rounded-3"
                                            value={eventForm.description}
                                            onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                                            placeholder="Tell potential attendees what to expect..."
                                        />
                                    </Form.Group>
                                </Col>

                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted">CATEGORY</Form.Label>
                                        <Form.Select
                                            className="bg-light border-0 p-3 rounded-3"
                                            value={eventForm.category}
                                            onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                                        >
                                            <option>Workshop</option>
                                            <option>Meetup</option>
                                            <option>Music</option>
                                            <option>Food</option>
                                            <option>Tech</option>
                                            <option>Art</option>
                                            <option>Other</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>

                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted">LOCALITY</Form.Label>
                                        <Form.Control
                                            required
                                            className="bg-light border-0 p-3 rounded-3"
                                            value={eventForm.locality}
                                            onChange={(e) => setEventForm({ ...eventForm, locality: e.target.value })}
                                            placeholder="e.g. Bandra West, CP, etc."
                                        />
                                    </Form.Group>
                                </Col>

                                {/* Logistics Section */}
                                <Col md={12} className="mt-5">
                                    <h6 className="fw-bold text-secondary mb-3 pb-2 border-bottom">LOGISTICS & CAPACITY</h6>
                                </Col>

                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted">DATE & TIME</Form.Label>
                                        <Form.Control
                                            type="datetime-local"
                                            required
                                            className="bg-light border-0 p-3 rounded-3"
                                            value={eventForm.dateTime}
                                            onChange={(e) => setEventForm({ ...eventForm, dateTime: e.target.value })}
                                        />
                                    </Form.Group>
                                </Col>

                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted">CAPACITY</Form.Label>
                                        <Form.Control
                                            type="number"
                                            required
                                            className="bg-light border-0 p-3 rounded-3"
                                            value={eventForm.capacity}
                                            onChange={(e) => setEventForm({ ...eventForm, capacity: e.target.value })}
                                            placeholder="Max attendees"
                                        />
                                    </Form.Group>
                                </Col>

                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted">EVENT TYPE</Form.Label>
                                        <Form.Select
                                            className="bg-light border-0 p-3 rounded-3"
                                            value={eventForm.eventType}
                                            onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })}
                                            required
                                        >
                                            <option value="offline">Offline (In-Person)</option>
                                            <option value="online">Online (Virtual)</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>

                                {eventForm.eventType === 'offline' && (
                                    <>
                                        <Col md={12}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-bold text-muted">PINCODE</Form.Label>
                                                <Form.Control
                                                    required
                                                    className="bg-light border-0 p-3 rounded-3"
                                                    value={eventForm.eventAddress.pincode}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '').substring(0, 6);
                                                        setEventForm({ ...eventForm, eventAddress: { ...eventForm.eventAddress, pincode: val } });
                                                    }}
                                                    placeholder="6-digit pincode"
                                                    onBlur={handleEventPincodeBlur}
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={12}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-bold text-muted">LOCALITY / STREET ADDRESS</Form.Label>
                                                <Form.Control
                                                    as="textarea"
                                                    rows={1}
                                                    required
                                                    className="bg-light border-0 p-3 rounded-3"
                                                    value={eventForm.eventAddress.fullAddress}
                                                    onChange={(e) => setEventForm({ ...eventForm, eventAddress: { ...eventForm.eventAddress, fullAddress: e.target.value } })}
                                                    placeholder="Enter street name and landmark..."
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={12} className="mb-3">
                                            <div className="p-2 rounded bg-light border d-flex justify-content-between align-items-center">
                                                <small className="text-muted">
                                                    {eventForm.coordinates?.lat ? (
                                                        <span className="text-success fw-bold">✅ GPS Coordinates Extracted from Pincode</span>
                                                    ) : (
                                                        <span>📍 Pincode coordinates will be auto-linked</span>
                                                    )}
                                                </small>
                                                {!eventForm.coordinates?.lat && eventForm.eventAddress.pincode.length === 6 && (
                                                    <Button size="sm" variant="link" onClick={handleEventPincodeBlur}>Verify Pincode</Button>
                                                )}
                                            </div>
                                        </Col>
                                    </>
                                )}
                                {eventForm.eventType === 'online' && (
                                    <Col md={12}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold text-muted">ONLINE MEETING LINK</Form.Label>
                                            <Form.Control
                                                type="url"
                                                required
                                                className="bg-light border-0 p-3 rounded-3"
                                                value={eventForm.onlineLink}
                                                onChange={(e) => setEventForm({ ...eventForm, onlineLink: e.target.value })}
                                                placeholder="Google Meet, Zoom, etc."
                                            />
                                        </Form.Group>
                                    </Col>
                                )}

                                {/* External Links Section */}
                                <Col md={12} className="mt-5">
                                    <h6 className="fw-bold text-secondary mb-3 pb-2 border-bottom">LINKS & PROMOTION (OPTIONAL)</h6>
                                </Col>

                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted">SOCIAL MEDIA / SOURCE LINK</Form.Label>
                                        <Form.Control
                                            type="url"
                                            className="bg-light border-0 p-3 rounded-3"
                                            value={eventForm.postLink}
                                            onChange={(e) => setEventForm({ ...eventForm, postLink: e.target.value })}
                                            placeholder="Instagram Post URL..."
                                        />
                                    </Form.Group>
                                </Col>

                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted">EXTERNAL REGISTRATION</Form.Label>
                                        <Form.Control
                                            type="url"
                                            className="bg-light border-0 p-3 rounded-3"
                                            value={eventForm.registrationLink}
                                            onChange={(e) => setEventForm({ ...eventForm, registrationLink: e.target.value })}
                                            placeholder="Google Forms, Typeform link..."
                                        />
                                    </Form.Group>
                                </Col>

                                <Col md={12} className="mt-4 pt-3 text-end border-top">
                                    <Button
                                        variant="light"
                                        className="me-2 px-4 py-2 rounded-3 border fw-bold text-secondary"
                                        onClick={() => setShowCreateModal(false)}
                                    >
                                        Discard
                                    </Button>
                                    <Button
                                        variant="primary"
                                        type="submit"
                                        className="px-5 py-2 rounded-3 fw-bold shadow-sm"
                                    >
                                        Publish Event 🚀
                                    </Button>
                                </Col>
                            </Row>
                        </Form>
                    </Modal.Body>
                </Modal>

                {/* Analytics Modal */}
                <AnalyticsModal
                    show={showAnalyticsModal}
                    onHide={() => setShowAnalyticsModal(false)}
                    eventId={analyticsEvent?.id}
                    eventTitle={analyticsEvent?.title}
                />

            </Container>
            {/* Scanning Modal */}
            <Modal show={showScanModal} onHide={handleCloseScan} size="lg" centered backdrop="static">
                <Modal.Header closeButton>
                    <Modal.Title>Event Entry Manager</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0">
                    <div className="d-flex border-bottom">
                        <div
                            className={`flex-fill text-center p-3 cursor-pointer fw-bold ${activeTab === 'scan' ? 'text-primary border-bottom border-primary border-3' : 'text-muted'}`}
                            onClick={() => setActiveTab('scan')}
                            style={{ cursor: 'pointer' }}
                        >
                            📷 Scan & Check-in
                        </div>
                        <div
                            className={`flex-fill text-center p-3 cursor-pointer fw-bold ${activeTab === 'list' ? 'text-primary border-bottom border-primary border-3' : 'text-muted'}`}
                            onClick={() => setActiveTab('list')}
                            style={{ cursor: 'pointer' }}
                        >
                            📋 Attendance List
                        </div>
                    </div>

                    {activeTab === 'scan' && (
                        <div className="p-4">
                            <Row>
                                <Col md={6} className="text-center border-end">
                                    <h6 className="fw-bold mb-3">Scan QR Code</h6>
                                    <div id="reader" className="mx-auto border rounded bg-light" style={{ width: '100%', minHeight: '300px' }}></div>
                                    <small className="text-muted mt-2 d-block">Position the QR code within the frame</small>
                                </Col>
                                <Col md={6}>
                                    <h6 className="fw-bold mb-3">Manual Entry</h6>
                                    <Form onSubmit={handleManualSubmit}>
                                        <Form.Group className="mb-3">
                                            <Form.Control
                                                placeholder="Enter Ticket Code (8 chars)"
                                                value={manualCode}
                                                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                                                maxLength={16}
                                            />
                                        </Form.Group>
                                        <Button type="submit" variant="primary" className="w-100 mb-4" disabled={!manualCode.trim()}>
                                            Check In
                                        </Button>
                                    </Form>

                                    {scanResult && (
                                        <Alert variant={scanResult.status === 'success' ? 'success' : 'danger'} className="mt-3">
                                            <h6 className="fw-bold">{scanResult.status === 'success' ? '✅ Check-in Success!' : '❌ Error'}</h6>
                                            <p className="mb-0 small">{scanResult.message}</p>
                                            {scanResult.rsvp?.user && (
                                                <div className="mt-2 pt-2 border-top border-success-subtle">
                                                    <strong>{scanResult.rsvp.user.name}</strong>
                                                    <br />
                                                    <small>{scanResult.rsvp.user.email}</small>
                                                </div>
                                            )}
                                        </Alert>
                                    )}
                                </Col>
                            </Row>
                        </div>
                    )}

                    {activeTab === 'list' && (
                        <div className="p-4">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="mb-0">
                                    Attendees ({attendanceList.filter(a => a.attendanceStatus === 'Checked In').length} / {attendanceList.length})
                                </h5>
                                <Button variant="success" size="sm" onClick={exportAttendance}>
                                    📊 Export Excel
                                </Button>
                            </div>
                            <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                <table className="table table-hover align-middle">
                                    <thead className="table-light sticky-top">
                                        <tr>
                                            <th>Name</th>
                                            <th>Ticket Code</th>
                                            <th>Status</th>
                                            <th>Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendanceList.map(rsvp => (
                                            <tr key={rsvp._id} className={rsvp.attendanceStatus === 'Checked In' ? 'table-success' : ''}>
                                                <td>
                                                    <div className="fw-bold">{rsvp.user?.name || 'Unknown'}</div>
                                                    <small className="text-muted">{rsvp.user?.email}</small>
                                                </td>
                                                <td><span className="font-monospace">{rsvp.ticketCode}</span></td>
                                                <td>
                                                    {rsvp.attendanceStatus === 'Checked In' ? (
                                                        <Badge bg="success">Checked In</Badge>
                                                    ) : (
                                                        <Badge bg="warning" text="dark">Pending</Badge>
                                                    )}
                                                </td>
                                                <td>
                                                    {rsvp.checkInTime ? new Date(rsvp.checkInTime).toLocaleTimeString() : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                        {attendanceList.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="text-center py-4 text-muted">No RSVPs yet</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default OrganizerDashboard;
