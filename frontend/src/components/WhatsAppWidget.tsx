import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl, getRole } from "@/lib/auth";

const WhatsAppWidget = () => {
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();
  const role = getRole();

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/settings"));
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const whatsappNumber = settings?.whatsappNumber || "";

  // Show widget after page load
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Don't show widget if:
  // 1. WhatsApp number is not configured
  // 2. User is on admin pages
  // 3. User is an admin
  if (!whatsappNumber || location.pathname.startsWith("/admin") || role === "admin") {
    return null;
  }

  // Format WhatsApp number (remove any non-digit characters except +)
  const formatNumber = (num: string): string => {
    // Remove spaces, dashes, and other characters
    let cleaned = num.replace(/[^\d+]/g, "");
    // If it starts with +, keep it, otherwise ensure it starts with country code
    if (!cleaned.startsWith("+")) {
      // If it's 10 digits (Indian number), add +91
      if (cleaned.length === 10) {
        cleaned = "+91" + cleaned;
      } else if (cleaned.length > 10) {
        // Assume it has country code but missing +
        cleaned = "+" + cleaned;
      }
    }
    return cleaned;
  };

  const handleWhatsAppClick = () => {
    const formattedNumber = formatNumber(whatsappNumber);
    const message = encodeURIComponent("Hello! I'm interested in your products.");
    const whatsappUrl = `https://wa.me/${formattedNumber}?text=${message}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-90"
      }`}
    >
      <button
        onClick={handleWhatsAppClick}
        className="group relative flex items-center justify-center w-16 h-16 bg-[#25D366] hover:bg-[#20BA5A] rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        aria-label="Chat on WhatsApp"
        title="Chat with us on WhatsApp"
      >
        <MessageCircle className="w-8 h-8 text-white" />
        
        {/* Pulse animation */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20" />
        
        {/* Tooltip */}
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
            Chat with us on WhatsApp
            <div className="absolute left-full top-1/2 -translate-y-1/2 -translate-x-1 border-4 border-transparent border-l-gray-900" />
          </div>
        </div>
      </button>
    </div>
  );
};

export default WhatsAppWidget;

