import ActivityIcon from "./ActivityIcon";

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
}

export default function ActivityMessage({ activity }: ActivityMessageProps) {
  return (
    <div
      className="
      flex
      gap-4
      border-b
      border-white/5
      pb-4
      animate-in
      fade-in
      slide-in-from-top-2
      "
    >
      <ActivityIcon action={activity.action} />

      <div className="flex-1">
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
            text-[11px]
            text-zinc-500
            "
          >
            {new Date(activity.createdAt).toLocaleTimeString()}
          </span>
        </div>

        {/* USER */}

        <div
          className="
          mt-2
          text-xs
          text-zinc-400
          "
        >
          By:
          <span className="text-[#D4AF37]"> {activity.user.name}</span>
        </div>

        {/* LEAD */}

        {(activity.lead || activity.metadata?.leadName) && (
          <p
            className="
            mt-1
            text-xs
            text-zinc-400
            "
          >
            Lead:
            <span className="text-white">
              {" "}
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
            rounded-lg
            bg-[#D4AF37]/5
            p-3
            text-xs
            "
          >
            <p className="text-zinc-400">Status Changed:</p>

            <p className="mt-1 text-white">
              {activity.metadata?.oldStatus}

              <span className="mx-2 text-[#D4AF37]">→</span>

              {activity.metadata?.newStatus}
            </p>
          </div>
        )}

        {/* FOLLOW UP DETAILS */}

        {activity.action === "FOLLOWUP_COMPLETED" && (
          <div
            className="
            mt-3
            rounded-lg
            bg-[#D4AF37]/5
            p-3
            space-y-1
            text-xs
            "
          >
            <p className="text-zinc-400">
              Follow Up #
              <span className="text-white">
                {activity.metadata?.followUpNumber}
              </span>
            </p>

            <p className="text-zinc-400">
              Remarks:
              <span className="text-white"> {activity.metadata?.remarks}</span>
            </p>

            {activity.metadata?.nextFollowUp && (
              <p className="text-zinc-400">
                Next Follow Up:
                <span className="text-white">
                  {" "}
                  {new Date(
                    activity.metadata.nextFollowUp,
                  ).toLocaleDateString()}
                </span>
              </p>
            )}
          </div>
        )}

        {/* LEAD UPDATE DETAILS */}

        {activity.action === "LEAD_UPDATED" && (
          <div
            className="
            mt-3
            rounded-lg
            bg-[#D4AF37]/5
            p-3
            text-xs
            "
          >
            <p className="text-zinc-400 mb-2">Updated Fields:</p>

            {Object.entries(activity.metadata?.changes || {}).map(
              ([key, value]) => {
                const change = value as { old: unknown; new: unknown };

                return (
                  <p key={key} className="text-white">
                    {key}:
                    <span className="text-zinc-400"> {String(change.old)}</span>
                    <span className="mx-2 text-[#D4AF37]">→</span>
                    <span className="text-[#D4AF37]">{String(change.new)}</span>
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
