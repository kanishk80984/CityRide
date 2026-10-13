import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MapPin, Navigation, Bike, Car, ShieldCheck,
  Clock, Navigation2, Menu, X, CheckCircle,
  Smartphone, Star, Heart, Map, Sparkles, Target, Zap, ChevronDown, PhoneCall,
  Users, Briefcase, ArrowRight, CreditCard, UserPlus
} from 'lucide-react';
import './Home.css';
import heroImage from '../../assets/city_ride_hero.jpg';
import alternativeImage from '../../assets/hero.png';
import bikeImage from '../../assets/bike.jpg';
import autoImage from '../../assets/auto.jpg';
import carImage from '../../assets/car.jpg';
import experienceImage from '../../assets/experience.jpg';
import trustSectionImage from '../../assets/trust_section.png';
import trustPhoneImage from '../../assets/trust_phone.png';
import trustBgImage from '../../assets/trust_bg.png';
import longDistanceImage from '../../assets/long_distance.jpg';

// Intersection Observer Hook for Scroll Animations
const useScrollReveal = () => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, []);

  return { ref, isVisible };
};

const ScrollSection = ({ children, className = '', delay = '' }) => {
  const { ref, isVisible } = useScrollReveal();
  return (
    <div ref={ref} className={`animate-on-scroll ${isVisible ? 'visible' : ''} ${delay} ${className}`}>
      {children}
    </div>
  );
};

