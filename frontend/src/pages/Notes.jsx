import { api } from "../api.js";
import NotesPanel from "../components/NotesPanel.jsx";
import { PageHead } from "../components/Sketch.jsx";
import { useProfile } from "../profile.jsx";
import { ErrorBox, Loading, useLoad } from "../ui.jsx";

export default function Notes() {
  const { profile } = useProfile();
  const courses = useLoad(() => api.get("/courses"), []);
  if (courses.loading && !courses.data) return <Loading label="Loading..." />;
  if (courses.error)
    return (
      <div className="page">
        <ErrorBox error={courses.error} onRetry={courses.reload} />
      </div>
    );
  return (
    <div className="page">
      <PageHead kicker="My notes" title="Your own study material" lead="Upload notes you downloaded (PDF or DOCX) or paste text. They stay private to you and appear on the matching topic page." pose="read" />
      <NotesPanel courses={courses.data} defaultCourseId={profile?.current_course?.id || ""} />
    </div>
  );
}
