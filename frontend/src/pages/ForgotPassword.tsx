import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiUrl } from "@/lib/auth";
import { toast } from "@/components/ui/sonner";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        setSent(true);
        toast.success("Password reset link sent to your email");
      } else {
        toast.error(data.error || "Failed to send reset email");
      }
    } catch (e) {
      toast.error("Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="container px-4 py-8">
        <div className="max-w-md mx-auto bg-card rounded-lg p-6 space-y-4 text-center">
          <h1 className="font-serif text-3xl font-bold">Check Your Email</h1>
          <p className="text-muted-foreground">
            If an account exists with <strong>{email}</strong>, we've sent a password reset link.
          </p>
          <p className="text-sm text-muted-foreground">
            Please check your email and click the link to reset your password. The link will expire in 1 hour.
          </p>
          <Link to="/login">
            <Button variant="outline" className="w-full">Back to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8">
      <div className="max-w-md mx-auto bg-card rounded-lg p-6 space-y-4">
        <h1 className="font-serif text-3xl font-bold">Forgot Password</h1>
        <p className="text-muted-foreground">
          Enter your email address and we'll send you a link to reset your password.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>
        <div className="text-center">
          <Link to="/login" className="text-sm text-primary hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
