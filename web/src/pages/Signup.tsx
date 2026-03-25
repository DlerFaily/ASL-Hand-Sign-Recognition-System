import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (password !== password2) {
      setError("Passwords do not match");
      return;
    }

    // Validate password length
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      await signup({
        username,
        email,
        first_name: firstName,
        last_name: lastName,
        password,
        password2,
      });
      navigate("/");
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.username?.[0] ||
        err.response?.data?.email?.[0] ||
        err.response?.data?.first_name?.[0] ||
        err.response?.data?.last_name?.[0] ||
        err.response?.data?.password?.[0] ||
        err.response?.data?.detail ||
        "Failed to create account. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center flex-col w-full h-full">
      <Card className="p-4">
        <h2 className="text-4xl font-semibold">Sign Up</h2>
        <form onSubmit={handleSubmit} className="gap-3 flex flex-col w-72">
          {error && <div>{error}</div>}
          <Input
            id="username"
            placeholder="Username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <Input
            id="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            id="firstName"
            placeholder="First name"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <Input
            id="lastName"
            placeholder="Last name"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />

          <Input
            id="password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <Input
            id="password2"
            type="password"
            placeholder="Confirm Password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            required
            minLength={8}
          />

          <Button
            type="submit"
            disabled={isLoading}
            className={cn(
              isLoading && "opacity-60 cursor-not-allowed",
              "bg-green-900"
            )}
          >
            {isLoading ? "Creating account..." : "Sign Up"}
          </Button>
          <p className="text-sm text-neutral-600">
            Already have an account?{" "}
            <Link className="text-green-700 font-medium underline" to="/login">
              Log in
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
