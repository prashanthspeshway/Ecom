import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPassword } from "@/lib/auth";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email);
      // Always show success to prevent email enumeration
      setSuccess(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "FAILED";
      if (msg === "NETWORK_ERROR") {
        setError("Unable to connect to server. Please check your connection and try again.");
      } else {
        setError("Failed to send reset email. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container px-4 py-8">
        <Helmet>
          <title>Check Your Email - Saree Elegance</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <div className="max-w-md mx-auto bg-card rounded-lg p-6 space-y-4">
          <h1 className="font-serif text-3xl font-bold">Check your email</h1>
          <p className="text-muted-foreground">
            If an account exists with <strong>{email}</strong>, we've sent a password reset link. Please check your inbox and follow the instructions to reset your password.
          </p>
          <p className="text-sm text-muted-foreground">
            If you don't see the email, please check your spam folder or try again in a few minutes.
          </p>
          <Link to="/login">
            <Button className="w-full">Back to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8">
      <Helmet>
        <title>Forgot Password - Saree Elegance</title>
        <meta name="description" content="Reset your password by entering your email address. We'll send you a password reset link." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="max-w-md mx-auto bg-card rounded-lg p-6 space-y-4">
        <h1 className="font-serif text-3xl font-bold">Forgot Password</h1>
        <p className="text-muted-foreground">
          Enter your email address and we'll send you a link to reset your password.
        </p>
        {error && <p className="text-destructive">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
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

