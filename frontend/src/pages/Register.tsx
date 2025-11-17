import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { register, getRole } from "@/lib/auth";

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="container px-4 py-8">
      <div className="max-w-md mx-auto bg-card rounded-lg p-6 space-y-4">
        <h1 className="font-serif text-3xl font-bold">Register</h1>
        {error && <p className="text-destructive">{error}</p>}
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="invite">Admin Invite Code (optional)</Label>
          <Input id="invite" value={invite} onChange={(e) => setInvite(e.target.value)} />
        </div>
        <Button
          className="w-full"
          onClick={async () => {
            try {
              await register({ name, email, password, invite: invite || undefined });
              const role = getRole();
              navigate(role === "admin" ? "/admin" : "/account");
            } catch (e) {
              setError("Registration failed");
            }
          }}
        >
          Create Account
        </Button>
      </div>
    </div>
  );
};

export default Register;