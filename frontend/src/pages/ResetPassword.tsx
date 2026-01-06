import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiUrl } from "@/lib/auth";
import { toast } from "@/components/ui/sonner";
import { Eye, EyeOff } from "lucide-react";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(getApiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Password reset successfully");
        navigate("/login");
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch (e) {
      setError("Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="container px-4 py-8">
        <div className="max-w-md mx-auto bg-card rounded-lg p-6 space-y-4 text-center">
          <h1 className="font-serif text-3xl font-bold">Invalid Reset Link</h1>
          <p className="text-muted-foreground">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link to="/forgot-password">
            <Button className="w-full">Request New Reset Link</Button>
          </Link>
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
                className="pr-10"
                placeholder="Enter new password"
                required
                minLength={6}
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
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pr-10"
                placeholder="Confirm new password"
                required
                minLength={6}
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
