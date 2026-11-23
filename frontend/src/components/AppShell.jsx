import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Avatar } from "../art/Characters.jsx";
import { useAuth } from "../auth.jsx";
import HangBuddy from "../fx/HangBuddy.jsx";
import { Draggable } from "../fx/Effects.jsx";
import { THEME_COLORS, ProfileProvider, useProfile } from "../profile.jsx";
import { Loading, useConfirm } from "../ui.jsx";
import Icon from "./Icon.jsx";
import { Disc, LogoBadge } from "./Logo.jsx";
import StudyBuddy from "./StudyBuddy.jsx";
import PaperMenu, { PullTab } from "./PaperMenu.jsx";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: "home" },
  { to: "/training", label: "Training", icon: "book" },
  { to: "/assessment", label: "Assessment", icon: "check" },
  { to: "/progress", label: "Progress", icon: "chart" },
  { to: "/profile", label: "Profile", icon: "user" },
];

const TITLES = [
  ["/dashboard", "Dashboard"],
  ["/profile", "Profile"],
  ["/assessment", "Assessment"],
  ["/progress", "Progress report"],
  ["/training", "Course training"],
  ["/notes", "My notes"],
  ["/about", "About"],
  ["/manage", "Manage content"],
];

const linkClass = ({ isActive }) => `topnav__link ${isActive ? "is-active" : ""}`;

function Shell() {
  const { user, logout } = useAuth();
  const { profile } = useProfile();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const tabRef = useRef(null);

  const isStaff = user.role === "admin" || user.role === "content_creator";
  const menuItems = [
    ...NAV,
    { to: "/notes", label: "My notes", icon: "edit" },
    { to: "/about", label: "About and team", icon: "info" },
    ...(isStaff ? [{ to: "/manage", label: "Manage content", icon: "sliders" }] : []),
  ];

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Every page change: close the menu, return to the top (unless the link points at a section) and set the tab title.
  useEffect(() => {
    setMenuOpen(false);
    if (!location.hash) window.scrollTo(0, 0);
    const match = TITLES.find(([prefix]) => location.pathname.startsWith(prefix));
    document.title = `${match ? match[1] : "Study Buddy"} | Study Buddy`;
  }, [location.pathname, location.hash]);

  const signOut = async () => {
    setMenuOpen(false);
    const yes = await confirm({ title: "Log out?", message: "You will need to log in again to continue.", confirmLabel: "Log out" });
    if (!yes) return;
    await logout();
    navigate("/", { replace: true });
  };

  const accent = THEME_COLORS[profile?.theme] || THEME_COLORS.lime;
  const firstName = user.full_name.split(" ")[0];

  return (
    <div className="app">
      <a className="skip" href="#main">
        Skip to content
      </a>

      <header className="topbar2">
        <Link to="/dashboard" className="topbar2__brand" aria-label="Study Buddy dashboard">
          <LogoBadge size="sm" />
        </Link>

        <nav className="topnav" aria-label="Pages">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="topbar2__right">
          <Link to="/profile" className="me-chip" aria-label={`My profile, ${user.full_name}`}>
            <Avatar id={profile?.avatar || "scholar"} bg={accent} size={40} />
            <span className="me-chip__name">{firstName}</span>
          </Link>
          <PullTab open={menuOpen} onToggle={setMenuOpen} buttonRef={tabRef} />
        </div>
      </header>

      <PaperMenu open={menuOpen} onClose={closeMenu} items={menuItems} user={user} onLogout={signOut} returnFocus={tabRef} />

      <main id="main" className="main2">
        <div key={`wipe-${location.pathname}`} className="wipe" aria-hidden="true">
        </div>
        <div key={location.pathname} className="page-enter">
          <Suspense fallback={<Loading label="Opening the page..." />}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      <nav className="tabbar" aria-label="Quick pages">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `tabbar__link ${isActive ? "is-active" : ""}`}>
            <Icon name={item.icon} size={22} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <HangBuddy anchorRef={tabRef} />
      <StudyBuddy />

      <footer className="foot paper">
        <div className="foot__stickers">
          <Draggable style={{ left: "5%", top: "26%" }} rotate={-8}>
            <Disc name="ASSESS" tag="Find gaps" color="#FFD60A" size="150px" />
          </Draggable>
          <Draggable style={{ left: "22%", top: "48%" }} rotate={6}>
            <Disc name="PRACTISE" tag="Fresh MCQs" color="#4FC3F7" size="132px" />
          </Draggable>
          <Draggable style={{ left: "62%", top: "20%" }} rotate={-5}>
            <Disc name="REVISE" tag="Fix mistakes" color="#FF7EB6" size="140px" />
          </Draggable>
          <Draggable style={{ left: "80%", top: "44%" }} rotate={9}>
            <Disc name="GROW" tag="Track it" color="#5ED38A" size="124px" />
          </Draggable>
        </div>
        <div className="foot__bar">
          <span>Study Buddy. Skill assessment, practice and progress.</span>
          <span className="row">
            <Link to="/about">About</Link>
            <Link to="/about#creators">Meet the team</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}

export default function AppShell() {
  return (
    <ProfileProvider>
      <Shell />
    </ProfileProvider>
  );
}


