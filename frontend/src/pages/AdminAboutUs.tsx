import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { authFetch, getRole, getToken } from "@/lib/auth";
import { toast } from "@/components/ui/sonner";

type AboutUsPage = {
  slug: string;
  title: string;
  content: string;
};

const getDefaultContent = () => {
  return `<div class="about-us-container">
    <section class="hero-section">
      <h1 class="main-title">Welcome to Savitri Saree Mandir</h1>
      <p class="subtitle">Your Trusted Destination for Authentic Indian Sarees</p>
    </section>

    <section class="intro-section">
      <h2>Our Story</h2>
      <p>At Savitri Saree Mandir, we celebrate the timeless elegance and cultural richness of Indian sarees. With a legacy spanning decades, we have been dedicated to bringing you the finest collection of handcrafted sarees that embody tradition, craftsmanship, and contemporary style.</p>
      <p>Our name, "Savitri Saree Mandir," reflects our commitment to being a sacred space (Mandir) where every saree is treated with reverence and care, just like the legendary Savitri who symbolizes strength, grace, and devotion.</p>
    </section>

    <section class="mission-section">
      <h2>Our Mission</h2>
      <p>Our mission is to preserve and promote the rich heritage of Indian textiles while making authentic sarees accessible to women across the globe. We believe that every saree tells a story, and we are honored to be part of your special moments.</p>
    </section>

    <section class="values-section">
      <h2>What Sets Us Apart</h2>
      <div class="values-grid">
        <div class="value-item">
          <h3>Authenticity</h3>
          <p>We source directly from renowned weavers and artisans across India, ensuring every saree is genuine and of the highest quality.</p>
        </div>
        <div class="value-item">
          <h3>Quality Craftsmanship</h3>
          <p>Each saree in our collection is carefully selected, representing the finest examples of traditional and contemporary Indian craftsmanship.</p>
        </div>
        <div class="value-item">
          <h3>Diverse Collection</h3>
          <p>From Banarasi and Kanjeevaram to Designer and Contemporary styles, we offer a wide range to suit every taste and occasion.</p>
        </div>
        <div class="value-item">
          <h3>Customer Care</h3>
          <p>Your satisfaction is our priority. We provide personalized assistance to help you find the perfect saree for your special moments.</p>
        </div>
      </div>
    </section>

    <section class="heritage-section">
      <h2>Our Heritage</h2>
      <p>Savitri Saree Mandir stands as a testament to India's rich textile heritage. We work closely with master craftsmen who have inherited generations of knowledge and skill. Our collection includes:</p>
      <ul>
        <li><strong>Banarasi Sarees:</strong> Luxurious silk sarees from Varanasi, known for their intricate zari work</li>
        <li><strong>Kanjeevaram Sarees:</strong> Traditional silk sarees from Tamil Nadu, celebrated for their durability and vibrant colors</li>
        <li><strong>Designer Sarees:</strong> Contemporary designs that blend traditional aesthetics with modern sensibilities</li>
        <li><strong>Handloom Sarees:</strong> Supporting local artisans and preserving traditional weaving techniques</li>
      </ul>
    </section>

    <section class="commitment-section">
      <h2>Our Commitment</h2>
      <p>We are committed to:</p>
      <ul>
        <li>Providing authentic, high-quality sarees at fair prices</li>
        <li>Supporting traditional artisans and weavers</li>
        <li>Ensuring customer satisfaction through excellent service</li>
        <li>Preserving and promoting Indian textile heritage</li>
        <li>Making sarees accessible to women everywhere</li>
      </ul>
    </section>

    <section class="closing-section">
      <h2>Join Us on This Journey</h2>
      <p>Whether you're looking for a saree for a wedding, festival, or special occasion, or simply want to add to your collection, Savitri Saree Mandir is here to help you find the perfect piece. We invite you to explore our collection and experience the beauty and elegance of authentic Indian sarees.</p>
      <p class="signature">Thank you for choosing Savitri Saree Mandir.</p>
    </section>
  </div>

  <style>
    .about-us-page {
      margin: 0 !important;
      padding: 0 !important;
    }
    .about-us-page > *:first-child {
      margin-top: 0 !important;
      padding-top: 0 !important;
    }
    .about-us-container {
      max-width: 900px;
      margin: 0 auto;
      line-height: 1.8;
      color: #333;
      margin-top: 0 !important;
      padding-top: 0 !important;
    }
    .about-us-container > *:first-child {
      margin-top: 0 !important;
      padding-top: 0 !important;
    }
    .hero-section {
      text-align: center;
      padding: 0 0 2rem 0 !important;
      border-bottom: 2px solid #e5e7eb;
      margin-bottom: 2rem;
      margin-top: 0 !important;
      padding-top: 0 !important;
    }
    .main-title {
      font-size: 2.5rem;
      font-weight: 700;
      color: #991b1b;
      margin-bottom: 1rem;
      margin-top: 0 !important;
      padding-top: 0 !important;
      font-family: 'Georgia', serif;
    }
    .subtitle {
      font-size: 1.25rem;
      color: #6b7280;
      font-style: italic;
    }
    section {
      margin-bottom: 3rem;
    }
    h2 {
      font-size: 1.875rem;
      font-weight: 600;
      color: #991b1b;
      margin-bottom: 1.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #e5e7eb;
    }
    p {
      margin-bottom: 1.25rem;
      font-size: 1.1rem;
      color: #4b5563;
    }
    .values-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 2rem;
      margin-top: 2rem;
    }
    .value-item {
      padding: 1.5rem;
      background: #f9fafb;
      border-radius: 8px;
      border-left: 4px solid #991b1b;
    }
    .value-item h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #991b1b;
      margin-bottom: 0.75rem;
    }
    .value-item p {
      font-size: 1rem;
      margin-bottom: 0;
    }
    ul {
      list-style: none;
      padding-left: 0;
    }
    ul li {
      padding: 0.75rem 0;
      padding-left: 1.5rem;
      position: relative;
      font-size: 1.1rem;
      color: #4b5563;
    }
    ul li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #991b1b;
      font-weight: bold;
      font-size: 1.25rem;
    }
    .signature {
      font-style: italic;
      text-align: right;
      color: #991b1b;
      font-weight: 500;
      margin-top: 2rem;
    }
    @media (max-width: 768px) {
      .main-title {
        font-size: 2rem;
      }
      .values-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>`;
};