const NumberCounter = ({ target, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const { ref, isVisible } = useScrollReveal();

  useEffect(() => {
    if (isVisible) {
      let start = 0;
      const duration = 2000;
      const increment = target / (duration / 16);

      const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
          setCount(target);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);

      return () => clearInterval(timer);
    }
  }, [isVisible, target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};


const Home = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedRide, setSelectedRide] = useState('auto');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleBookRide = () => {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="home-container">
      {/* 1. Navbar */}
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
        <Link to="/" className="nav-brand">
          <Navigation2 size={32} />
          CITYRIDE
        </Link>

        <div className="nav-links">
          <a href="#rides">Rides</a>
          <a href="#outstation">Outstation</a>
          <a href="#safety">Safety</a>
          <a href="#about">About</a>
        </div>

        <div className="nav-actions">
          <Link to="/login" className="btn-nav-outline">Login</Link>
          <Link to="/register" className="btn-nav-outline" style={{ border: 'none' }}>Sign Up</Link>
        </div>

        <button className="nav-hamburger" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </nav>

      <div className={`mobile-nav ${isMobileMenuOpen ? 'open' : ''}`}>
        <a href="#rides" onClick={() => setIsMobileMenuOpen(false)}>Rides</a>
        <a href="#outstation" onClick={() => setIsMobileMenuOpen(false)}>Outstation</a>
        <a href="#safety" onClick={() => setIsMobileMenuOpen(false)}>Safety</a>
        <a href="#about" onClick={() => setIsMobileMenuOpen(false)}>About</a>
        <hr style={{ borderColor: '#e2e8f0', margin: '1rem 0' }} />
        <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
        <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>Sign Up</Link>
      </div>

      {/* 2. Full-Width Hero Banner */}
      <header className={`hero ${isLoaded ? 'loaded' : ''}`}>
        <div className="hero-bg" style={{ backgroundImage: `url(${heroImage})` }}></div>
        <div className="hero-overlay"></div>

        <div className="hero-content">
          <span className="hero-label">YOUR CITY. YOUR RIDE.</span>
          <h1 className="hero-title">
            Move Freely.<br />Ride Confidently.
          </h1>
          <p className="hero-subtitle">
            Fast, safe and reliable rides for every journey. Book a bike, auto or car and move through your city with confidence.
          </p>
          <div className="hero-buttons">
            <button className="btn-primary-large" onClick={handleBookRide}>Book a Ride</button>
            <a href="#rides" className="btn-secondary-large">Explore CityRide</a>
          </div>
        </div>

        <div className="scroll-indicator">
          <span>Scroll to explore</span>
          <ChevronDown size={24} />
        </div>


      </header>

      {/* 4. Ride Services */}
      <section id="rides" className="section section-light relative-section">
        <div className="section-bg-decoration"></div>
        <ScrollSection>
          <div className="section-header">
            <span className="section-label">One Platform. Every Ride.</span>
            <h2 className="section-title">Choose the ride<br />that fits your journey.</h2>
            <p className="section-subtitle">From quick city trips to comfortable long journeys, CityRide gives you the freedom to choose how you move.</p>
          </div>
        </ScrollSection>

        <div className="services-grid">
          <ScrollSection delay="delay-100" className="slide-from-left">
            <div className="service-card premium-card">
              <span className="service-number">01</span>
              <div className="service-image-container">
                <img src={bikeImage} alt="CityRide Bike" className="service-image" />
              </div>
              <div className="service-content">
                <h3>BIKE</h3>
                <p className="service-tagline">"Beat the traffic."</p>
                <p>Quick, affordable rides for everyday city travel.</p>
                <button className="btn-nav-solid btn-card" onClick={handleBookRide}>Book Bike</button>
              </div>
            </div>
          </ScrollSection>

          <ScrollSection delay="delay-200" className="slide-from-bottom">
            <div className="service-card premium-card">
              <span className="service-number">02</span>
              <div className="service-image-container">
                <img src={autoImage} alt="CityRide Auto" className="service-image" />
              </div>
              <div className="service-content">
                <h3>AUTO</h3>
                <p className="service-tagline">"Ride easy."</p>
                <p>Affordable and comfortable rides for everyday journeys.</p>
                <button className="btn-nav-solid btn-card" onClick={handleBookRide}>Book Auto</button>
              </div>
            </div>
          </ScrollSection>

          <ScrollSection delay="delay-300" className="slide-from-right">
            <div className="service-card premium-card">
              <span className="service-number">03</span>
              <div className="service-image-container">
                <img src={carImage} alt="CityRide Car" className="service-image" />
              </div>
              <div className="service-content">
                <h3>CAR</h3>
                <p className="service-tagline">"Travel in comfort."</p>
                <p>Spacious and comfortable rides for family and business travel.</p>
                <button className="btn-nav-solid btn-card" onClick={handleBookRide}>Book Car</button>
              </div>
            </div>
          </ScrollSection>
        </div>
      </section>

      {/* 5. CityRide Experience */}
      <section id="about" className="section section-white experience-section">
        <div className="split-layout">
          <ScrollSection className="split-content experience-content">
            <div className="section-header left" style={{ margin: 0 }}>
              <span className="section-label experience-label">THE EXPERIENCE</span>
              <h2 className="section-title">More Than a Ride.<br />It's <span className="text-green">Your City Experience.</span></h2>
              <p className="section-subtitle">CityRide connects people with reliable transportation through technology, real-time tracking, and a growing network of top-rated professional drivers.</p>
            </div>

            <ul className="feature-list-detailed">
              <li>
                <div className="feature-icon"><Zap size={24} /></div>
                <div className="feature-text">
                  <h4>Easy one-tap booking</h4>
                  <p>Book your ride in seconds, anytime, anywhere.</p>
                </div>
              </li>
              <li>
                <div className="feature-icon"><Target size={24} /></div>
                <div className="feature-text">
                  <h4>Real-time tracking</h4>
                  <p>Know your ride location and estimated arrival.</p>
                </div>
              </li>
              <li>
                <div className="feature-icon"><ShieldCheck size={24} /></div>
                <div className="feature-text">
                  <h4>Nearby verified drivers</h4>
                  <p>Get matched with trusted drivers quickly.</p>
                </div>
              </li>
              <li>
                <div className="feature-icon"><CheckCircle size={24} /></div>
                <div className="feature-text">
                  <h4>Transparent & secure payments</h4>
                  <p>Multiple payment options with complete security.</p>
                </div>
              </li>
            </ul>

            <div className="experience-actions">
              <button className="btn-primary-large btn-green">
                Learn More About CityRide &rarr;
              </button>
            </div>
          </ScrollSection>

          <ScrollSection className="split-image-wrap experience-image-wrap" delay="delay-200">
            <img src={experienceImage} alt="CityRide Experience" className="experience-main-image" style={{ background: 'transparent', boxShadow: 'none' }} />
          </ScrollSection>
        </div>
      </section>

      {/* 6. Animated Statistics */}
      <section className="section section-dark stats-section">
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-number"><NumberCounter target={10} suffix="K+" /></div>
            <div className="stat-label">Happy Riders</div>
          </div>
          <div className="stat-item">
            <div className="stat-number"><NumberCounter target={5} suffix="K+" /></div>
            <div className="stat-label">Daily Rides</div>
          </div>
          <div className="stat-item">
            <div className="stat-number"><NumberCounter target={2} suffix="K+" /></div>
            <div className="stat-label">Driver Partners</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">24/7</div>
            <div className="stat-label">Ride Availability</div>
          </div>
        </div>
      </section>

      {/* 7. How It Works */}
      <section className="section section-light">
        <ScrollSection>
          <div className="section-header">
            <span className="section-label">Simplicity</span>
            <h2 className="section-title">Your Ride in Three Simple Steps.</h2>
          </div>
        </ScrollSection>

        <div className="timeline">
          <ScrollSection delay="delay-100" className="timeline-step">
            <div className="step-circle">01</div>
            <h4>Enter Destination</h4>
            <p>Open the app and tell us where you need to go.</p>
          </ScrollSection>
          <ScrollSection delay="delay-200" className="timeline-step">
            <div className="step-circle">02</div>
            <h4>Choose Your Ride</h4>
            <p>Select the vehicle that best fits your budget and needs.</p>
          </ScrollSection>
          <ScrollSection delay="delay-300" className="timeline-step">
            <div className="step-circle">03</div>
            <h4>Enjoy Your Journey</h4>
            <p>Meet your driver and relax. We'll handle the rest.</p>
          </ScrollSection>
        </div>
      </section>

      {/* 8. Safety & Trust (Coded Layout) */}
      <section id="safety" className="section premium-trust-section" style={{ backgroundImage: `url(${trustBgImage})` }}>
        <div className="trust-content-wrapper">
          {/* Left Side: Empty Space (since phone is in bg image) */}
          <div className="trust-visual-column"></div>

          {/* Right Side: Stack of Wide Cards */}
          <div className="trust-grid-column">
            <ScrollSection delay="delay-200" className="trust-premium-card" style={{ backgroundImage: `url(${experienceImage})` }}>
              <div className="trust-card-overlay"></div>
              <div className="trust-card-text-area">
                <div className="trust-card-icon"><ShieldCheck size={28} /></div>
                <div className="trust-card-content">
                  <h4>Verified Drivers</h4>
                  <p>Every CityRide driver undergoes a strict background verification and training process before they hit the road.</p>
                </div>
              </div>
            </ScrollSection>

            <ScrollSection delay="delay-300" className="trust-premium-card" style={{ backgroundImage: `url(${carImage})` }}>
              <div className="trust-card-overlay"></div>
              <div className="trust-card-text-area">
                <div className="trust-card-icon"><Navigation2 size={28} /></div>
                <div className="trust-card-content">
                  <h4>Live Ride Tracking</h4>
                  <p>Track your trip in real-time on the map. Share your live location with trusted contacts with a single tap.</p>
                </div>
              </div>
            </ScrollSection>

            <ScrollSection delay="delay-400" className="trust-premium-card" style={{ backgroundImage: `url(${experienceImage})` }}>
              <div className="trust-card-overlay"></div>
              <div className="trust-card-text-area">
                <div className="trust-card-icon"><PhoneCall size={28} /></div>
                <div className="trust-card-content">
                  <h4>Emergency Support</h4>
                  <p>An SOS button directly in the app connects you to our 24/7 dedicated safety response team instantly.</p>
                </div>
              </div>
            </ScrollSection>

            <ScrollSection delay="delay-500" className="trust-premium-card" style={{ backgroundImage: `url(${autoImage})` }}>
              <div className="trust-card-overlay"></div>
              <div className="trust-card-text-area">
                <div className="trust-card-icon"><Map size={28} /></div>
                <div className="trust-card-content">
                  <h4>Trip Monitoring</h4>
                  <p>Our intelligent system automatically detects unexpected stops or deviations and checks in on your safety.</p>
                </div>
              </div>
            </ScrollSection>
          </div>
        </div>
      </section>

      {/* 9. Outstation */}
      <section id="outstation" className="section section-white">
        <div className="split-layout reverse">
          <ScrollSection className="split-content">
            <div className="section-header left" style={{ margin: 0 }}>
              <span className="section-label experience-label" style={{ textTransform: 'uppercase' }}>Long Distance</span>
              <h2 className="section-title">Going Beyond<br /><span className="text-green">the City?</span></h2>
              <p className="section-subtitle">From everyday commutes to long-distance journeys, CityRide is built to take you farther.</p>
            </div>

            <ul className="feature-list-detailed">
              <li>
                <div className="feature-icon"><Map size={24} /></div>
                <div className="feature-text">
                  <h4>Dedicated Intercity Rides</h4>
                  <p>Comfortable and reliable rides to nearby cities.</p>
                </div>
              </li>
              <li>
                <div className="feature-icon"><Users size={24} /></div>
                <div className="feature-text">
                  <h4>Comfortable Family Travel</h4>
                  <p>Spacious rides for your family's comfort.</p>
                </div>
              </li>
              <li>
                <div className="feature-icon"><Briefcase size={24} /></div>
                <div className="feature-text">
                  <h4>Professional Business Trips</h4>
                  <p>Reach your destination on time, every time.</p>
                </div>
              </li>
            </ul>

            <button className="btn-primary-large btn-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', paddingRight: '1rem' }} onClick={handleBookRide}>
              Explore Outstation
              <div style={{ background: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowRight size={18} color="#11704B" />
              </div>
            </button>
          </ScrollSection>
          <ScrollSection className="split-image-wrap" delay="delay-200">
            <img src={longDistanceImage} alt="Outstation Travel" className="split-image" />
          </ScrollSection>
        </div>
      </section>

      {/* 10. Driver Partner Section */}
      <section className="section section-light partnership-section">
        <div className="split-layout">
          <ScrollSection className="split-content">
            <div className="section-header left" style={{ margin: 0 }}>
              <span className="section-label experience-label" style={{ textTransform: 'uppercase' }}>Partnership</span>
              <h2 className="section-title">Drive With<br /><span className="text-green">CityRide.</span></h2>
              <p className="section-subtitle">Your vehicle. Your schedule. Your opportunity. Become your own boss and earn money driving on your terms.</p>
            </div>

            <ul className="feature-list-detailed">
              <li>
                <div className="feature-icon"><Clock size={24} /></div>
                <div className="feature-text">
                  <h4>Flexible working hours</h4>
                  <p>Drive when it suits you.</p>
                </div>
              </li>
              <li>
                <div className="feature-icon"><CreditCard size={24} /></div>
                <div className="feature-text">
                  <h4>Transparent earnings & fast payouts</h4>
                  <p>Earn fairly with clear payments.</p>
                </div>
              </li>
              <li>
                <div className="feature-icon"><UserPlus size={24} /></div>
                <div className="feature-text">
                  <h4>Simple onboarding process</h4>
                  <p>Get started in minutes.</p>
                </div>
              </li>
            </ul>

            <button className="btn-primary-large" style={{ background: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', paddingRight: '1rem' }} onClick={() => navigate('/login')}>
              Become a Driver
              <div style={{ background: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowRight size={18} color="#0f172a" />
              </div>
            </button>
          </ScrollSection>
          <ScrollSection className="split-image-wrap" delay="delay-200">
            <img src={alternativeImage} alt="Driver Partner" className="split-image" style={{ borderRadius: '30px' }} />
          </ScrollSection>
        </div>
      </section>

      {/* 11. Mobile App Section */}
      <section className="section section-white">
        <div className="split-layout reverse">
          <ScrollSection className="split-content">
            <div className="section-header left" style={{ margin: 0 }}>
              <span className="section-label">Download</span>
              <h2 className="section-title">Your City.<br />In Your Pocket.</h2>
              <p className="section-subtitle">Get the CityRide mobile app for the fastest booking experience, exclusive offers, and instant notifications.</p>
            </div>
            <button className="btn-primary-large" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.8rem', marginTop: '1rem' }}>
              <Smartphone size={24} /> Get the App
            </button>
          </ScrollSection>
          <ScrollSection className="split-image-wrap" delay="delay-200">
            <div className="app-mockup-wrapper">
              <div className="app-mockup">
                <div className="app-mockup-screen">
                  <div className="app-header">CityRide</div>
                  <div className="app-map" style={{ backgroundImage: `url(${alternativeImage})` }}>
                    <MapPin size={48} color="#111827" style={{ position: 'absolute', top: '45%', left: '45%' }} />
                  </div>
                  <div className="app-bottom">
                    <div className="app-line" style={{ width: '60%' }}></div>
                    <div className="app-line"></div>
                    <div className="app-line" style={{ background: '#11704B', marginTop: '20px' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollSection>
        </div>
      </section>

      {/* 12. Testimonials */}
      <section className="section section-light">
        <ScrollSection>
          <div className="section-header">
            <span className="section-label">Reviews</span>
            <h2 className="section-title">People Who Ride With Us.</h2>
          </div>
        </ScrollSection>

        <div className="testimonials-wrapper">
          <ScrollSection delay="delay-100" className="testimonial-card">
            <div style={{ display: 'flex', gap: '0.3rem', color: '#f59e0b' }}>
              <Star fill="currentColor" /><Star fill="currentColor" /><Star fill="currentColor" /><Star fill="currentColor" /><Star fill="currentColor" />
            </div>
            <p className="testimonial-quote">"The premium feel of CityRide cars is unmatched. The drivers are professional and the app experience is incredibly smooth."</p>
            <div className="testimonial-author">
              <div className="avatar">K</div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.2rem' }}>Karthik R.</h4>
                <span style={{ color: '#64748b' }}>Car Ride</span>
              </div>
            </div>
          </ScrollSection>
          <ScrollSection delay="delay-200" className="testimonial-card">
            <div style={{ display: 'flex', gap: '0.3rem', color: '#f59e0b' }}>
              <Star fill="currentColor" /><Star fill="currentColor" /><Star fill="currentColor" /><Star fill="currentColor" /><Star fill="currentColor" />
            </div>
            <p className="testimonial-quote">"Daily commute has never been easier. The bike taxis save me hours of being stuck in traffic, and it's super affordable."</p>
            <div className="testimonial-author">
              <div className="avatar">S</div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.2rem' }}>Sneha M.</h4>
                <span style={{ color: '#64748b' }}>Bike Ride</span>
              </div>
            </div>
          </ScrollSection>
          <ScrollSection delay="delay-300" className="testimonial-card">
            <div style={{ display: 'flex', gap: '0.3rem', color: '#f59e0b' }}>
              <Star fill="currentColor" /><Star fill="currentColor" /><Star fill="currentColor" /><Star fill="currentColor" /><Star fill="currentColor" />
            </div>
            <p className="testimonial-quote">"As someone who travels intercity frequently for business, CityRide Outstation has been a lifesaver. Highly reliable."</p>
            <div className="testimonial-author">
              <div className="avatar">A</div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.2rem' }}>Arjun V.</h4>
                <span style={{ color: '#64748b' }}>Outstation</span>
              </div>
            </div>
          </ScrollSection>
        </div>
      </section>


      {/* 14. Premium Footer */}
      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-brand" style={{ gridColumn: 'span 2' }}>
            <h3><Navigation2 size={36} /> CITYRIDE</h3>
            <p>We are a modern mobility platform committed to providing reliable, safe, and comfortable rides for everyone. Your journey starts here.</p>
          </div>
          <div className="footer-col">
            <h4>CITYRIDE</h4>
            <ul>
              <li><a href="#about">About Us</a></li>
              <li><a href="#contact">Contact</a></li>
              <li><a href="#careers">Careers</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>RIDES</h4>
            <ul>
              <li><a href="#rides">Bike</a></li>
              <li><a href="#rides">Auto</a></li>
              <li><a href="#rides">Car</a></li>
              <li><a href="#outstation">Outstation</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>SUPPORT</h4>
            <ul>
              <li><a href="#safety">Safety</a></li>
              <li><a href="#help">Help Center</a></li>
              <li><a href="#terms">Terms</a></li>
              <li><a href="#privacy">Privacy</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          &copy; All rights reserved by City Ride.
        </div>
      </footer>
    </div>
  );
};

export default Home;
