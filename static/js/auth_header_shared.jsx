/**
 * Shared header actions: Tools home + login/register or profile + logout.
 * Session cookies must be sent (credentials: 'same-origin' on API calls in parent).
 */
function AcademoAuthNav({ sessionLoaded, isAuthenticated, displayName }) {
  const next = encodeURIComponent(
    window.location.pathname + window.location.search
  );

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-2 sm:gap-3">
      {!sessionLoaded && (
        <span className="text-blue-200/70 text-xs font-medium">Session…</span>
      )}
      {sessionLoaded && isAuthenticated && displayName && (
        <span
          className="text-blue-100 text-xs sm:text-sm font-medium max-w-[160px] sm:max-w-[220px] truncate"
          title={displayName}
        >
          {displayName}
        </span>
      )}
      {sessionLoaded && !isAuthenticated && (
        <>
          <a
            href={`/login?next=${next}`}
            className="text-blue-200 hover:text-white text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-full border border-white/25 hover:bg-white/10 transition-colors"
          >
            Log in
          </a>
          <a
            href={`/login?tab=register&next=${next}`}
            className="text-blue-200 hover:text-white text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-full border border-white/25 hover:bg-white/10 transition-colors"
          >
            Register
          </a>
        </>
      )}
      {sessionLoaded && isAuthenticated && (
        <>
          <a
            href="/profile"
            className="text-blue-200 hover:text-white text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-full border border-white/20 hover:bg-white/10 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
            Profile
          </a>
          <a
            href="/logout"
            className="text-blue-200 hover:text-white text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-full border border-white/20 hover:bg-white/10 transition-colors"
          >
            Log out
          </a>
        </>
      )}
      <a
        href="/home"
        className="text-blue-200 hover:text-white text-sm font-semibold flex items-center gap-2 pl-2 sm:border-l sm:border-white/25 sm:ml-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
        </svg>
        Tools
      </a>
    </div>
  );
}

window.AcademoAuthNav = AcademoAuthNav;
