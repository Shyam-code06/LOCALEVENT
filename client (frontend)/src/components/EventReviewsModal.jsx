import { useState, useEffect } from 'react';
import { Modal, Tabs, Tab, Spinner, Badge, Alert } from 'react-bootstrap';
import axios from 'axios';

const EventReviewsModal = ({ show, onHide, eventId, eventTitle }) => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('comments');

    useEffect(() => {
        if (show && eventId) {
            fetchReviews();
        }
    }, [show, eventId]);

    const fetchReviews = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await axios.get(`http://localhost:5000/api/feedback/${eventId}`);
            setReviews(data);
        } catch (err) {
            console.error("Error fetching reviews:", err);
            setError("Failed to load reviews.");
        } finally {
            setLoading(false);
        }
    };

    const comments = reviews.filter(r => r.comment && r.comment.trim().length > 0);
    const photos = reviews.filter(r => r.imageUrl);

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton className="border-0 pb-0">
                <Modal.Title className="fw-bold">
                    Reviews for <span className="text-primary">{eventTitle}</span>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ minHeight: '400px', maxHeight: '70vh', overflowY: 'auto' }}>
                {loading ? (
                    <div className="d-flex align-items-center justify-content-center h-100 py-5">
                        <Spinner animation="border" variant="primary" />
                    </div>
                ) : error ? (
                    <Alert variant="danger">{error}</Alert>
                ) : reviews.length === 0 ? (
                    <div className="text-center py-5 h-100 d-flex flex-column justify-content-center">
                        <div className="fs-1 mb-2">💭</div>
                        <h5 className="text-muted">No reviews yet</h5>
                        <p className="small text-muted">Be the first to leave feedback for this event!</p>
                    </div>
                ) : (
                    <Tabs
                        activeKey={activeTab}
                        onSelect={(k) => setActiveTab(k)}
                        className="mb-4 custom-tabs"
                        fill
                    >
                        <Tab eventKey="comments" title={`💬 Comments (${comments.length})`}>
                            {comments.length === 0 ? (
                                <div className="text-center py-4 text-muted">
                                    No text comments available.
                                </div>
                            ) : (
                                <div className="d-flex flex-column gap-3">
                                    {comments.map((review) => (
                                        <div key={review._id} className="p-3 bg-light rounded border-start border-4 border-primary shadow-sm hover-shadow transition-all">
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <div className="d-flex align-items-center">
                                                    <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold me-2" style={{ width: 35, height: 35 }}>
                                                        {review.user?.name?.charAt(0) || 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="fw-bold text-dark">{review.user?.name || 'Anonymous User'}</div>
                                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                            {new Date(review.createdAt).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Badge bg="warning" text="dark" className="px-2">
                                                    {review.rating} ★
                                                </Badge>
                                            </div>
                                            <p className="mb-0 text-secondary" style={{ whiteSpace: 'pre-wrap' }}>{review.comment}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Tab>
                        <Tab eventKey="photos" title={`📸 Photos (${photos.length})`}>
                            {photos.length === 0 ? (
                                <div className="text-center py-4 text-muted">
                                    No photos shared yet.
                                </div>
                            ) : (
                                <div className="row g-3">
                                    {photos.map((review, idx) => (
                                        <div key={review._id || idx} className="col-6 col-md-4">
                                            <div className="position-relative group rounded overflow-hidden shadow-sm" style={{ aspectRatio: '1/1' }}>
                                                <img
                                                    src={review.imageUrl.startsWith('http') ? review.imageUrl : `http://localhost:5000${review.imageUrl.startsWith('/') ? '' : '/'}${review.imageUrl}`}
                                                    alt={`Review by ${review.user?.name}`}
                                                    className="w-100 h-100 object-fit-cover hover-zoom"
                                                    style={{ transition: 'transform 0.3s ease' }}
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = 'https://via.placeholder.com/300?text=Error+Loading+Image';
                                                    }}
                                                    onClick={() => window.open(review.imageUrl.startsWith('http') ? review.imageUrl : `http://localhost:5000${review.imageUrl.startsWith('/') ? '' : '/'}${review.imageUrl}`, '_blank')}
                                                    role="button"
                                                    title="Click to view full size"
                                                />
                                                <div className="position-absolute bottom-0 start-0 w-100 bg-dark bg-opacity-75 text-white p-2 small text-truncate">
                                                    📸 {review.user?.name || 'User'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Tab>
                    </Tabs>
                )}
            </Modal.Body>
        </Modal>
    );
};

export default EventReviewsModal;
