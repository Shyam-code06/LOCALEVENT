import { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';

const HypeFeed = ({ user }) => {
    const [stories, setStories] = useState([]);
    const [selectedStory, setSelectedStory] = useState(null);

    useEffect(() => {
        if (user) fetchStories();
    }, [user]);

    const fetchStories = async () => {
        try {
            // Fetch hype feed
            const { data } = await axios.get(`http://localhost:5000/api/hype/feed?userId=${user._id}`);
            setStories(data);
        } catch (error) {
            console.error("Failed to fetch hype feed", error);
        }
    };

    if (stories.length === 0) return null;

    return (
        <div className="mb-4">
            <h5 className="fw-bold mb-3 text-secondary">🔥 Hype / Stories</h5>
            <div className="d-flex gap-3 overflow-auto pb-2">
                {stories.map(story => (
                    <div
                        key={story._id}
                        className="text-center cursor-pointer"
                        style={{ minWidth: '80px' }}
                        onClick={() => setSelectedStory(story)}
                    >
                        <div className="p-1 rounded-circle bg-gradient border-2 border-primary mb-1" style={{ width: '70px', height: '70px', background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}>
                            <div className="bg-white rounded-circle w-100 h-100 p-1">
                                <img
                                    src={story.imageUrl?.startsWith('http') ? story.imageUrl : `http://localhost:5000${story.imageUrl?.startsWith('/') ? '' : '/'}${story.imageUrl || ''}`}
                                    className="w-100 h-100 rounded-circle object-fit-cover"
                                    alt="story"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = `https://ui-avatars.com/api/?name=${story.userName}&background=random`;
                                    }}
                                />
                            </div>
                        </div>
                        <small className="d-block text-truncate fw-bold" style={{ maxWidth: '80px' }}>
                            {story.userName.split(' ')[0]}
                        </small>
                    </div>
                ))}
            </div>

            {/* Story Viewer Modal */}
            <Modal show={!!selectedStory} onHide={() => setSelectedStory(null)} centered contentClassName="bg-dark text-white border-0">
                <Modal.Body className="p-0 position-relative text-center" style={{ minHeight: '500px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <button
                        className="position-absolute top-0 end-0 btn btn-link text-white text-decoration-none fs-3 p-3"
                        onClick={() => setSelectedStory(null)}
                        style={{ zIndex: 10 }}
                    >
                        &times;
                    </button>

                    {selectedStory && (
                        <>
                            {selectedStory.imageUrl && (
                                <img
                                    src={selectedStory.imageUrl.startsWith('http') ? selectedStory.imageUrl : `http://localhost:5000${selectedStory.imageUrl.startsWith('/') ? '' : '/'}${selectedStory.imageUrl}`}
                                    className="w-100 h-100 position-absolute top-0 start-0 object-fit-cover opacity-50"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.style.display = 'none';
                                    }}
                                />
                            )}
                            <div className="position-relative z-1 p-4">
                                <h3 className="fw-bold mb-4">{selectedStory.event.title}</h3>
                                <p className="lead fs-4">{selectedStory.content}</p>
                                <div className="mt-5">
                                    <small className="text-white-50">Posted by {selectedStory.userName}</small>
                                </div>
                            </div>
                        </>
                    )}
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default HypeFeed;
