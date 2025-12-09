import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { register, getRole } from "@/lib/auth";

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    try {
      await register({ name, email, password });
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
      const msg = e instanceof Error ? e.message : "REGISTRATION_FAILED";
      if (msg === "EMAIL_EXISTS") setError("User already exists");
      else setError("Registration failed");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRegister();
    }
  };

  return (
    <div className="container px-4 py-8">
      <div className="max-w-md mx-auto bg-card rounded-lg p-6 space-y-4">
        <h1 className="font-serif text-3xl font-bold">Register</h1>
        {error && <p className="text-destructive">{error}</p>}
        <div>
          <Label htmlFor="name">Name</Label>
          <Input 
            id="name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            onKeyDown={handleKeyDown}
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            onKeyDown={handleKeyDown}
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input 
            id="password" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            onKeyDown={handleKeyDown}
          />
        </div>
        <Button
          className="w-full"
          onClick={handleRegister}
        >
          Create Account
        </Button>
      </div>
    </div>
  );
};

export default Register;