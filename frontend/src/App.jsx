import { Suspense, lazy } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./auth.jsx";
import AppShell from "./components/AppShell.jsx";
import { LogoBadge } from "./components/Logo.jsx";
import { Loading } from "./ui.jsx";

// Each page is its own download, loaded the first time it is opened.
const Welcome = lazy(() => import("./pages/Welcome.jsx"));
const Login = lazy(() => import("./pages/AuthPages.jsx").then((m) => ({ default: m.Login })));
const Signup = lazy(() => import("./pages/AuthPages.jsx").then((m) => ({ default: m.Signup })));
const ForgotPassword = lazy(() => import("./pages/AuthPages.jsx").then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import("./pages/AuthPages.jsx").then((m) => ({ default: m.ResetPassword })));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const AssessmentHome = lazy(() => import("./pages/Assessment.jsx").then((m) => ({ default: m.AssessmentHome })));
const AttemptPage = lazy(() => import("./pages/Assessment.jsx").then((m) => ({ default: m.AttemptPage })));
const Progress = lazy(() => import("./pages/Progress.jsx"));
const Training = lazy(() => import("./pages/Training.jsx").then((m) => ({ default: m.Training })));
const TopicPage = lazy(() => import("./pages/Training.jsx").then((m) => ({ default: m.TopicPage })));
const Notes = lazy(() => import("./pages/Notes.jsx"));
const About = lazy(() => import("./pages/About.jsx"));
const Manage = lazy(() => import("./pages/Manage.jsx"));

function NotFound() {
  return (
    <div className="auth">
      <div className="auth__wrap">
        <LogoBadge size="lg" />
        <div className="auth__card">
          <h1>Page not found</h1>
          <p className="muted">That page does not exist. It may have moved.</p>
          <Link className="btn btn--primary" to="/">
            Back to the start
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<Loading label="Loading..." />}>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/assessment" element={<AssessmentHome />} />
          <Route path="/assessment/:attemptId" element={<AttemptPage />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/training" element={<Training />} />
          <Route path="/training/topic/:topicId" element={<TopicPage />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/about" element={<About />} />
          <Route
            path="/manage"
            element={
              <RequireAuth roles={["admin", "content_creator"]}>
                <Manage />
              </RequireAuth>
            }
          />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
