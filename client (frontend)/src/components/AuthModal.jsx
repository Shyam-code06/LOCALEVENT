import { Modal, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const AuthModal = ({ show, handleClose }) => {
    const navigate = useNavigate();

    return (
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Header closeButton>
                <Modal.Title className="fw-bold">Login Required</Modal.Title>
            </Modal.Header>
            <Modal.Body className="text-center py-4">
                <div className="fs-1 mb-3">🔒</div>
                <h5 className="mb-3">Please log in or register to view and join events.</h5>
                <p className="text-muted small">Join our community to access reliable event details and connect with organizers.</p>
                <div className="d-flex gap-3 justify-content-center mt-4">
                    <Button variant="outline-primary" className="px-4" onClick={() => navigate('/login')}>
                        Login
                    </Button>
                    <Button variant="primary" className="px-4" onClick={() => navigate('/register')}>
                        Register
                    </Button>
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default AuthModal;
