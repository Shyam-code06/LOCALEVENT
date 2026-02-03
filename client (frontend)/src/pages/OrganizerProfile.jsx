import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Container, Card, Form, Button, Row, Col, Navbar, Nav } from 'react-bootstrap';

const OrganizerProfile = () => {
    const [user, setUser] = useState(null);
    const [formData, setFormData] = useState({
        organizationName: '',
        organizationType: 'Company',
        companyRegistrationNumber: '',
        gstNumber: '',
        panNumber: '',
        street: '',
        city: '',
        state: '',
        pincode: '',
        contactPerson: '',
        contactPhone: '',
        contactEmail: '',
        website: '',
        bio: '',
        // Document URLs
        aadharCard: '',
        companyRegistration: '',
        gstCertificate: '',
        panCard: '',
        companyPagePhoto: '',
        bankStatement: '',
        otherDocuments: []
    });
    const navigate = useNavigate();

    useEffect(() => {
        const userInfo = localStorage.getItem('userInfo');
        if (!userInfo) {
            navigate('/login');
        } else {
            const parsedUser = JSON.parse(userInfo);
            if (parsedUser.role !== 'organizer') {
                navigate('/dashboard');
                return;
            }
            setUser(parsedUser);

            // Pre-fill existing data
            if (parsedUser.organizerProfile) {
                const profile = parsedUser.organizerProfile;
                setFormData({
                    organizationName: profile.organizationName || '',
                    organizationType: profile.organizationType || 'Company',
                    companyRegistrationNumber: profile.companyRegistrationNumber || '',
                    gstNumber: profile.gstNumber || '',
                    panNumber: profile.panNumber || '',
                    street: profile.address?.street || '',
                    city: profile.address?.city || '',
                    state: profile.address?.state || '',
                    pincode: profile.address?.pincode || '',
                    contactPerson: profile.contactPerson || '',
                    contactPhone: profile.contactPhone || '',
                    contactEmail: profile.contactEmail || '',
                    website: profile.website || '',
                    bio: profile.bio || '',
                    // Document URLs
                    aadharCard: profile.documents?.aadharCard || '',
                    companyRegistration: profile.documents?.companyRegistration || '',
                    gstCertificate: profile.documents?.gstCertificate || '',
                    panCard: profile.documents?.panCard || '',
                    companyPagePhoto: profile.documents?.companyPagePhoto || '',
                    bankStatement: profile.documents?.bankStatement || '',
                    otherDocuments: profile.documents?.otherDocuments || []
                });
            }
        }
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const { data } = await axios.put(`http://localhost:5000/api/users/organizer-profile/${user._id}`, formData);

            // Update local storage
            const updatedUser = { ...user, organizerProfile: data.organizerProfile };
            localStorage.setItem('userInfo', JSON.stringify(updatedUser));

            toast.success("Profile updated successfully!");
            navigate('/organizer-dashboard');
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update profile");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('userInfo');
        navigate('/');
    };

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
                            <Nav.Link as={Link} to="/organizer-profile" className="me-3 active text-primary">Profile</Nav.Link>
                            <Button variant="outline-danger" size="sm" onClick={handleLogout}>Logout</Button>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            <Container style={{ maxWidth: '900px' }} className="py-5">
                <Card className="p-4 shadow-lg border-0">
                    <Card.Body>
                        <div className="text-center mb-4">
                            <h2 className="fw-bold text-success">Organizer Profile & Verification</h2>
                            <p className="text-muted">Complete your profile to get verified and build trust</p>
                        </div>

                        <Form onSubmit={handleSubmit}>
                            {/* Organization Details */}
                            <h5 className="fw-bold mb-3 text-primary">Organization Details</h5>
                            <Row className="mb-4">
                                <Col md={8}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Organization Name <span className="text-danger">*</span></Form.Label>
                                        <Form.Control
                                            required
                                            value={formData.organizationName}
                                            onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                                            placeholder="ABC Events Pvt Ltd"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Organization Type <span className="text-danger">*</span></Form.Label>
                                        <Form.Select
                                            value={formData.organizationType}
                                            onChange={(e) => setFormData({ ...formData, organizationType: e.target.value })}
                                        >
                                            <option>Individual</option>
                                            <option>Company</option>
                                            <option>NGO</option>
                                            <option>Educational</option>
                                            <option>Government</option>
                                            <option>Other</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            </Row>

                            {/* Business Verification */}
                            <h5 className="fw-bold mb-3 text-primary">Business Verification (for faster approval)</h5>
                            <Row className="mb-4">
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Company Registration No.</Form.Label>
                                        <Form.Control
                                            value={formData.companyRegistrationNumber}
                                            onChange={(e) => setFormData({ ...formData, companyRegistrationNumber: e.target.value })}
                                            placeholder="U12345MH2020PTC123456"
                                        />
                                        <Form.Text className="text-muted">CIN/Registration Number</Form.Text>
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>GST Number</Form.Label>
                                        <Form.Control
                                            value={formData.gstNumber}
                                            onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                                            placeholder="22AAAAA0000A1Z5"
                                        />
                                        <Form.Text className="text-muted">15-digit GSTIN</Form.Text>
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>PAN Number</Form.Label>
                                        <Form.Control
                                            value={formData.panNumber}
                                            onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
                                            placeholder="ABCDE1234F"
                                        />
                                        <Form.Text className="text-muted">10-character PAN</Form.Text>
                                    </Form.Group>
                                </Col>
                            </Row>

                            {/* Address */}
                            <h5 className="fw-bold mb-3 text-primary">Registered Address <span className="text-danger">*</span></h5>
                            <Form.Group className="mb-3">
                                <Form.Label>Street Address</Form.Label>
                                <Form.Control
                                    required
                                    value={formData.street}
                                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                                    placeholder="123, Main Street, Building Name"
                                />
                            </Form.Group>
                            <Row className="mb-4">
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>City</Form.Label>
                                        <Form.Control
                                            required
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            placeholder="Mumbai"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>State</Form.Label>
                                        <Form.Control
                                            required
                                            value={formData.state}
                                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                            placeholder="Maharashtra"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Pincode</Form.Label>
                                        <Form.Control
                                            required
                                            value={formData.pincode}
                                            onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                            placeholder="400001"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            {/* Contact Details */}
                            <h5 className="fw-bold mb-3 text-primary">Contact Information <span className="text-danger">*</span></h5>
                            <Row className="mb-4">
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Contact Person Name</Form.Label>
                                        <Form.Control
                                            required
                                            value={formData.contactPerson}
                                            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                            placeholder="John Doe"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Contact Phone</Form.Label>
                                        <Form.Control
                                            required
                                            type="tel"
                                            value={formData.contactPhone}
                                            onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                                            placeholder="+91 9876543210"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row className="mb-4">
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Contact Email</Form.Label>
                                        <Form.Control
                                            required
                                            type="email"
                                            value={formData.contactEmail}
                                            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                            placeholder="contact@company.com"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Website (Optional)</Form.Label>
                                        <Form.Control
                                            value={formData.website}
                                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                            placeholder="https://www.yourcompany.com"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            {/* Bio */}
                            <Form.Group className="mb-4">
                                <Form.Label className="fw-bold">About Your Organization</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={4}
                                    value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    placeholder="Tell us about your organization, the types of events you host, your mission, and experience..."
                                    maxLength={1000}
                                />
                                <Form.Text className="text-muted">{formData.bio.length}/1000 characters</Form.Text>
                            </Form.Group>

                            {/* Document Uploads */}
                            <h5 className="fw-bold mb-3 text-primary">Verification Documents</h5>
                            <div className="alert alert-warning mb-4">
                                <strong>📄 Document Upload Instructions:</strong>
                                <ul className="mb-0 mt-2 small">
                                    <li>Upload clear, readable images (JPG, PNG) or PDF files</li>
                                    <li>You can use image hosting services like Imgur, Google Drive (with public link), or any cloud storage</li>
                                    <li>Paste the public URL of your document in the fields below</li>
                                    <li>Documents are required for verification and trust building</li>
                                </ul>
                            </div>

                            <Row className="mb-4">
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>
                                            Aadhar Card <span className="text-danger">*</span>
                                        </Form.Label>
                                        <Form.Control
                                            type="url"
                                            value={formData.aadharCard}
                                            onChange={(e) => setFormData({ ...formData, aadharCard: e.target.value })}
                                            placeholder="https://example.com/aadhar.jpg"
                                        />
                                        <Form.Text className="text-muted">Public URL to Aadhar card image</Form.Text>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>
                                            Company Registration Certificate
                                        </Form.Label>
                                        <Form.Control
                                            type="url"
                                            value={formData.companyRegistration}
                                            onChange={(e) => setFormData({ ...formData, companyRegistration: e.target.value })}
                                            placeholder="https://example.com/registration.pdf"
                                        />
                                        <Form.Text className="text-muted">Certificate of Incorporation/Registration</Form.Text>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>
                                            GST Certificate
                                        </Form.Label>
                                        <Form.Control
                                            type="url"
                                            value={formData.gstCertificate}
                                            onChange={(e) => setFormData({ ...formData, gstCertificate: e.target.value })}
                                            placeholder="https://example.com/gst-certificate.jpg"
                                        />
                                        <Form.Text className="text-muted">GST registration certificate</Form.Text>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>
                                            PAN Card
                                        </Form.Label>
                                        <Form.Control
                                            type="url"
                                            value={formData.panCard}
                                            onChange={(e) => setFormData({ ...formData, panCard: e.target.value })}
                                            placeholder="https://example.com/pan-card.jpg"
                                        />
                                        <Form.Text className="text-muted">PAN card image</Form.Text>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>
                                            Company Page/Letterhead Photo <span className="text-danger">*</span>
                                        </Form.Label>
                                        <Form.Control
                                            type="url"
                                            value={formData.companyPagePhoto}
                                            onChange={(e) => setFormData({ ...formData, companyPagePhoto: e.target.value })}
                                            placeholder="https://example.com/letterhead.jpg"
                                        />
                                        <Form.Text className="text-muted">Company letterhead or official page</Form.Text>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>
                                            Bank Statement (Optional)
                                        </Form.Label>
                                        <Form.Control
                                            type="url"
                                            value={formData.bankStatement}
                                            onChange={(e) => setFormData({ ...formData, bankStatement: e.target.value })}
                                            placeholder="https://example.com/bank-statement.pdf"
                                        />
                                        <Form.Text className="text-muted">Recent bank statement (optional, for additional verification)</Form.Text>
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Form.Group className="mb-4">
                                <Form.Label>Other Documents (Optional)</Form.Label>
                                <Form.Text className="d-block text-muted mb-2">Add URLs for any other verification documents (one per line)</Form.Text>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    value={formData.otherDocuments.join('\n')}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        otherDocuments: e.target.value.split('\n').filter(url => url.trim())
                                    })}
                                    placeholder="https://example.com/doc1.jpg&#10;https://example.com/doc2.pdf"
                                />
                                <Form.Text className="text-muted">Enter one URL per line</Form.Text>
                            </Form.Group>

                            <div className="alert alert-info">
                                <strong>📋 Verification Process:</strong>
                                <ul className="mb-0 mt-2">
                                    <li>Our team will review your details within 2-3 business days</li>
                                    <li>Providing GST/PAN/Registration numbers speeds up verification</li>
                                    <li>Verified organizers get higher trust scores and better visibility</li>
                                    <li>You can create events immediately, verification is for trust building</li>
                                </ul>
                            </div>

                            <div className="d-flex gap-2">
                                <Button variant="outline-secondary" onClick={() => navigate('/organizer-dashboard')}>
                                    Back to Dashboard
                                </Button>
                                <Button variant="success" type="submit" className="flex-grow-1">
                                    Save Profile & Submit for Verification
                                </Button>
                            </div>
                        </Form>
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
};

export default OrganizerProfile;
