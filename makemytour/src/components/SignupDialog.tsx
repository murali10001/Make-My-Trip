import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { DialogDescription } from "@radix-ui/react-dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { signup, login, apiClient, extractErrorMessage } from "../api";
import { setUser } from "@/store";
import { useDispatch } from "react-redux";

const SignupDialog = ({trigger}:any) => {
  const [isSignup, setIsSignup] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [open, setopem] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useDispatch();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setAuthError("");
    setIsSubmitting(true);
    try {
      const res: any = await apiClient.post(`/user/forgot-password?email=${encodeURIComponent(resetEmail)}`);
      if (res?.isNetworkError) {
        throw new Error(extractErrorMessage(res, "Unable to connect to server. Please ensure the backend is running."));
      }
      setResetSent(true);
    } catch (err: any) {
      setAuthError(err?.message || "Unable to send reset instructions. Please verify your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setAuthError("");
    setIsSubmitting(true);
    if (isSignup) {
      try {
        const signin = await signup(
          firstName,
          lastName,
          email,
          phoneNumber,
          password
        );
        dispatch(setUser(signin));
        setopem(false);
        clearform();
      } catch (error: any) {
        console.warn("Signup error handled:", error?.message || error);
        setAuthError(error?.message || "Signup failed. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      try {
        const data = await login(email, password);
        dispatch(setUser(data));
        setopem(false);
        clearform();
      } catch (error: any) {
        console.warn("Login error handled:", error?.message || error);
        setAuthError(error?.message || "Invalid email or password.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const clearform = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setPhoneNumber("");
    setResetEmail("");
    setResetSent(false);
    setIsForgotPassword(false);
    setAuthError("");
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setopem(val); if (!val) clearform(); }}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {isForgotPassword
              ? "Reset Password"
              : isSignup
              ? "Create Account"
              : "Welcome Back"}
          </DialogTitle>
          <DialogDescription>
            {isForgotPassword
              ? "Enter your email address to receive password recovery instructions."
              : isSignup
              ? "Join us to start booking your travels."
              : "Enter your credentials to access your account."}
          </DialogDescription>
        </DialogHeader>

        {authError && (
          <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
            <span>{authError}</span>
          </div>
        )}

        {isForgotPassword ? (
          resetSent ? (
            <div className="space-y-4 py-4 text-center">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm">
                <p className="font-bold">Password Reset Email Sent!</p>
                <p className="text-xs mt-1 text-emerald-700">
                  If an account exists for {resetEmail}, password reset instructions have been sent.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => { setIsForgotPassword(false); setResetSent(false); }}
              >
                Back to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="resetEmail">Registered Email</Label>
                <Input
                  id="resetEmail"
                  type="email"
                  placeholder="name@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-blue-600 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending Reset Link..." : "Send Reset Link"}
              </Button>
              <div className="text-center pt-2">
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:underline font-semibold"
                  onClick={() => { setIsForgotPassword(false); setAuthError(""); }}
                >
                  Back to Login
                </button>
              </div>
            </form>
          )
        ) : (
          <>
            <form onSubmit={handleAuth} className="space-y-4 py-4">
              {isSignup && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {!isSignup && (
                    <button
                      type="button"
                      onClick={() => { setIsForgotPassword(true); setAuthError(""); }}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {isSignup && (
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                </div>
              )}
              <Button
                type="submit"
                className="w-full bg-blue-600 text-white"
                variant="outline"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? (isSignup ? "Signing up..." : "Logging in...")
                  : (isSignup ? "Sign Up" : "Login")}
              </Button>
            </form>
            <div className="text-center text-sm">
              {isSignup ? (
                <>
                  Already have an account?{" "}
                  <Button
                    variant="link"
                    className="p-0 text-blue-600"
                    onClick={() => { setIsSignup(false); setAuthError(""); }}
                  >
                    Login
                  </Button>
                </>
              ) : (
                <>
                  Don't have an account?{" "}
                  <Button
                    variant="link"
                    className="p-0 text-blue-600"
                    onClick={() => { setIsSignup(true); setAuthError(""); }}
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SignupDialog;
