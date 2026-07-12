"use client";

import ActivityMessage from "./ActivityMessage";

interface LiveActivityFeedProps {
  activities: any[];
}

export default function LiveActivityFeed({
  activities,
}: LiveActivityFeedProps) {
  return (
    <div
      className="
rounded-2xl
border
border-[#D4AF37]/20
bg-[#111111]
p-5
"
    >
      <div
        className="
mb-5
flex
items-center
justify-between
"
      >
        <div>
          <h2
            className="
text-lg
font-semibold
text-white
"
          >
            Live Activity
          </h2>

          <p
            className="
text-xs
text-zinc-500
"
          >
            Sales team activity stream
          </p>
        </div>

        <div
          className="
flex
items-center
gap-2
text-xs
text-green-400
"
        >
          <span
            className="
h-2
w-2
rounded-full
bg-green-400
animate-pulse
"
          />
          LIVE
        </div>
      </div>

      <div
        className="
max-h-[650px]
overflow-y-auto
space-y-4
pr-2
"
      >
        {activities.map((activity) => (
          <ActivityMessage key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
}
