import React from "react";
import { Composition } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Hook } from "./scenes/Hook";
import { OldWay } from "./scenes/OldWay";
import { Title } from "./scenes/Title";
import { HealLoop } from "./scenes/HealLoop";
import { Guards } from "./scenes/Guards";
import { Harvest } from "./scenes/Harvest";
import { Portable } from "./scenes/Portable";
import { Outro } from "./scenes/Outro";

const X = 12; // transition length in frames
const cut = () => (
  <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: X })} />
);
const push = () => (
  <TransitionSeries.Transition
    presentation={slide({ direction: "from-right" })}
    timing={linearTiming({ durationInFrames: X })}
  />
);

// 150+140+110+270+240+190+130+140 = 1370, minus 7 transitions × 12 = 1286 frames
export const TOTAL = 1286;

const Intro: React.FC = () => (
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={150} name="Hook">
      <Hook />
    </TransitionSeries.Sequence>
    {cut()}
    <TransitionSeries.Sequence durationInFrames={140} name="OldWay">
      <OldWay />
    </TransitionSeries.Sequence>
    {cut()}
    <TransitionSeries.Sequence durationInFrames={110} name="Title">
      <Title />
    </TransitionSeries.Sequence>
    {push()}
    <TransitionSeries.Sequence durationInFrames={270} name="HealLoop">
      <HealLoop />
    </TransitionSeries.Sequence>
    {push()}
    <TransitionSeries.Sequence durationInFrames={240} name="Guards">
      <Guards />
    </TransitionSeries.Sequence>
    {push()}
    <TransitionSeries.Sequence durationInFrames={190} name="Harvest">
      <Harvest />
    </TransitionSeries.Sequence>
    {cut()}
    <TransitionSeries.Sequence durationInFrames={130} name="Portable">
      <Portable />
    </TransitionSeries.Sequence>
    {cut()}
    <TransitionSeries.Sequence durationInFrames={140} name="Outro">
      <Outro />
    </TransitionSeries.Sequence>
  </TransitionSeries>
);

export const RemotionRoot: React.FC = () => {
  return (
    <Composition id="Intro" component={Intro} durationInFrames={TOTAL} fps={30} width={1920} height={1080} />
  );
};
