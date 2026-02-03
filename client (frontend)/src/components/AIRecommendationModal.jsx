import React from 'react';
import { Modal, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { calculateSuitability } from '../utils/calculateSuitability';

const AIRecommendationModal = ({ show, onHide, recommendations, user }) => {
    const navigate = useNavigate();

    return (
        <Modal
            show={show}
            onHide={onHide}
            centered
            size="xl"
            className="glass-modal"
            contentClassName="border-0 shadow-lg"
        >
            <Modal.Header closeButton className="border-0 px-4 pt-4">
                <Modal.Title>
                    <div className="d-flex align-items-center gap-3">
                        <span className="ai-badge">✨ AI Optimized</span>
                        <h2 className="mb-0 fw-bold">Personalized For You</h2>
                    </div>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="px-4 pb-5">
                <p className="text-muted mb-4 px-1">Based on your interests, past activity, and current location.</p>

                <Row className="g-4">
                    {recommendations.length > 0 ? (
                        recommendations.map((event) => {
                            const { score, reasons } = calculateSuitability(user, event);
                            return (
                                <Col lg={6} key={event._id}>
                                    <Card className="glass-card border-0 p-3 h-100">
                                        <Row className="h-100">
                                            <Col md={5}>
                                                <div className="event-image-container h-100 mb-0">
                                                    <img
                                                        src={event.imageUrl?.startsWith('http') ? event.imageUrl : `http://localhost:5000${event.imageUrl?.startsWith('/') ? '' : '/'}${event.imageUrl || ''}`}
                                                        alt={event.title}
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = 'https://via.placeholder.com/400x300?text=Event+Image';
                                                        }}
                                                    />
                                                    <div className="position-absolute top-0 end-0 p-2">
                                                        <Badge bg="dark" className="glass-badge">
                                                            {event.category}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </Col>
                                            <Col md={7} className="d-flex flex-column">
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <h5 className="fw-bold mb-0 text-truncate" style={{ maxWidth: '180px' }}>
                                                        {event.title}
                                                    </h5>
                                                    <div className="match-score-circle">
                                                        {score}%
                                                        <span>Match</span>
                                                    </div>
                                                </div>

                                                <div className="flex-grow-1">
                                                    <div className="mb-3 d-flex flex-wrap gap-2">
                                                        {reasons.slice(0, 2).map((reason, idx) => (
                                                            <div key={idx} className="recommendation-info-tag">
                                                                {reason.text}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <p className="text-muted small mb-3">
                                                        {event.description?.substring(0, 80)}...
                                                    </p>

                                                    <div className="d-flex align-items-center gap-2 text-muted small mb-3">
                                                        <div className="reason-bullet"></div>
                                                        {event.city} • {new Date(event.dateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </div>
                                                </div>

                                                <Button
                                                    variant="primary"
                                                    className="btn-premium btn-premium-primary w-100"
                                                    onClick={() => {
                                                        onHide();
                                                        navigate(`/event/${event._id}`);
                                                    }}
                                                >
                                                    Explore This Match
                                                </Button>
                                            </Col>
                                        </Row>
                                    </Card>
                                </Col>
                            );
                        })
                    ) : (
                        <Col xs={12} className="text-center py-5">
                            <div className="display-1 mb-3">🔍</div>
                            <h3>No recommendations yet</h3>
                            <p className="text-muted">Tell us more about your interests to see personalized events!</p>
                        </Col>
                    )}
                </Row>
            </Modal.Body>
        </Modal>
    );
};

export default AIRecommendationModal;
