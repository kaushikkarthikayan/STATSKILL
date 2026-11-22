import { api } from "../../api.js";
import { Empty, ErrorBox, Loading, useConfirm, useLoad, useToast } from "../../ui.jsx";
import { BookForm } from "../Training.jsx";

export default function BooksTab({ courses }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { loading, data, error, reload } = useLoad(() => api.get("/books"), []);
  const courseName = (id) => courses.find((course) => course.id === id)?.name || "-";

  const togglePublished = async (book) => {
    try {
      await api.put(`/books/${book.id}`, { is_published: !book.is_published });
      reload();
    } catch (problem) {
      toast.error(problem.message);
    }
  };

  const remove = async (book) => {
    const yes = await confirm({ title: "Delete this book?", message: `"${book.title}" will disappear for all students, including their saved copies.`, confirmLabel: "Delete", danger: true });
    if (!yes) return;
    try {
      await api.del(`/books/${book.id}`);
      toast.success("Book deleted.");
      reload();
    } catch (problem) {
      toast.error(problem.message);
    }
  };

  return (
    <div className="stack">
      <BookForm courses={courses} onAdded={reload} />
      {loading && <Loading label="Loading books..." />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data &&
        (data.length === 0 ? (
          <Empty title="No books yet">Add a book link above and students will see it under Course Training.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Course</th>
                  <th>Topic</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((book) => (
                  <tr key={book.id}>
                    <td>
                      <a href={book.url} target="_blank" rel="noopener noreferrer">
                        {book.title}
                      </a>
                    </td>
                    <td>{book.author}</td>
                    <td>{courseName(book.course_id)}</td>
                    <td>{book.topic || "-"}</td>
                    <td>
                      <span className={`chip ${book.is_published ? "chip--ok" : ""}`}>{book.is_published ? "Visible" : "Hidden"}</span>
                    </td>
                    <td>
                      <div className="manage-actions">
                        <button className="btn btn--sm" onClick={() => togglePublished(book)}>
                          {book.is_published ? "Hide" : "Show"}
                        </button>
                        <button className="btn btn--sm btn--danger" onClick={() => remove(book)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}
