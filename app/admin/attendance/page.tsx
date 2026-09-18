import { requireAdminPage } from "@/lib/auth/current-user";
import { getGroup } from "@/lib/data/groups";
import { getAttendanceMatrix } from "@/lib/data/sessions";
import { formatShortDate } from "@/lib/time/group-time";
import { Alert } from "@/components/ui/alert";

export const metadata = { title: "Attendance — Admin" };

const CELL: Record<string, { mark: string; className: string; label: string }> = {
  confirmed: { mark: "●", className: "text-kit-green", label: "played" },
  maybe: { mark: "~", className: "text-kit-yellow", label: "maybe" },
  declined: { mark: "×", className: "text-kit-red/70", label: "out" },
};

export default async function AttendancePage() {
  await requireAdminPage();
  const group = await getGroup();
  if (!group) return <Alert tone="warning">This football group has not been set up yet.</Alert>;

  const { sessions, players } = await getAttendanceMatrix(group.id, 12);

  if (sessions.length === 0) {
    return (
      <>
        <h1 className="mb-4 text-2xl font-black tracking-tight">Attendance</h1>
        <Alert tone="info">No Sundays yet, so there is nothing to show.</Alert>
      </>
    );
  }

  const playedSessions = sessions.filter((s) => s.status === "completed").length;

  return (
    <>
      <h1 className="mb-1 text-2xl font-black tracking-tight">Attendance</h1>
      <p className="mb-5 text-sm text-chalk-dim">
        Who answered what, most recent on the right. The <strong className="text-chalk">Played</strong>{" "}
        column counts only Sundays that actually happened — {playedSessions} so far.
      </p>

      <div className="mb-4 flex flex-wrap gap-4 text-xs text-chalk-faint">
        <span><span className="text-kit-green">●</span> played / in</span>
        <span><span className="text-kit-yellow">~</span> maybe</span>
        <span><span className="text-kit-red/70">×</span> out</span>
        <span><span className="text-pitch-600">·</span> no answer</span>
      </div>

      {/* Wide table, narrow phone: the table scrolls, the page does not. */}
      <div className="overflow-x-auto rounded-2xl border border-pitch-700">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-pitch-850">
              <th scope="col" className="sticky left-0 z-10 bg-pitch-850 px-3 py-2 text-left font-bold">
                Player
              </th>
              {sessions.map((session) => (
                <th key={session.id} scope="col" className="px-2 py-2 text-center font-semibold whitespace-nowrap">
                  <span className="block text-chalk-dim">{formatShortDate(session.date, group.timezone)}</span>
                  <span className="block text-[10px] font-normal text-chalk-faint">
                    {session.status === "completed" ? "played" : session.status === "cancelled" ? "off" : "upcoming"}
                  </span>
                </th>
              ))}
              <th scope="col" className="px-3 py-2 text-right font-bold whitespace-nowrap">
                Played
              </th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.id} className="border-t border-pitch-800">
                <th scope="row" className="sticky left-0 z-10 bg-pitch-900 px-3 py-2 text-left font-semibold">
                  {player.name}
                </th>
                {sessions.map((session) => {
                  const status = player.cells[session.id];
                  const cell = status ? CELL[status] : null;
                  return (
                    <td key={session.id} className="px-2 py-2 text-center">
                      <span
                        className={cell ? cell.className : "text-pitch-600"}
                        title={cell ? cell.label : "no answer"}
                      >
                        {cell ? cell.mark : "·"}
                      </span>
                    </td>
                  );
                })}
                <td className="tabular px-3 py-2 text-right font-bold">{player.played}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
