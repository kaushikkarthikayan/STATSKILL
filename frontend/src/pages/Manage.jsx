import { useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { ErrorBox, Loading, Tabs, useLoad } from "../ui.jsx";
import BooksTab from "./manage/BooksTab.jsx";
import CoursesTab from "./manage/CoursesTab.jsx";
import MaterialTab from "./manage/MaterialTab.jsx";
import QuestionsTab from "./manage/QuestionsTab.jsx";
import UsersTab from "./manage/UsersTab.jsx";

// Only content creators and administrators reach this page (see the route in App.jsx).
// The backend checks the role again on every request, so hiding a button is never the only protection.
export default function Manage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("questions");
  const courses = useLoad(() => api.get("/courses"), []);

  const tabs = [
    { id: "questions", label: "Questions" },
    { id: "material", label: "Study material" },
    { id: "books", label: "Books" },
    { id: "courses", label: "Courses and topics" },
    ...(user.role === "admin" ? [{ id: "users", label: "Users" }] : []),
  ];

  if (courses.loading && !courses.data) return <Loading label="Loading..." />;
  if (courses.error)
    return (
      <div className="page">
        <ErrorBox error={courses.error} onRetry={courses.reload} />
      </div>
    );

  const shared = { courses: courses.data, reloadCourses: courses.reload };
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <span className="kicker">{user.role === "admin" ? "Administrator" : "Content creator"}</span>
          <h1 className="page-title">Manage content</h1>
          <p className="lead">Add and edit the questions, study material, books and courses that students see.</p>
        </div>
      </div>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === "questions" && <QuestionsTab {...shared} />}
      {tab === "material" && <MaterialTab {...shared} />}
      {tab === "books" && <BooksTab {...shared} />}
      {tab === "courses" && <CoursesTab {...shared} />}
      {tab === "users" && user.role === "admin" && <UsersTab />}
    </div>
  );
}
