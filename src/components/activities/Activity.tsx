"use client";

import type { Activity as ActivityData } from "@/lib/activities";
import { ChartActivity } from "./ChartActivity";
import { ChoiceActivity } from "./ChoiceActivity";
import { DiagramActivity } from "./DiagramActivity";
import { GraphActivity } from "./GraphActivity";
import { ListenActivity } from "./ListenActivity";
import { OrderActivity } from "./OrderActivity";
import { SimulationActivity } from "./SimulationActivity";
import { SortActivity } from "./SortActivity";
import { SoundActivity } from "./SoundActivity";
import { StoryActivity } from "./StoryActivity";
import { TimelineActivity } from "./TimelineActivity";

/** Renders one lesson activity by type. onDone fires (possibly repeatedly) once it's been engaged with. */
export function Activity({ a, onDone }: { a: ActivityData; onDone: () => void }) {
  switch (a.type) {
    case "predict":
    case "scenario":
      return <ChoiceActivity a={a} onDone={onDone} />;
    case "sort":
      return <SortActivity a={a} onDone={onDone} />;
    case "order":
      return <OrderActivity a={a} onDone={onDone} />;
    case "story":
      return <StoryActivity a={a} onDone={onDone} />;
    case "timeline":
      return <TimelineActivity a={a} onDone={onDone} />;
    case "chart":
      return <ChartActivity a={a} onDone={onDone} />;
    case "simulation":
      return <SimulationActivity a={a} onDone={onDone} />;
    case "diagram":
      return <DiagramActivity a={a} onDone={onDone} />;
    case "listen":
      return <ListenActivity a={a} onDone={onDone} />;
    case "sound":
      return <SoundActivity a={a} onDone={onDone} />;
    case "graph":
      return <GraphActivity a={a} onDone={onDone} />;
  }
}
