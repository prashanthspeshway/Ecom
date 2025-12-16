import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, getRole } from "@/lib/auth";
import { Eye, EyeOff } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      await login({ email, password });
      const role = getRole();
      const params = new URLSearchParams(location.search);
      const redirect = params.get("redirect");
      if (redirect) navigate(redirect);
      else navigate(role === "admin" ? "/admin" : "/account");
    } catch (e) {
      if (e instanceof TypeError) {
        setError("Backend is not connected");
        return;
      }
      const msg = e instanceof Error ? e.message : "LOGIN_FAILED";
      if (msg === "INVALID_CREDENTIALS") setError("Wrong credentials");
      else setError("Login failed");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && email && password) {
      handleLogin();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      handleLogin();
    }
  };

  return (
    <div className="container px-4 py-8">
      <Helmet>
        <title>Login - Saree Elegance</title>
        <meta name="description" content="Login to your Saree Elegance account to access your orders, wishlist, and account settings." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="max-w-md mx-auto bg-card rounded-lg p-6 space-y-4">
        <h1 className="font-serif text-3xl font-bold">Login</h1>
        {error && <p className="text-destructive">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input 
                id="password" 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pr-10"
                required
              />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-2 text-right">
            <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>
        <div className="flex gap-2 sm:hidden">
          <Button
            type="submit"
            className="flex-1"
          >
            Sign In
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => {
              const params = new URLSearchParams(location.search);
              const redirect = params.get("redirect");
              navigate(redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : "/register");
            }}
          >
            Sign Up
          </Button>
        </div>
        <div className="hidden sm:flex gap-2">
          <Button
            type="submit"
            className="flex-1"
          >
            Sign In
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => {
              const params = new URLSearchParams(location.search);
              const redirect = params.get("redirect");
              navigate(redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : "/register");
            }}
          >
            Sign Up
          </Button>
        </div>
        </form>
      </div>
    </div>
  );
};

export default Login;