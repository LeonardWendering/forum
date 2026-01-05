"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button, FormField, Alert, Card, CardHeader, CardContent, CardFooter } from "@/components/ui";
import { ApiClientError } from "@/lib/api";
import { generateUsernameSuggestions } from "@/lib/username-generator";

interface FormErrors {
  email?: string;
  displayName?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    displayName: "",
    password: "",
    confirmPassword: ""
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);

  useEffect(() => {
    // Generate initial suggestions
    setUsernameSuggestions(generateUsernameSuggestions(3));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setApiError(null);
  };

  const handleUseSuggestion = (suggestion: string) => {
    setFormData((prev) => ({ ...prev, displayName: suggestion }));
    setErrors((prev) => ({ ...prev, displayName: undefined }));
  };

  const handleGenerateNewSuggestions = () => {
    setUsernameSuggestions(generateUsernameSuggestions(3));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.displayName) {
      newErrors.displayName = "Display name is required";
    } else if (formData.displayName.length < 2) {
      newErrors.displayName = "Display name must be at least 2 characters";
    } else if (formData.displayName.length > 50) {
      newErrors.displayName = "Display name must be less than 50 characters";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setApiError(null);
    setIsSubmitting(true);

    try {
      const result = await register({
        email: formData.email,
        displayName: formData.displayName,
        password: formData.password
      });
      if (result.requiresVerification) {
        router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`);
      } else {
        router.push("/login?registered=true");
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setApiError(err.message);
      } else {
        setApiError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <h1 className="text-2xl font-bold text-gray-900">Create an account</h1>
        <p className="text-gray-600 mt-1">Join the discussion</p>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {apiError && <Alert variant="error">{apiError}</Alert>}

          <FormField
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            required
            autoComplete="email"
            disabled={isSubmitting}
          />

          <div>
            <FormField
              label="Display Name"
              name="displayName"
              type="text"
              placeholder="How you'll appear to others"
              value={formData.displayName}
              onChange={handleChange}
              error={errors.displayName}
              required
              autoComplete="name"
              disabled={isSubmitting}
            />
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Suggestions:</p>
                <button
                  type="button"
                  onClick={handleGenerateNewSuggestions}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                  disabled={isSubmitting}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Generate new
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {usernameSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleUseSuggestion(suggestion)}
                    className="px-3 py-1.5 bg-white text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-colors"
                    disabled={isSubmitting}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <FormField
            label="Password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            required
            autoComplete="new-password"
            disabled={isSubmitting}
          />

          <FormField
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            required
            autoComplete="new-password"
            disabled={isSubmitting}
          />
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            isLoading={isSubmitting}
            disabled={
              !formData.email ||
              !formData.displayName ||
              !formData.password ||
              !formData.confirmPassword
            }
          >
            Create account
          </Button>

          <p className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
