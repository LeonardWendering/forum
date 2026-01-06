"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button, FormField, Alert, Card, CardHeader, CardContent, CardFooter } from "@/components/ui";
import { ApiClientError, authApi } from "@/lib/api";
import { generateUsername } from "@/lib/username-generator";
import type { ValidateInviteCodeResponse } from "@/lib/types";

interface FormErrors {
  email?: string;
  displayName?: string;
  password?: string;
  confirmPassword?: string;
  inviteCode?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    displayName: "",
    password: "",
    confirmPassword: "",
    inviteCode: ""
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestedUsername, setSuggestedUsername] = useState("");
  const [inviteCodeInfo, setInviteCodeInfo] = useState<ValidateInviteCodeResponse | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  useEffect(() => {
    setSuggestedUsername(generateUsername());
    // Check for invite code in URL params
    const codeFromUrl = searchParams.get("code");
    if (codeFromUrl) {
      setFormData(prev => ({ ...prev, inviteCode: codeFromUrl }));
      validateInviteCode(codeFromUrl);
    }
  }, [searchParams]);

  const validateInviteCode = useCallback(async (code: string) => {
    if (!code.trim()) {
      setInviteCodeInfo(null);
      setErrors(prev => ({ ...prev, inviteCode: undefined }));
      return;
    }

    setIsValidatingCode(true);
    try {
      const result = await authApi.validateInviteCode(code);
      setInviteCodeInfo(result);
      setErrors(prev => ({ ...prev, inviteCode: undefined }));
    } catch (err) {
      setInviteCodeInfo(null);
      if (err instanceof ApiClientError) {
        setErrors(prev => ({ ...prev, inviteCode: err.message }));
      } else {
        setErrors(prev => ({ ...prev, inviteCode: "Failed to validate invite code" }));
      }
    } finally {
      setIsValidatingCode(false);
    }
  }, []);

  const regenerateUsername = () => {
    setSuggestedUsername(generateUsername());
  };

  const useSuggestion = () => {
    setFormData((prev) => ({ ...prev, displayName: suggestedUsername }));
    setErrors((prev) => ({ ...prev, displayName: undefined }));
  };

  // Debounce invite code validation
  useEffect(() => {
    if (!formData.inviteCode.trim()) {
      setInviteCodeInfo(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      validateInviteCode(formData.inviteCode);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.inviteCode, validateInviteCode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setApiError(null);
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
        password: formData.password,
        ...(formData.inviteCode.trim() && { inviteCode: formData.inviteCode.trim() })
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
            {suggestedUsername && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-500 mb-1">Suggested username:</div>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-sm font-mono text-gray-800 bg-white px-2 py-1 rounded border">
                    {suggestedUsername}
                  </code>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={regenerateUsername}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                      disabled={isSubmitting}
                    >
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      New
                    </button>
                    <button
                      type="button"
                      onClick={useSuggestion}
                      className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors font-medium"
                      disabled={isSubmitting}
                    >
                      Use this
                    </button>
                  </div>
                </div>
              </div>
            )}
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

          <div>
            <FormField
              label="Invite Code (optional)"
              name="inviteCode"
              type="text"
              placeholder="Enter invite code if you have one"
              value={formData.inviteCode}
              onChange={handleChange}
              error={errors.inviteCode}
              autoComplete="off"
              disabled={isSubmitting}
            />
            {isValidatingCode && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Validating...
              </div>
            )}
            {inviteCodeInfo && (
              <div className={`mt-2 p-3 rounded-lg border ${
                inviteCodeInfo.isRestricted
                  ? "bg-amber-50 border-amber-200"
                  : "bg-green-50 border-green-200"
              }`}>
                <div className="flex items-start gap-2">
                  <svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                    inviteCodeInfo.isRestricted ? "text-amber-600" : "text-green-600"
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {inviteCodeInfo.isRestricted ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    )}
                  </svg>
                  <div>
                    <p className={`text-sm font-medium ${
                      inviteCodeInfo.isRestricted ? "text-amber-800" : "text-green-800"
                    }`}>
                      You will be joined to: {inviteCodeInfo.subcommunity.name}
                    </p>
                    {inviteCodeInfo.subcommunity.description && (
                      <p className="text-xs text-gray-600 mt-1">
                        {inviteCodeInfo.subcommunity.description}
                      </p>
                    )}
                    {inviteCodeInfo.isRestricted && (
                      <p className="text-xs text-amber-700 mt-1">
                        This is a restricted invite. Your account will only have access to this forum.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
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
