import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, getRole, syncRoleFromBackend } from "@/lib/auth";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="container px-4 py-8">
      <div className="max-w-md mx-auto bg-card rounded-lg p-6 space-y-4">
        <h1 className="font-serif text-3xl font-bold">Login</h1>
        {error && <p className="text-destructive">{error}</p>}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm text-primary hover:underline">
            Forgot Password?
          </Link>
        </div>
        <div className="flex gap-2 sm:hidden">
          <Button
            className="flex-1"
            onClick={async () => {
              try {
                await login({ email, password });
                // Wait a moment for localStorage to be updated
                await new Promise(resolve => setTimeout(resolve, 100));
                // Get role and verify it's set correctly
                let role = getRole();
                // If role is still not set, try syncing from backend
                if (!role || role === "undefined") {
                  role = await syncRoleFromBackend();
                }
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
            }}
          >
            Sign In
          </Button>
          <Button
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
            className="flex-1"
            onClick={async () => {
              try {
                await login({ email, password });
                // Wait a moment for localStorage to be updated
                await new Promise(resolve => setTimeout(resolve, 100));
                // Get role and verify it's set correctly
                let role = getRole();
                // If role is still not set, try syncing from backend
                if (!role || role === "undefined") {
                  role = await syncRoleFromBackend();
                }
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
            }}
          >
            Sign In
          </Button>
          <Button
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
      </div>
    </div>
  );
};

export default Login;