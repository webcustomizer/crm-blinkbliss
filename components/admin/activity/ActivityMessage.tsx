import ActivityIcon from "./ActivityIcon";
import { formatDate, formatTime } from "@/lib/format-date";

export interface ActivityMessageProps {
  activity: {
    id: string;

    action: string;

    description: string;

    createdAt: string;

    user: {
      name: string;
    };

    lead?: {
      name: string | null;
      phone: string;
    } | null;

    metadata?: {
      leadName?: string;
      oldStatus?: string;
      newStatus?: string;
      followUpNumber?: number;
      remarks?: string;
      nextFollowUp?: string;
      changes?: Record<string, { old: unknown; new: unknown }>;
    };
  };

  isLast?: boolean;
}

export default function ActivityMessage({
  activity,
  isLast,
}: ActivityMessageProps) {
  return (
    <div
      className="
      relative
      flex
      gap-4
      pb-6
      animate-in
      fade-in
      slide-in-from-top-2
      "
    >
      {/* timeline connector */}
      {!isLast && (
        <span
          aria-hidden
          className="
          absolute
          left-[17px]
          top-9
          h-[calc(100%-2rem)]
          w-px
          bg-gradient-to-b
          from-white/10
          to-transparent
          "
        />
      )}

      <ActivityIcon action={activity.action} />

      <div
        className="
        flex-1
        rounded-2xl
        border
        border-white/[0.07]
        bg-white/[0.02]
        p-4
        transition-colors
        hover:border-[#D4AF37]/20
        "
      >
        <div
          className="
          flex
          items-center
          justify-between
          gap-3
          "
        >
          <p
            className="
            text-sm
            font-medium
            text-white
            "
          >
            {activity.description}
          </p>

          <span
            className="
            shrink-0
            text-[11px]
            text-white/35
            "
          >
            {formatTime(activity.createdAt)}
          </span>
        </div>

        {/* USER */}

        <div
          className="
          mt-2
          flex
          items-center
          gap-1.5
          text-xs
          text-white/40
          "
        >
          <span>By</span>
          <span className="font-medium text-[#D4AF37]">
            {activity.user.name}
          </span>
        </div>

        {/* LEAD */}

        {(activity.lead || activity.metadata?.leadName) && (
          <p
            className="
            mt-1
            flex
            items-center
            gap-1.5
            text-xs
            text-white/40
            "
          >
            <span>Lead</span>
            <span className="font-medium text-white/80">
              {activity.lead?.name ||
                activity.metadata?.leadName ||
                activity.lead?.phone}
            </span>
          </p>
        )}

        {/* STATUS CHANGE DETAILS */}

        {activity.action === "STATUS_CHANGED" && (
          <div
            className="
            mt-3
            rounded-xl
            border
            border-white/5
            bg-black/25
            p-3
            text-xs
            "
          >
            <p className="text-white/40">Status changed</p>

            <p className="mt-1.5 flex items-center gap-2 font-medium text-white">
              <span className="text-white/60">
                {activity.metadata?.oldStatus}
              </span>
              <span className="text-[#D4AF37]">→</span>
              <span className="text-[#D4AF37]">
                {activity.metadata?.newStatus}
              </span>
            </p>
          </div>
        )}

        {/* FOLLOW UP DETAILS */}

        {activity.action === "FOLLOWUP_COMPLETED" && (
          <div
            className="
            mt-3
            space-y-1.5
            rounded-xl
            border
            border-white/5
            bg-black/25
            p-3
            text-xs
            "
          >
            <p className="text-white/40">
              Follow up #
              <span className="font-medium text-white">
                {activity.metadata?.followUpNumber}
              </span>
            </p>

            <p className="text-white/40">
              Remarks:{" "}
              <span className="font-medium text-white">
                {activity.metadata?.remarks}
              </span>
            </p>

            {activity.metadata?.nextFollowUp && (
              <p className="text-white/40">
                Next follow up:{" "}
                <span className="font-medium text-white">
                  {formatDate(activity.metadata.nextFollowUp)}
                </span>
              </p>
            )}
          </div>
        )}

        {/* REMARK UPDATE DETAILS */}

        {activity.action === "REMARK_UPDATED" && activity.metadata?.remarks && (
          <div
            className="
              mt-3
              rounded-xl
              border
              border-white/5
              bg-black/25
              p-3
              text-xs
              "
          >
            <p className="text-white/40">New remarks</p>
            <p className="mt-1.5 whitespace-pre-wrap font-medium text-white">
              {activity.metadata.remarks}
            </p>
          </div>
        )}

        {/* LEAD UPDATE DETAILS */}

        {activity.action === "LEAD_UPDATED" && (
          <div
            className="
            mt-3
            space-y-1
            rounded-xl
            border
            border-white/5
            bg-black/25
            p-3
            text-xs
            "
          >
            <p className="mb-1 text-white/40">Updated fields</p>

            {Object.entries(activity.metadata?.changes || {}).map(
              ([key, value]) => {
                const change = value as { old: unknown; new: unknown };

                return (
                  <p key={key} className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-white">{key}:</span>
                    <span className="text-white/40">{String(change.old)}</span>
                    <span className="text-[#D4AF37]">→</span>
                    <span className="font-medium text-[#D4AF37]">
                      {String(change.new)}
                    </span>
                  </p>
                );
              },
            )}
          </div>
        )}
      </div>
    </div>
  );
}
