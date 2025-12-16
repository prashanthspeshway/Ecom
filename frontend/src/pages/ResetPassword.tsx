import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/lib/auth";
import { Eye, EyeOff } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link. Please request a new one.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Invalid reset link");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "FAILED";
      if (msg === "INVALID_TOKEN") setError("Invalid or expired reset link. Please request a new one.");
      else setError("Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container px-4 py-8">
        <Helmet>
          <title>Password Reset Successful - Saree Elegance</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <div className="max-w-md mx-auto bg-card rounded-lg p-6 space-y-4">
          <h1 className="font-serif text-3xl font-bold">Password Reset Successful</h1>
          <p className="text-muted-foreground">
            Your password has been successfully reset. You will be redirected to the login page shortly.
          </p>
          <Link to="/login">
            <Button className="w-full">Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="container px-4 py-8">
        <Helmet>
          <title>Invalid Reset Link - Saree Elegance</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <div className="max-w-md mx-auto bg-card rounded-lg p-6 space-y-4">
          <h1 className="font-serif text-3xl font-bold">Invalid Reset Link</h1>
          <p className="text-destructive">{error}</p>
          <Link to="/forgot-password">
            <Button className="w-full">Request New Reset Link</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8">
      <Helmet>
        <title>Reset Password - Saree Elegance</title>
        <meta name="description" content="Enter your new password to complete the password reset process." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="max-w-md mx-auto bg-card rounded-lg p-6 space-y-4">
        <h1 className="font-serif text-3xl font-bold">Reset Password</h1>
        {error && <p className="text-destructive">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input 
                id="password" 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input 
                id="confirmPassword" 
                type={showConfirmPassword ? "text" : "password"} 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
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

export default ResetPassword;



