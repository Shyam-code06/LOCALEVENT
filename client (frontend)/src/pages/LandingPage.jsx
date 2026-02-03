import { useState, useEffect } from 'react';
import { Container, Row, Col, Badge, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MapPin, Calendar, Clock, ArrowRight, Sparkles, Filter, Search } from 'lucide-react';
import Header from '../components/Header';
import AuthModal from '../components/AuthModal';

import Footer from '../components/Footer';

const Hero = ({ onSearch }) => {
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('');
    const [text, setText] = useState('');
    const fullText = "Discover Meaningful Events Near You";

    useEffect(() => {
        let index = 0;
        const timer = setTimeout(() => {
            const interval = setInterval(() => {
                if (index <= fullText.length) {
                    setText(fullText.slice(0, index));
                    index++;
                } else {
                    clearInterval(interval);
                }
            }, 60);
            return () => clearInterval(interval);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const renderTitle = () => {
        const target = "Meaningful Events";
        if (!text.includes(target)) {
            return <span>{text}</span>;
        }
        const parts = text.split(target);
        return (
            <>
                <span>{parts[0]}</span>
                <span className="text-gradient">{target}</span>
                <span>{parts[1]}</span>
            </>
        );
    };

    return (
        <div className="hero-section text-center mb-0">
            <div className="animated-bg"></div>
            <Container>
                <div className="fade-in-up">
                    <Badge bg="light" text="primary" className="mb-3 px-3 py-2 rounded-pill shadow-sm border">
                        <Sparkles size={14} className="me-2 mb-1" />
                        Discover local magic
                    </Badge>
                    <h1 className="display-3 fw-bold mb-4" style={{ minHeight: '1.2em' }}>
                        {renderTitle()}
                        <span className="typewriter-cursor">|</span>
                    </h1>
                    <p className="lead text-muted mb-5 mx-auto" style={{ maxWidth: '700px' }}>
                        Join micro-events, workshops, and local meetups that matter.
                        From tech workshops to cultural festivals, find your tribe today.
                    </p>

                    {/* Professional Search Bar */}
                    <div className="bg-white p-2 p-md-3 rounded-5 shadow-lg mx-auto mb-5 border d-flex flex-column flex-md-row gap-2" style={{ maxWidth: '900px', position: 'relative', zIndex: 10 }}>
                        <div className="d-flex align-items-center flex-grow-1 px-3 border-end border-light">
                            <Search className="text-muted me-2" size={20} />
                            <input
                                type="text"
                                placeholder="Search by title, city, or locality..."
                                className="border-0 w-100 py-2 shadow-none"
                                onChange={(e) => setQuery(e.target.value)}
                                style={{ outline: 'none' }}
                            />
                        </div>
                        <div className="d-flex align-items-center flex-grow-1 px-3 border-end border-light d-none d-md-flex">
                            <Filter className="text-muted me-2" size={20} />
                            <select
                                className="border-0 w-100 py-2 bg-transparent text-muted"
                                style={{ outline: 'none' }}
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                <option value="">All Categories</option>
                                <option value="Workshop">Workshop</option>
                                <option value="Meetup">Meetup</option>
                                <option value="Cultural">Cultural</option>
                                <option value="Tech">Tech</option>
                                <option value="Social">Social</option>
                            </select>
                        </div>
                        <button
                            className="btn-premium btn-premium-primary px-4 py-2"
                            onClick={() => onSearch({ query, category })}
                        >
                            Find Events
                        </button>
                    </div>

                    <div className="d-flex gap-3 justify-content-center flex-wrap d-none d-md-flex align-items-center">
                        <span className="small text-muted fw-bold text-uppercase tracking-wider">🔥 Trending:</span>
                        <div className="d-flex gap-2">
                            {['Workshop', 'Music', 'Tech'].map(tag => (
                                <Badge key={tag} bg="white" text="dark" className="border shadow-sm px-3 py-2 rounded-pill hover-lift transition-smooth cursor-pointer" style={{ fontSize: '12px' }}>
                                    #{tag}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>
            </Container>
            <div className="hero-wave"></div>
        </div>
    );
};

const SkeletonCard = () => (
    <div className="event-card border-0" style={{ minWidth: '320px', height: '420px' }}>
        <div className="skeleton-box w-100" style={{ height: '200px', borderRadius: '20px 20px 0 0' }}></div>
        <div className="p-4">
            <div className="skeleton-box w-75 mb-3" style={{ height: '24px' }}></div>
            <div className="skeleton-box w-50 mb-2" style={{ height: '16px' }}></div>
            <div className="skeleton-box w-60 mb-4" style={{ height: '16px' }}></div>
            <div className="skeleton-box w-100" style={{ height: '45px', borderRadius: '50px' }}></div>
        </div>
    </div>
);

const EventCard = ({ event, handleAction }) => {
    const dateObj = new Date(event.dateTime);
    const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    return (
        <div className="event-card border-0 d-flex flex-column h-100" style={{ minWidth: '320px', maxWidth: '320px' }}>
            <div className="position-relative" style={{ height: '200px' }}>
                <img
                    src={event.posterImageUrl || event.imageUrl || "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=500&q=60"}
                    className="w-100 h-100 object-fit-cover"
                    alt={event.title}
                    style={{ borderRadius: '20px 20px 0 0' }}
                />
                <div className="position-absolute top-0 start-0 m-3">
                    <Badge bg="white" text="dark" className="glass-badge shadow-sm border-0 py-2 px-3 rounded-pill opacity-90">
                        {event.category || 'General'}
                    </Badge>
                </div>
                {event.trustScore > 80 && (
                    <div className="position-absolute bottom-0 end-0 m-3">
                        <Badge bg="success" className="shadow-sm border-0 py-2 px-3 rounded-pill">
                            <Sparkles size={12} className="me-1" /> Featured
                        </Badge>
                    </div>
                )}
            </div>
            <div className="p-4 d-flex flex-column flex-grow-1">
                <h5 className="fw-bold mb-3 text-truncate" title={event.title}>{event.title}</h5>

                <div className="d-flex align-items-center gap-2 text-muted mb-2 small">
                    <Calendar size={14} className="text-primary" />
                    <span>{dateStr} • {timeStr}</span>
                </div>

                <div className="d-flex align-items-center gap-2 text-muted mb-4 small">
                    <MapPin size={14} className="text-primary" />
                    <span className="text-truncate">{event.locality || 'Downtown'}, {event.city}</span>
                </div>

                <button
                    className="btn-premium btn-premium-primary w-100 mt-auto d-flex align-items-center justify-content-center gap-2"
                    onClick={() => handleAction(event._id)}
                >
                    View Details <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
};

const EmptyState = ({ onRetry }) => (
    <div className="text-center py-5 fade-in-up">
        <div className="mb-4">
            <img
                src="/empty-state.png"
                alt="No events found"
                style={{ maxWidth: '300px', width: '100%', borderRadius: '24px' }}
                className="shadow-sm"
            />
        </div>
        <h3 className="fw-bold mb-2">No events near you yet</h3>
        <p className="text-muted mb-4 mx-auto" style={{ maxWidth: '400px' }}>
            No events near you yet — but something exciting is coming soon!
        </p>
        <button
            className="btn-premium btn-premium-primary px-5"
            onClick={onRetry}
        >
            Explore Nearby Events
        </button>
    </div>
);

const LandingPage = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [searchParams, setSearchParams] = useState({ query: '', category: '' });
    const navigate = useNavigate();

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('http://localhost:5000/api/events?status=upcoming');
            setEvents(data || []);
        } catch (error) {
            console.error("Error fetching events:", error);
            setEvents([]);
        } finally {
            setTimeout(() => setLoading(false), 800);
        }
    };

    const handleAction = (eventId) => {
        const userInfo = localStorage.getItem('userInfo');
        if (!userInfo) {
            setShowAuthModal(true);
        } else {
            navigate(`/event/${eventId}`);
        }
    };

    const handleSearch = (params) => {
        const userInfo = localStorage.getItem('userInfo');
        if (params.category && !userInfo) {
            setShowAuthModal(true);
            return;
        }
        setSearchParams(params);
    };

    const upcomingEvents = (events || []).filter(e => {
        const dateMatch = new Date(e.dateTime) >= new Date();
        const queryMatch = !searchParams.query ||
            e.title.toLowerCase().includes(searchParams.query.toLowerCase()) ||
            (e.city && e.city.toLowerCase().includes(searchParams.query.toLowerCase())) ||
            (e.locality && e.locality.toLowerCase().includes(searchParams.query.toLowerCase()));
        const categoryMatch = !searchParams.category || e.category === searchParams.category;

        return dateMatch && queryMatch && categoryMatch;
    });

    const featuredEvents = upcomingEvents.length > 0
        ? [...upcomingEvents].sort((a, b) => (b.trustScore || 0) - (a.trustScore || 0)).slice(0, 5)
        : [];

    return (
        <div className="min-vh-100 d-flex flex-column bg-secondary">
            <Header />

            <Hero onSearch={handleSearch} />

            <Container className="pb-5 pt-4 flex-grow-1">
                {loading ? (
                    <div className="mb-5">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <div className="skeleton-box w-25" style={{ height: '32px' }}></div>
                        </div>
                        <div className="d-flex gap-4 overflow-hidden pb-4">
                            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
                        </div>
                    </div>
                ) : upcomingEvents.length === 0 ? (
                    <EmptyState onRetry={() => { setSearchParams({ query: '', category: '' }); fetchEvents(); }} />
                ) : (
                    <>
                        {featuredEvents.length > 0 && (
                            <div className="mb-5 fade-in-up">
                                <div className="d-flex justify-content-between align-items-baseline mb-4">
                                    <h3 className="fw-bold d-flex align-items-center gap-2">
                                        Featured Events <Sparkles className="text-warning" size={24} />
                                    </h3>
                                    <button
                                        onClick={() => navigate('/dashboard')}
                                        className="btn p-0 text-primary text-decoration-none fw-semibold d-flex align-items-center gap-1 border-0 bg-transparent"
                                    >
                                        View All <ArrowRight size={16} />
                                    </button>
                                </div>
                                <div className="d-flex gap-4 overflow-auto pb-4 custom-scrollbar px-1">
                                    {featuredEvents.map(event => (
                                        <div key={event._id} className="h-100">
                                            <EventCard event={event} handleAction={handleAction} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mb-5 fade-in-up" style={{ animationDelay: '0.2s' }}>
                            <div className="d-flex justify-content-between align-items-baseline mb-4">
                                <h3 className="fw-bold">Happening Soon</h3>
                            </div>
                            <div className="d-flex gap-4 overflow-auto pb-4 custom-scrollbar px-1">
                                {upcomingEvents.slice(0, 8).map(event => (
                                    <div key={event._id} className="h-100">
                                        <EventCard event={event} handleAction={handleAction} />
                                    </div>
                                ))}
                            </div>
                        </div>

                    </>
                )}
            </Container>

            <Footer />

            <AuthModal show={showAuthModal} handleClose={() => setShowAuthModal(false)} />
        </div>
    );
};

export default LandingPage;


