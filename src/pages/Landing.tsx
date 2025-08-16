import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import styles from './Landing.module.css';

const Landing = () => {
  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.topBar}>
          <div className={styles.topBarContent}>
            <span>📞 +234 123 456 7890</span>
            <span>📧 info@go3net.com.ng</span>
            <span>📍 Lagos, Nigeria</span>
          </div>
        </div>
        
        <nav className={styles.navbar}>
          <div className={styles.navContent}>
            <div className={styles.logo}>
              <span className={styles.logoText}>Go<span className={styles.logoNet}>3NET</span></span>
              <div className={styles.logoArrow}>→</div>
            </div>
            
            <div className={styles.navLinks}>
              <Link to="/" className={styles.navLink}>HOME</Link>
              <Link to="/about" className={styles.navLink}>ABOUT US</Link>
              <Link to="/services" className={styles.navLink}>SERVICES</Link>
              <Link to="/projects" className={styles.navLink}>PROJECTS</Link>
              <Link to="/contact" className={styles.navLink}>CONTACT</Link>
            </div>
            
            <div className={styles.authButtons}>
              <Link to="/login">
                <Button variant="outline">Login</Button>
              </Link>
              <Link to="/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>
              Go3net Technologies LTD
            </h1>
            <p className={styles.heroDescription}>
              Empowering businesses with cutting-edge technology solutions. 
              From web development to digital transformation, we deliver 
              excellence in every project.
            </p>
            <div className={styles.heroButtons}>
              <Link to="/login">
                <Button size="lg" className={styles.primaryButton}>
                  Access Dashboard
                </Button>
              </Link>
              <Link to="/services">
                <Button size="lg" variant="outline" className={styles.secondaryButton}>
                  Our Services
                </Button>
              </Link>
            </div>
          </div>
          
          <div className={styles.heroGraphic}>
            <div className={styles.graphicShape}></div>
            <div className={styles.graphicAccent}></div>
          </div>
        </div>
      </main>

      {/* Services Section */}
      <section className={styles.services}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>What we <span className={styles.highlight}>DO</span></h2>
          
          <div className={styles.serviceCards}>
            <Card className={styles.serviceCard}>
              <div className={styles.serviceIcon}>🏠</div>
              <h3>Residential Services</h3>
              <p>Comprehensive technology solutions for homes and residential properties.</p>
            </Card>
            
            <Card className={styles.serviceCard}>
              <div className={styles.serviceIcon}>🏢</div>
              <h3>Commercial Services</h3>
              <p>Enterprise-grade technology infrastructure for businesses of all sizes.</p>
            </Card>
            
            <Card className={styles.serviceCard}>
              <div className={styles.serviceIcon}>🏭</div>
              <h3>Industrial Services</h3>
              <p>Specialized technology solutions for industrial and manufacturing sectors.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerSection}>
            <h4>Go3net Technologies</h4>
            <p>Leading technology solutions provider in Nigeria.</p>
          </div>
          
          <div className={styles.footerSection}>
            <h4>Quick Links</h4>
            <Link to="/about">About Us</Link>
            <Link to="/services">Services</Link>
            <Link to="/projects">Projects</Link>
            <Link to="/contact">Contact</Link>
          </div>
          
          <div className={styles.footerSection}>
            <h4>Contact Info</h4>
            <p>📞 +234 123 456 7890</p>
            <p>📧 info@go3net.com.ng</p>
            <p>📍 Lagos, Nigeria</p>
          </div>
        </div>
        
        <div className={styles.footerBottom}>
          <p>&copy; 2024 Go3net Technologies LTD. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;