const AdminAboutUs = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [role, setRole] = useState<string | null>(getRole());
  const [isChecking, setIsChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState<AboutUsPage | null>(null);

  useEffect(() => {
    (async () => {
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const res = await authFetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          const backendRole = data.role || data.user?.role || null;
          if (backendRole && backendRole !== "undefined") {
            if (backendRole !== role) {
              localStorage.setItem("auth_role", backendRole);
              setRole(backendRole);
            }
            if (backendRole !== "admin") {
              navigate("/login");
              return;
            }
          } else {
            if (role !== "admin") {
              navigate("/login");
              return;
            }
          }
        } else {
          if (role !== "admin") {
            navigate("/login");
            return;
          }
        }
      } catch (e) {
        if (role !== "admin") {
          navigate("/login");
          return;
        }
      }
      setIsChecking(false);
    })();
  }, [navigate, role]);

  useEffect(() => {
    if (!isChecking && role === "admin") {
      loadPage();
    }
  }, [isChecking, role]);

  const loadPage = async () => {
    try {
      setLoading(true);
      const res = await authFetch("/api/pages/about-us");
      if (res.ok) {
        const data = await res.json();
        setPage(data);
      } else if (res.status === 404) {
        // Page doesn't exist, create default
        setPage({
          slug: "about-us",
          title: "About Savitri Saree Mandir",
          content: getDefaultContent(),
        });
      }
    } catch (e) {
      // If page doesn't exist, create default
      setPage({
        slug: "about-us",
        title: "About Savitri Saree Mandir",
        content: getDefaultContent(),
      });
    } finally {
      setLoading(false);
    }
  };

  const savePage = async () => {
    if (!page) return;
    try {
      setLoading(true);
      const res = await authFetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(page),
      });
      if (res.ok) {
        toast.success("About Us page saved successfully");
        qc.invalidateQueries({ queryKey: ["footer-pages"] });
      } else {
        toast.error("Failed to save page");
      }
    } catch (e) {
      toast.error("Failed to save page");
    } finally {
      setLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="container px-4 py-16 text-center">
        <p>Verifying admin access...</p>
      </div>
    );
  }

  if (role !== "admin" || !getToken()) {
    return (
      <div className="container px-4 py-16 text-center">
        <p>Unauthorized. Redirecting...</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="container px-4 py-16 text-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-3xl md:text-4xl font-bold">Edit About Us</h1>
          <Button variant="outline" onClick={() => navigate("/admin")}>
            Back to Admin
          </Button>
        </div>

        <div className="bg-card rounded-lg p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="page-title">Title</Label>
              <Input
                id="page-title"
                value={page.title}
                onChange={(e) => setPage({ ...page, title: e.target.value })}
                placeholder="About Us"
              />
            </div>
            <div>
              <Label htmlFor="page-content">Content (HTML allowed)</Label>
              <Textarea
                id="page-content"
                value={page.content}
                onChange={(e) => setPage({ ...page, content: e.target.value })}
                placeholder="<h1>About Us</h1><p>Content here...</p>"
                rows={15}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={savePage} disabled={loading}>
                {loading ? "Saving..." : "Save About Us Page"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.open("/pages/about-us", "_blank")}
              >
                Preview Page
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => {
                  if (confirm("This will replace the current content with the default professional content. Continue?")) {
                    setPage({
                      ...page!,
                      content: getDefaultContent(),
                    });
                  }
                }}
              >
                Load Default Content
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAboutUs;

