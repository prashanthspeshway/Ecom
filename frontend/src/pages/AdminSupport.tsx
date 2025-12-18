import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { authFetch, getRole, getToken } from "@/lib/auth";
import { toast } from "@/components/ui/sonner";

const AdminSupport = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<string | null>(getRole());
  const [isChecking, setIsChecking] = useState(true);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
      loadSupportMessages();
    }
  }, [isChecking, role]);

  const loadSupportMessages = async () => {
    try {
      setLoading(true);
      // This would fetch from your backend API
      // For now, showing a placeholder
      setSupportMessages([]);
    } catch (e) {
      toast.error("Failed to load support messages");
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

  return (
    <div className="container px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-3xl md:text-4xl font-bold">Support Management</h1>
          <Button variant="outline" onClick={() => navigate("/admin")}>
            Back to Admin
          </Button>
        </div>

        <div className="bg-card rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Support Messages</h2>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : supportMessages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No support messages yet.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Support messages from customers will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {supportMessages.map((message) => (
                  <div key={message.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{message.name}</span>
                      <span className="text-sm text-muted-foreground">{message.date}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{message.email}</p>
                    <p>{message.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">Support Settings</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="support-email">Support Email</Label>
                <Input id="support-email" placeholder="support@example.com" />
              </div>
              <div>
                <Label htmlFor="support-phone">Support Phone</Label>
                <Input id="support-phone" placeholder="+1 (555) 123-4567" />
              </div>
              <div>
                <Label htmlFor="support-hours">Support Hours</Label>
                <Input id="support-hours" placeholder="Mon-Fri 9AM-5PM" />
              </div>
              <Button>Save Settings</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSupport;
