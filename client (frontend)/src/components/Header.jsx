import { Navbar, Container, Nav, Dropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { User, LogOut, LayoutDashboard, Calendar, Settings } from 'lucide-react';

const Header = () => {
    const navigate = useNavigate();
    const userInfo = localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')) : null;

    const handleLogout = () => {
        localStorage.removeItem('userInfo');
        navigate('/');
        window.location.reload();
    };

    return (
        <Navbar expand="lg" className="py-3 px-2 sticky-top" style={{ zIndex: 1000 }}>
            <Container>
                <Navbar.Brand as={Link} to="/" className="fw-bold">
                    LocalEvents
                </Navbar.Brand>

                <Navbar.Toggle aria-controls="basic-navbar-nav" className="border-0 shadow-none" />

                <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
                    <Nav className="gap-3 align-items-center mt-3 mt-lg-0">
                        {!userInfo ? (
                            <>
                                <Link to="/login" className="text-decoration-none">
                                    <button className="btn-premium btn-premium-outline px-4">
                                        Login
                                    </button>
                                </Link>
                                <Link to="/register" className="text-decoration-none">
                                    <button className="btn-premium btn-premium-primary px-4 border-0">
                                        Register
                                    </button>
                                </Link>
                            </>
                        ) : (
                            <Dropdown align="end">
                                <Dropdown.Toggle id="user-dropdown" className="bg-white border-0 p-0 shadow-none d-flex align-items-center gap-2">
                                    <div className="bg-light p-2 rounded-circle border">
                                        <User size={18} className="text-primary" />
                                    </div>
                                    <span className="text-dark fw-semibold d-none d-sm-inline">{userInfo.name}</span>
                                </Dropdown.Toggle>

                                <Dropdown.Menu className="border-0 shadow-lg rounded-4 p-2 mt-2">
                                    <Dropdown.Item as={Link} to="/dashboard" className="rounded-3 py-2 d-flex align-items-center gap-2">
                                        <LayoutDashboard size={16} /> Dashboard
                                    </Dropdown.Item>
                                    <Dropdown.Item as={Link} to="/my-events" className="rounded-3 py-2 d-flex align-items-center gap-2">
                                        <Calendar size={16} /> My Events
                                    </Dropdown.Item>
                                    <Dropdown.Item as={Link} to="/profile" className="rounded-3 py-2 d-flex align-items-center gap-2">
                                        <User size={16} /> Profile
                                    </Dropdown.Item>
                                    <Dropdown.Item as={Link} to="/complete-profile" className="rounded-3 py-2 d-flex align-items-center gap-2">
                                        <Settings size={16} /> Settings
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item onClick={handleLogout} className="rounded-3 py-2 d-flex align-items-center gap-2 text-danger">
                                        <LogOut size={16} /> Logout
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        )}
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default Header;
