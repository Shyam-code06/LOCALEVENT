import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Container, Card, Form, Button, Row, Col, Badge } from 'react-bootstrap';

const CompleteProfile = () => {
    const [user, setUser] = useState(null);
    const [formData, setFormData] = useState({
        bio: '',
        occupation: 'Student', // Default for college students
        college: '',
        graduationYear: '2026',
        dob: '',
        gender: '',
        phoneNumber: '',
        pincode: '',
        address: '',
        locationCity: '',
        interests: [],
        skills: [],
        linkedin: '',
        twitter: '',
        instagram: '',
        coordinates: null // Store coords for distance calc
    });

    const [customInterest, setCustomInterest] = useState('');
    const [customSkill, setCustomSkill] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        const userInfo = localStorage.getItem('userInfo');
        if (!userInfo) {
            navigate('/login');
        } else {
            const parsedUser = JSON.parse(userInfo);
            setUser(parsedUser);

            if (parsedUser.profile) {
                setFormData({
                    bio: parsedUser.profile.bio || '',
                    occupation: parsedUser.profile.occupation || 'Student',
                    college: parsedUser.profile.college || '',
                    graduationYear: parsedUser.profile.graduationYear || '2026',
                    dob: parsedUser.profile.dob ? new Date(parsedUser.profile.dob).toISOString().split('T')[0] : '2000-01-01',
                    gender: parsedUser.profile.gender || 'Prefer not to say',
                    phoneNumber: parsedUser.profile.phoneNumber || '',
                    address: parsedUser.profile.address || '',
                    locationCity: parsedUser.locationCity || '',
                    pincode: parsedUser.profile.pincode || '',
                    interests: parsedUser.interests || [],
                    skills: parsedUser.profile.skills || [],
                    linkedin: parsedUser.profile.socialLinks?.linkedin || '',
                    twitter: parsedUser.profile.socialLinks?.twitter || '',
                    instagram: parsedUser.profile.socialLinks?.instagram || '',
                    coordinates: parsedUser.profile.location?.coordinates ? {
                        lat: parsedUser.profile.location.coordinates[1],
                        lng: parsedUser.profile.location.coordinates[0]
                    } : null
                });
            }
        }
    }, [navigate]);

    const INTEREST_OPTIONS = [
        "Technology", "Music", "Art", "Sports", "Food", "Travel",
        "Photography", "Dance", "Theater", "Literature", "Gaming",
        "Fitness", "Entrepreneurship", "Social Work", "Fashion", "Other"
    ];

    const SKILL_OPTIONS = [
        "Python", "JavaScript", "Java", "C++", "React", "Node.js",
        "Design", "UI/UX", "Graphic Design", "Video Editing",
        "Public Speaking", "Writing", "Marketing", "Leadership",
        "Photography", "Music Production", "Dancing", "Cooking", "Other"
    ];

    const toggleSelection = (array, item, field) => {
        if (array.includes(item)) {
            setFormData(prev => ({ ...prev, [field]: array.filter(i => i !== item) }));
        } else {
            setFormData(prev => ({ ...prev, [field]: [...array, item] }));
        }
    };

    const handleAddCustom = (field, value, setVal) => {
        if (!value.trim()) return;
        if (!formData[field].includes(value.trim())) {
            setFormData(prev => ({ ...prev, [field]: [...prev[field], value.trim()] }));
        }
        setVal('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.dob || !formData.gender || !formData.pincode) {
            toast.error("Date of Birth, Gender and Pincode are mandatory fields.");
            return;
        }

        if (formData.interests.length < 3) {
            toast.error("Please select at least 3 interests");
            return;
        }

        const tid = toast.loading("Saving your profile...");
        try {
            const { data } = await axios.put(`http://localhost:5000/api/users/profile/${user._id}`, {
                ...formData,
                coordinates: formData.coordinates, // Send geocoded coords
                socialLinks: {
                    linkedin: formData.linkedin,
                    twitter: formData.twitter,
                    instagram: formData.instagram
                }
            });

            const existingInfo = JSON.parse(localStorage.getItem('userInfo'));
            const updatedInfo = { ...data, token: existingInfo?.token };

            localStorage.setItem('userInfo', JSON.stringify(updatedInfo));
            toast.success("Profile saved successfully!", { id: tid });
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.message || "Save failed", { id: tid });
        }
    };

    if (!user) return null;

    return (
        <div className="bg-light min-vh-100 py-5">
            <style>
                {`
                    .profile-card {
                        border-radius: 24px;
                        border: none;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.05);
                    }
                    .form-label {
                        font-weight: 600;
                        color: #333;
                        margin-bottom: 8px;
                    }
                    .form-control, .form-select {
                        border-radius: 12px;
                        padding: 12px 16px;
                        border: 1px solid #eee;
                        background-color: #fcfcfc;
                        transition: all 0.2s;
                    }
                    .form-control:focus {
                        background-color: #fff;
                        border-color: #6366f1;
                        box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
                    }
                    .interest-badge, .skill-badge {
                        cursor: pointer;
                        padding: 10px 20px;
                        font-weight: 500;
                        transition: all 0.2s;
                        border: 1px solid #eee;
                    }
                    .badge-selected {
                        background-color: #6366f1 !important;
                        color: white !important;
                        border-color: #6366f1 !important;
                    }
                    .badge-unselected {
                        background-color: #fff !important;
                        color: #666 !important;
                    }
                    .save-btn {
                        background: #6366f1;
                        border: none;
                        padding: 16px;
                        border-radius: 14px;
                        font-weight: 700;
                        font-size: 1.1rem;
                        transition: all 0.3s;
                    }
                    .save-btn:hover {
                        background: #4f46e5;
                        transform: translateY(-2px);
                        box-shadow: 0 10px 20px rgba(99, 102, 241, 0.2);
                    }
                    .back-btn {
                        background: #fff;
                        border: 1px solid #eee;
                        color: #666;
                        padding: 16px;
                        border-radius: 14px;
                        font-weight: 600;
                    }
                    .section-title {
                        font-weight: 800;
                        font-size: 1.25rem;
                        color: #1a1a1a;
                        margin-top: 32px;
                        margin-bottom: 16px;
                    }
                `}
            </style>

            <Container style={{ maxWidth: '900px' }}>
                <div className="text-center mb-5">
                    <h1 className="fw-bold text-primary mb-2" style={{ fontSize: '3rem' }}>My Profile</h1>
                    <p className="text-muted fs-5">Manage your profile and preferences</p>
                </div>

                <Card className="profile-card p-4 p-md-5">
                    <Form onSubmit={handleSubmit}>
                        {/* About You Section */}
                        <div className="section-title mt-0">About You</div>
                        <Form.Group className="mb-4">
                            <Form.Label>Tell us about yourself, your passions, and what you're looking for in events...</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={4}
                                placeholder="Describe yourself..."
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value.substring(0, 500) })}
                            />
                            <div className="text-end text-muted small mt-1">
                                {formData.bio.length}/500 characters
                            </div>
                        </Form.Group>

                        {/* Essential Details Section */}
                        <div className="section-title">Essential Details <span className="text-danger">*</span></div>
                        <p className="text-muted mb-3">These details are required for age verification and nearby event detection</p>
                        <Row className="mb-4">
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label>Date of Birth</Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={formData.dob}
                                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label>Gender</Form.Label>
                                    <Form.Select
                                        value={formData.gender}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                        <option value="Prefer not to say">Prefer not to say</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label>Pincode (Location)</Form.Label>
                                    <Form.Control
                                        placeholder="6-digit Pincode"
                                        value={formData.pincode}
                                        onChange={async (e) => {
                                            const val = e.target.value.replace(/\D/g, '').substring(0, 6);
                                            setFormData({ ...formData, pincode: val });

                                            // Trigger geocoding immediately when 6 digits are reached
                                            if (val.length === 6) {
                                                const tid = toast.loading("Auto-detecting location...");
                                                try {
                                                    const { data } = await axios.get(`http://localhost:5000/api/users/geocode?address=${val}`);
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        locationCity: data.city,
                                                        coordinates: { lat: data.lat, lng: data.lng }
                                                    }));
                                                    toast.success(`Location: ${data.city}`, { id: tid });
                                                } catch (err) {
                                                    toast.error("Geocoding failed", { id: tid });
                                                }
                                            }
                                        }}
                                        required
                                    />
                                    {formData.locationCity && <small className="text-success fw-bold">📍 {formData.locationCity}</small>}
                                </Form.Group>
                            </Col>
                        </Row>

                        {/* College & Education */}
                        <Row className="mb-4">
                            <Col md={8}>
                                <Form.Group>
                                    <Form.Label className="section-title mt-0" style={{ fontSize: '1.25rem' }}>College/University</Form.Label>
                                    <Form.Control
                                        placeholder="Enter your college name (e.g., IIT Bombay, Mumbai University)"
                                        value={formData.college}
                                        onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="section-title mt-0" style={{ fontSize: '1.25rem' }}>Graduation Year</Form.Label>
                                    <Form.Control
                                        placeholder="2026"
                                        value={formData.graduationYear}
                                        onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        {/* Interests Section */}
                        <div className="section-title">Interests <span className="text-danger">*</span></div>
                        <p className="text-muted mb-3">Select at least 3 interests to get better recommendations</p>
                        <div className="d-flex flex-wrap gap-2 mb-3">
                            {INTEREST_OPTIONS.map(interest => (
                                <Badge
                                    key={interest}
                                    pill
                                    className={`interest-badge ${formData.interests.includes(interest) ? 'badge-selected' : 'badge-unselected'}`}
                                    onClick={() => toggleSelection(formData.interests, interest, 'interests')}
                                >
                                    {interest}
                                </Badge>
                            ))}
                            {formData.interests.filter(i => !INTEREST_OPTIONS.includes(i)).map(interest => (
                                <Badge
                                    key={interest}
                                    pill
                                    className="interest-badge badge-selected"
                                    onClick={() => toggleSelection(formData.interests, interest, 'interests')}
                                >
                                    {interest} ✕
                                </Badge>
                            ))}
                        </div>
                        <div className="d-flex gap-2 mb-4">
                            <Form.Control
                                placeholder="Add custom interest"
                                value={customInterest}
                                onChange={(e) => setCustomInterest(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustom('interests', customInterest, setCustomInterest))}
                            />
                            <Button variant="outline-primary" onClick={() => handleAddCustom('interests', customInterest, setCustomInterest)}>Add</Button>
                        </div>

                        {/* Skills Section */}
                        <div className="section-title">Skills</div>
                        <p className="text-muted mb-3">What are you good at? (Optional)</p>
                        <div className="d-flex flex-wrap gap-2 mb-3">
                            {SKILL_OPTIONS.map(skill => (
                                <Badge
                                    key={skill}
                                    pill
                                    className={`skill-badge ${formData.skills.includes(skill) ? 'badge-selected' : 'badge-unselected'}`}
                                    onClick={() => toggleSelection(formData.skills, skill, 'skills')}
                                >
                                    {skill}
                                </Badge>
                            ))}
                            {formData.skills.filter(s => !SKILL_OPTIONS.includes(s)).map(skill => (
                                <Badge
                                    key={skill}
                                    pill
                                    className="skill-badge badge-selected"
                                    onClick={() => toggleSelection(formData.skills, skill, 'skills')}
                                >
                                    {skill} ✕
                                </Badge>
                            ))}
                        </div>
                        <div className="d-flex gap-2 mb-4">
                            <Form.Control
                                placeholder="Add custom skill"
                                value={customSkill}
                                onChange={(e) => setCustomSkill(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustom('skills', customSkill, setCustomSkill))}
                            />
                            <Button variant="outline-success" onClick={() => handleAddCustom('skills', customSkill, setCustomSkill)}>Add</Button>
                        </div>

                        {/* Social Links */}
                        <div className="section-title">Social Links (Optional)</div>
                        <Row className="mb-5">
                            <Col md={4} className="mb-3">
                                <Form.Control
                                    placeholder="LinkedIn URL"
                                    value={formData.linkedin}
                                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                                />
                            </Col>
                            <Col md={4} className="mb-3">
                                <Form.Control
                                    placeholder="Twitter URL"
                                    value={formData.twitter}
                                    onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                                />
                            </Col>
                            <Col md={4} className="mb-3">
                                <Form.Control
                                    placeholder="Instagram URL"
                                    value={formData.instagram}
                                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                                />
                            </Col>
                        </Row>

                        {/* Action Buttons */}
                        <div className="d-flex gap-3">
                            <Button variant="light" className="back-btn flex-grow-1" onClick={() => navigate('/dashboard')}>
                                Back to Dashboard
                            </Button>
                            <Button variant="primary" type="submit" className="save-btn flex-grow-2 w-50">
                                Save Profile
                            </Button>
                        </div>
                    </Form>
                </Card>
            </Container>
        </div>
    );
};

export default CompleteProfile;
