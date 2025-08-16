import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

const Landing = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="bg-primary text-primary-foreground py-2">
          <div className="max-w-6xl mx-auto px-8 flex justify-between items-center text-sm">
            <span>📞 +234 123 456 7890</span>
            <span>📧 info@go3net.com.ng</span>
            <span>📍 Lagos, Nigeria</span>
          </div>
        </div>
        
        <nav className="bg-white py-4">
          <div className="max-w-6xl mx-auto px-8 flex justify-between items-center">
            <div className="flex items-center gap-2 text-2xl font-bold">
              <span className="text-primary">Go<span className="text-foreground">3NET</span></span>
              <div className="text-primary text-xl">→</div>
            </div>
            
            <div className="hidden md:flex gap-8 items-center">
              <Link to="/" className="text-foreground hover:text-primary font-medium px-4 py-2 rounded-md transition-colors">HOME</Link>
              <Link to="/about" className="text-foreground hover:text-primary font-medium px-4 py-2 rounded-md transition-colors">ABOUT US</Link>
              <Link to="/services" className="text-foreground hover:text-primary font-medium px-4 py-2 rounded-md transition-colors">SERVICES</Link>
              <Link to="/projects" className="text-foreground hover:text-primary font-medium px-4 py-2 rounded-md transition-colors">PROJECTS</Link>
              <Link to="/contact" className="text-foreground hover:text-primary font-medium px-4 py-2 rounded-md transition-colors">CONTACT</Link>
            </div>
            
            <div className="flex gap-4">
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
      <main className="flex-1 bg-gradient-to-br from-background to-muted py-16 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center min-h-[500px]">
          <div className="z-10">
            <h1 className="text-5xl font-bold text-foreground mb-6 leading-tight">
              Go3net Technologies LTD
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Empowering businesses with cutting-edge technology solutions. 
              From web development to digital transformation, we deliver 
              excellence in every project.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link to="/login">
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  Access Dashboard
                </Button>
              </Link>
              <Link to="/services">
                <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                  Our Services
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="relative h-96 flex items-center justify-center">
            <div className="w-72 h-72 bg-gradient-to-br from-primary to-primary/80 rounded-[50%_10%_50%_10%] relative animate-pulse"></div>
            <div className="absolute w-36 h-36 bg-accent rounded-full -top-5 -right-5 opacity-80"></div>
          </div>
        </div>
      </main>

      {/* Services Section */}
      <section className="py-16 bg-background">
        <div className="max-w-6xl mx-auto px-8">
          <h2 className="text-4xl font-bold text-center mb-12 text-foreground">What we <span className="text-primary relative">DO</span></h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-8 text-center border hover:border-primary transition-all hover:-translate-y-2 hover:shadow-lg">
              <div className="text-5xl mb-4">🏠</div>
              <h3 className="text-2xl font-semibold mb-4 text-foreground">Residential Services</h3>
              <p className="text-muted-foreground leading-relaxed">Comprehensive technology solutions for homes and residential properties.</p>
            </Card>
            
            <Card className="p-8 text-center border hover:border-primary transition-all hover:-translate-y-2 hover:shadow-lg">
              <div className="text-5xl mb-4">🏢</div>
              <h3 className="text-2xl font-semibold mb-4 text-foreground">Commercial Services</h3>
              <p className="text-muted-foreground leading-relaxed">Enterprise-grade technology infrastructure for businesses of all sizes.</p>
            </Card>
            
            <Card className="p-8 text-center border hover:border-primary transition-all hover:-translate-y-2 hover:shadow-lg">
              <div className="text-5xl mb-4">🏭</div>
              <h3 className="text-2xl font-semibold mb-4 text-foreground">Industrial Services</h3>
              <p className="text-muted-foreground leading-relaxed">Specialized technology solutions for industrial and manufacturing sectors.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted text-muted-foreground py-12">
        <div className="max-w-6xl mx-auto px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h4 className="text-foreground text-xl mb-4">Go3net Technologies</h4>
            <p className="leading-relaxed">Leading technology solutions provider in Nigeria.</p>
          </div>
          
          <div>
            <h4 className="text-foreground text-xl mb-4">Quick Links</h4>
            <div className="space-y-2">
              <Link to="/about" className="block hover:text-primary transition-colors">About Us</Link>
              <Link to="/services" className="block hover:text-primary transition-colors">Services</Link>
              <Link to="/projects" className="block hover:text-primary transition-colors">Projects</Link>
              <Link to="/contact" className="block hover:text-primary transition-colors">Contact</Link>
            </div>
          </div>
          
          <div>
            <h4 className="text-foreground text-xl mb-4">Contact Info</h4>
            <div className="space-y-2">
              <p>📞 +234 123 456 7890</p>
              <p>📧 info@go3net.com.ng</p>
              <p>📍 Lagos, Nigeria</p>
            </div>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto px-8 pt-8 border-t border-border text-center text-muted-foreground">
          <p>&copy; 2024 Go3net Technologies LTD. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;