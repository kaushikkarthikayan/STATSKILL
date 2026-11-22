import { useState } from "react";
import { api } from "../../api.js";
import { useAuth } from "../../auth.jsx";
import { ErrorBox, Field, Loading, useConfirm, useLoad, useToast } from "../../ui.jsx";
import { fmtDate } from "../../utils.js";

const ROLES = [
  { id: "student", label: "Student" },
  { id: "content_creator", label: "Content creator" },
  { id: "admin", label: "Administrator" },
];

export default function UsersTab() {
  const { user: me } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const { loading, data, error, reload } = useLoad(() => api.get(`/users?limit=100${search ? `&q=${encodeURIComponent(search)}` : ""}`), [search]);

  const change = async (target, changes, what) => {
    const yes = await confirm({
      title: "Change this account?",
      message: `${what} for ${target.full_name}. Their current session will end, and the change applies the next time they log in.`,
      confirmLabel: "Change it",
    });
    if (!yes) return;
    try {
      await api.put(`/users/${target.id}`, changes);
      toast.success("Account updated.");
      reload();
    } catch (problem) {
      toast.error(problem.message);
    }
  };

  return (
    <div className="stack">
      <form
        className="card card--soft row"
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(query.trim());
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <Field label="Find a user" htmlFor="user-search" hint="Search by name or email.">
            <input id="user-search" className="input" value={query} onChange={(event) => setQuery(event.target.value)} />
          </Field>
        </div>
        <button className="btn btn--primary">Search</button>
      </form>

      {loading && <Loading label="Loading users..." />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Last login</th>
                <th>Account</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.full_name}</td>
                  <td>{item.email}</td>
                  <td>
                    <select
                      className="select"
                      aria-label={`Role for ${item.full_name}`}
                      value={item.role}
                      disabled={item.id === me.id}
                      onChange={(event) => change(item, { role: event.target.value }, `Role changes to ${ROLES.find((r) => r.id === event.target.value).label}`)}
                    >
                      {ROLES.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{fmtDate(item.last_login_at) || "Never"}</td>
                  <td>
                    <button
                      className={`btn btn--sm ${item.is_active ? "" : "btn--danger"}`}
                      disabled={item.id === me.id}
                      onClick={() => change(item, { is_active: !item.is_active }, item.is_active ? "The account will be disabled" : "The account will be enabled")}
                    >
                      {item.is_active ? "Active: disable" : "Disabled: enable"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <p className="muted small">Showing {data.items.length} of {data.total} accounts. You cannot change your own role or disable yourself.</p>}
    </div>
  );
}
