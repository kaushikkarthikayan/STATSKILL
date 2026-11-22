import { api } from "../api.js";
import { Field, useLoad } from "../ui.jsx";

// Course select plus a topic select that fills in once a course is chosen.
export default function CourseTopicPicker({ courses, courseId, topicId, onChange, topicRequired = false, topicLabel = "Topic", idPrefix = "pick" }) {
  const topics = useLoad(() => (courseId ? api.get(`/courses/${courseId}/topics`) : Promise.resolve([])), [courseId]);
  return (
    <div className="form-row">
      <Field label="Course" htmlFor={`${idPrefix}-course`}>
        <select
          id={`${idPrefix}-course`}
          className="select"
          value={courseId || ""}
          onChange={(event) => onChange({ course_id: event.target.value, topic_id: "" })}
        >
          <option value="">Choose a course</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={topicLabel} htmlFor={`${idPrefix}-topic`}>
        <select
          id={`${idPrefix}-topic`}
          className="select"
          value={topicId || ""}
          onChange={(event) => onChange({ course_id: courseId, topic_id: event.target.value })}
          disabled={!courseId}
        >
          <option value="">{topicRequired ? "Choose a topic" : "No specific topic"}</option>
          {(topics.data || []).map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.name}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}
