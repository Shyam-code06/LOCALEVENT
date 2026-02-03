import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Navbar, Container, Nav, Badge, Row, Col, Card, Button, Table, Modal, Form, Spinner, Tabs, Tab, Alert } from 'react-bootstrap';

const AdminDashboard = () => {
    const [admin, setAdmin] = useState(null);
    const [stats, setStats] = useState(null);
    const [organizers, setOrganizers] = useState([]);
    const [events, setEvents] = useState([]);
    const [feedback, setFeedback] = useState([]);
    const [report, setReport] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrganizer, setSelectedOrganizer] = useState(null);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [verifyStatus, setVerifyStatus] = useState('verified');
    const [verifyNotes, setVerifyNotes] = useState('');
    const [manualTrustScore, setManualTrustScore] = useState(50);

    // Delete Event State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [eventToDelete, setEventToDelete] = useState(null);
    const [deleteReason, setDeleteReason] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        const adminInfo = localStorage.getItem('adminInfo');
        if (!adminInfo) {
            navigate('/login');
            return;
        }
        const parsedAdmin = JSON.parse(adminInfo);
        setAdmin(parsedAdmin);
        fetchData();

        // Auto-refresh data every 30 seconds for "real-time" updates
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [navigate]);

    const fetchData = async () => {
        try {
            const adminInfo = localStorage.getItem('adminInfo');
            if (!adminInfo) return;
            const token = JSON.parse(adminInfo).token;
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const [statsRes, organizersRes, eventsRes, feedbackRes, reportRes] = await Promise.all([
                axios.get('http://localhost:5000/api/admin/stats', config),
                axios.get('http://localhost:5000/api/admin/organizers', config),
                axios.get('http://localhost:5000/api/admin/events', config),
                axios.get('http://localhost:5000/api/admin/feedback', config),
                axios.get('http://localhost:5000/api/admin/report', config)
            ]);

            setStats(statsRes.data);
            setOrganizers(organizersRes.data);
            setEvents(eventsRes.data);
            setFeedback(feedbackRes.data);
            setReport(reportRes.data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to load admin data:", error);
            toast.error(error.response?.data?.message || "Failed to load admin data");
            setLoading(false);
        }
    };

    const handleVerifyOrganizer = async () => {
        try {
            const adminInfo = localStorage.getItem('adminInfo');
            const token = JSON.parse(adminInfo).token;
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const { data } = await axios.put(`http://localhost:5000/api/admin/organizers/${selectedOrganizer._id}/verify`, {
                status: verifyStatus,
                notes: verifyNotes,
                trustRating: manualTrustScore
            }, config);

            toast.success(data.message || "Organizer updated successfully");
            setShowVerifyModal(false);
            setSelectedOrganizer(null);
            setVerifyNotes('');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to verify organizer");
        }
    };

    const handleUpdateAllTrustScores = async () => {
        try {
            const adminInfo = localStorage.getItem('adminInfo');
            const token = JSON.parse(adminInfo).token;
            await axios.post('http://localhost:5000/api/admin/update-trust-scores', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Trust scores updated for all organizers");
            fetchData();
        } catch (error) {
            toast.error("Failed to update trust scores");
            console.log(error);

        }
    };

    const handleDeleteEvent = async () => {
        try {
            if (!eventToDelete || !deleteReason.trim()) return;

            const adminInfo = localStorage.getItem('adminInfo');
            const token = JSON.parse(adminInfo).token;

            await axios.delete(`http://localhost:5000/api/admin/events/${eventToDelete._id}`, {
                data: { reason: deleteReason },
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("Event deleted and organizer notified");
            setShowDeleteModal(false);
            setEventToDelete(null);
            setDeleteReason('');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete event");
        }
    };

    const handleCancelEvent = async (event) => {
        if (!window.confirm("Are you sure you want to cancel this event?")) return;
        try {
            const adminInfo = localStorage.getItem('adminInfo');
            if (!adminInfo) throw new Error("No admin credentials found");
            const token = JSON.parse(adminInfo).token;

            await axios.put(`http://localhost:5000/api/events/${event._id}/cancel`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("Event cancelled successfully");
            fetchData();
        } catch (error) {
            console.error("Cancel failed", error);
            if (error.response && error.response.status === 401) {
                toast.error("Session expired. Please login again.");
                localStorage.removeItem('adminInfo');
                navigate('/login');
            } else {
                toast.error(error.response?.data?.message || "Failed to cancel event");
            }
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminInfo');
        navigate('/admin-login');
    };

    if (loading) {
        return (
            <div className="bg-light min-vh-100 d-flex align-items-center justify-content-center">
                <Spinner animation="border" variant="danger" />
            </div>
        );
    }

    return (
        <div className="bg-light min-vh-100">
            {/* Navbar */}
            <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm">
                <Container fluid>
                    <Navbar.Brand>
                        <span className="bg-danger text-white rounded p-2 me-2">A</span>
                        Admin Dashboard
                    </Navbar.Brand>
                    <Navbar.Toggle />
                    <Navbar.Collapse>
                        <Nav className="ms-auto align-items-center">
                            <div className="d-flex align-items-center">
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    className="me-3"
                                    onClick={fetchData}
                                    disabled={loading}
                                >
                                    {loading ? 'Refreshing...' : '🔄 Refresh Data'}
                                </Button>
                                <div className="text-end me-3">
                                    <div className="fw-bold">{admin?.name || 'Administrator'}</div>
                                </div>
                                <Button variant="danger" size="sm" onClick={handleLogout}>Logout</Button>
                            </div>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            <Container fluid className="py-4">
                {/* Stats Cards */}
                <Row className="mb-4">
                    <Col md={3}>
                        <Card className="border-0 shadow-sm text-center p-3">
                            <h3 className="display-5 text-primary fw-bold">{stats?.users?.total || 0}</h3>
                            <p className="text-muted mb-0">Total Users</p>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="border-0 shadow-sm text-center p-3">
                            <h3 className="display-5 text-success fw-bold">{stats?.users?.organizers || 0}</h3>
                            <p className="text-muted mb-0">Total Organizers</p>
                            <small className="text-success">✓ Verified: {stats?.users?.verifiedOrganizers || 0}</small>
                            <br />
                            <small className="text-warning">⏳ Pending: {stats?.users?.pendingOrganizers || 0}</small>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="border-0 shadow-sm text-center p-3">
                            <h3 className="display-5 text-info fw-bold">{stats?.events?.total || 0}</h3>
                            <p className="text-muted mb-0">Total Events</p>
                            <small className="text-info">Upcoming: {stats?.events?.upcoming || 0}</small>
                            <br />
                            <small className="text-secondary">Past: {stats?.events?.past || 0}</small>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="border-0 shadow-sm text-center p-3">
                            <h3 className="display-5 text-warning fw-bold">{stats?.engagement?.totalRSVPs || 0}</h3>
                            <p className="text-muted mb-0">Total RSVPs</p>
                            <small className="text-muted">Feedback: {stats?.engagement?.totalFeedback || 0}</small>
                        </Card>
                    </Col>
                </Row>

                {/* Main Content Tabs */}
                <Card className="border-0 shadow-sm">
                    <Card.Body>
                        <Tabs defaultActiveKey="organizers" className="mb-3">
                            {/* Organizers Tab */}
                            <Tab eventKey="organizers" title={`Organizers (${organizers.length})`}>
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h5 className="mb-0">All Organizers</h5>
                                    <Button variant="outline-primary" size="sm" onClick={handleUpdateAllTrustScores}>
                                        Update All Trust Scores
                                    </Button>
                                </div>
                                <div className="table-responsive">
                                    <Table striped bordered hover>
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Organization</th>
                                                <th>Email</th>
                                                <th>Verification</th>
                                                <th>Account Status</th>
                                                <th>Trust Score</th>
                                                <th>Events Hosted</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {organizers.map(org => (
                                                <tr key={org._id}>
                                                    <td>{org.name}</td>
                                                    <td>{org.organizerProfile?.organizationName || 'N/A'}</td>
                                                    <td>{org.email}</td>
                                                    <td>
                                                        {org.organizerProfile?.verified ? (
                                                            <Badge bg="success">Verified</Badge>
                                                        ) : org.organizerProfile?.verificationStatus === 'rejected' ? (
                                                            <Badge bg="danger">Rejected</Badge>
                                                        ) : (
                                                            <Badge bg="warning">Pending</Badge>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {org.isActive === false ? (
                                                            <Badge bg="danger">Deactivated</Badge>
                                                        ) : (
                                                            <Badge bg="success">Active</Badge>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <Badge bg={org.organizerProfile?.trustRating > 80 ? 'success' : org.organizerProfile?.trustRating > 60 ? 'warning' : 'secondary'}>
                                                            {org.organizerProfile?.trustRating || 50}/100
                                                        </Badge>
                                                    </td>
                                                    <td>{org.organizerProfile?.eventsHosted || 0}</td>
                                                    <td>
                                                        <div className="d-flex gap-1 flex-wrap">
                                                            <Button
                                                                variant="outline-primary"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedOrganizer(org);
                                                                    setShowVerifyModal(true);
                                                                    // Default to 'verified' if pending or under_review, otherwise current status
                                                                    const currentStatus = org.organizerProfile?.verificationStatus;
                                                                    setVerifyStatus(currentStatus === 'verified' ? 'verified' : 'verified');
                                                                    setManualTrustScore(org.organizerProfile?.trustRating || 50);
                                                                }}
                                                            >
                                                                View & Verify
                                                            </Button>
                                                            {org.isActive ? (
                                                                <Button
                                                                    variant="outline-danger"
                                                                    size="sm"
                                                                    onClick={async () => {
                                                                        const reason = prompt('Enter deactivation reason (e.g., Scam activity, Policy violation):');
                                                                        if (reason) {
                                                                            try {
                                                                                const adminInfo = localStorage.getItem('adminInfo');
                                                                                const token = JSON.parse(adminInfo).token;
                                                                                await axios.put(
                                                                                    `http://localhost:5000/api/admin/organizers/${org._id}/deactivate`,
                                                                                    { reason },
                                                                                    { headers: { Authorization: `Bearer ${token}` } }
                                                                                );
                                                                                toast.success("Organizer account deactivated");
                                                                                fetchData();
                                                                            } catch (error) {
                                                                                toast.error(error.response?.data?.message || "Failed to deactivate");
                                                                            }
                                                                        }
                                                                    }}
                                                                >
                                                                    Deactivate
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    variant="outline-success"
                                                                    size="sm"
                                                                    onClick={async () => {
                                                                        try {
                                                                            const adminInfo = localStorage.getItem('adminInfo');
                                                                            const token = JSON.parse(adminInfo).token;
                                                                            await axios.put(
                                                                                `http://localhost:5000/api/admin/organizers/${org._id}/activate`,
                                                                                {},
                                                                                { headers: { Authorization: `Bearer ${token}` } }
                                                                            );
                                                                            toast.success("Organizer account reactivated");
                                                                            fetchData();
                                                                        } catch (error) {
                                                                            toast.error(error.response?.data?.message || "Failed to reactivate");
                                                                        }
                                                                    }}
                                                                >
                                                                    Activate
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            </Tab>

                            {/* Events Tab */}
                            <Tab eventKey="events" title={`Events (${events.length})`}>
                                <Tabs defaultActiveKey="registered_events" className="mb-3 mt-3" variant="pills">
                                    <Tab eventKey="registered_events" title={`Registered Organizer Events (${events.filter(e => e.organizerId).length})`}>
                                        <h5 className="mb-3 mt-3">Events by Registered Organizers</h5>
                                        <div className="table-responsive">
                                            <Table striped bordered hover>
                                                <thead>
                                                    <tr>
                                                        <th>Title</th>
                                                        <th>Organizer</th>
                                                        <th>Category</th>
                                                        <th>Date & Time</th>
                                                        <th>RSVPs</th>
                                                        <th>Rating</th>
                                                        <th>Status</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {events.filter(e => e.organizerId).map(event => (
                                                        <tr key={event._id} className={event.isDeleted ? "table-danger text-muted" : ""}>
                                                            <td>
                                                                {event.title}
                                                                {event.isDeleted && <Badge bg="danger" className="ms-2">Deleted</Badge>}
                                                            </td>
                                                            <td>
                                                                {event.organizerId?.organizerProfile?.organizationName || event.organizerName || 'N/A'}
                                                                <br />
                                                                <small className="text-muted">Trust: {event.trustScore}</small>
                                                            </td>
                                                            <td><Badge bg="light" text="dark">{event.category}</Badge></td>
                                                            <td>{new Date(event.dateTime).toLocaleString()}</td>
                                                            <td className="fw-bold text-center">
                                                                {event.participantCount || 0}
                                                            </td>
                                                            <td>
                                                                <Badge bg={event.averageRating >= 4 ? 'success' : event.averageRating >= 3 ? 'warning' : 'secondary'}>
                                                                    {event.averageRating > 0 ? `${event.averageRating} ⭐` : 'N/A'}
                                                                </Badge>
                                                            </td>
                                                            <td>
                                                                {event.status === 'cancelled' ? (
                                                                    <Badge bg="danger">Cancelled</Badge>
                                                                ) : new Date(event.dateTime) < new Date() ? (
                                                                    <Badge bg="secondary">Past</Badge>
                                                                ) : (
                                                                    <Badge bg="primary">Upcoming</Badge>
                                                                )}
                                                            </td>
                                                            <td>
                                                                {!event.isDeleted && event.status !== 'cancelled' && (
                                                                    <>
                                                                        <Button
                                                                            variant="outline-warning"
                                                                            size="sm"
                                                                            className="me-2"
                                                                            onClick={() => handleCancelEvent(event)}
                                                                        >
                                                                            Cancel
                                                                        </Button>
                                                                        <Button
                                                                            variant="danger"
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                setEventToDelete(event);
                                                                                setShowDeleteModal(true);
                                                                            }}
                                                                        >
                                                                            🗑 Delete
                                                                        </Button>
                                                                    </>
                                                                )}
                                                                {event.isDeleted && (
                                                                    <small className="text-danger d-block fst-italic">Reason: {event.deletionReason}</small>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {events.filter(e => e.organizerId).length === 0 && (
                                                        <tr>
                                                            <td colSpan="7" className="text-center">No events found from registered organizers.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </Table>
                                        </div>
                                    </Tab>

                                    <Tab eventKey="external_events" title={`External / Info Events (${events.filter(e => !e.organizerId).length})`}>
                                        <h5 className="mb-3 mt-3 text-info">External / Non-User Events</h5>
                                        <Alert variant="info">
                                            These events were created by guests or system admins and are not linked to a registered User account.
                                        </Alert>
                                        <div className="table-responsive">
                                            <Table striped bordered hover>
                                                <thead>
                                                    <tr>
                                                        <th>Title</th>
                                                        <th>Organizer Name (Manual)</th>
                                                        <th>Category</th>
                                                        <th>Date & Time</th>
                                                        <th>Source</th>
                                                        <th>Status</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {events.filter(e => !e.organizerId).map(event => (
                                                        <tr key={event._id} className={event.isDeleted ? "table-danger text-muted" : ""}>
                                                            <td>
                                                                {event.title}
                                                                {event.isDeleted && <Badge bg="danger" className="ms-2">Deleted</Badge>}
                                                            </td>
                                                            <td>
                                                                {event.organizerName || 'N/A'}
                                                            </td>
                                                            <td><Badge bg="light" text="dark">{event.category}</Badge></td>
                                                            <td>{new Date(event.dateTime).toLocaleString()}</td>
                                                            <td><Badge bg="info">{event.sourcePlatform || 'Manual'}</Badge></td>
                                                            <td>
                                                                {new Date(event.dateTime) < new Date() ? (
                                                                    <Badge bg="secondary">Past</Badge>
                                                                ) : (
                                                                    <Badge bg="primary">Upcoming</Badge>
                                                                )}
                                                            </td>
                                                            <td>
                                                                {!event.isDeleted && (
                                                                    <Button
                                                                        variant="danger"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setEventToDelete(event);
                                                                            setShowDeleteModal(true);
                                                                        }}
                                                                    >
                                                                        🗑 Delete
                                                                    </Button>
                                                                )}
                                                                {event.isDeleted && (
                                                                    <small className="text-danger d-block fst-italic">Reason: {event.deletionReason}</small>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {events.filter(e => !e.organizerId).length === 0 && (
                                                        <tr>
                                                            <td colSpan="7" className="text-center">No external events found.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </Table>
                                        </div>
                                    </Tab>
                                </Tabs>
                            </Tab>

                            {/* Feedback Tab */}
                            <Tab eventKey="feedback" title={`Feedback (${feedback.length})`}>
                                <h5 className="mb-3">User Feedback for Completed Events</h5>
                                <div className="table-responsive">
                                    <Table striped bordered hover>
                                        <thead>
                                            <tr>
                                                <th>Event</th>
                                                <th>Organizer</th>
                                                <th>User</th>
                                                <th>Role</th>
                                                <th>Rating</th>
                                                <th>Comment</th>
                                                <th>Photo</th>
                                                <th>Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {feedback.map(fb => (
                                                <tr key={fb._id} className={!fb.event ? "table-light text-muted" : ""}>
                                                    <td>
                                                        {fb.event?.title || <span className="text-danger italic small">Deleted Event</span>}
                                                    </td>
                                                    <td>
                                                        {fb.event?.organizerId?.organizerProfile?.organizationName || fb.event?.organizerName || (fb.event ? 'N/A' : <span className="text-muted small">N/A</span>)}
                                                    </td>
                                                    <td>{fb.user?.name || 'Unknown User'}</td>
                                                    <td>
                                                        <Badge bg={fb.user?.role === 'organizer' ? 'success' : 'secondary'}>
                                                            {fb.user?.role || 'user'}
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        <Badge bg={fb.rating >= 4 ? 'success' : fb.rating >= 3 ? 'warning' : 'danger'}>
                                                            {fb.rating}/5 ⭐
                                                        </Badge>
                                                    </td>
                                                    <td>{fb.comment || 'No comment'}</td>
                                                    <td>
                                                        {fb.imageUrl ? (
                                                            <a href={fb.imageUrl} target="_blank" rel="noreferrer">
                                                                <img src={fb.imageUrl} alt="Feedback" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                                                            </a>
                                                        ) : 'N/A'}
                                                    </td>
                                                    <td>{new Date(fb.createdAt).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            </Tab>

                            {/* Reports Tab */}
                            <Tab eventKey="reports" title="Overall Report">
                                <div className="d-flex justify-content-between align-items-center mb-3 mt-3">
                                    <h5 className="mb-0">Overall Event Performance Report</h5>
                                    <Button variant="success" size="sm" onClick={() => window.print()}>
                                        🖨️ Print Report
                                    </Button>
                                </div>
                                <div className="table-responsive">
                                    <Table striped bordered hover className="bg-white">
                                        <thead className="table-dark">
                                            <tr>
                                                <th>Event Title</th>
                                                <th>Organizer</th>
                                                <th>Category</th>
                                                <th>Date</th>
                                                <th>Participants</th>
                                                <th>Avg. Rating</th>
                                                <th>Feedbacks</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {report.map(r => (
                                                <tr key={r.eventId}>
                                                    <td className="fw-bold">{r.title}</td>
                                                    <td>{r.organizer}</td>
                                                    <td><Badge bg="light" text="dark">{r.category}</Badge></td>
                                                    <td>{new Date(r.date).toLocaleDateString()}</td>
                                                    <td>
                                                        <span className="fw-bold text-primary">{r.participants}</span>
                                                        <small className="text-muted ms-1">/ {r.capacity}</small>
                                                    </td>
                                                    <td>
                                                        <Badge bg={r.avgRating >= 4 ? 'success' : r.avgRating >= 3 ? 'warning' : 'danger'}>
                                                            {r.avgRating} ⭐
                                                        </Badge>
                                                    </td>
                                                    <td>{r.feedbackCount}</td>
                                                    <td>
                                                        <Badge bg={r.status === 'cancelled' ? 'danger' : r.status === 'completed' ? 'secondary' : 'primary'}>
                                                            {r.status}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            </Tab>
                        </Tabs>
                    </Card.Body>
                </Card>

                {/* Verify Organizer Modal */}
                <Modal show={showVerifyModal} onHide={() => setShowVerifyModal(false)} size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>Organizer Verification</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {selectedOrganizer && (
                            <>
                                <h5>{selectedOrganizer.organizerProfile?.organizationName || selectedOrganizer.name}</h5>
                                <p><strong>Email:</strong> {selectedOrganizer.email}</p>
                                <p><strong>Contact:</strong> {selectedOrganizer.organizerProfile?.contactPhone || 'N/A'}</p>

                                <hr />

                                <h6>Verification Details</h6>
                                <Row className="mb-3">
                                    <Col md={6}>
                                        <p><strong>GST:</strong> {selectedOrganizer.organizerProfile?.gstNumber || 'Not provided'}</p>
                                        <p><strong>PAN:</strong> {selectedOrganizer.organizerProfile?.panNumber || 'Not provided'}</p>
                                    </Col>
                                    <Col md={6}>
                                        <p><strong>Registration:</strong> {selectedOrganizer.organizerProfile?.companyRegistrationNumber || 'Not provided'}</p>
                                        <p><strong>Type:</strong> {selectedOrganizer.organizerProfile?.organizationType || 'N/A'}</p>
                                    </Col>
                                </Row>

                                {selectedOrganizer.organizerProfile?.address && (
                                    <div className="mb-3">
                                        <strong>Address:</strong>
                                        <p className="mb-0">
                                            {selectedOrganizer.organizerProfile.address.street && `${selectedOrganizer.organizerProfile.address.street}, `}
                                            {selectedOrganizer.organizerProfile.address.city && `${selectedOrganizer.organizerProfile.address.city}, `}
                                            {selectedOrganizer.organizerProfile.address.state && `${selectedOrganizer.organizerProfile.address.state} `}
                                            {selectedOrganizer.organizerProfile.address.pincode && `- ${selectedOrganizer.organizerProfile.address.pincode}`}
                                        </p>
                                    </div>
                                )}

                                <hr />

                                <Form.Group className="mb-3">
                                    <Form.Label>Verification Status</Form.Label>
                                    <Form.Select
                                        value={verifyStatus}
                                        onChange={(e) => setVerifyStatus(e.target.value)}
                                    >
                                        <option value="verified">Verify</option>
                                        <option value="rejected">Reject</option>
                                        <option value="under_review">Under Review</option>
                                        <option value="pending">Pending</option>
                                    </Form.Select>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Notes (Optional)</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        value={verifyNotes}
                                        onChange={(e) => setVerifyNotes(e.target.value)}
                                        placeholder="Add any notes about this verification..."
                                    />
                                </Form.Group>

                                <hr />

                                {/* Account Status Section */}
                                <div className="mb-3">
                                    <h6 className="fw-bold">Account Status</h6>
                                    {selectedOrganizer.isActive === false ? (
                                        <Alert variant="danger" className="py-2">
                                            <strong>⚠️ Account Deactivated</strong>
                                            <p className="mb-0 small mt-1">
                                                Reason: {selectedOrganizer.deactivationReason || 'No reason provided'}
                                            </p>
                                        </Alert>
                                    ) : (
                                        <Alert variant="success" className="py-2">
                                            <strong>✓ Account Active</strong>
                                        </Alert>
                                    )}
                                </div>

                                <div className="d-flex gap-2 mb-3">
                                    {selectedOrganizer.isActive ? (
                                        <Button
                                            variant="outline-danger"
                                            className="flex-grow-1"
                                            onClick={async () => {
                                                const reason = prompt('Enter deactivation reason (e.g., Scam activity, Policy violation, User reports):');
                                                if (reason) {
                                                    try {
                                                        const adminInfo = localStorage.getItem('adminInfo');
                                                        const token = JSON.parse(adminInfo).token;
                                                        await axios.put(
                                                            `http://localhost:5000/api/admin/organizers/${selectedOrganizer._id}/deactivate`,
                                                            { reason },
                                                            { headers: { Authorization: `Bearer ${token}` } }
                                                        );
                                                        toast.success("Organizer account deactivated");
                                                        setShowVerifyModal(false);
                                                        fetchData();
                                                    } catch (error) {
                                                        toast.error(error.response?.data?.message || "Failed to deactivate");
                                                    }
                                                }
                                            }}
                                        >
                                            🚫 Deactivate Account
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline-success"
                                            className="flex-grow-1"
                                            onClick={async () => {
                                                try {
                                                    const adminInfo = localStorage.getItem('adminInfo');
                                                    const token = JSON.parse(adminInfo).token;
                                                    await axios.put(
                                                        `http://localhost:5000/api/admin/organizers/${selectedOrganizer._id}/activate`,
                                                        {},
                                                        { headers: { Authorization: `Bearer ${token}` } }
                                                    );
                                                    toast.success("Organizer account reactivated");
                                                    setShowVerifyModal(false);
                                                    fetchData();
                                                } catch (error) {
                                                    toast.error(error.response?.data?.message || "Failed to reactivate");
                                                }
                                            }}
                                        >
                                            ✓ Activate Account
                                        </Button>
                                    )}
                                </div>

                                <div className="alert alert-info">
                                    <strong>Note:</strong> Trust score will be automatically updated based on successful events after verification.
                                </div>

                                <Form.Group className="mb-3">
                                    <Form.Label>Manual Trust Score (Override)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={manualTrustScore}
                                        onChange={(e) => setManualTrustScore(Number(e.target.value))}
                                        placeholder="Enter trust score (0-100)"
                                    />
                                    <Form.Text className="text-muted">
                                        Set a manual trust score for this organizer. Default calculation is based on past events.
                                    </Form.Text>
                                </Form.Group>
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowVerifyModal(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleVerifyOrganizer}>
                            {verifyStatus === 'verified' ? 'Verify Organizer' : verifyStatus === 'rejected' ? 'Reject Organizer' : 'Update Status'}
                        </Button>
                    </Modal.Footer>
                </Modal>

                {/* Delete Event Modal */}
                <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
                    <Modal.Header closeButton>
                        <Modal.Title className="text-danger">Delete Event</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <p>Are you sure you want to delete this event?</p>
                        <Form.Group className="mb-3">
                            <Form.Label>Deletion Reason (Required)</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                required
                                value={deleteReason}
                                onChange={(e) => setDeleteReason(e.target.value)}
                                placeholder="Explain why this event is being deleted (violates policy, duplicate, etc.)"
                            />
                        </Form.Group>
                        <Alert variant="warning">
                            <small>This will remove the event from public view. The organizer will be notified with your reason.</small>
                        </Alert>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
                        <Button variant="danger" disabled={!deleteReason.trim()} onClick={handleDeleteEvent}>
                            Delete Event
                        </Button>
                    </Modal.Footer>
                </Modal>
            </Container>
        </div>
    );
};

export default AdminDashboard;

