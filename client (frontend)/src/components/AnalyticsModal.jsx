import { Modal, Button, Row, Col, Card } from 'react-bootstrap';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { useEffect, useState } from 'react';
import axios from 'axios';

const COLORS = ['#0d6efd', '#f73378', '#ffc107', '#6c757d'];

const AnalyticsModal = ({ show, onHide, eventId, eventTitle }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get(`http://localhost:5000/api/rsvp/analytics/${eventId}`);
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch analytics", error);
            } finally {
                setLoading(false);
            }
        };

        if (show && eventId) {
            fetchAnalytics();
        }
    }, [show, eventId]);

    const preparePieData = (source) => {
        if (!stats || !stats[source]) return [];
        return Object.entries(stats[source])
            .filter(([_, value]) => value > 0)
            .map(([name, value]) => ({ name, value }));
    };

    const prepareComparisonData = () => {
        if (!stats) return [];
        const genders = ['Male', 'Female'];

        const data = genders.map(gender => ({
            name: gender,
            registered: stats.registered[gender] || 0,
            attended: stats.attended[gender] || 0
        })).filter(item => item.registered > 0 || item.attended > 0);

        return data;
    };

    const prepareAgeData = () => {
        if (!stats || !stats.ageGroups) return [];
        return Object.entries(stats.ageGroups).map(([range, count]) => ({
            range,
            count
        }));
    };

    const registeredPieData = preparePieData('registered');
    const comparisonData = prepareComparisonData();
    const ageData = prepareAgeData();

    const hasData = registeredPieData.length > 0;

    return (
        <Modal show={show} onHide={onHide} size="xl" centered scrollable>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title>
                    Event Analytics: <span className="text-primary">{eventTitle}</span>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
                {loading ? (
                    <div className="text-center py-5">
                        <span className="spinner-border text-primary" role="status"></span>
                        <p className="mt-2 text-muted">Analyzing event data...</p>
                    </div>
                ) : !hasData ? (
                    <div className="text-center py-5">
                        <i className="bi bi-graph-up text-muted display-1 mb-3"></i>
                        <h5 className="text-muted">No Sufficient Data Yet</h5>
                        <p>Waiting for user registrations to generate demographics.</p>
                    </div>
                ) : (
                    <>
                        {/* Quick Stats Banner */}
                        <Row className="mb-4">
                            <Col md={12}>
                                <div className="p-3 bg-white rounded-4 shadow-sm border mb-4">
                                    <div className="d-flex justify-content-around text-center py-2">
                                        <div className="px-3 border-end flex-fill">
                                            <h6 className="text-muted small text-uppercase fw-bold mb-1">Male Participation</h6>
                                            <div className="d-flex align-items-center justify-content-center gap-2">
                                                <span className="badge bg-primary-subtle text-primary border border-primary-subtle">R: {stats.registered.Male || 0}</span>
                                                <span className="badge bg-success-subtle text-success border border-success-subtle">A: {stats.attended.Male || 0}</span>
                                            </div>
                                        </div>
                                        <div className="px-3 flex-fill">
                                            <h6 className="text-muted small text-uppercase fw-bold mb-1">Female Participation</h6>
                                            <div className="d-flex align-items-center justify-content-center gap-2">
                                                <span className="badge bg-danger-subtle text-danger border border-danger-subtle">R: {stats.registered.Female || 0}</span>
                                                <span className="badge bg-success-subtle text-success border border-success-subtle">A: {stats.attended.Female || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Col>
                        </Row>

                        <Row className="mb-4">
                            <Col lg={4}>
                                <Card className="h-100 border-0 shadow-sm rounded-4">
                                    <Card.Body>
                                        <Card.Title className="text-center mb-4 fw-bold small text-uppercase text-muted">Registration Mix</Card.Title>
                                        <div style={{ width: '100%', height: 250 }}>
                                            <ResponsiveContainer>
                                                <PieChart>
                                                    <Pie
                                                        data={registeredPieData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {registeredPieData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="mt-3">
                                            {registeredPieData.map((item, idx) => (
                                                <div key={idx} className="d-flex justify-content-between small mb-1">
                                                    <span><span className="d-inline-block rounded-circle me-2" style={{ width: '10px', height: '10px', backgroundColor: COLORS[idx % COLORS.length] }}></span>{item.name}</span>
                                                    <span className="fw-bold">{item.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col lg={8}>
                                <Card className="h-100 border-0 shadow-sm rounded-4">
                                    <Card.Body>
                                        <Card.Title className="text-center mb-4 fw-bold small text-uppercase text-muted">Conversion: Male vs Female</Card.Title>
                                        <div style={{ width: '100%', height: 350 }}>
                                            <ResponsiveContainer>
                                                <BarChart
                                                    data={comparisonData}
                                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                                    <YAxis axisLine={false} tickLine={false} />
                                                    <Tooltip cursor={{ fill: '#f8f9fa' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                                    <Bar name="Registered (R)" dataKey="registered" fill="#4dabf7" radius={[6, 6, 0, 0]} barSize={40} />
                                                    <Bar name="Attended (A)" dataKey="attended" fill="#40c057" radius={[6, 6, 0, 0]} barSize={40} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>

                        <Row className="mb-4">
                            <Col lg={12}>
                                <Card className="border-0 shadow-sm rounded-4">
                                    <Card.Body>
                                        <Card.Title className="text-center mb-4 fw-bold small text-uppercase text-muted">Participant Age Distribution</Card.Title>
                                        <div style={{ width: '100%', height: 300 }}>
                                            <ResponsiveContainer>
                                                <BarChart
                                                    data={ageData}
                                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                                    <XAxis dataKey="range" axisLine={false} tickLine={false} />
                                                    <YAxis axisLine={false} tickLine={false} />
                                                    <Tooltip cursor={{ fill: '#f8f9fa' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                                    <Bar name="Participants" dataKey="count" fill="#ffc107" radius={[6, 6, 0, 0]} barSize={60} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>

                        <div className="bg-light p-4 rounded-4 shadow-sm border-0 mt-2">
                            <Row className="align-items-center">
                                <Col md={4} className="text-center border-end">
                                    <div className="display-6 fw-bold text-primary">
                                        {Object.values(stats.registered).reduce((a, b) => a + b, 0)}
                                    </div>
                                    <div className="text-muted text-uppercase small fw-bold tracking-wider">Total Registers</div>
                                </Col>
                                <Col md={4} className="text-center border-end">
                                    <div className="display-6 fw-bold text-success">
                                        {Object.values(stats.attended).reduce((a, b) => a + b, 0)}
                                    </div>
                                    <div className="text-muted text-uppercase small fw-bold tracking-wider">Total Attendees</div>
                                </Col>
                                <Col md={4} className="text-center">
                                    <div className="display-6 fw-bold text-info">
                                        {Object.values(stats.registered).reduce((a, b) => a + b, 0) > 0
                                            ? Math.round((Object.values(stats.attended).reduce((a, b) => a + b, 0) / Object.values(stats.registered).reduce((a, b) => a + b, 0)) * 100)
                                            : 0}%
                                    </div>
                                    <div className="text-muted text-uppercase small fw-bold tracking-wider">Attendance Rate</div>
                                </Col>
                            </Row>
                        </div>
                    </>
                )}
            </Modal.Body>
            <Modal.Footer className="bg-light">
                <Button variant="outline-secondary" onClick={onHide}>Close Analytics Dashboard</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default AnalyticsModal;
