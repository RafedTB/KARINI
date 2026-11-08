import { RequireAuth } from "@/presentation/components/auth/require-auth";
import { LiveCalendarView } from "@/presentation/features/live/live-calendar-view";

export default function LivePage() {
  return (
    <RequireAuth>
      <LiveCalendarView />
    </RequireAuth>
  );
}

