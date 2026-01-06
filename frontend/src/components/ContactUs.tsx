import { Mail, Phone, MapPin, Clock } from "lucide-react";

const ContactUs = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-[#991b1b] mb-4 font-serif">
          Contact Us
        </h1>
        <p className="text-xl text-gray-600">
          We'd love to hear from you. Get in touch with Savitri Saree Mandir
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="bg-[#991b1b] rounded-full p-3">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Email Us</h3>
              <p className="text-gray-600">Send us an email anytime</p>
              <a href="mailto:info@savitrisareemandir.com" className="text-[#991b1b] hover:underline">
                info@savitrisareemandir.com
              </a>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="bg-[#991b1b] rounded-full p-3">
              <Phone className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Call Us</h3>
              <p className="text-gray-600">Speak with our team</p>
              <a href="tel:+919876543210" className="text-[#991b1b] hover:underline">
                +91 98765 43210
              </a>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="bg-[#991b1b] rounded-full p-3">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Visit Us</h3>
              <p className="text-gray-600">Come to our store</p>
              <p className="text-gray-700">
                Savitri Saree Mandir<br />
                Main Street, City Center<br />
                India
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="bg-[#991b1b] rounded-full p-3">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Business Hours</h3>
              <p className="text-gray-600">We're here to help</p>
              <p className="text-gray-700">
                Monday - Saturday: 10:00 AM - 8:00 PM<br />
                Sunday: 11:00 AM - 6:00 PM
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-8 border border-gray-200">
        <h2 className="text-2xl font-semibold text-[#991b1b] mb-6">Send us a Message</h2>
        <p className="text-gray-700 mb-6">
          Have a question or need assistance? Fill out the form below and we'll get back to you as soon as possible.
        </p>
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#991b1b] focus:border-transparent"
                placeholder="Enter your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Email</label>
              <input
                type="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#991b1b] focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#991b1b] focus:border-transparent"
              placeholder="What is this regarding?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
            <textarea
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#991b1b] focus:border-transparent"
              placeholder="Tell us how we can help you..."
            ></textarea>
          </div>
          <button className="w-full bg-[#991b1b] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#7a1515] transition-colors">
            Send Message
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;

