import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, getRole } from "@/lib/auth";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="flex gap-2 sm:hidden">
          <Button
            className="flex-1"
            onClick={async () => {
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