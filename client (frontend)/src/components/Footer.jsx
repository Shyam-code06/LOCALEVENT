import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin, Mail, MapPin, Phone } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-white pt-5 pb-4 border-top">
            <Container>
                <Row className="gy-4">
                    <Col lg={4} md={6}>
                        <h4 className="fw-bold mb-3 text-gradient d-inline-block">LocalEvents</h4>
                        <p className="text-muted mb-4" style={{ maxWidth: '300px' }}>
                            Empowering local communities by making micro-events accessible and discovery effortless. Find your tribe in your neighborhood.
                        </p>
                        <div className="d-flex gap-3">
                            <a href="#" className="p-2 bg-light rounded-circle text-primary hover-shadow transition-smooth">
                                <Facebook size={18} />
                            </a>
                            <a href="#" className="p-2 bg-light rounded-circle text-primary hover-shadow transition-smooth">
                                <Twitter size={18} />
                            </a>
                            <a href="#" className="p-2 bg-light rounded-circle text-primary hover-shadow transition-smooth">
                                <Instagram size={18} />
                            </a>
                            <a href="#" className="p-2 bg-light rounded-circle text-primary hover-shadow transition-smooth">
                                <Linkedin size={18} />
                            </a>
                        </div>
                    </Col>

                    <Col lg={2} md={6}>
                        <h6 className="fw-bold mb-4 text-dark">Platform</h6>
                        <ul className="list-unstyled d-flex flex-column gap-2">
                            <li><Link to="/" className="text-muted text-decoration-none hover-primary">Explore Events</Link></li>
                            <li><Link to="/register-organizer" className="text-muted text-decoration-none hover-primary">Host an Event</Link></li>
                            <li><Link to="/dashboard" className="text-muted text-decoration-none hover-primary">Dashboard</Link></li>
                            <li><Link to="/profile" className="text-muted text-decoration-none hover-primary">User Profile</Link></li>
                        </ul>
                    </Col>

                    <Col lg={2} md={6}>
                        <h6 className="fw-bold mb-4 text-dark">Company</h6>
                        <ul className="list-unstyled d-flex flex-column gap-2">
                            <li><Link to="#" className="text-muted text-decoration-none hover-primary">About Us</Link></li>
                            <li><Link to="#" className="text-muted text-decoration-none hover-primary">Privacy Policy</Link></li>
                            <li><Link to="#" className="text-muted text-decoration-none hover-primary">Terms of Service</Link></li>
                            <li><Link to="#" className="text-muted text-decoration-none hover-primary">Contact Support</Link></li>
                        </ul>
                    </Col>

                    <Col lg={4} md={6}>
                        <h6 className="fw-bold mb-4 text-dark">Get in Touch</h6>
                        <ul className="list-unstyled d-flex flex-column gap-3">
                            <li className="d-flex gap-3 text-muted">
                                <MapPin size={20} className="text-primary flex-shrink-0" />
                                <span>Team GatherX</span>
                            </li>
                            <li className="d-flex gap-3 text-muted">
                                <Phone size={20} className="text-primary flex-shrink-0" />
                                <span>+91 (555) 123-4567</span>
                            </li>
                            <li className="d-flex gap-3 text-muted">
                                <Mail size={20} className="text-primary flex-shrink-0" />
                                <span>teamgatherx@gmail.com</span>
                            </li>
                        </ul>
                    </Col>
                </Row>

                <hr className="my-4 border-light" />

                <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
                    <p className="text-muted small mb-0">
                        © 2026 LocalEvents. Built with ❤️ for Connecting communities through meaningful events.
                    </p>
                    <div className="d-flex gap-4">
                        <Link to="#" className="text-muted small text-decoration-none">Privacy</Link>
                        <Link to="#" className="text-muted small text-decoration-none">Terms</Link>
                        <Link to="#" className="text-muted small text-decoration-none">Cookies</Link>
                    </div>
                </div>
            </Container>

            <style jsx>{`
                .hover-primary:hover {
                    color: var(--accent-blue) !important;
                    padding-left: 4px;
                    transition: all 0.2s ease;
                }
                .hover-shadow:hover {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    transform: translateY(-2px);
                }
            `}</style>
        </footer>
    );
};

export default Footer;
