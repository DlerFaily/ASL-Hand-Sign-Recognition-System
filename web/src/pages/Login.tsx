import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login({ username, password });
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid username or password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center flex-col w-full h-full">
      <Card className="p-4">
        <h2 className="text-4xl font-semibold">Login</h2>
        <form onSubmit={handleSubmit} className="gap-3 flex flex-col w-72">
          {error && (
            <div
              style={{
                padding: "0.75rem",
                backgroundColor: "#fee",
                color: "#c00",
                borderRadius: "4px",
              }}
            >
              {error}
            </div>
          )}

          <Input
            id="username"
            type="text"
            value={username}
            placeholder="Username"
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <Input
            id="password"
            type="password"
            value={password}
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            disabled={isLoading}
            className={cn(isLoading && "opacity-60 cursor-not-allowed", "bg-green-900")}
          > 
            {isLoading ? "Logging in..." : "Log in"}
          </Button>
        </form>

        <p className="text-sm text-neutral-600">
          Don't have an account? <Link className="text-green-700 font-medium underline" to="/signup">Sign up</Link>
        </p>
      </Card>
    </div>
  );
}
