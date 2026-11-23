import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { Stickman } from "../art/Characters.jsx";
import { DOODLES, DoodleField } from "../art/Doodles.jsx";
import { LogoBadge } from "../components/Logo.jsx";
import { Bubble } from "../components/Sketch.jsx";
import { Field, PasswordField, useToast } from "../ui.jsx";
import { EMAIL_PATTERN, passwordProblem } from "../utils.js";

function AuthLayout({ title, intro, children, footer }) {
  return (
    <div className="auth paper" style={{ position: "relative" }}>
      <DoodleField items={DOODLES.welcome} />
      <div className="auth__wrap" style={{ position: "relative", zIndex: 1 }}>
        <Link to="/" aria-label="AI home">
          <LogoBadge size="lg" />
        </Link>
        <div className="auth__coach">
          <Bubble tone="white" side="right">Let's get you learning!</Bubble>
          <Stickman pose="wave" size={80} />
        </div>
        <div className="auth__card">
          <h1>{title}</h1>
          {intro && (
            <p className="muted" style={{ marginTop: 0 }}>
              {intro}
            </p>
          )}
          {children}
        </div>
        {footer}
      </div>
    </div>
  );
}

const useFormState = (initial) => {
  const [form, setForm] = useState(initial);
  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));
  return [form, set];
};

export function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [form, set] = useFormState({ email: "", password: "", remember: false });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const target = location.state?.from || "/dashboard";

  if (user) return <Navigate to={target} replace />;

  const submit = async (event) => {
    event.preventDefault();
    const found = {};
    if (!EMAIL_PATTERN.test(form.email.trim())) found.email = "Enter a valid email address.";
    if (!form.password) found.password = "Enter your password.";
    setErrors(found);
    setFormError("");
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await login(form.email.trim(), form.password, form.remember);
      toast.success("Welcome back!");
      navigate(target, { replace: true });
    } catch (error) {
      setFormError(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Log in"
      intro="Pick up where you left off."
      footer={
        <p className="small">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      }
    >
      <form onSubmit={submit} noValidate>
        {formError && (
          <div className="alert alert--error" role="alert" style={{ marginBottom: 14 }}>
            {formError}
          </div>
        )}
        <Field label="Email address" htmlFor="email" error={errors.email}>
          <input id="email" className="input" type="email" autoComplete="email" value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password}>
          <PasswordField id="password" autoComplete="current-password" value={form.password} onChange={set("password")} />
        </Field>
        <label className="check" style={{ marginBottom: 16 }}>
          <input type="checkbox" checked={form.remember} onChange={set("remember")} />
          Remember me on this device
        </label>
        <button className="btn btn--primary" disabled={busy}>
          {busy ? "Logging in..." : "Log in"}
        </button>
        <div className="auth__links">
          <Link to="/forgot-password">Forgot password?</Link>
          <Link to="/">Back to start</Link>
        </div>
      </form>
    </AuthLayout>
  );
}

export function Signup() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, set] = useFormState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (event) => {
    event.preventDefault();
    const found = {};
    if (form.name.trim().length < 2) found.name = "Enter your full name.";
    if (!EMAIL_PATTERN.test(form.email.trim())) found.email = "Enter a valid email address, for example name@gmail.com.";
    const problem = passwordProblem(form.password);
    if (problem) found.password = problem;
    if (form.confirm !== form.password) found.confirm = "The passwords do not match.";
    setErrors(found);
    setFormError("");
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password, form.confirm);
      toast.success("Account created. Welcome to AI!");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setFormError(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Sign up"
      intro="Create your account to start your first assessment."
      footer={
        <p className="small">
          Already registered? <Link to="/login">Log in</Link>
        </p>
      }
    >
      <form onSubmit={submit} noValidate>
        {formError && (
          <div className="alert alert--error" role="alert" style={{ marginBottom: 14 }}>
            {formError}
          </div>
        )}
        <Field label="Full name" htmlFor="name" error={errors.name}>
          <input id="name" className="input" autoComplete="name" value={form.name} onChange={set("name")} />
        </Field>
        <Field label="Email address" htmlFor="email" error={errors.email} hint="A Gmail address works, and so does any other email you can open.">
          <input id="email" className="input" type="email" autoComplete="email" value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password} hint="At least 8 characters, with a letter and a number.">
          <PasswordField id="password" autoComplete="new-password" value={form.password} onChange={set("password")} />
        </Field>
        <Field label="Confirm password" htmlFor="confirm" error={errors.confirm}>
          <PasswordField id="confirm" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} />
        </Field>
        <button className="btn btn--primary" disabled={busy}>
          {busy ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const result = await api.publicPost("/auth/forgot-password", { email: email.trim() });
      setMessage(result.message);
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot password"
      intro="Enter your email and we will prepare a reset link."
      footer={
        <p className="small">
          <Link to="/login">Back to log in</Link>
        </p>
      }
    >
      {message ? (
        <div className="alert" role="status">
          {message}
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <Field label="Email address" htmlFor="email" error={error}>
            <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <button className="btn btn--primary" disabled={busy}>
            {busy ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [form, set] = useFormState({ password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const found = {};
    const problem = passwordProblem(form.password);
    if (problem) found.password = problem;
    if (form.confirm !== form.password) found.confirm = "The passwords do not match.";
    setErrors(found);
    setFormError("");
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await api.publicPost("/auth/reset-password", { token, password: form.password, confirm_password: form.confirm });
      setDone(true);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Reset password" intro="Choose a new password for your account.">
      {!token ? (
        <div className="alert alert--error">This link is missing its reset code. Request a new link.</div>
      ) : done ? (
        <div className="stack">
          <div className="alert" role="status">
            Your password has been reset. You can log in with the new password.
          </div>
          <Link className="btn btn--primary" to="/login">
            Go to log in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          {formError && (
            <div className="alert alert--error" role="alert" style={{ marginBottom: 14 }}>
              {formError}
            </div>
          )}
          <Field label="New password" htmlFor="password" error={errors.password} hint="At least 8 characters, with a letter and a number.">
            <PasswordField id="password" autoComplete="new-password" value={form.password} onChange={set("password")} />
          </Field>
          <Field label="Confirm new password" htmlFor="confirm" error={errors.confirm}>
            <PasswordField id="confirm" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} />
          </Field>
          <button className="btn btn--primary" disabled={busy}>
            {busy ? "Saving..." : "Reset password"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}

